import frappe
from vms.api.permissions import validate_role

@frappe.whitelist()
def get_internal_operational_queue():
    validate_role([
        "Dispatcher", "Fleet Manager", "Accounts User", "Accounts Manager",
        "Warehouse User", "Warehouse Manager", "System Manager",
    ])
    roles = set(frappe.get_roles(frappe.session.user))
    queue = {}
    if roles.intersection({"Dispatcher", "Fleet Manager", "Warehouse User", "Warehouse Manager", "System Manager"}):
        queue["allocations_to_load"] = frappe.db.count("Vehicle Allocation", {"docstatus": 1, "status": "In Progress"})
    if roles.intersection({"Dispatcher", "Fleet Manager", "System Manager"}):
        queue["trips_to_dispatch"] = frappe.db.count("Vehicle Allocation", {"docstatus": 1, "status": "Loading Verified"})
    if roles.intersection({"Accounts User", "Accounts Manager", "System Manager"}):
        queue["collections_to_verify"] = frappe.db.count("Payment Collection", {"docstatus": 1, "status": "Submitted"})
    return queue
