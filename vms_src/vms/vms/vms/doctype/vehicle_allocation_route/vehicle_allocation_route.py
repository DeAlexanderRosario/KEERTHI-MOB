import frappe
from frappe.model.document import Document
from frappe import _

class VehicleAllocationRoute(Document):
    def validate(self):
        if not self.route:
            frappe.throw(_("Route is required in allocation route sequence."))
        if self.estimated_time is not None and self.estimated_time < 0:
            frappe.throw(_("Estimated time cannot be negative."))
