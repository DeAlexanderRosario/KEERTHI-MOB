import frappe
from frappe import _
from vms.api.permissions import validate_role
from vms.api.common import assert_customer_scope


def _validate_accounts_access(allowed_roles):
    roles = set(frappe.get_roles(frappe.session.user))
    if "Driver" in roles and "System Manager" not in roles:
        frappe.throw(_("Drivers are not permitted to access Accounts actions."), frappe.PermissionError)
    validate_role(allowed_roles)

@frappe.whitelist()
def get_pending_collections(company=None):
    """Accounts view of submitted payment collections awaiting verification."""
    _validate_accounts_access(["Accounts User", "Accounts Manager", "System Manager"])
    default_company = frappe.db.get_single_value("Global Defaults", "default_company")
    if company and default_company and company != default_company:
        frappe.throw(_("You cannot view collections for another company."), frappe.PermissionError)
    filters = {"docstatus": 1, "status": "Submitted"}
        
    return frappe.get_all(
        "Payment Collection",
        filters=filters,
        fields=[
            "name", "customer", "customer_name", "sales_agent", "amount",
            "mode_of_payment", "transaction_reference", "collection_date", "bank_name"
        ],
        order_by="collection_date asc"
    )

@frappe.whitelist()
def verify_collection(collection_name, notes=None):
    """
    Accounts officer verifies physical/bank evidence.
    Advances status to 'Verified'.
    Enforces segregation of duties: Agent cannot verify own collection.
    """
    _validate_accounts_access(["Accounts User", "Accounts Manager", "System Manager"])
    col = frappe.get_doc("Payment Collection", collection_name)
    
    # Segregation check
    if col.sales_agent == frappe.session.user and frappe.session.user != "Administrator":
        frappe.throw(_("Fraud prevention: Sales Agent cannot verify their own payment collection."), frappe.PermissionError)
        
    if col.status != "Submitted":
        frappe.throw(_("Only collections in 'Submitted' state can be verified. Current status: {0}").format(col.status))
        
    col.status = "Verified"
    col.verified_by = frappe.session.user
    col.verification_timestamp = frappe.utils.now_datetime()
    col.verification_notes = notes
    col.save()
    
    col.add_comment("Comment", text=f"Verified by Accounts User {frappe.session.user}. Notes: {notes or 'Evidence verified.'}")
    return {"status": "success", "collection": col.name, "state": col.status}

# Backward compatibility alias
verify_payment_collection = verify_collection

@frappe.whitelist()
def get_open_invoices(customer):
    """Returns unpaid submitted Sales Invoices for customer with outstanding balances."""
    _validate_accounts_access(["Accounts User", "Accounts Manager", "Field Sales Agent", "System Manager"])
    if not frappe.has_permission("Customer", "read", customer):
        frappe.throw(_("You do not have access to this customer."), frappe.PermissionError)
    assert_customer_scope(customer)
    return frappe.get_list(
        "Sales Invoice",
        filters={"customer": customer, "docstatus": 1, "outstanding_amount": [">", 0]},
        fields=["name", "posting_date", "due_date", "grand_total", "outstanding_amount"],
        order_by="due_date asc",
        limit_page_length=500,
    )

@frappe.whitelist()
def preview_collection_allocation(collection_name):
    """Simulates how a collection amount will apply to open invoices."""
    _validate_accounts_access(["Accounts User", "Accounts Manager", "System Manager"])
    col = frappe.get_doc("Payment Collection", collection_name)
    invoices = get_open_invoices(col.customer)
    
    remaining = float(col.amount)
    allocations = []
    
    for inv in invoices:
        if remaining <= 0:
            break
        alloc_amt = min(remaining, float(inv.outstanding_amount))
        allocations.append({
            "sales_invoice": inv.name,
            "grand_total": inv.grand_total,
            "outstanding_amount": inv.outstanding_amount,
            "allocated_amount": alloc_amt
        })
        remaining -= alloc_amt
        
    return {
        "collection": col.name,
        "customer": col.customer,
        "collection_amount": float(col.amount),
        "suggested_allocations": allocations,
        "unallocated_advance": max(0.0, remaining)
    }

