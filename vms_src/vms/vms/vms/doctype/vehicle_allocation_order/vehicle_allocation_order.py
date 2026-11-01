import frappe
from frappe.model.document import Document
from frappe import _

class VehicleAllocationOrder(Document):
    def validate(self):
        if not self.sales_order:
            frappe.throw(_("Sales Order is required for allocation line."))
        if not self.allocated_qty or self.allocated_qty <= 0:
            frappe.throw(_("Allocated quantity must be greater than zero."))
