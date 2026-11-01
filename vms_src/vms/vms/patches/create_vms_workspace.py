import frappe

def execute():
    """Ensures standard Workspaces are published and accessible."""
    frappe.logger("vms").info("Patch: Registering VMS Workspaces...")
    workspaces = [
        "VMS Overview", "Field Sales", "Accounts & Collections",
        "Warehouse Operations", "Fleet & Dispatch", "Delivery Operations", "VMS Reports & Analytics"
    ]
    for ws_name in workspaces:
        if frappe.db.exists("Workspace", ws_name):
            frappe.db.set_value("Workspace", ws_name, "public", 1)
            frappe.db.set_value("Workspace", ws_name, "module", "VMS")
            frappe.db.set_value("Workspace", ws_name, "is_standard", 1)
