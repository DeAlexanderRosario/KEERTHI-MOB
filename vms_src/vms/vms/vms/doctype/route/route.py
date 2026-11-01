import frappe
from frappe.model.document import Document
from frappe import _

class Route(Document):
    def validate(self):
        if not self.route_name:
            frappe.throw(_("Route Name is required."))
        if self.estimated_distance_km is not None and self.estimated_distance_km < 0:
            frappe.throw(_("Estimated distance cannot be negative."))
        if self.estimated_duration_hours is not None and self.estimated_duration_hours < 0:
            frappe.throw(_("Estimated duration cannot be negative."))
