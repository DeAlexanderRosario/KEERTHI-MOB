app_name = "vms"
app_title = "Keerthi VMS"
app_publisher = "Keerthi Groups Hardware"
app_description = "Native Frappe v16 / ERPNext v16 Vehicle Management System"
app_email = "engineering@keerthigroups.com"
app_license = "Proprietary"
required_apps = ["frappe", "erpnext"]
after_migrate = "vms.install.after_migrate"

# App Included in Desk
app_include_css = "/assets/vms/css/vms.css"
app_include_js = "/assets/vms/js/vms.js"
# Scoped to Nexus Theme's optional split-screen sign-in page; authentication
# templates and Frappe login handlers remain owned by the installed apps.
web_include_css = "/assets/vms/css/keerthi_login.css"

doctype_js = {
    "Proof of Delivery": "vms/doctype/proof_of_delivery/proof_of_delivery.js"
}

add_to_apps_screen = [
    {
        "name": "vms",
        "logo": "/assets/vms/images/vms_logo.svg",
        "title": "Keerthi VMS",
        "route": "/app/vms-overview",
        "has_permission": "vms.api.permissions.has_vms_permission"
    }
]

# DocType Events for Stock & Accounts Integrity
doc_events = {
    "Sales Order": {
        "on_cancel": "vms.vms.doctype.vehicle_allocation.vehicle_allocation.on_sales_order_cancel"
    },
    "Delivery Note": {
        "on_submit": "vms.vms.doctype.delivery_trip.delivery_trip.on_delivery_note_submit"
    }
}

# Standard Fixtures
fixtures = [
    {
        "doctype": "Role",
        "filters": [
            ["role_name", "in", ["Fleet Manager", "Dispatcher", "Driver", "Field Sales Agent", "Warehouse User", "VMS Executive"]]
        ]
    },
    {
        "doctype": "Custom DocPerm",
        "filters": [
            ["parent", "in", ["Delivery Trip", "Proof of Delivery", "Vehicle Allocation", "Payment Collection", "Shop Visit", "Customer Onboarding Request"]]
        ]
    }
]

# Scheduled Tasks for Allocation, Visit Summaries & Route Optimizations
scheduler_events = {
    "hourly": [
        "vms.api.dispatch.check_delayed_trips"
    ],
    "daily": [
        "vms.api.field_sales.generate_daily_visit_summary",
        "vms.api.collections.process_collection_followups"
    ]
}
