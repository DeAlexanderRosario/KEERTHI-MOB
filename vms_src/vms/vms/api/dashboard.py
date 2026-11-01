# -*- coding: utf-8 -*-
"""
Keerthi VMS - Native Operational Dashboard API
Frappe v16 / ERPNext v16 Native Backend

Strictly integrates with real ERPNext & VMS records:
- Queries tabWarehouse, tabAddress, tabVehicle, tabDriver, tabDelivery Trip,
  tabVehicle Allocation, tabPayment Collection, tabProof of Delivery.
- Zero invented data: If coordinates or GPS telemetry are not configured,
  explicitly flags them as unavailable.
- Reuses existing operational metrics from vms.api modules.
- Enforces strict role-based access control.
"""

import json
import frappe
from frappe import _
from frappe.utils import today, add_days, flt, cint, now_datetime
from vms.api.common import validate_role_access
from vms.api.dashboard_metrics import get_operational_metrics
from vms.api.fleet_monitoring import get_fleet_status

DASHBOARD_ROLES = ["VMS Executive", "Fleet Manager", "Dispatcher", "System Manager", "General Manager"]

def check_dashboard_access():
    """Verify that current session user has authorized dashboard role."""
    validate_role_access(DASHBOARD_ROLES, "access VMS Operations Dashboard")


@frappe.whitelist()
def get_dashboard_summary(company=None):
    """
    Returns high-level operational summaries derived from actual records.
    - Active trips, pending allocations, and pending collections
    """
    check_dashboard_access()

    company_filter = {"company": company} if (company and frappe.db.has_column("Delivery Trip", "company")) else {}

    # Query real Delivery Trip records
    total_trips = frappe.db.count("Delivery Trip", {"docstatus": 1, **company_filter})
    in_transit_trips = frappe.db.count("Delivery Trip", {"status": "In Transit", "docstatus": 1, **company_filter})
    completed_trips = frappe.db.count("Delivery Trip", {"status": "Completed", "docstatus": 1, **company_filter})
    
    # Query pending allocations & collections
    pending_allocations = frappe.db.count("Vehicle Allocation", {"docstatus": 0})
    pending_collections = frappe.db.count("Payment Collection", {"docstatus": 1, "status": "Submitted"})
    open_discrepancies = frappe.db.count("Warehouse Discrepancy", {"resolution_status": "Pending Resolution"})

    # Compute average distance from Routes associated with trips
    avg_km_res = frappe.db.sql("""
        SELECT AVG(r.estimated_distance_km) as avg_km
        FROM `tabDelivery Trip` dt
        JOIN `tabRoute` r ON r.name = dt.route
        WHERE dt.docstatus = 1 AND r.estimated_distance_km > 0
    """, as_dict=True)
    avg_distance = round(flt(avg_km_res[0].avg_km), 1) if (avg_km_res and avg_km_res[0].avg_km) else None

    return {
        "company": company or frappe.defaults.get_user_default("Company") or "Keerthi Groups Hardware",
        "has_data": total_trips > 0,
        "on_time_shipments": {
            # Kept under its existing key for API compatibility. This is a
            # completed-trip count, not an on-time SLA calculation.
            "value": completed_trips,
            "total_completed": completed_trips,
            "label": "Completed trips",
            "status_text": f"{completed_trips} completed trips" if completed_trips else "No completed trips yet"
        },
        "average_km": {
            "value": avg_distance if avg_distance is not None else "N/A",
            "unit": "km" if avg_distance is not None else "",
            "label": "Average planned route",
            "status_text": "Average estimated distance from route masters" if avg_distance is not None else "Route distances not configured"
        },
        "accepted_orders": {
            "value": completed_trips,
            "total_trips": total_trips,
            "label": "Completed trips",
            "badge_count": pending_allocations,
            "status_text": f"{pending_allocations} orders awaiting allocation"
        },
        "active_in_transit": in_transit_trips,
        "pending_allocation": pending_allocations,
        "pending_collections_count": pending_collections,
        "open_discrepancies": open_discrepancies,
        "timestamp": now_datetime()
    }


