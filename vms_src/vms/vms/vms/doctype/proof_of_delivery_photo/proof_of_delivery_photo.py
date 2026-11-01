import frappe
from frappe.model.document import Document
from frappe import _

class ProofofDeliveryPhoto(Document):
    def validate(self):
        allowed = ["Delivery Evidence", "Gate Check", "Damaged Item", "Customer Premises"]
        if self.category and self.category not in allowed:
            frappe.throw(_("Invalid photo category {0}. Allowed categories: {1}").format(self.category, ", ".join(allowed)))
