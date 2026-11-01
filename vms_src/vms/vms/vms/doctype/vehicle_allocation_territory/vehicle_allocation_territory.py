import frappe
from frappe.model.document import Document
from frappe import _

class VehicleAllocationTerritory(Document):
    def validate(self):
        if not self.territory:
            frappe.throw(_("Territory is required in allocation territory list."))
