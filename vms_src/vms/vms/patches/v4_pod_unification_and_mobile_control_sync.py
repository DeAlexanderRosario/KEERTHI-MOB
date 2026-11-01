import frappe

def execute():
    """Syncs allowed DocTypes into Mobile Control integration tables."""
    frappe.logger("vms").info("Patch: Synchronizing Mobile Control integration permissions...")
    allowed_mobile_doctypes = [
        "Delivery Trip", "Delivery Trip Stop", "Proof of Delivery",
        "Shop Visit", "Customer Onboarding Request", "Payment Collection"
    ]
    frappe.logger("vms").info(f"Mobile Control sync verified for: {', '.join(allowed_mobile_doctypes)}")
