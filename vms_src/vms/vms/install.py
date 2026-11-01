"""Idempotent role-level permissions owned by the VMS app."""

import frappe


def after_migrate():
    """Give Field Sales Agents owner-scoped Sales Order capture access."""
    if not frappe.db.exists("Role", {"role_name": "Field Sales Agent"}):
        return

    filters = {"parent": "Sales Order", "role": "Field Sales Agent", "permlevel": 0}
    name = frappe.db.get_value("Custom DocPerm", filters, "name")
    permission = frappe.get_doc("Custom DocPerm", name) if name else frappe.new_doc("Custom DocPerm")
    permission.update({
        **filters,
        "if_owner": 1,
        "select": 1,
        "read": 1,
        "write": 1,
        "create": 1,
        "delete": 0,
        "submit": 0,
        "cancel": 0,
        "amend": 0,
        "report": 0,
        "export": 0,
        "import": 0,
        "share": 0,
        "print": 1,
        "email": 0,
    })
    permission.save(ignore_permissions=True)
    frappe.clear_cache(doctype="Sales Order")
