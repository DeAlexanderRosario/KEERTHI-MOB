import frappe


def execute():
    """Add stable links used to make VMS Delivery Note generation traceable and idempotent."""
    fields = [
        {
            "fieldname": "vms_pod_reference",
            "label": "VMS Proof of Delivery",
            "fieldtype": "Link",
            "options": "Proof of Delivery",
            "read_only": 1,
            "insert_after": "vms_delivery_trip",
        },
        {
            "fieldname": "vms_sales_order",
            "label": "VMS Sales Order",
            "fieldtype": "Link",
            "options": "Sales Order",
            "read_only": 1,
            "insert_after": "vms_pod_reference",
        },
    ]
    for field in fields:
        custom_field_name = f"Delivery Note-{field['fieldname']}"
        if frappe.db.exists("Custom Field", custom_field_name):
            continue
        custom_field = frappe.new_doc("Custom Field")
        custom_field.dt = "Delivery Note"
        custom_field.update(field)
        custom_field.flags.ignore_permissions = True
        custom_field.insert(ignore_permissions=True)

    vehicle_capacity_field = {
        "fieldname": "custom_max_weight_capacity_kg",
        "label": "Maximum Payload Capacity (kg)",
        "fieldtype": "Float",
        "default": 0,
        "insert_after": "license_plate",
    }
    vehicle_capacity_name = f"Vehicle-{vehicle_capacity_field['fieldname']}"
    if not frappe.db.exists("Custom Field", vehicle_capacity_name):
        custom_field = frappe.new_doc("Custom Field")
        custom_field.dt = "Vehicle"
        custom_field.update(vehicle_capacity_field)
        custom_field.flags.ignore_permissions = True
        custom_field.insert(ignore_permissions=True)
