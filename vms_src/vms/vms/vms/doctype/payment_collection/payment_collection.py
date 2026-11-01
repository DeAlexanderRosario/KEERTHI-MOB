import math

import frappe
from frappe.model.document import Document
from frappe import _
from vms.api.common import assert_customer_scope

class PaymentCollection(Document):
    def validate(self):
        self.enforce_separation_of_duties()
        self.validate_amount_and_customer()
        self.validate_allocations()

    def validate_amount_and_customer(self):
        amount = float(self.amount or 0)
        if not math.isfinite(amount) or amount <= 0:
            frappe.throw(_("Collection amount must be greater than zero."))

        if self.docstatus == 1 and self.get_doc_before_save():
            previous = self.get_doc_before_save()
            if previous.status != self.status:
                allowed_transitions = {
                    "Submitted": {"Verified", "Rejected"},
                    "Verified": {"Payment Entry Created"},
                }
                roles = set(frappe.get_roles(frappe.session.user))
                if self.status not in allowed_transitions.get(previous.status, set()):
                    frappe.throw(_("Invalid Payment Collection status transition: {0} to {1}.").format(previous.status, self.status))
                if not roles.intersection({"Accounts User", "Accounts Manager", "System Manager"}):
                    frappe.throw(_("Only Accounts personnel may verify or reject a collection."), frappe.PermissionError)
                if self.status == "Payment Entry Created" and not self.payment_entry_reference:
                    frappe.throw(_("A linked ERPNext Payment Entry is required for this status."))
                if self.status == "Verified":
                    if self.verified_by != frappe.session.user or not self.verification_timestamp:
                        frappe.throw(_("Record the verifying Accounts user and timestamp when verifying a collection."))
                if self.status == "Rejected" and len((self.rejection_reason or "").strip()) < 5:
                    frappe.throw(_("A rejection reason of at least 5 characters is required."))
                if self.status == "Payment Entry Created":
                    payment_entry = frappe.db.get_value(
                        "Payment Entry",
                        self.payment_entry_reference,
                        ["docstatus", "party_type", "party"],
                        as_dict=True,
                    )
                    if not payment_entry or payment_entry.docstatus != 1 or payment_entry.party_type != "Customer" or payment_entry.party != self.customer:
                        frappe.throw(_("The linked Payment Entry must be submitted for this collection customer."))
        
    def enforce_separation_of_duties(self):
        """
        Rules:
        1. Drivers are NOT allowed to collect or submit payments.
        2. Sales Agent cannot mark collection as 'Verified' or create Payment Entry.
        """
        user_roles = frappe.get_roles(frappe.session.user)
        if "Driver" in user_roles and "System Manager" not in user_roles:
            frappe.throw(_("Security Violation: Drivers are strictly prohibited from recording payment collections."), frappe.PermissionError)

        if "Field Sales Agent" in user_roles and "Sales Manager" not in user_roles and "System Manager" not in user_roles:
            if self.sales_agent and self.sales_agent != frappe.session.user:
                frappe.throw(_("Field Sales Agents may record only their own collections."), frappe.PermissionError)
            if self.customer:
                assert_customer_scope(self.customer)
                if not frappe.has_permission("Customer", "read", self.customer):
                    frappe.throw(_("You do not have access to this customer."), frappe.PermissionError)
            
        if self.status in ["Verified", "Payment Entry Created"]:
            if "Accounts User" not in user_roles and "Accounts Manager" not in user_roles and "System Manager" not in user_roles:
                frappe.throw(_("Only Accounts personnel can verify payments or generate Payment Entries."), frappe.PermissionError)
                
    def validate_allocations(self):
        total_allocated = 0.0
        company = frappe.db.get_single_value("Global Defaults", "default_company")
        previous = self.get_doc_before_save() if self.docstatus == 1 else None
        payment_just_posted = bool(
            previous
            and previous.status == "Verified"
            and self.status == "Payment Entry Created"
            and self.payment_entry_reference
        )
        for allocation in self.allocations:
            amount = float(allocation.allocated_amount or 0)
            if not math.isfinite(amount) or amount <= 0:
                frappe.throw(_("Invoice allocation amounts must be greater than zero."))
            invoice = frappe.db.get_value(
                "Sales Invoice",
                allocation.sales_invoice,
                ["customer", "company", "docstatus", "outstanding_amount"],
                as_dict=True,
            )
            if not invoice or invoice.docstatus != 1:
                frappe.throw(_("Only submitted Sales Invoices may be allocated."))
            if invoice.customer != self.customer:
                frappe.throw(_("Invoice {0} belongs to another customer.").format(allocation.sales_invoice))
            if company and invoice.company != company:
                frappe.throw(_("Invoice {0} belongs to a different company.").format(allocation.sales_invoice))
            if not payment_just_posted and amount > float(invoice.outstanding_amount or 0):
                frappe.throw(_("Allocation exceeds the current outstanding amount for invoice {0}.").format(allocation.sales_invoice))
            total_allocated += amount
        if total_allocated > self.amount:
            frappe.throw(_("Total allocated to invoices ({0}) cannot exceed collected amount ({1}).").format(total_allocated, self.amount))
            
    def on_submit(self):
        if self.status == "Draft":
            self.status = "Submitted"
            frappe.db.set_value(self.doctype, self.name, "status", self.status)
