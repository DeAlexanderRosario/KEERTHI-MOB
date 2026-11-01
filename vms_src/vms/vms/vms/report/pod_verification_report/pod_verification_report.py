import frappe
from frappe import _

def execute(filters=None):
    columns = [
        {"label": _("POD ID"), "fieldname": "name", "fieldtype": "Link", "options": "Proof of Delivery", "width": 140},
        {"label": _("Delivery Trip"), "fieldname": "delivery_trip", "fieldtype": "Link", "options": "Delivery Trip", "width": 130},
        {"label": _("Customer"), "fieldname": "customer_name", "fieldtype": "Data", "width": 160},
        {"label": _("Receiver"), "fieldname": "receiver_name", "fieldtype": "Data", "width": 130},
        {"label": _("Verified By"), "fieldname": "verified_by", "fieldtype": "Data", "width": 120},
        {"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 100},
        {"label": _("Audit Hash"), "fieldname": "audit_hash", "fieldtype": "Data", "width": 180}
    ]
    data = frappe.db.sql("""
        SELECT name, delivery_trip, customer_name, receiver_name, verified_by, status, audit_hash
        FROM `tabProof of Delivery`
        ORDER BY creation DESC
        LIMIT 100
    """, as_dict=True)
    return columns, data
