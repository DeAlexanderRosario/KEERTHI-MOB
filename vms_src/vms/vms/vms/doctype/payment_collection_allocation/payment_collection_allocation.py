import frappe
from frappe.model.document import Document
from frappe import _

class PaymentCollectionAllocation(Document):
    def validate(self):
        if not self.sales_invoice:
            frappe.throw(_("Sales Invoice reference is required for payment allocation."))
        if not self.allocated_amount or self.allocated_amount <= 0:
            frappe.throw(_("Allocated amount to invoice {0} must be positive.").format(self.sales_invoice))
