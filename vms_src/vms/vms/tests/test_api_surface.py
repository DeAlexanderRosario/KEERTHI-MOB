"""Smoke coverage for the complete VMS whitelisted API surface."""
from importlib import import_module
from pkgutil import iter_modules

from frappe.tests.utils import FrappeTestCase

import vms.api


class TestWhitelistedApiSurface(FrappeTestCase):
    def test_field_sales_has_owner_scoped_sales_order_capture_permission(self):
        permission = __import__("frappe").db.get_value(
            "Custom DocPerm",
            {"parent": "Sales Order", "role": "Field Sales Agent", "permlevel": 0},
            ["if_owner", "read", "write", "create", "submit"],
            as_dict=True,
        )
        self.assertTrue(permission)
        self.assertEqual(permission.if_owner, 1)
        self.assertEqual(permission.read, 1)
        self.assertEqual(permission.write, 1)
        self.assertEqual(permission.create, 1)
        self.assertFalse(permission.submit)

    def test_all_api_modules_import_and_whitelisted_methods_are_private(self):
        modules = [
            import_module(f"{vms.api.__name__}.{entry.name}")
            for entry in iter_modules(vms.api.__path__)
            if not entry.ispkg and not entry.name.startswith("_")
        ]
        endpoints = []
        whitelisted = __import__("frappe").whitelisted
        guest_methods = __import__("frappe").guest_methods
        for module in modules:
            for name, value in vars(module).items():
                if callable(value) and value in whitelisted:
                    endpoints.append(f"{module.__name__}.{name}")
                    self.assertNotIn(
                        value,
                        guest_methods,
                        f"VMS endpoint unexpectedly permits Guest access: {module.__name__}.{name}",
                    )

        self.assertGreaterEqual(len(endpoints), 70, "API inventory unexpectedly shrank; review endpoint removals")
        for endpoint in (
            "vms.api.driver_portal.get_my_trips",
            "vms.api.field_sales.create_sales_order",
            "vms.api.field_sales.get_customer_context",
            "vms.api.warehouse.verify_loading",
            "vms.api.dispatch.approve_dispatch",
            "vms.api.accounts.create_payment_entry",
        ):
            self.assertIn(endpoint, endpoints)
