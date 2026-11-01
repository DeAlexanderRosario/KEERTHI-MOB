import frappe
from vms.api.dispatch import get_orders_awaiting_allocation, create_vehicle_allocation, approve_dispatch

@frappe.whitelist()
def get_dispatch_queue(warehouse=None):
    return get_orders_awaiting_allocation(warehouse)

@frappe.whitelist()
def process_allocation_approval(allocation_name):
    return approve_dispatch(allocation_name)