@frappe.whitelist()
def get_fleet_efficiency(company=None):
    """
    Computes Fleet Efficiency Donut Chart from real Vehicle & Vehicle Allocation records.
    Categorizes vehicles into:
    - On the move (Vehicle linked to an active In Progress / In Transit Trip)
    - Available (Vehicle active and not currently allocated)
    - In Maintenance (Vehicle status marked as Out of Order / Under Maintenance)
    """
    check_dashboard_access()

    # Reuses existing fleet status query from fleet_monitoring.py
    fleet_data = get_fleet_status()
    total_vehicles = len(fleet_data)

    if total_vehicles == 0:
        return {
            "has_vehicles": False,
            "total_fleet": 0,
            "on_the_move": 0,
            "unutilized": 0,
            "in_maintenance": 0,
            "utilization_percentage": 0.0,
            "message": "No vehicles registered in Fleet master."
        }

    # Vehicle is a standard ERPNext DocType and often has no lifecycle/status
    # column. Read a site-defined maintenance field only when it exists.
    maintenance_field = next((
        field for field in ("status", "custom_vehicle_status", "maintenance_status", "custom_maintenance_status")
        if frappe.db.has_column("Vehicle", field)
    ), None)

    on_the_move = 0
    in_maintenance = 0
    unutilized = 0

    for v in fleet_data:
        status = v.get("status", "")
        # Check vehicle maintenance status if field exists
        v_doc_status = frappe.db.get_value("Vehicle", v.get("name"), maintenance_field) if maintenance_field else ""
        if str(v_doc_status or "").strip().lower() in ["out of order", "under maintenance", "maintenance", "repair"]:
            in_maintenance += 1
        elif status == "Allocated":
            on_the_move += 1
        else:
            unutilized += 1

    utilization_pct = round((on_the_move / total_vehicles) * 100, 1) if total_vehicles > 0 else 0.0

    return {
        "has_vehicles": True,
        "total_fleet": total_vehicles,
        "on_the_move": on_the_move,
        "unutilized": unutilized,
        "in_maintenance": in_maintenance,
        "maintenance_status_available": bool(maintenance_field),
        "utilization_percentage": utilization_pct,
        "comparison_trend": f"{utilization_pct}% active utilization",
        "chart_segments": [
            {"label": "on the move", "count": on_the_move, "color": "#20d52e", "key": "active"},
            {"label": "unutilized", "count": unutilized, "color": "#eab308", "key": "available"},
            {"label": "in maintenance", "count": in_maintenance, "color": "#ef4444", "key": "maintenance"}
        ]
    }


@frappe.whitelist()
def get_featured_vehicle():
    """
    Returns the current featured on-road vehicle from real active Delivery Trips.
    If no active trip is running, returns an empty state.
    Strictly reports GPS telemetry as unavailable if no IoT tracking is integrated.
    """
    check_dashboard_access()

    # Find the most recently dispatched active delivery trip
    active_trip = frappe.get_all(
        "Delivery Trip",
        filters={"status": ["in", ["In Transit", "Dispatched"]], "docstatus": 1},
        fields=["name", "vehicle", "driver", "route", "departure_time", "vehicle_allocation"],
        order_by="departure_time desc",
        limit=1
    )

    if not active_trip:
        return {
            "has_active_vehicle": False,
            "message": "No active delivery trips found in the system.",
            "image_url": "/assets/vms/images/delivery_truck.svg"
        }

    trip = active_trip[0]
    vehicle_id = trip.vehicle
    driver_id = trip.driver

    # Fetch Vehicle Master details
    vehicle_fields = ["license_plate", "make", "model"]
    capacity_field = next((
        field for field in ("custom_max_weight_capacity_kg", "custom_capacity_kg", "capacity_kg", "weight_capacity")
        if frappe.db.has_column("Vehicle", field)
    ), None)
    if capacity_field:
        vehicle_fields.append(capacity_field)
    vehicle_doc = frappe.db.get_value("Vehicle", vehicle_id, vehicle_fields, as_dict=True) or {}
    driver_name = frappe.db.get_value("Driver", driver_id, "full_name") or driver_id
    driver_phone = frappe.db.get_value("Driver", driver_id, "cell_number") or frappe.db.get_value("Driver", driver_id, "mobile_no") or None

    # Fetch capacity from allocation
    allocated_weight = 0.0
    if trip.vehicle_allocation:
        allocated_weight = flt(frappe.db.get_value("Vehicle Allocation", trip.vehicle_allocation, "total_weight_kg") or 0.0)

    max_capacity = flt(vehicle_doc.get(capacity_field) or 0) if capacity_field else 0.0
    utilization = round((allocated_weight / max_capacity) * 100, 1) if max_capacity > 0 else 0.0

    # Real route name
    route_name = trip.route or "Direct Route"

    # Strictly check if GPS coordinates exist on Driver or Trip Stop
    last_stop = frappe.get_all(
        "Delivery Trip Stop",
        filters={"parent": trip.name, "status": ["in", ["Arrived", "Delivered"]]},
        fields=["customer", "customer_name", "arrival_lat", "arrival_lng", "arrival_time"],
        order_by="stop_sequence desc",
        limit=1
    )

    last_location = None
    if last_stop and last_stop[0].customer_name:
        last_location = f"Last stop: {last_stop[0].customer_name}"

    return {
        "has_active_vehicle": True,
        "vehicle_id": vehicle_doc.get("license_plate") or vehicle_id,
        "vehicle_record": vehicle_id,
        "model": f"{vehicle_doc.get('make', '')} {vehicle_doc.get('model', '')}".strip() or "Commercial Vehicle",
        "driver_name": driver_name,
        "driver_phone": driver_phone,
        "trip_id": trip.name,
        "route_name": route_name,
        "current_location": last_location or "En route (GPS tracker not configured)",
        "status": trip.get("status", "In Transit"),
        "telemetry_available": False,
        "telemetry_notice": "Live GPS hardware telemetry unavailable. Status based on logged stops.",
        "capacity_utilization_pct": utilization,
        "current_load_kg": allocated_weight,
        "max_capacity_kg": max_capacity,
        "capacity_configured": max_capacity > 0,
        "image_url": "/assets/vms/images/delivery_truck.svg"
    }


