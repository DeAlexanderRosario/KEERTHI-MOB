import frappe
from frappe import _

def execute(filters=None):
    columns = [
        {"label": _("Sales Order"), "fieldname": "sales_order", "fieldtype": "Link", "options": "Sales Order", "width": 140},
        {"label": _("Customer"), "fieldname": "customer_name", "fieldtype": "Data", "width": 160},
        {"label": _("Item Code"), "fieldname": "item_code", "fieldtype": "Data", "width": 130},
        {"label": _("Ordered Qty"), "fieldname": "order_qty", "fieldtype": "Float", "width": 110},
        {"label": _("Delivered Qty"), "fieldname": "delivered_qty", "fieldtype": "Float", "width": 110},
        {"label": _("Pending Qty"), "fieldname": "pending_qty", "fieldtype": "Float", "width": 110},
        {"label": _("Delivery Date"), "fieldname": "delivery_date", "fieldtype": "Date", "width": 110}
    ]
    data = frappe.db.sql("""
        SELECT 
            so.name as sales_order,
            so.customer_name,
            soi.item_code,
            soi.qty as order_qty,
            ifnull(soi.delivered_qty, 0) as delivered_qty,
            (soi.qty - ifnull(soi.delivered_qty, 0)) as pending_qty,
            so.delivery_date
        FROM `tabSales Order` so
        JOIN `tabSales Order Item` soi ON soi.parent = so.name
        WHERE so.docstatus = 1 AND so.status not in ('Completed', 'Cancelled')
        ORDER BY so.delivery_date ASC
        LIMIT 100
    """, as_dict=True)
    return columns, data
