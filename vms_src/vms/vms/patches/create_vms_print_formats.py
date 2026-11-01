import frappe

def execute():
    """Ensures standard print formats are registered in tabPrint Format."""
    frappe.logger("vms").info("Patch: Synchronizing VMS Print Formats...")
    formats = [
        {"name": "Signed Proof of Delivery", "doc_type": "Proof of Delivery"},
        {"name": "Trip Sheet", "doc_type": "Delivery Trip"},
        {"name": "Customer Delivery Report", "doc_type": "Proof of Delivery"},
        {"name": "Consolidated Delivery History", "doc_type": "Delivery Trip"}
    ]
    for fmt in formats:
        if not frappe.db.exists("Print Format", fmt["name"]):
            pf = frappe.new_doc("Print Format")
            pf.name = fmt["name"]
            pf.doc_type = fmt["doc_type"]
            pf.module = "VMS"
            pf.standard = "Yes"
            pf.print_format_type = "Jinja"
            pf.insert(ignore_permissions=True)
