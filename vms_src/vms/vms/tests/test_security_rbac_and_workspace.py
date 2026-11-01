#!/usr/bin/env python3
"""
Test suite verifying Workspace count, metadata and Desk navigation
"""
import unittest

class TestSecurityRBACAndWorkspace(unittest.TestCase):
    def test_workspace_count(self):
        import os, json
        ws_dir = os.path.join(os.path.dirname(__file__), "..", "vms", "workspace")
        workspaces = [
            d for d in os.listdir(ws_dir)
            if os.path.isfile(os.path.join(ws_dir, d, f"{d}.json"))
        ]
        self.assertEqual(len(workspaces), 7)

    def test_all_workspaces_are_standard_and_public(self):
        import os, json
        ws_dir = os.path.join(os.path.dirname(__file__), "..", "vms", "workspace")
        expected_workspaces = [
            "vms_overview", "field_sales", "accounts_and_collections",
            "warehouse_operations", "fleet_and_dispatch",
            "delivery_operations", "vms_reports_and_analytics"
        ]
        for ws_slug in expected_workspaces:
            json_file = os.path.join(ws_dir, ws_slug, f"{ws_slug}.json")
            self.assertTrue(os.path.exists(json_file), f"Missing workspace JSON: {json_file}")
            with open(json_file, "r") as f:
                data = json.load(f)
            self.assertEqual(data.get("public"), 1, f"{ws_slug} must be public")
            self.assertEqual(data.get("is_standard"), 1, f"{ws_slug} must be standard")
            self.assertEqual(data.get("module"), "VMS", f"{ws_slug} must belong to module VMS")
            self.assertTrue(len(data.get("roles", [])) > 0, f"{ws_slug} must have RBAC roles configured")

if __name__ == "__main__":
    unittest.main()