@frappe.whitelist()
def create_payment_entry(collection_name):
    """
    Creates and posts an authoritative standard ERPNext Payment Entry from a Verified collection.
    Features:
    - Company validation
    - Mode of payment account resolution
    - Outstanding invoice validation
    - Multi-invoice allocation and partial payments
    - Advances booking if unallocated
    - Idempotency & Duplicate prevention
    - Transaction safety
    """
    _validate_accounts_access(["Accounts User", "Accounts Manager", "System Manager"])
    # Serialize concurrent posting attempts for the same collection. The row
    # lock is held until the request transaction commits or rolls back.
    frappe.db.sql(
        "SELECT name FROM `tabPayment Collection` WHERE name = %s FOR UPDATE",
        collection_name,
    )
    col = frappe.get_doc("Payment Collection", collection_name)
    
    if col.status != "Verified":
        frappe.throw(_("Payment Collection {0} must be 'Verified' by Accounts before creating Payment Entry.").format(collection_name))
        
    if col.payment_entry_reference:
        frappe.throw(_("Payment Entry {0} has already been posted for this collection (Idempotency Check).").format(col.payment_entry_reference))

    company = frappe.db.get_single_value("Global Defaults", "default_company") or "Keerthi Groups Hardware"
    
    # Resolve paid_to account from Mode of Payment
    paid_to_account = None
    if col.mode_of_payment:
        paid_to_account = frappe.db.get_value(
            "Mode of Payment Account",
            {"parent": col.mode_of_payment, "company": company},
            "default_account"
        )
    if not paid_to_account:
        paid_to_account = frappe.db.get_value("Company", company, "default_cash_account") or "Cash - KGH"
        
    paid_from_account = frappe.db.get_value("Company", company, "default_receivable_account") or "Debtors - KGH"

    # Check for duplicate transaction reference
    if col.transaction_reference:
        duplicate = frappe.db.get_value(
            "Payment Entry",
            {"reference_no": col.transaction_reference, "docstatus": 1},
            "name"
        )
        if duplicate:
            frappe.throw(_("Duplicate payment transaction: Reference number {0} already posted in Payment Entry {1}").format(col.transaction_reference, duplicate))

    pe = frappe.new_doc("Payment Entry")
    pe.payment_type = "Receive"
    pe.party_type = "Customer"
    pe.party = col.customer
    pe.company = company
    pe.posting_date = col.collection_date
    pe.paid_amount = float(col.amount)
    pe.received_amount = float(col.amount)
    pe.mode_of_payment = col.mode_of_payment
    pe.paid_from = paid_from_account
    pe.paid_to = paid_to_account
    pe.reference_no = col.transaction_reference or col.name
    pe.reference_date = col.collection_date
    pe.remarks = f"Autogenerated from Keerthi VMS Payment Collection {col.name}. Collected by Agent: {col.sales_agent}. Verified by: {col.verified_by}."

    total_allocated = 0.0
    for alloc in col.allocations:
        if alloc.allocated_amount and alloc.allocated_amount > 0 and alloc.sales_invoice:
            inv_outstanding = frappe.db.get_value("Sales Invoice", alloc.sales_invoice, "outstanding_amount") or 0.0
            if float(alloc.allocated_amount) > float(inv_outstanding):
                frappe.throw(_("Allocated amount {0} exceeds current outstanding balance {1} for invoice {2}").format(alloc.allocated_amount, inv_outstanding, alloc.sales_invoice))
                
            pe.append("references", {
                "reference_doctype": "Sales Invoice",
                "reference_name": alloc.sales_invoice,
                "total_amount": frappe.db.get_value("Sales Invoice", alloc.sales_invoice, "grand_total") or 0.0,
                "outstanding_amount": inv_outstanding,
                "allocated_amount": float(alloc.allocated_amount)
            })
            total_allocated += float(alloc.allocated_amount)

    unallocated_advance = float(col.amount) - total_allocated
    pe.unallocated_amount = unallocated_advance if unallocated_advance > 0 else 0.0

    pe.insert(ignore_permissions=False)
    pe.submit()

    col.payment_entry_reference = pe.name
    col.status = "Payment Entry Created"
    col.save()
    
    col.add_comment("Comment", text=f"Authoritative ERPNext Payment Entry {pe.name} posted successfully.")
    return {
        "status": "success",
        "payment_entry": pe.name,
        "unallocated_advance": pe.unallocated_amount,
        "message": _("Standard ERPNext Payment Entry {0} created and reconciled.").format(pe.name)
    }

# Backward compatibility alias
create_erpnext_payment_entry = create_payment_entry

@frappe.whitelist()
def get_customer_ledger_summary(customer):
    """Returns summarized customer receivable position directly from ERPNext GL."""
    _validate_accounts_access(["Accounts User", "Accounts Manager", "System Manager"])
    if not frappe.has_permission("Customer", "read", customer):
        frappe.throw(_("You do not have access to this customer."), frappe.PermissionError)
    company = frappe.db.get_single_value("Global Defaults", "default_company") or "Keerthi Groups Hardware"
    
    res = frappe.db.sql("""
        SELECT 
            ifnull(sum(debit), 0) - ifnull(sum(credit), 0) as balance,
            ifnull(sum(debit), 0) as total_invoiced,
            ifnull(sum(credit), 0) as total_paid
        FROM `tabGL Entry`
        WHERE party_type = 'Customer' AND party = %s AND company = %s
    """, (customer, company), as_dict=True)[0]
    
    return {
        "customer": customer,
        "company": company,
        "current_balance": res.balance,
        "total_invoiced": res.total_invoiced,
        "total_paid": res.total_paid
    }

@frappe.whitelist()
def reject_payment_collection(collection_name, reason):
    """Rejects invalid collection record with mandatory audit explanation."""
    _validate_accounts_access(["Accounts User", "Accounts Manager", "System Manager"])
    if not reason:
        frappe.throw(_("A rejection reason must be provided."))
    col = frappe.get_doc("Payment Collection", collection_name)
    if col.status != "Submitted":
        frappe.throw(_("Only submitted collections can be rejected."))
    col.status = "Rejected"
    col.rejection_reason = reason
    col.verified_by = frappe.session.user
    col.save()
    col.add_comment("Comment", text=f"Rejected by {frappe.session.user}. Reason: {reason}")
    return {"status": "success", "collection": col.name, "state": "Rejected"}
