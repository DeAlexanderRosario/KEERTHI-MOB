import frappe
from frappe import _

ALLOWED_DOCTYPES = {
    "Field Sales Agent": ["Shop Visit", "Customer Onboarding Request", "Payment Collection", "Customer", "Item"],
    "Driver": ["Delivery Trip", "Delivery Trip Stop", "Proof of Delivery"]
}

WHITELISTED_FIELDS = {
    "Customer": ["name", "customer_name", "territory", "customer_group", "mobile_no"],
    "Item": ["name", "item_code", "item_name", "item_group", "stock_uom", "standard_rate"],
    "Delivery Trip": ["name", "vehicle", "driver", "route", "status", "departure_time"],
    "Delivery Trip Stop": ["name", "stop_sequence", "customer", "customer_name", "address", "contact_phone", "status"],
    "Proof of Delivery": ["name", "delivery_trip", "customer", "status", "audit_hash"]
}

@frappe.whitelist()
def sync_mobile_data(doctype, filters=None):
    """
    Hardened read endpoint for mobile sync.
    Strictly forbids fields=['*'] and enforces role-based DocType whitelisting.
    """
    user_roles = frappe.get_roles(frappe.session.user)
    if frappe.session.user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)
    
    # Check permission
    is_allowed = False
    for r, docs in ALLOWED_DOCTYPES.items():
        if r in user_roles and doctype in docs:
            is_allowed = True
            break
            
    if not is_allowed and frappe.session.user != "Administrator":
        frappe.throw(_("Forbidden: User lacks role permission to sync {0}").format(doctype), frappe.PermissionError)

    # A combined Driver + Field Sales role must not gain access to sales or
    # finance data through the broader role's allowlist.
    if "Driver" in user_roles and "System Manager" not in user_roles:
        driver_doctypes = {"Delivery Trip", "Delivery Trip Stop", "Proof of Delivery"}
        if doctype not in driver_doctypes:
            frappe.throw(_("Driver accounts cannot sync sales or finance records."), frappe.PermissionError)
        
    allowed_fields = WHITELISTED_FIELDS.get(doctype, ["name"])
    
    # Driver boundary: enforce assignment filter
    parsed_filters = frappe.parse_json(filters) if filters else {}
    if "Driver" in user_roles and "System Manager" not in user_roles:
        from vms.api.driver_portal import get_authenticated_driver, has_driver_supervisor_access

        if not has_driver_supervisor_access():
            driver = get_authenticated_driver()
            trip_names = frappe.get_list(
                "Delivery Trip", filters={"driver": driver, "docstatus": 1}, fields=["name"], limit_page_length=1000
            )
            assigned_trips = [row.name for row in trip_names]
            if doctype == "Delivery Trip":
                parsed_filters["driver"] = driver
            elif doctype == "Delivery Trip Stop":
                if not assigned_trips:
                    return {"doctype": doctype, "count": 0, "data": []}
                parsed_filters["parent"] = ["in", assigned_trips]
            elif doctype == "Proof of Delivery":
                if not assigned_trips:
                    return {"doctype": doctype, "count": 0, "data": []}
                parsed_filters["delivery_trip"] = ["in", assigned_trips]

    elif "Field Sales Agent" in user_roles and "System Manager" not in user_roles:
        if doctype in {"Shop Visit", "Payment Collection"}:
            parsed_filters["sales_agent"] = frappe.session.user
        elif doctype == "Customer Onboarding Request":
            parsed_filters["owner"] = frappe.session.user
        
    records = frappe.get_list(doctype, filters=parsed_filters, fields=allowed_fields, limit_page_length=50)
    return {"doctype": doctype, "count": len(records), "data": records}
