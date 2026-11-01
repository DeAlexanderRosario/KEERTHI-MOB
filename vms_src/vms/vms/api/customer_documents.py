import frappe
from frappe import _
from vms.api.common import assert_customer_scope, validate_role_access

@frappe.whitelist()
def get_customer_delivery_dossier(customer):
    roles = set(frappe.get_roles(frappe.session.user))
    validate_role_access([
        "Driver", "Field Sales Agent", "Sales Manager", "Dispatcher", "Fleet Manager",
        "Accounts User", "Accounts Manager", "System Manager",
    ], "view customer delivery evidence")
    pod_filters = {"customer": customer, "docstatus": 1}
    if "Driver" not in roles or roles.intersection({"Dispatcher", "Fleet Manager", "System Manager"}):
        assert_customer_scope(customer)

    if "Driver" in roles and "System Manager" not in roles:
        from vms.api.driver_portal import get_authenticated_driver

        if not roles.intersection({"Dispatcher", "Fleet Manager"}):
            driver = get_authenticated_driver()
            assigned_trips = frappe.get_list(
                "Delivery Trip",
                filters={"driver": driver, "docstatus": 1},
                fields=["name"],
                limit_page_length=500,
            )
            trip_names = [trip.name for trip in assigned_trips]
            if not trip_names or not frappe.get_list(
                "Delivery Trip Stop",
                filters={"parent": ["in", trip_names], "customer": customer},
                fields=["name"],
                limit_page_length=1,
            ):
                frappe.throw(_("You are not assigned to this customer's delivery."), frappe.PermissionError)
            pod_filters["delivery_trip"] = ["in", trip_names]
    elif "System Manager" not in roles and not frappe.has_permission("Customer", "read", doc=customer):
        frappe.throw(_("You do not have access to this customer."), frappe.PermissionError)

    pods = frappe.get_list(
        "Proof of Delivery",
        filters=pod_filters,
        fields=["name", "delivery_trip", "receiver_name", "server_timestamp", "status", "audit_hash"],
        order_by="creation desc",
        limit=20
    )
    return {"customer": customer, "pods": pods}
