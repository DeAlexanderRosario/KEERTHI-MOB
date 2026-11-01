import frappe
from frappe.model.document import Document
from frappe import _

class CollectionFollowUp(Document):
    def validate(self):
        if not self.customer:
            frappe.throw(_("Customer is required for collection follow-up."))
        if not self.due_date:
            frappe.throw(_("Expected payment due date is mandatory."))
        if not self.expected_amount or self.expected_amount <= 0:
            frappe.throw(_("Expected amount must be positive."))
