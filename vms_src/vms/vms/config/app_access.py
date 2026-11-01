import frappe

def has_vms_app_access():
    user = frappe.session.user
    if user == "Administrator":
        return True
    roles = frappe.get_roles(user)
    vms_roles = [
        "Fleet Manager", "Dispatcher", "Driver", "Field Sales Agent",
        "Warehouse User", "Warehouse Manager", "Accounts User", "Accounts Manager",
        "Sales Manager", "VMS Executive", "System Manager"
    ]
    return any(r in roles for r in vms_roles)
