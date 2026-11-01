import frappe

def execute():
    """Registers VMS app route in Frappe desk app screen."""
    frappe.logger("vms").info("Patch: Verifying VMS Dock registration...")
    if frappe.db.exists("Workspace", "VMS Overview"):
        frappe.db.set_value("Workspace", "VMS Overview", "route", "/app/vms-overview")
        frappe.db.set_value("Workspace", "VMS Overview", "public", 1)
