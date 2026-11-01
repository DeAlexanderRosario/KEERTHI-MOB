import frappe
from frappe.model.document import Document
from frappe import _

class PaymentDiscrepancy(Document):
    def validate(self):
        reported = float(self.reported_amount or 0)
        verified = float(self.verified_amount or 0)
        self.discrepancy_amount = verified - reported
        if not self.reason and self.discrepancy_amount != 0:
            frappe.throw(_("A valid explanation is required for payment discrepancy amount of {0}").format(self.discrepancy_amount))
