import frappe
from frappe.model.document import Document
from frappe import _

class ShopVisitItem(Document):
    def validate(self):
        if not self.item_code:
            frappe.throw(_("Item Code is required in visit item demand."))
        if self.stock_level_at_shop is not None and self.stock_level_at_shop < 0:
            frappe.throw(_("Stock level at shop cannot be negative."))
