import frappe
from frappe import _
from vms.api.common import assert_territory_scope, validate_role_access


def _validate_not_driver():
    roles = set(frappe.get_roles(frappe.session.user))
    if "Driver" in roles and "System Manager" not in roles:
        frappe.throw(_("Drivers cannot access customer onboarding or credit review actions."), frappe.PermissionError)

@frappe.whitelist()
def submit_onboarding_request(
    customer_name, territory, mobile_no, gst_in=None, address=None,
    proposed_credit_limit=0, documents_json=None, owner_name=None, email=None
):
    """
    Field Sales Agent submits new customer onboarding proposal.
    Creates Customer Onboarding Request with mandatory audit metadata.
    """
    validate_role_access(["Field Sales Agent", "Sales Manager", "System Manager"], "submit onboarding request")
    _validate_not_driver()
    assert_territory_scope(territory)
    
    req = frappe.new_doc("Customer Onboarding Request")
    req.shop_name = customer_name
    req.owner_name = owner_name or customer_name
    req.territory = territory
    req.mobile_no = mobile_no
    req.tax_id = gst_in
    req.email = email
    req.primary_address = address
    req.proposed_credit_limit = float(proposed_credit_limit or 0)
    req.sales_agent = frappe.session.user
    req.submission_date = frappe.utils.today()
    req.status = "Pending Approval"
    
    req.insert()
    req.submit()
    return {"status": "success", "request_name": req.name, "customer_name": customer_name}

@frappe.whitelist()
def review_onboarding_request(request_name, action, rejection_reason=None, adjusted_credit_limit=None):
    """
    Authorized officer reviews onboarding proposal: approve, reject, or request_changes.
    On approval, creates authoritative standard ERPNext Customer document.
    """
    validate_role_access(["Sales Manager", "Accounts User", "Accounts Manager", "System Manager"], "review onboarding request")
    _validate_not_driver()
    
    req = frappe.get_doc("Customer Onboarding Request", request_name)
    if req.docstatus != 1:
        frappe.throw(_("Only submitted onboarding requests can be reviewed."))
    if req.status not in ("Pending Approval", "Changes Requested"):
        frappe.throw(_("This onboarding request has already been reviewed."))
    if action == "approve":
        if adjusted_credit_limit is not None:
            try:
                adjusted_credit_limit = float(adjusted_credit_limit)
            except (TypeError, ValueError):
                frappe.throw(_("Credit limit must be a number."))
            if adjusted_credit_limit < 0:
                frappe.throw(_("Credit limit cannot be negative."))
            frappe.db.set_value(req.doctype, req.name, "proposed_credit_limit", adjusted_credit_limit, update_modified=False)
            req.proposed_credit_limit = adjusted_credit_limit
        frappe.db.set_value(req.doctype, req.name, "status", "Approved")
        req.status = "Approved"
        customer_name = req.approve_and_create_customer()
        return {"status": "success", "action": "approved", "customer": customer_name}
    elif action == "reject":
        if not rejection_reason:
            frappe.throw(_("Rejection reason is required."))
        frappe.db.set_value(req.doctype, req.name, {"status": "Rejected", "rejection_reason": rejection_reason})
        req.status = "Rejected"
        req.rejection_reason = rejection_reason
        req.add_comment("Comment", text=f"Onboarding rejected: {rejection_reason}")
        return {"status": "success", "action": "rejected", "request": req.name}
    elif action == "request_changes":
        reason = rejection_reason or "Additional documentation needed."
        frappe.db.set_value(req.doctype, req.name, {"status": "Changes Requested", "rejection_reason": reason})
        req.status = "Changes Requested"
        req.add_comment("Comment", text=f"Changes requested: {rejection_reason or 'Additional documentation needed.'}")
        return {"status": "success", "action": "changes_requested", "request": req.name}
    else:
        frappe.throw(_("Invalid review action: {0}").format(action))

# Backward compatibility aliases
@frappe.whitelist()
def approve_onboarding_request(request_name):
    return review_onboarding_request(request_name, "approve")

@frappe.whitelist()
def reject_onboarding_request(request_name, reason):
    return review_onboarding_request(request_name, "reject", rejection_reason=reason)
