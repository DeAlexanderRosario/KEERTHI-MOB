import frappe
from frappe import _
import hashlib
import json
from frappe.utils import now_datetime
from vms.api.common import parse_coordinates

def get_authenticated_driver():
    """
    Strictly resolves Driver record for logged-in user session.
    NO fallback to TEST-DRIVER or Administrator.
    """
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw(_("Authentication required. Please log in as an authorized Driver."), frappe.AuthenticationError)

    roles = set(frappe.get_roles(user))
    if roles.intersection({"System Manager", "Dispatcher", "Fleet Manager"}):
        return None
    if "Driver" not in roles:
        frappe.throw(_("Access Denied: Driver role is required."), frappe.PermissionError)

    # A name or phone-number match is not an identity link. Require an explicit
    # Driver.user_id mapping to prevent account confusion and impersonation.
    driver = frappe.db.get_value("Driver", {"user_id": user}, "name")
    
    if not driver:
        frappe.throw(
            _("Access Denied: Logged-in user '{0}' is not linked to an active Driver record.").format(user),
            frappe.PermissionError
        )
    return driver

def has_driver_supervisor_access():
    return bool(set(frappe.get_roles(frappe.session.user)).intersection(
        {"System Manager", "Dispatcher", "Fleet Manager"}
    ))


def _require_active_trip(trip):
    if trip.docstatus != 1 or trip.status not in ("Dispatched", "In Transit"):
        frappe.throw(_("This action is available only for a submitted, active delivery trip."))

# Standardize alias for Mobile Sync and API callers
get_current_driver = get_authenticated_driver

@frappe.whitelist()
def get_my_trips():
    """Returns active trips assigned strictly to the authenticated driver."""
    driver = get_authenticated_driver()
    filters = {"docstatus": 1, "status": ["in", ["Dispatched", "In Transit"]]}
    if driver:
        filters["driver"] = driver
    trips = frappe.get_all(
        "Delivery Trip",
        filters=filters,
        fields=["name", "vehicle", "route", "departure_time", "status"]
    )
    for t in trips:
        t["stops"] = frappe.get_all(
            "Delivery Trip Stop",
            filters={"parent": t.name},
            fields=["name", "stop_sequence", "customer", "customer_name", "address", "contact_phone", "status", "pod_reference"],
            order_by="stop_sequence asc"
        )
    return trips

# Backward compatibility alias
get_assigned_trips = get_my_trips

@frappe.whitelist()
def get_trip_details(trip_name):
    """Returns complete operational details for a specific trip assigned to driver."""
    driver = get_authenticated_driver()
    trip = frappe.get_doc("Delivery Trip", trip_name)
    if trip.driver != driver and not has_driver_supervisor_access():
        frappe.throw(_("Unauthorized: You are not assigned to trip {0}").format(trip_name), frappe.PermissionError)
    
    return {
        "name": trip.name,
        "vehicle": trip.vehicle,
        "driver": trip.driver,
        "route": trip.route,
        "status": trip.status,
        "departure_time": trip.departure_time,
        "stops": [s.as_dict() for s in trip.stops],
        "items": [i.as_dict() for i in trip.items]
    }

@frappe.whitelist()
def start_trip(trip_name):
    """Driver begins assigned transit."""
    driver = get_authenticated_driver()
    trip = frappe.get_doc("Delivery Trip", trip_name)
    if trip.driver != driver and not has_driver_supervisor_access():
        frappe.throw(_("Unauthorized: You are not assigned to trip {0}").format(trip_name), frappe.PermissionError)
    if trip.docstatus != 1:
        frappe.throw(_("Only a submitted delivery trip can be started."))
    if trip.status == "In Transit":
        return {"status": "success", "trip": trip.name, "state": trip.status, "already_started": True}
    if trip.status != "Dispatched":
        frappe.throw(_("Only a dispatched trip can be started."))

    trip.status = "In Transit"
    trip.actual_departure = now_datetime()
    trip.save()
    return {"status": "success", "trip": trip.name, "state": trip.status}

@frappe.whitelist()
def record_arrival(trip_name, stop_name, lat=None, lng=None):
    """Driver marks arrival at destination stop."""
    driver = get_authenticated_driver()
    trip = frappe.get_doc("Delivery Trip", trip_name)
    if trip.driver != driver and not has_driver_supervisor_access():
        frappe.throw(_("Unauthorized access to trip."), frappe.PermissionError)
    _require_active_trip(trip)

    for s in trip.stops:
        if s.name == stop_name:
            if s.status == "Arrived":
                return {"status": "success", "stop": s.name, "already_arrived": True}
            if s.status != "Pending":
                frappe.throw(_("Arrival can be recorded only for a pending stop."))
            s.status = "Arrived"
            s.arrival_time = now_datetime()
            coordinates = parse_coordinates(lat, lng)
            if coordinates:
                latitude, longitude = coordinates
                s.arrival_lat = latitude
                s.arrival_lng = longitude
            trip.save()
            return {"status": "success", "stop": s.name}
    frappe.throw(_("Stop not found in assigned trip."))

# Backward compatibility alias
arrive_at_stop = record_arrival

