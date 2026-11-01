import math

import frappe
from frappe import _
from vms.api.common import validate_role_access


def _assert_warehouse_access(allocation):
    for row in allocation.orders:
        if row.warehouse and not frappe.has_permission("Warehouse", "read", row.warehouse):
            frappe.throw(_("You do not have access to Warehouse {0}.").format(row.warehouse), frappe.PermissionError)


def _get_allocation(allocation_name):
    allocation = frappe.get_doc("Vehicle Allocation", allocation_name)
    _assert_warehouse_access(allocation)
    if allocation.docstatus != 1:
        frappe.throw(_("Warehouse operations require a submitted allocation."))
    return allocation


@frappe.whitelist()
def get_picking_queue():
    """Returns permission-aware submitted allocations awaiting warehouse work."""
    validate_role_access(["Warehouse User", "Warehouse Manager", "System Manager"], "view picking queue")
    candidates = frappe.get_list(
        "Vehicle Allocation",
        filters={"docstatus": 1, "status": ["in", ["In Progress", "Discrepancy Reported"]]},
        fields=["name", "vehicle", "driver", "route", "delivery_date", "status", "total_weight_kg"],
        limit_page_length=500,
    )
    results = []
    for candidate in candidates:
        allocation = frappe.get_doc("Vehicle Allocation", candidate.name)
        try:
            _assert_warehouse_access(allocation)
        except frappe.PermissionError:
            continue
        results.append(candidate)
    return results


@frappe.whitelist()
def record_picking(allocation_name, item_code, picked_qty, bin_location=None, sales_order=None):
    """Record a picked quantity for one uniquely identified allocation line."""
    validate_role_access(["Warehouse User", "Warehouse Manager", "System Manager"], "record picking")
    allocation = _get_allocation(allocation_name)
    if allocation.status not in ("In Progress", "Discrepancy Reported"):
        frappe.throw(_("Picking is unavailable for allocation status {0}.").format(allocation.status))
    quantity = float(picked_qty)
    if not math.isfinite(quantity) or quantity < 0:
        frappe.throw(_("Picked quantity must be a non-negative finite number."))

    matches = [
        row for row in allocation.orders
        if row.item_code == item_code and (not sales_order or row.sales_order == sales_order)
    ]
    if len(matches) != 1:
        frappe.throw(_("Select a Sales Order to identify the allocation line unambiguously."))
    order = matches[0]
    if quantity > float(order.allocated_qty or 0):
        frappe.throw(_("Picked quantity cannot exceed allocated quantity."))
    order.picked_qty = quantity
    allocation.save()
    if bin_location:
        allocation.add_comment("Comment", text=f"{item_code} picked from bin {bin_location}.")
    return {"status": "success", "allocation": allocation.name, "sales_order": order.sales_order, "item_code": item_code, "picked_qty": quantity}


@frappe.whitelist()
def record_loading(allocation_name, remarks=None):
    """Record warehouse loading activity without marking it verified."""
    validate_role_access(["Warehouse User", "Warehouse Manager", "System Manager"], "record loading")
    allocation = _get_allocation(allocation_name)
    if allocation.status not in ("In Progress", "Discrepancy Reported"):
        frappe.throw(_("Loading activity is unavailable for allocation status {0}.").format(allocation.status))
    if remarks:
        allocation.add_comment("Comment", text=f"Loading activity by {frappe.session.user}: {remarks}")
    return {"status": "success", "allocation": allocation.name, "state": allocation.status}


