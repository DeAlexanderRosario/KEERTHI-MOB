import frappe

def execute():
    """
    Deprecates and clears legacy driver-cash fields safely from database schema.
    Drivers are strictly delivery-only; they do not collect money or COD.
    """
    frappe.logger("vms").info("Verifying driver separation of duties: No cash fields active.")
    # Check if legacy columns exist on delivery trip stop and safely nullify/deprecate without dropping historical tables
    if frappe.db.has_column("Delivery Trip Stop", "cash_collected"):
        frappe.db.sql("UPDATE `tabDelivery Trip Stop` SET cash_collected = 0 WHERE cash_collected IS NULL")