@frappe.whitelist()
def get_kerala_map_data():
    """
    Returns actual configured Kerala locations from real database records:
    1. Warehouses: Fetches real `tabWarehouse` records and reads their linked Address latitude and longitude.
    2. Active Stops: Fetches real `tabDelivery Trip Stop` records and reads arrival_lat and arrival_lng.
    If no coordinates are configured in the database, provides explicit unmapped list so
    users know which records require coordinate configuration.
    """
    check_dashboard_access()

    # Query real Warehouses
    warehouses_raw = frappe.get_all(
        "Warehouse",
        filters={"is_group": 0, "disabled": 0},
        fields=["name", "warehouse_name", "company"]
    )

    mapped_warehouses = []
    unmapped_warehouses = []

    for wh in warehouses_raw:
        # Check linked address in Dynamic Link
        addr_links = frappe.get_all(
            "Dynamic Link",
            filters={"link_doctype": "Warehouse", "link_name": wh.name, "parenttype": "Address"},
            fields=["parent"],
            limit=1
        )
        lat = None
        lng = None
        city = None
        if addr_links:
            addr = frappe.db.get_value("Address", addr_links[0].parent, ["city", "latitude", "longitude", "address_line1"], as_dict=True)
            if addr:
                city = addr.city
                if addr.latitude and addr.longitude:
                    lat = flt(addr.latitude)
                    lng = flt(addr.longitude)

        # Count active dispatches from this warehouse
        active_disp = frappe.db.count("Vehicle Allocation", {"warehouse": wh.name, "status": "Ready for Dispatch"}) if frappe.db.has_column("Vehicle Allocation", "warehouse") else 0

        wh_obj = {
            "id": wh.name,
            "name": wh.warehouse_name or wh.name,
            "city": city or "Kerala",
            "active_dispatches": active_disp
        }

        if lat and lng:
            wh_obj["lat"] = lat
            wh_obj["lng"] = lng
            mapped_warehouses.append(wh_obj)
        else:
            unmapped_warehouses.append(wh_obj)

    # Query real active trip stops
    active_stops = frappe.db.sql("""
        SELECT 
            dts.name as stop_id,
            dts.customer,
            dts.customer_name,
            dts.status,
            dts.arrival_lat as lat,
            dts.arrival_lng as lng,
            dts.address,
            dt.name as trip_id,
            dt.vehicle
        FROM `tabDelivery Trip Stop` dts
        JOIN `tabDelivery Trip` dt ON dt.name = dts.parent
        WHERE dt.status = 'In Transit' AND dt.docstatus = 1
        ORDER BY dts.stop_sequence ASC
    """, as_dict=True)

    mapped_stops = []
    unmapped_stops = []
    for s in active_stops:
        stop_obj = {
            "id": s.stop_id,
            "customer": s.customer,
            "customer_name": s.customer_name or s.customer,
            "trip_id": s.trip_id,
            "vehicle": s.vehicle,
            "status": s.status,
            "address": s.address
        }
        if s.lat and s.lng and flt(s.lat) != 0.0 and flt(s.lng) != 0.0:
            stop_obj["lat"] = flt(s.lat)
            stop_obj["lng"] = flt(s.lng)
            mapped_stops.append(stop_obj)
        else:
            unmapped_stops.append(stop_obj)

    # Aggregate deliveries per Territory (real Kerala territories configured in ERPNext)
    territory_counts = frappe.db.sql("""
        SELECT territory, COUNT(name) as count
        FROM `tabCustomer`
        WHERE territory IS NOT NULL AND territory != ''
        GROUP BY territory
        ORDER BY count DESC
        LIMIT 7
    """, as_dict=True)

    return {
        "has_coordinates": len(mapped_warehouses) > 0 or len(mapped_stops) > 0,
        "warehouses": mapped_warehouses,
        "unmapped_warehouses": unmapped_warehouses,
        "stops": mapped_stops,
        "unmapped_stops": unmapped_stops,
        "territory_counts": territory_counts,
        "coordinates_notice": None if (len(mapped_warehouses) > 0 or len(mapped_stops) > 0) else "No geographic coordinates configured in Address or Trip Stop records. Displaying operational list view."
    }


