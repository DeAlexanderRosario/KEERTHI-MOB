import frappe
from frappe import _
from vms.api.common import assert_customer_scope, validate_role_access

@frappe.whitelist()
def create_payment_collection(customer, amount, mode_of_payment, transaction_reference=None, allocations_json=None):
    """
    Field Sales Agent records payment collection from customer.
    SECURITY BOUNDARY: Drivers are strictly forbidden from collecting money.
    """
    user_roles = frappe.get_roles(frappe.session.user)
    if "Driver" in user_roles and "System Manager" not in user_roles:
        frappe.throw(_("Security Violation: Drivers are prohibited from collecting payments."), frappe.PermissionError)
        
    validate_role_access(["Field Sales Agent", "Sales Manager", "System Manager"], "record payment collection")
    assert_customer_scope(customer)
    if not frappe.has_permission("Customer", "read", customer):
        frappe.throw(_("You do not have access to this customer."), frappe.PermissionError)
    
    col = frappe.new_doc("Payment Collection")
    col.sales_agent = frappe.session.user
    col.customer = customer
    col.amount = float(amount)
    col.mode_of_payment = mode_of_payment
    col.transaction_reference = transaction_reference
    col.collection_date = frappe.utils.today()
    col.status = "Draft"
    
    if allocations_json:
        import json
        allocs = json.loads(allocations_json) if isinstance(allocations_json, str) else allocations_json
        for a in allocs:
            col.append("allocations", {
                "sales_invoice": a.get("sales_invoice"),
                "allocated_amount": float(a.get("allocated_amount", 0))
            })
            
    col.insert()
    col.submit()
    
    return {"status": "success", "collection_name": col.name, "amount": col.amount}

@frappe.whitelist()
def get_my_collections():
    """Returns collections submitted by authenticated Sales Agent."""
    roles = set(frappe.get_roles(frappe.session.user))
    if "Driver" in roles and "System Manager" not in roles:
        frappe.throw(_("Drivers cannot access collection records."), frappe.PermissionError)
    validate_role_access(["Field Sales Agent", "Sales Manager", "System Manager"], "view collections")
    return frappe.get_all(
        "Payment Collection",
        filters={"sales_agent": frappe.session.user},
        fields=["name", "customer", "customer_name", "amount", "collection_date", "status", "payment_entry_reference"],
        order_by="collection_date desc"
    )

# Backward compatibility alias
get_agent_collections = get_my_collections

@frappe.whitelist()
def create_collection_followup(customer, due_date, expected_amount, notes=None):
    """Logs a follow-up task for pending payment."""
    roles = set(frappe.get_roles(frappe.session.user))
    if "Driver" in roles and "System Manager" not in roles:
        frappe.throw(_("Drivers are not permitted to create collection follow-ups."), frappe.PermissionError)
    validate_role_access(["Field Sales Agent", "Sales Manager", "Accounts User", "System Manager"], "create collection follow-up")
    assert_customer_scope(customer)
    if not frappe.has_permission("Customer", "read", customer):
        frappe.throw(_("You do not have access to this customer."), frappe.PermissionError)
    cfu = frappe.new_doc("Collection Follow Up")
    cfu.customer = customer
    cfu.sales_agent = frappe.session.user
    cfu.due_date = due_date
    cfu.expected_amount = float(expected_amount)
    cfu.follow_up_notes = notes
    cfu.status = "Open"
    cfu.insert()
    return {"status": "success", "followup": cfu.name}

def process_collection_followups():
    """Scheduled task: scans overdue followups and generates notifications."""
    frappe.logger("vms").info("Processing overdue collection followups...")
    return True
