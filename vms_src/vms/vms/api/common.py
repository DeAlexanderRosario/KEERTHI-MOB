import math

import frappe
from frappe import _


def parse_coordinates(latitude, longitude):
    """Validate an optional GPS coordinate pair and return numeric values."""
    if latitude in (None, "") and longitude in (None, ""):
        return None
    if latitude in (None, "") or longitude in (None, ""):
        frappe.throw(_("Both latitude and longitude are required when GPS is provided."))
    try:
        latitude, longitude = float(latitude), float(longitude)
    except (TypeError, ValueError):
        frappe.throw(_("Latitude and longitude must be valid numbers."))
    if not math.isfinite(latitude) or not math.isfinite(longitude):
        frappe.throw(_("Latitude and longitude must be finite numbers."))
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        frappe.throw(_("Latitude or longitude is outside its valid range."))
    return latitude, longitude

def validate_role_access(allowed_roles, action_desc="perform this action"):
    """Enforces role-based access control for API invocations."""
    user = frappe.session.user
    if user == "Administrator":
        return True
    user_roles = frappe.get_roles(user)
    if not any(r in user_roles for r in allowed_roles):
        frappe.throw(
            _("Access Denied: You do not have the required permissions ({0}) to {1}.").format(", ".join(allowed_roles), action_desc),
            frappe.PermissionError
        )
    return True


def get_current_user_customer_scope():
    """Return assigned customer names, or None for an explicitly broad role."""
    user = frappe.session.user
    roles = set(frappe.get_roles(user))
    if user == "Administrator" or roles.intersection({
        "Sales Manager", "Accounts User", "Accounts Manager", "System Manager"
    }):
        return None
    if "Field Sales Agent" not in roles:
        return []

    permissions = frappe.get_all(
        "User Permission",
        filters={"user": user, "allow": ["in", ["Customer", "Territory"]]},
        fields=["allow", "for_value", "hide_descendants"],
        limit=2000,
    )
    customer_names = {p.for_value for p in permissions if p.allow == "Customer" and p.for_value}
    territory_names = set(get_current_user_territory_scope() or [])
    for permission in permissions:
        if permission.allow != "Territory" or not permission.for_value:
            continue
        if permission.hide_descendants:
            territory_names.add(permission.for_value)
    if territory_names:
        customer_names.update(frappe.get_all(
            "Customer",
            filters={"disabled": 0, "territory": ["in", list(territory_names)]},
            pluck="name",
            limit=10000,
        ))
    return sorted(customer_names)


def get_current_user_territory_scope():
    user = frappe.session.user
    roles = set(frappe.get_roles(user))
    if user == "Administrator" or roles.intersection({"Sales Manager", "System Manager"}):
        return None
    if "Field Sales Agent" not in roles:
        return []

    permissions = frappe.get_all(
        "User Permission",
        filters={"user": user, "allow": "Territory"},
        fields=["for_value", "hide_descendants"],
        limit=1000,
    )
    territory_names = set()
    for permission in permissions:
        if not permission.for_value:
            continue
        if permission.hide_descendants:
            territory_names.add(permission.for_value)
            continue
        bounds = frappe.db.get_value("Territory", permission.for_value, ["lft", "rgt"], as_dict=True)
        if bounds:
            territory_names.update(frappe.get_all(
                "Territory",
                filters={"lft": [">=", bounds.lft], "rgt": ["<=", bounds.rgt]},
                pluck="name",
                limit=5000,
            ))
    return sorted(territory_names)


def has_customer_scope(customer):
    scope = get_current_user_customer_scope()
    return scope is None or customer in scope


def assert_customer_scope(customer):
    if not has_customer_scope(customer):
        frappe.throw(_("You are not assigned to customer {0}.").format(customer), frappe.PermissionError)


def assert_territory_scope(territory):
    scope = get_current_user_territory_scope()
    if scope is not None and territory not in scope:
        frappe.throw(_("You are not assigned to territory {0}.").format(territory), frappe.PermissionError)

@frappe.whitelist()
def get_bootstrap():
    """Initializes app metadata, user identity, permissions and system settings."""
    user = frappe.session.user
    roles = frappe.get_roles(user)
    
    return {
        "user": user,
        "roles": roles,
        "company": frappe.db.get_single_value("Global Defaults", "default_company") or "Keerthi Groups Hardware",
        "system_date": frappe.utils.today(),
        "is_driver": "Driver" in roles,
        "is_sales_agent": "Field Sales Agent" in roles,
        "is_accounts": any(r in roles for r in ["Accounts User", "Accounts Manager"]),
        "is_dispatcher": any(r in roles for r in ["Dispatcher", "Fleet Manager"])
    }

@frappe.whitelist()
def get_permissions():
    """Returns dynamic feature permission mapping for current session."""
    user = frappe.session.user
    roles = frappe.get_roles(user)
    return {
        "can_dispatch": any(r in roles for r in ["Dispatcher", "Fleet Manager", "System Manager"]),
        "can_verify_payments": any(r in roles for r in ["Accounts User", "Accounts Manager", "System Manager"]),
        "can_collect_payments": any(r in roles for r in ["Field Sales Agent", "Sales Manager", "System Manager"]) and "Driver" not in roles,
        "can_submit_pod": any(r in roles for r in ["Driver", "System Manager"]),
        "can_verify_loading": any(r in roles for r in ["Warehouse User", "Warehouse Manager", "System Manager"])
    }

@frappe.whitelist()
def get_dashboard_summary():
    """Provides fast overview metrics across all 7 operational divisions."""
    validate_role_access([
        "VMS Executive", "Fleet Manager", "Dispatcher", "Warehouse Manager",
        "Accounts User", "Accounts Manager", "Sales Manager", "System Manager",
    ], "view VMS dashboard metrics")
    return {
        "active_trips": frappe.db.count("Delivery Trip", {"status": "In Transit"}),
        "pending_collections": frappe.db.count("Payment Collection", {"status": "Submitted"}),
        "pending_loading": frappe.db.count("Vehicle Allocation", {"status": "Awaiting Loading"})
    }

@frappe.whitelist()
def get_user_profile():
    user = frappe.session.user
    return {
        "user": user,
        "full_name": frappe.utils.get_fullname(user),
        "roles": frappe.get_roles(user)
    }
