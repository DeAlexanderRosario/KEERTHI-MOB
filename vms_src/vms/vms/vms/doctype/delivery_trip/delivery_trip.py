import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import now_datetime

class DeliveryTrip(Document):
    def validate(self):
        self.validate_driver_vehicle_assignment()
        self.validate_stops()
        
    def validate_driver_vehicle_assignment(self):
        if not self.vehicle or not self.driver:
            frappe.throw(_("Vehicle and Driver are mandatory."))
            
    def validate_stops(self):
        if not self.stops:
            frappe.throw(_("At least one Delivery Trip Stop is required."))
        # Sort stops by sequence
        self.stops.sort(key=lambda s: s.stop_sequence or 0)
        
    def on_submit(self):
        if self.status == "Draft":
            self.status = "Dispatched"
        self.update_vehicle_allocation_status("Dispatched")
        
    def on_cancel(self):
        self.status = "Cancelled"
        self.update_vehicle_allocation_status("Cancelled")
        
    def update_vehicle_allocation_status(self, new_status):
        if self.vehicle_allocation:
            frappe.db.set_value("Vehicle Allocation", self.vehicle_allocation, "status", new_status)
            
    def check_completion(self):
        all_completed = all(s.status in ["Delivered", "Failed", "Partially Delivered"] for s in self.stops)
        if all_completed and self.status != "Completed":
            self.status = "Completed"
            self.actual_completion = now_datetime()
            self.save()

def on_delivery_note_submit(doc, method):
    """Syncs submitted Delivery Note status with linked Delivery Trip."""
    if doc.get("vms_delivery_trip"):
        trip = frappe.get_doc("Delivery Trip", doc.vms_delivery_trip)
        trip.add_comment("Comment", text=f"Authoritative Delivery Note {doc.name} submitted.")
        trip.check_completion()
