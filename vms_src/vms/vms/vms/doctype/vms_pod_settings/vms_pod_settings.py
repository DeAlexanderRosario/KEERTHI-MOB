import frappe
from frappe.model.document import Document
from frappe import _

class VMSPODSettings(Document):
    def validate(self):
        if self.geofence_radius_meters and (self.geofence_radius_meters < 10 or self.geofence_radius_meters > 10000):
            frappe.throw(_("Geofence radius must be between 10 and 10,000 meters."))
        if self.max_upload_size_mb and (self.max_upload_size_mb < 1 or self.max_upload_size_mb > 100):
            frappe.throw(_("Max upload size must be between 1 and 100 MB."))
