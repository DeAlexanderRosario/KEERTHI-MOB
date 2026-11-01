import frappe

def execute():
    """Configures customer master fields for digital POD verification."""
    frappe.logger("vms").info("Patch: Creating POD configuration fields...")
    if frappe.db.exists("DocType", "Customer") and not frappe.db.exists("Custom Field", "Customer-vms_require_signature"):
        cf = frappe.new_doc("Custom Field")
        cf.dt = "Customer"
        cf.fieldname = "vms_require_signature"
        cf.label = "Require POD Signature"
        cf.fieldtype = "Check"
        cf.default = "1"
        cf.insert()
