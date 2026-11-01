import frappe

def execute():
    """
    Harmonizes Workspace records and prevents duplicate shortcuts in Frappe Desk.
    """
    workspaces = [
        "VMS Overview", "Field Sales", "Accounts & Collections",
        "Warehouse Operations", "Fleet & Dispatch", "Delivery Operations", "VMS Reports & Analytics"
    ]
    for ws_name in workspaces:
        if frappe.db.exists("Workspace", ws_name):
            ws = frappe.get_doc("Workspace", ws_name)
            ws.module = "VMS"
            ws.public = 1
            ws.is_standard = 1
            ws.flags.ignore_permissions = True
            ws.save()

    # Safely archive or hide deprecated legacy workspace names
    legacy_workspaces = ["Vehicle Management", "Dispatch Management", "Accounts Operations", "Sales Management", "Executive Cockpit"]
    for old_ws in legacy_workspaces:
        if frappe.db.exists("Workspace", old_ws):
            frappe.db.set_value("Workspace", old_ws, "public", 0)
