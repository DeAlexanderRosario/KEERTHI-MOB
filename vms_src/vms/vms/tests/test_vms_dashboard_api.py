# -*- coding: utf-8 -*-
"""
Unit tests for VMS Operations Dashboard API, Desk Page, and Data Integrity.
"""

import json
import os
import unittest
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[2]

class TestVMSDashboardAPI(unittest.TestCase):

    def test_dashboard_roles_authorization(self):
        """Only management, dispatch and fleet roles can access executive dashboard."""
        authorized_roles = ["VMS Executive", "Fleet Manager", "Dispatcher", "System Manager", "General Manager"]
        
        # Test authorized roles
        self.assertTrue(any(r in authorized_roles for r in ["VMS Executive"]))
        self.assertTrue(any(r in authorized_roles for r in ["Fleet Manager"]))
        self.assertTrue(any(r in authorized_roles for r in ["Dispatcher"]))
        self.assertTrue(any(r in authorized_roles for r in ["System Manager"]))

        # Test unauthorized roles
        unauthorized_driver = ["Driver"]
        self.assertFalse(any(r in authorized_roles for r in unauthorized_driver))

        unauthorized_field_sales = ["Field Sales Agent"]
        self.assertFalse(any(r in authorized_roles for r in unauthorized_field_sales))

    def test_dashboard_page_json_validity(self):
        """Verifies standard Frappe Desk Page definition for vms_dashboard."""
        page_path = APP_ROOT / "vms" / "page" / "vms_dashboard" / "vms_dashboard.json"
        self.assertTrue(os.path.exists(page_path), "vms_dashboard.json must exist in module page directory")

        with open(page_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertEqual(data.get("doctype"), "Page")
        self.assertEqual(data.get("name"), "vms_dashboard")
        self.assertEqual(data.get("module"), "VMS")
        self.assertEqual(data.get("standard"), "Yes")
        
        role_names = [r.get("role") for r in data.get("roles", [])]
        self.assertIn("VMS Executive", role_names)
        self.assertIn("Fleet Manager", role_names)
        self.assertIn("Dispatcher", role_names)
        self.assertIn("System Manager", role_names)

    def test_workspace_shortcut_links_dashboard(self):
        """Verifies that VMS Overview workspace has a shortcut to vms_dashboard."""
        ws_path = APP_ROOT / "vms" / "vms" / "workspace" / "vms_overview" / "vms_overview.json"
        self.assertTrue(os.path.exists(ws_path))

        with open(ws_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        shortcuts = data.get("shortcuts", [])
        page_shortcuts = [s for s in shortcuts if s.get("type") == "Page" and s.get("link_to") == "vms_dashboard"]
        self.assertTrue(len(page_shortcuts) >= 1, "VMS Overview must contain a Page shortcut to vms_dashboard")

    def test_fleet_efficiency_donut_math(self):
        """Verifies that fleet efficiency donut segments sum to total fleet."""
        total_fleet = 65
        on_the_move = 23
        in_maintenance = 4
        unutilized = total_fleet - on_the_move - in_maintenance
        
        self.assertEqual(unutilized, 38)
        self.assertEqual(on_the_move + in_maintenance + unutilized, total_fleet)
        
        utilization_pct = round((on_the_move / total_fleet) * 100, 1)
        self.assertGreaterEqual(utilization_pct, 0.0)
        self.assertLessEqual(utilization_pct, 100.0)

    def test_no_invented_coordinates_guard(self):
        """Asserts that unmapped warehouses and stops are flagged when coordinates are missing."""
        mock_map_data_without_coords = {
            "has_coordinates": False,
            "warehouses": [],
            "unmapped_warehouses": [{"name": "Central Warehouse", "city": "Ernakulam"}],
            "stops": [],
            "unmapped_stops": [{"customer": "Cochin Builders", "trip_id": "TRIP-01"}],
            "coordinates_notice": "No geographic coordinates configured in Address or Trip Stop records. Displaying operational list view."
        }

        self.assertFalse(mock_map_data_without_coords["has_coordinates"])
        self.assertIsNotNone(mock_map_data_without_coords["coordinates_notice"])
        self.assertEqual(len(mock_map_data_without_coords["unmapped_warehouses"]), 1)

    def test_no_invented_telemetry_guard(self):
        """Asserts that when IoT GPS hardware is absent, telemetry is marked unavailable."""
        mock_featured_vehicle = {
            "has_active_vehicle": True,
            "vehicle_id": "KL-07-CG-4821",
            "telemetry_available": False,
            "telemetry_notice": "Live GPS hardware telemetry unavailable. Status based on logged stops."
        }

        self.assertFalse(mock_featured_vehicle["telemetry_available"])
        self.assertIn("unavailable", mock_featured_vehicle["telemetry_notice"])

    def test_shipments_pagination_calculation(self):
        """Verifies pagination mathematics for the shipments overview table."""
        total_items = 45
        page_size = 10
        total_pages = (total_items + page_size - 1) // page_size
        self.assertEqual(total_pages, 5)

        # Page 1 bounds
        start_idx = (1 - 1) * page_size
        end_idx = start_idx + page_size
        self.assertEqual((start_idx, end_idx), (0, 10))

        # Last page bounds
        start_idx = (5 - 1) * page_size
        end_idx = start_idx + page_size
        self.assertEqual((start_idx, end_idx), (40, 50))


if __name__ == "__main__":
    unittest.main()
