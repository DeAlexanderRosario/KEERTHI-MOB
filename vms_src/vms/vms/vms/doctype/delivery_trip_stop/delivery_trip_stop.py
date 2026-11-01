import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import now_datetime

class DeliveryTripStop(Document):
    def validate(self):
        self.validate_stop_details()

    def validate_stop_details(self):
        if not self.customer:
            frappe.throw(_("Customer is mandatory for Delivery Trip Stop."))
        if self.stop_sequence is None or self.stop_sequence < 1:
            frappe.throw(_("Stop sequence must be a positive integer."))

    def mark_arrived(self, lat=None, lng=None):
        self.status = "Arrived"
        self.arrival_time = now_datetime()
        if lat and lng:
            self.arrival_lat = float(lat)
            self.arrival_lng = float(lng)
        self.save()
        return self.status

    def mark_delivered(self, pod_name):
        self.status = "Delivered"
        self.pod_reference = pod_name
        self.save()
        return self.status
