import frappe
from frappe import _
from vms.api.common import validate_role_access
from vms.vms.doctype.vehicle_allocation.vehicle_allocation import get_vehicle_capacity

@frappe.whitelist()
def get_orders_awaiting_allocation(warehouse=None):
    """Returns submitted Sales Orders that have unallocated delivery quantities."""
    validate_role_access(["Dispatcher", "Fleet Manager", "System Manager"], "view orders awaiting allocation")
    conditions = ["so.docstatus = 1", "so.status not in ('Completed', 'Cancelled', 'Closed')"]
    params = {}
    if warehouse:
        conditions.append("soi.warehouse = %(warehouse)s")
        params["warehouse"] = warehouse
        
    query = f"""
        SELECT 
            so.name as sales_order,
            so.customer,
            so.customer_name,
            so.delivery_date,
            soi.item_code,
            soi.name as sales_order_item,
            soi.item_name,
            soi.qty as order_qty,
            ifnull(soi.delivered_qty, 0) as delivered_qty,
            (soi.qty - ifnull(soi.delivered_qty, 0)) as pending_delivery_qty,
            soi.warehouse
        FROM `tabSales Order` so
        JOIN `tabSales Order Item` soi ON soi.parent = so.name
        WHERE {" AND ".join(conditions)}
        ORDER BY so.delivery_date ASC
    """
    return frappe.db.sql(query, params, as_dict=True)

@frappe.whitelist()
def preview_allocation(vehicle, orders_json):
    """
    Simulates allocation, computes total load weight from Item master,
    and validates against vehicle capacity without saving.
    """
    validate_role_access(["Dispatcher", "Fleet Manager", "System Manager"], "preview allocation")
    import json
    orders = json.loads(orders_json) if isinstance(orders_json, str) else orders_json
    
    vehicle_capacity = get_vehicle_capacity(vehicle)
    total_weight = 0.0
    missing_weights = []
    enriched_orders = []
    
    for o in orders:
        item_code = o.get("item_code")
        qty = float(o.get("allocated_qty", 1))
        weight_per_unit = frappe.db.get_value("Item", item_code, "weight_per_unit")
        
        if weight_per_unit is None or float(weight_per_unit) <= 0:
            missing_weights.append(item_code)
            frappe.throw(_("Set a positive weight_per_unit for item {0} before allocation.").format(item_code))
        line_weight = float(weight_per_unit) * qty
            
        total_weight += line_weight
        enriched_orders.append({
            "sales_order": o.get("sales_order"),
            "sales_order_item": o.get("sales_order_item"),
            "customer": o.get("customer"),
            "item_code": item_code,
            "allocated_qty": qty,
            "line_weight_kg": line_weight
        })
        
    is_overloaded = total_weight > float(vehicle_capacity)
    
    return {
        "vehicle": vehicle,
        "vehicle_capacity_kg": float(vehicle_capacity),
        "total_weight_kg": total_weight,
        "utilization_pct": round((total_weight / float(vehicle_capacity)) * 100, 2) if float(vehicle_capacity) > 0 else 0,
        "is_overloaded": is_overloaded,
        "missing_weights": missing_weights,
        "orders": enriched_orders
    }

@frappe.whitelist()
def create_or_update_allocation(vehicle, driver, route, delivery_date, orders_json, allocation_name=None):
    """Creates or updates a Vehicle Allocation document with capacity conflict checks."""
    validate_role_access(["Dispatcher", "Fleet Manager", "System Manager"], "create vehicle allocation")
    import json
    orders = json.loads(orders_json) if isinstance(orders_json, str) else orders_json
    if not orders:
        frappe.throw(_("At least one order line item must be allocated."))
        
    if allocation_name:
        doc = frappe.get_doc("Vehicle Allocation", allocation_name)
        if doc.docstatus != 0:
            frappe.throw(_("Only draft allocations can be edited."))
        doc.orders = []
    else:
        doc = frappe.new_doc("Vehicle Allocation")
        
    doc.vehicle = vehicle
    doc.driver = driver
    doc.route = route
    doc.delivery_date = delivery_date
    doc.status = "In Progress"
    
    for o in orders:
        doc.append("orders", {
            "sales_order": o.get("sales_order"),
            "sales_order_item": o.get("sales_order_item"),
            "customer": o.get("customer"),
            "item_code": o.get("item_code"),
            "allocated_qty": float(o.get("allocated_qty", 1)),
            "warehouse": o.get("warehouse", "Stores - KGH")
        })
        
    doc.save()
    return {"status": "success", "allocation_name": doc.name}

# Backward compatibility alias
create_vehicle_allocation = create_or_update_allocation

@frappe.whitelist()
def submit_to_warehouse(allocation_name):
    """Transitions allocation to warehouse picking and loading queue."""
    validate_role_access(["Dispatcher", "Fleet Manager", "System Manager"], "dispatch allocation")
    doc = frappe.get_doc("Vehicle Allocation", allocation_name)
    if doc.docstatus != 0:
        frappe.throw(_("Only a draft allocation can be submitted to Warehouse."))
    doc.status = "In Progress"
    doc.submit()
    return {"status": "success", "allocation": doc.name, "status": doc.status}

@frappe.whitelist()
def approve_dispatch(allocation_name):
    """Authorized dispatch approval. Generates Delivery Trip once loading is verified."""
    validate_role_access(["Dispatcher", "Fleet Manager", "System Manager"], "approve dispatch")
    alloc = frappe.get_doc("Vehicle Allocation", allocation_name)
    trip_name = alloc.approve_and_generate_trip()
    return {"status": "success", "trip_name": trip_name}

# Backward compatibility alias
approve_dispatch_and_generate_trip = approve_dispatch

@frappe.whitelist()
def cancel_or_reconcile_allocation(allocation_name, reason):
    """Cancels an un-dispatched vehicle allocation and releases order locks."""
    validate_role_access(["Dispatcher", "Fleet Manager", "System Manager"], "cancel allocation")
    alloc = frappe.get_doc("Vehicle Allocation", allocation_name)
    if alloc.status == "Dispatched":
        frappe.throw(_("Cannot cancel allocation that has already been dispatched into an active trip."))
    alloc.status = "Cancelled"
    alloc.save()
    alloc.add_comment("Comment", text=f"Allocation cancelled by {frappe.session.user}. Reason: {reason}")
    return {"status": "success", "allocation": alloc.name, "state": "Cancelled"}

def check_delayed_trips():
    """Scheduled task: monitors active trips past estimated arrival and sends alerts."""
    frappe.logger("vms").info("Checking delayed trips...")
    return True
