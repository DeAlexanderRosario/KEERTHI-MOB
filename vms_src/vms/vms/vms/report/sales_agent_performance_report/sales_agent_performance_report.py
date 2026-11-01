import frappe
from frappe import _

def execute(filters=None):
    columns = [
        {"label": _("Sales Agent"), "fieldname": "sales_agent", "fieldtype": "Link", "options": "User", "width": 160},
        {"label": _("Shop Visits"), "fieldname": "total_visits", "fieldtype": "Int", "width": 120},
        {"label": _("Collections Recorded"), "fieldname": "total_collections", "fieldtype": "Int", "width": 140},
        {"label": _("Total Amount Collected"), "fieldname": "total_amount", "fieldtype": "Currency", "width": 160}
    ]
    data = frappe.db.sql("""
        SELECT 
            pc.sales_agent,
            count(distinct sv.name) as total_visits,
            count(distinct pc.name) as total_collections,
            ifnull(sum(pc.amount), 0) as total_amount
        FROM `tabPayment Collection` pc
        LEFT JOIN `tabShop Visit` sv ON sv.sales_agent = pc.sales_agent
        WHERE pc.docstatus = 1
        GROUP BY pc.sales_agent
        ORDER BY total_amount DESC
    """, as_dict=True)
    return columns, data
