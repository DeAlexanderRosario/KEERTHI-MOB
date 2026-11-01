import frappe
from frappe import _

def execute(filters=None):
    columns = [
        {"label": _("Discrepancy ID"), "fieldname": "name", "fieldtype": "Link", "options": "Warehouse Discrepancy", "width": 140},
        {"label": _("Allocation"), "fieldname": "vehicle_allocation", "fieldtype": "Link", "options": "Vehicle Allocation", "width": 140},
        {"label": _("Order"), "fieldname": "sales_order", "fieldtype": "Link", "options": "Sales Order", "width": 130},
        {"label": _("Item Code"), "fieldname": "item_code", "fieldtype": "Data", "width": 130},
        {"label": _("Allocated"), "fieldname": "allocated_qty", "fieldtype": "Float", "width": 100},
        {"label": _("Loaded"), "fieldname": "loaded_qty", "fieldtype": "Float", "width": 100},
        {"label": _("Variance"), "fieldname": "discrepancy_qty", "fieldtype": "Float", "width": 100},
        {"label": _("Reason"), "fieldname": "reason", "fieldtype": "Data", "width": 180},
        {"label": _("Status"), "fieldname": "resolution_status", "fieldtype": "Data", "width": 120}
    ]
    data = frappe.db.sql("""
        SELECT name, vehicle_allocation, sales_order, item_code, allocated_qty, loaded_qty, discrepancy_qty, reason, resolution_status
        FROM `tabWarehouse Discrepancy`
        ORDER BY creation DESC
        LIMIT 100
    """, as_dict=True)
    return columns, data
