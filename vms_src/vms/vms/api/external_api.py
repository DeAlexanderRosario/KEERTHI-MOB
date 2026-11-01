import frappe

@frappe.whitelist(allow_guest=False)
def get_system_health():
    return {
        "status": "healthy",
        "app": "Keerthi VMS",
        "version": "16.0.0",
        "framework": "Frappe v16"
    }
