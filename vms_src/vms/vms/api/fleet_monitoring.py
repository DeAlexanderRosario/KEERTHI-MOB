import frappe
from vms.api.common import validate_role_access
from vms.vms.doctype.vehicle_allocation.vehicle_allocation import ACTIVE_ALLOCATION_STATUSES

@frappe.whitelist()
def get_fleet_status():
    validate_role_access(["Fleet Manager", "Dispatcher", "VMS Executive", "System Manager"], "view fleet status")
    vehicles = frappe.get_list("Vehicle", fields=["name", "license_plate", "make", "model"], limit_page_length=500)
    allocations = frappe.get_list(
        "Vehicle Allocation",
        filters={"status": ["in", list(ACTIVE_ALLOCATION_STATUSES)], "docstatus": 1},
        fields=["vehicle", "driver", "delivery_date", "total_weight_kg"],
        limit_page_length=500,
    )
    alloc_map = {a.vehicle: a for a in allocations}
    
    for v in vehicles:
        alloc = alloc_map.get(v.name)
        v["status"] = "Allocated" if alloc else "Available"
        v["allocation_details"] = alloc
    return vehicles
