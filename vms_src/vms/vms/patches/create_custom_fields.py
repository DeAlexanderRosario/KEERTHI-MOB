import frappe

def execute():
    """Creates custom fields on Sales Order and Delivery Note for VMS integration."""
    frappe.logger("vms").info("Patch: Creating VMS custom fields on core ERPNext documents...")
    custom_fields = {
        "Sales Order": [
            {
                "fieldname": "vms_allocation_status",
                "label": "VMS Allocation Status",
                "fieldtype": "Select",
                "options": "Not Allocated\nPartially Allocated\nFully Allocated",
                "default": "Not Allocated",
                "read_only": 1,
                "insert_after": "status"
            }
        ],
        "Delivery Note": [
            {
                "fieldname": "vms_delivery_trip",
                "label": "VMS Delivery Trip",
                "fieldtype": "Link",
                "options": "Delivery Trip",
                "read_only": 1,
                "insert_after": "title"
            }
        ]
    }
    for dt, fields in custom_fields.items():
        if frappe.db.exists("DocType", dt):
            for f in fields:
                if not frappe.db.exists("Custom Field", f"{dt}-{f['fieldname']}"):
                    cf = frappe.new_doc("Custom Field")
                    cf.dt = dt
                    cf.update(f)
                    cf.flags.ignore_permissions = True
                    cf.insert()
