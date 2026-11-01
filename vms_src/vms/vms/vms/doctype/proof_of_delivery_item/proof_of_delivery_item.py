import frappe
from frappe.model.document import Document
from frappe import _

class ProofofDeliveryItem(Document):
    def validate(self):
        self.validate_quantities()

    def validate_quantities(self):
        for field in ["delivered_qty", "damaged_qty", "short_qty", "rejected_qty"]:
            val = getattr(self, field, 0) or 0
            if val < 0:
                frappe.throw(_("Quantity field {0} cannot be negative for item {1}.").format(field, self.item_code))
