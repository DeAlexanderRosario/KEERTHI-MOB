import frappe
from frappe.utils import today
from vms.api.common import validate_role_access

@frappe.whitelist()
def get_operational_metrics():
    roles = set(frappe.get_roles(frappe.session.user))
    validate_role_access([
        "VMS Executive", "Fleet Manager", "Dispatcher", "Warehouse User", "Warehouse Manager",
        "Accounts User", "Accounts Manager", "System Manager",
    ], "view operational metrics")
    active_trips = frappe.db.count("Delivery Trip", {"status": "In Transit", "docstatus": 1})
    orders_pending = frappe.db.count("Vehicle Allocation", {"status": "Draft", "docstatus": 0})
    collections_pending = frappe.db.count("Payment Collection", {"status": "Submitted", "docstatus": 1})
    pod_pending = frappe.db.count("Proof of Delivery", {"status": "Submitted", "docstatus": 1})
    discrepancies = frappe.db.count("Warehouse Discrepancy", {"resolution_status": "Pending Resolution"})
    
    metrics = {
        "active_delivery_trips": active_trips,
        "orders_pending_allocation": orders_pending,
        "pod_pending_verification": pod_pending,
        "warehouse_discrepancies": discrepancies,
        "timestamp": frappe.utils.now_datetime()
    }
    if roles.intersection({"Accounts User", "Accounts Manager", "VMS Executive", "System Manager"}):
        metrics["collections_pending_verification"] = collections_pending
    return metrics