@frappe.whitelist()
def create_discrepancy(allocation_name, item_code, discrepancy_type, discrepancy_qty, remarks=None, sales_order=None):
    """Record a warehouse variance against an actual allocation line."""
    validate_role_access(["Warehouse User", "Warehouse Manager", "System Manager"], "create discrepancy")
    allocation = _get_allocation(allocation_name)
    if allocation.status not in ("In Progress", "Discrepancy Reported"):
        frappe.throw(_("A discrepancy can be recorded only during warehouse processing."))
    quantity = float(discrepancy_qty)
    if not math.isfinite(quantity) or quantity <= 0:
        frappe.throw(_("Discrepancy quantity must be a positive finite number."))
    if discrepancy_type not in ("Short", "Overage", "Damaged", "Wrong Item"):
        frappe.throw(_("Choose a valid discrepancy type."))

    matches = [
        row for row in allocation.orders
        if row.item_code == item_code and (not sales_order or row.sales_order == sales_order)
    ]
    if len(matches) != 1:
        frappe.throw(_("Select a Sales Order to identify the allocation line unambiguously."))
    order = matches[0]
    if quantity > float(order.allocated_qty or 0) and discrepancy_type != "Overage":
        frappe.throw(_("Discrepancy quantity cannot exceed allocated quantity."))

    discrepancy = frappe.new_doc("Warehouse Discrepancy")
    discrepancy.vehicle_allocation = allocation.name
    discrepancy.sales_order = order.sales_order
    discrepancy.item_code = order.item_code
    discrepancy.discrepancy_type = discrepancy_type
    discrepancy.allocated_qty = order.allocated_qty
    discrepancy.loaded_qty = (
        max(0.0, float(order.allocated_qty or 0) - quantity)
        if discrepancy_type == "Short"
        else float(order.allocated_qty or 0) + quantity
        if discrepancy_type == "Overage"
        else float(order.allocated_qty or 0)
    )
    discrepancy.discrepancy_qty = quantity
    discrepancy.reason = remarks or discrepancy_type
    discrepancy.resolution_status = "Pending Resolution"
    discrepancy.insert()

    allocation.status = "Discrepancy Reported"
    allocation.save()
    return {"status": "success", "discrepancy_name": discrepancy.name}


@frappe.whitelist()
def resolve_discrepancy(discrepancy_name, resolution_notes):
    """Resolve a warehouse variance with an auditable manager note."""
    validate_role_access(["Warehouse Manager", "System Manager"], "resolve discrepancy")
    if not resolution_notes or len(resolution_notes.strip()) < 5:
        frappe.throw(_("Provide a resolution note of at least 5 characters."))
    discrepancy = frappe.get_doc("Warehouse Discrepancy", discrepancy_name)
    allocation = _get_allocation(discrepancy.vehicle_allocation)
    if discrepancy.resolution_status != "Pending Resolution":
        frappe.throw(_("Only pending discrepancies can be resolved."))
    discrepancy.resolution_status = "Resolved"
    discrepancy.resolution_notes = resolution_notes
    discrepancy.save()
    discrepancy.add_comment("Comment", text=f"Resolved by {frappe.session.user}: {resolution_notes}")

    open_discrepancies = frappe.get_list(
        "Warehouse Discrepancy",
        filters={"vehicle_allocation": allocation.name, "resolution_status": "Pending Resolution"},
        fields=["name"],
        limit_page_length=1,
    )
    if not open_discrepancies and allocation.status == "Discrepancy Reported":
        allocation.status = "In Progress"
        allocation.save()
    return {"status": "success", "discrepancy_name": discrepancy.name, "state": discrepancy.resolution_status}


@frappe.whitelist()
def verify_loading(allocation_name, verified_by_staff_id=None, remarks=None):
    """Verify that every planned quantity was picked before dispatch approval."""
    validate_role_access(["Warehouse User", "Warehouse Manager", "System Manager"], "verify loading")
    allocation = _get_allocation(allocation_name)
    if allocation.status != "In Progress":
        frappe.throw(_("Only an allocation in progress can be verified."))
    pending = frappe.get_list(
        "Warehouse Discrepancy",
        filters={"vehicle_allocation": allocation.name, "resolution_status": ["!=", "Resolved"]},
        fields=["name"],
        limit_page_length=1,
    )
    if pending:
        frappe.throw(_("Resolve or reject all warehouse discrepancies before verifying loading."))
    incomplete = [
        row for row in allocation.orders
        if abs(float(row.picked_qty or 0) - float(row.allocated_qty or 0)) > 0.0001
    ]
    if incomplete:
        frappe.throw(_("Every allocation line must be fully picked before loading can be verified."))

    allocation.status = "Loading Verified"
    allocation.loading_verified_by = frappe.session.user
    allocation.save()
    if remarks:
        allocation.add_comment("Comment", text=f"Loading verified by {frappe.session.user}: {remarks}")
    return {"status": "success", "allocation": allocation.name, "state": allocation.status}


# Backward compatibility alias
record_loading_verification = verify_loading
