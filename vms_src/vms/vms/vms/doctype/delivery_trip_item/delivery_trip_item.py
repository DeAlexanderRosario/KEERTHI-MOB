import frappe
from frappe.model.document import Document
from frappe import _

class DeliveryTripItem(Document):
    def validate(self):
        self.validate_item_quantities()

    def validate_item_quantities(self):
        if not self.item_code:
            frappe.throw(_("Item Code is mandatory for Delivery Trip Item."))
        if not self.allocated_qty or self.allocated_qty <= 0:
            frappe.throw(_("Allocated quantity for item {0} must be greater than zero.").format(self.item_code))
        if not self.warehouse:
            frappe.throw(_("Source warehouse is required for item {0}.").format(self.item_code))
