import frappe

def has_vms_permission():
    """Checks if current user has permission to access VMS desk workspace."""
    user = frappe.session.user
    if user == "Administrator":
        return True
    user_roles = frappe.get_roles(user)
    vms_roles = [
        "Fleet Manager", "Dispatcher", "Driver", "Field Sales Agent",
        "Warehouse User", "Warehouse Manager", "Accounts User", "Accounts Manager",
        "Sales Manager", "VMS Executive", "System Manager"
    ]
    return any(role in user_roles for role in vms_roles)

def validate_role(allowed_roles):
    """Enforce that the logged-in user possesses one of the allowed roles."""
    user = frappe.session.user
    if user == "Administrator":
        return
    user_roles = frappe.get_roles(user)
    if not any(r in user_roles for r in allowed_roles):
        frappe.throw(
            frappe._("Not permitted: Action requires one of the following roles: {0}").format(", ".join(allowed_roles)),
            frappe.PermissionError
        )
