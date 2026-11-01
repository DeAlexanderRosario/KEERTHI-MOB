import frappe

@frappe.whitelist()
def get_agent_profile():
    user = frappe.session.user
    roles = frappe.get_roles(user)
    return {
        "user": user,
        "is_field_sales": "Field Sales Agent" in roles,
        "is_driver": "Driver" in roles
    }