@frappe.whitelist()
def submit_pod(
    trip_name, stop_name, receiver_name, receiver_phone,
    items_json, signature_base64=None, photos_json=None, lat=None, lng=None,
    delivery_notes=None
):
    """
    Submits Proof of Delivery.
    - Lifecycle: Inserts first as Draft, then submits via pod.submit().
    - Quantity conservation: Allocated = Delivered + Damaged + Short + Rejected.
    - Strict Security: Drivers never collect money/cash. Zero COD.
    - Computes cryptographic SHA-256 seal.
    """
    driver = get_authenticated_driver()
    trip = frappe.get_doc("Delivery Trip", trip_name)
    if trip.driver != driver and not has_driver_supervisor_access():
        frappe.throw(_("Unauthorized: You cannot submit POD for this trip."), frappe.PermissionError)
    _require_active_trip(trip)

    stop_doc = next((s for s in trip.stops if s.name == stop_name), None)
    if not stop_doc:
        frappe.throw(_("Stop {0} not found in trip {1}.").format(stop_name, trip_name))
    if stop_doc.status not in ("Pending", "Arrived") or stop_doc.pod_reference:
        frappe.throw(_("This trip stop is already complete or otherwise unavailable for POD submission."))
        
    items = json.loads(items_json) if isinstance(items_json, str) else items_json
    photos = json.loads(photos_json) if photos_json and isinstance(photos_json, str) else (photos_json or [])
    
    # Create POD as Draft
    pod = frappe.new_doc("Proof of Delivery")
    pod.delivery_trip = trip.name
    pod.delivery_trip_stop = stop_doc.name
    pod.customer = stop_doc.customer
    pod.receiver_name = receiver_name
    pod.receiver_phone = receiver_phone
    pod.delivery_notes = delivery_notes or ""
    pod.server_timestamp = now_datetime()
    pod.status = "Draft"
    coordinates = parse_coordinates(lat, lng)
    if coordinates:
        pod.gps_latitude, pod.gps_longitude = coordinates
        
    for item in items:
        allocated = float(item.get("allocated_qty", 0))
        delivered = float(item.get("delivered_qty", 0))
        damaged = float(item.get("damaged_qty", 0))
        short = float(item.get("short_qty", 0))
        rejected = float(item.get("rejected_qty", 0))
        
        # Enforce exact quantity conservation
        total_accounted = delivered + damaged + short + rejected
        if abs(total_accounted - allocated) > 0.0001:
            frappe.throw(
                _("Quantity conservation failed for {0}: Allocated ({1}) != Accounted ({2})")
                .format(item.get("item_code"), allocated, total_accounted)
            )
            
        pod.append("items", {
            "sales_order": item.get("sales_order"),
            "sales_order_item": item.get("sales_order_item"),
            "item_code": item.get("item_code"),
            "allocated_qty": allocated,
            "delivered_qty": delivered,
            "damaged_qty": damaged,
            "short_qty": short,
            "rejected_qty": rejected
        })
        
    if signature_base64:
        pod.signature_data = signature_base64
    for p in photos:
        pod.append("photos", {
            "category": p.get("category", "Delivery Evidence"),
            "photo_url": p.get("photo_url"),
            "remarks": p.get("remarks")
        })
        
    # Insert first as Draft
    pod.insert()
    
    # Submit via official doc lifecycle
    pod.submit()
    
    # The submitted POD controller owns stop outcome and trip completion updates.
    return {"status": "success", "pod_name": pod.name, "audit_hash": pod.audit_hash}

# Backward compatibility alias
submit_proof_of_delivery = submit_pod

@frappe.whitelist()
def record_failed_delivery(trip_name, stop_name, reason, lat=None, lng=None):
    """Records unsuccessful delivery attempt with failure reason."""
    driver = get_authenticated_driver()
    if not reason or not reason.strip():
        frappe.throw(_("A failure reason is required."))
    trip = frappe.get_doc("Delivery Trip", trip_name)
    if trip.driver != driver and not has_driver_supervisor_access():
        frappe.throw(_("Unauthorized access."), frappe.PermissionError)
    _require_active_trip(trip)

    for s in trip.stops:
        if s.name == stop_name:
            if s.status not in ("Pending", "Arrived"):
                frappe.throw(_("This stop is already complete or unavailable."))
            s.status = "Failed"
            s.failure_reason = reason
            trip.save()
            trip.add_comment("Comment", text=f"Delivery to {s.customer} failed. Reason: {reason}")
            return {"status": "success", "stop": s.name, "state": "Failed"}
    frappe.throw(_("Stop not found in trip."))

@frappe.whitelist()
def request_reschedule(trip_name, stop_name, requested_date, reason):
    """Driver or customer requests stop rescheduling."""
    driver = get_authenticated_driver()
    if not requested_date or not reason or not reason.strip():
        frappe.throw(_("A reschedule date and reason are required."))
    trip = frappe.get_doc("Delivery Trip", trip_name)
    if trip.driver != driver and not has_driver_supervisor_access():
        frappe.throw(_("Unauthorized access."), frappe.PermissionError)
    _require_active_trip(trip)

    for s in trip.stops:
        if s.name == stop_name:
            if s.status not in ("Pending", "Arrived"):
                frappe.throw(_("This stop is already complete or unavailable."))
            s.status = "Rescheduled"
            s.rescheduled_date = requested_date
            s.reschedule_reason = reason
            trip.save()
            trip.add_comment("Comment", text=f"Stop {s.customer} requested reschedule to {requested_date}. Reason: {reason}")
            return {"status": "success", "stop": s.name, "rescheduled_date": requested_date}
    frappe.throw(_("Stop not found in trip."))
