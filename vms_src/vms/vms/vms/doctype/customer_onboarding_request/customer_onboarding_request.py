import frappe
from frappe.model.document import Document
from frappe import _

class CustomerOnboardingRequest(Document):
    def approve_and_create_customer(self):
        """Create the ERPNext Customer once, after an authorized approval."""
        if self.docstatus != 1:
            frappe.throw(_("Only a submitted onboarding request can be approved."))
        if self.created_customer:
            return self.created_customer
        if self.status != "Approved":
            frappe.throw(_("Set the request status to Approved before creating the customer."))

        customer = frappe.new_doc("Customer")
        customer.customer_name = self.shop_name
        customer.customer_type = "Company"
        customer.customer_group = frappe.db.get_single_value("Selling Settings", "customer_group") or "Commercial"
        customer.territory = self.territory or "All Territories"
        customer.tax_id = self.tax_id
        customer.mobile_no = self.mobile_no
        customer.email_id = self.email
        customer.insert()

        credit_limit = float(self.proposed_credit_limit or 0)
        if credit_limit < 0:
            frappe.throw(_("Proposed credit limit cannot be negative."))
        if credit_limit:
            company = frappe.defaults.get_user_default("Company")
            if not company:
                frappe.throw(_("Set a default Company before approving a credit limit."))
            customer.append("credit_limits", {"company": company, "credit_limit": credit_limit})
            customer.save()

        frappe.db.set_value(self.doctype, self.name, "created_customer", customer.name, update_modified=False)
        self.created_customer = customer.name
        return customer.name
