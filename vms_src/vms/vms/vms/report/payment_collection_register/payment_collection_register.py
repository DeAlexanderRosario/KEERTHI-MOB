import frappe
from frappe import _

def execute(filters=None):
    columns = [
        {"label": _("Collection ID"), "fieldname": "name", "fieldtype": "Link", "options": "Payment Collection", "width": 150},
        {"label": _("Customer"), "fieldname": "customer_name", "fieldtype": "Data", "width": 160},
        {"label": _("Sales Agent"), "fieldname": "sales_agent", "fieldtype": "Link", "options": "User", "width": 130},
        {"label": _("Date"), "fieldname": "collection_date", "fieldtype": "Date", "width": 100},
        {"label": _("Amount"), "fieldname": "amount", "fieldtype": "Currency", "width": 120},
        {"label": _("Mode"), "fieldname": "mode_of_payment", "fieldtype": "Data", "width": 110},
        {"label": _("Ref No"), "fieldname": "transaction_reference", "fieldtype": "Data", "width": 130},
        {"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 110},
        {"label": _("ERPNext Payment Entry"), "fieldname": "payment_entry_reference", "fieldtype": "Link", "options": "Payment Entry", "width": 150}
    ]
    data = frappe.db.sql("""
        SELECT name, customer_name, sales_agent, collection_date, amount, mode_of_payment, transaction_reference, status, payment_entry_reference
        FROM `tabPayment Collection`
        ORDER BY collection_date DESC
        LIMIT 100
    """, as_dict=True)
    return columns, data