@frappe.whitelist()
def get_incoming_communications(filter_type="all", limit=10):
    """
    Retrieves real live notifications and operational alerts:
    - Recent Warehouse Discrepancies
    - Recent Proof of Delivery submissions
    - Recent Payment Collections awaiting Accounts verification
    - Recent Delayed Trips
    """
    check_dashboard_access()

    limit = min(cint(limit) or 10, 30)
    items = []

    # 1. Unresolved Warehouse Discrepancies (Alerts)
    discrepancies = frappe.get_all(
        "Warehouse Discrepancy",
        filters={"resolution_status": "Pending Resolution"},
        fields=["name", "warehouse", "item_code", "discrepancy_type", "reported_by", "creation"],
        order_by="creation desc",
        limit=5
    )
    for d in discrepancies:
        items.append({
            "id": d.name,
            "type": "alert",
            "category": "Alerts",
            "icon": "alert-circle",
            "icon_color": "#ef4444",
            "title": f"Warehouse Discrepancy: {d.discrepancy_type}",
            "body": f"Warehouse {d.warehouse} logged {d.discrepancy_type} on item {d.item_code}.",
            "time_ago": frappe.utils.pretty_date(d.creation),
            "reference_doctype": "Warehouse Discrepancy",
            "reference_name": d.name
        })

    # 2. Submitted Payment Collections (Approvals)
    collections = frappe.get_all(
        "Payment Collection",
        filters={"docstatus": 1, "status": "Submitted"},
        fields=["name", "customer", "amount", "mode_of_payment", "creation"],
        order_by="creation desc",
        limit=5
    )
    for c in collections:
        items.append({
            "id": c.name,
            "type": "approval",
            "category": "Approvals",
            "icon": "credit-card",
            "icon_color": "#10b981",
            "title": f"Collection Pending Verification ({c.mode_of_payment})",
            "body": f"Collection of ₹{c.amount:,.2f} from {c.customer} awaits Accounts reconciliation.",
            "time_ago": frappe.utils.pretty_date(c.creation),
            "reference_doctype": "Payment Collection",
            "reference_name": c.name
        })

    # 3. Submitted Proofs of Delivery (Approvals)
    pods = frappe.get_all(
        "Proof of Delivery",
        filters={"docstatus": 1},
        fields=["name", "customer", "delivery_trip", "receiver_name", "creation"],
        order_by="creation desc",
        limit=5
    )
    for p in pods:
        items.append({
            "id": p.name,
            "type": "approval",
            "category": "Approvals",
            "icon": "check-circle",
            "icon_color": "#20d52e",
            "title": "Proof of Delivery Signed",
            "body": f"POD signed by {p.receiver_name or p.customer} for Trip {p.delivery_trip}.",
            "time_ago": frappe.utils.pretty_date(p.creation),
            "reference_doctype": "Proof of Delivery",
            "reference_name": p.name
        })

    # 4. Delayed Trips (Alerts)
    delayed_trips = frappe.get_all(
        "Delivery Trip",
        filters={"is_delayed": 1, "status": "In Transit"},
        fields=["name", "vehicle", "driver", "route", "modified"],
        order_by="modified desc",
        limit=5
    )
    for t in delayed_trips:
        items.append({
            "id": t.name,
            "type": "alert",
            "category": "Alerts",
            "icon": "alert-triangle",
            "icon_color": "#f59e0b",
            "title": f"Trip Delay Advisory: {t.name}",
            "body": f"Vehicle {t.vehicle} on route {t.route} exceeded scheduled stop duration.",
            "time_ago": frappe.utils.pretty_date(t.modified),
            "reference_doctype": "Delivery Trip",
            "reference_name": t.name
        })

    # Filter by category if requested
    filtered = items
    if filter_type and filter_type.lower() != "all":
        filtered = [it for it in items if it.get("category", "").lower() == filter_type.lower()]

    # Sort by time
    return {
        "total_count": len(items),
        "counts": {
            "all": len(items),
            "approvals": len([i for i in items if i.get("category") == "Approvals"]),
            "alerts": len([i for i in items if i.get("category") == "Alerts"]),
            "messages": 0
        },
        "items": filtered[:limit]
    }


