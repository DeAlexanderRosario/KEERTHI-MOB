import frappe
from frappe import _

def execute(filters=None):
    columns = [
        {"label": _("Trip ID"), "fieldname": "name", "fieldtype": "Link", "options": "Delivery Trip", "width": 140},
        {"label": _("Vehicle"), "fieldname": "vehicle", "fieldtype": "Link", "options": "Vehicle", "width": 120},
        {"label": _("Driver"), "fieldname": "driver", "fieldtype": "Link", "options": "Driver", "width": 140},
        {"label": _("Route"), "fieldname": "route", "fieldtype": "Link", "options": "Route", "width": 130},
        {"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 110},
        {"label": _("Departure Time"), "fieldname": "departure_time", "fieldtype": "Datetime", "width": 140},
        {"label": _("Completion Time"), "fieldname": "actual_completion", "fieldtype": "Datetime", "width": 140}
    ]
    conditions = []
    if filters and filters.get("status"):
        conditions.append(f"status = '{filters.get('status')}'")
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    data = frappe.db.sql(f"""
        SELECT name, vehicle, driver, route, status, departure_time, actual_completion
        FROM `tabDelivery Trip`
        {where_clause}
        ORDER BY departure_time DESC
        LIMIT 100
    """, as_dict=True)
    return columns, data
