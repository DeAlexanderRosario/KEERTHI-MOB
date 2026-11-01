import frappe
from frappe.model.document import Document
from frappe import _

class WarehouseDiscrepancy(Document):
    def validate(self):
        allocated = float(self.allocated_qty or 0)
        loaded = float(self.loaded_qty or 0)
        self.discrepancy_qty = loaded - allocated
        if not self.reason and self.discrepancy_qty != 0:
            frappe.throw(_("A valid reason is required for discrepancy of {0} on item {1}").format(self.discrepancy_qty, self.item_code))
        if not self.resolution_status:
            self.resolution_status = "Pending Resolution"

    def resolve(self, resolution_notes, resolved_by):
        self.resolution_status = "Resolved"
        self.add_comment("Comment", text=f"Discrepancy resolved by {resolved_by}: {resolution_notes}")
        self.save()
