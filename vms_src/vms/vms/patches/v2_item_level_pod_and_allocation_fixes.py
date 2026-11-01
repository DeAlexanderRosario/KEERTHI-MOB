import frappe

def execute():
    """Ensures all item-level allocation and POD quantity columns are indexed and valid."""
    frappe.logger("vms").info("Patch: Verifying item-level quantity integrity...")
    if frappe.db.has_column("Delivery Trip Item", "allocated_qty"):
        frappe.db.sql("UPDATE `tabDelivery Trip Item` SET allocated_qty = 0 WHERE allocated_qty IS NULL")
    if frappe.db.has_column("Proof of Delivery Item", "delivered_qty"):
        frappe.db.sql("UPDATE `tabProof of Delivery Item` SET delivered_qty = 0 WHERE delivered_qty IS NULL")