@frappe.whitelist()
def get_shipments_overview(status=None, search=None, page=1, page_size=10):
    """
    Returns real operational shipments from tabDelivery Trip records.
    Columns: ID, Route, Weight (kg), Status, Truck, Driver, Scheduled Departure.
    """
    check_dashboard_access()

    page = max(1, cint(page) or 1)
    page_size = min(50, max(5, cint(page_size) or 10))

    filters = {}
    if status and status != "All":
        filters["status"] = status

    trips = frappe.get_all(
        "Delivery Trip",
        filters=filters,
        fields=["name", "route", "vehicle", "driver", "status", "departure_time", "vehicle_allocation", "is_delayed"],
        order_by="departure_time desc, creation desc",
        limit_start=(page - 1) * page_size,
        limit_page_length=page_size
    )

    total_count = frappe.db.count("Delivery Trip", filters)

    shipments = []
    for t in trips:
        weight_kg = 0.0
        if t.vehicle_allocation:
            weight_kg = flt(frappe.db.get_value("Vehicle Allocation", t.vehicle_allocation, "total_weight_kg") or 0.0)

        # Map status to color token
        status_color = "gray"
        if t.status == "In Transit":
            status_color = "green"
        elif t.status == "Completed":
            status_color = "green"
        elif t.status == "Delayed" or t.is_delayed:
            status_color = "orange"
        elif t.status == "Dispatched":
            status_color = "green"

        departure_str = str(t.departure_time) if t.departure_time else "Unscheduled"

        shipments.append({
            "id": t.name,
            "route": t.route or "Direct Route",
            "weight_kg": weight_kg,
            "weight_formatted": f"{round(weight_kg/1000, 1)} T" if weight_kg >= 1000 else f"{int(weight_kg)} kg",
            "status": t.status,
            "status_color": status_color,
            "truck": t.vehicle or "Unassigned",
            "driver": t.driver or "Unassigned",
            "arrival_date": departure_str,
            "vehicle_allocation": t.vehicle_allocation
        })

    return {
        "items": shipments,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size if total_count else 1
    }


@frappe.whitelist()
def get_revenue_collections_chart(period="monthly"):
    """
    Returns actual Payment Collections time series aggregated by month.
    Does not invent figures.
    """
    check_dashboard_access()

    # Query real Payment Collection data for the current year
    records = frappe.db.sql("""
        SELECT 
            DATE_FORMAT(collection_date, '%%b') as month_name,
            MONTH(collection_date) as month_num,
            SUM(amount) as total_amount
        FROM `tabPayment Collection`
        WHERE docstatus = 1 AND collection_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month_num, month_name
        ORDER BY month_num ASC
    """, as_dict=True)

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_data = {m: 0.0 for m in months}

    total_sum = 0.0
    for r in records:
        m = r.month_name
        if m in monthly_data:
            val = flt(r.total_amount)
            monthly_data[m] = val
            total_sum += val

    return {
        "period": period,
        "currency": "INR",
        "has_records": len(records) > 0,
        "current_total_formatted": f"₹{total_sum:,.2f}" if total_sum > 0 else "₹0.00 (No collections recorded)",
        "labels": months,
        "data": [monthly_data[m] for m in months]
    }
