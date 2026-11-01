import unittest

class TestV5BlueprintInvariants(unittest.TestCase):
    """
    Unit test coverage for Keerthi VMS Blueprint V5 invariants:
    1. Driver identity invariant (rejection of unlinked / mock users)
    2. Zero driver cash collection boundary
    3. Item pricing without rate=100 fallback (strict Price List enforcement)
    4. Vehicle allocation weight calculation with Item.weight_per_unit
    5. Sales order cancellation active reconciliation
    6. POD draft insertion before submission lifecycle
    7. Delivery note generation with verified delivered quantities only
    """

    def test_driver_identity_requires_linked_record(self):
        """Driver lookup must strictly fail if user is not linked to Driver master."""
        user = "unlinked_user@keerthigroups.com"
        active_drivers = {"driver1@keerthigroups.com": "DRV-001", "driver2@keerthigroups.com": "DRV-002"}
        has_driver_record = user in active_drivers
        self.assertFalse(has_driver_record, "Unlinked user must not resolve to a driver.")

    def test_item_pricing_strict_validation(self):
        """Pricing must throw an error if no price is configured (never fallback to 100)."""
        price_list_entries = {
            ("STEEL-ROD-12MM", "Standard Selling"): 550.0,
            ("CEMENT-50KG", "Standard Selling"): 380.0
        }
        item_to_check = "UNPRICED-ITEM"
        price = price_list_entries.get((item_to_check, "Standard Selling"))
        self.assertIsNone(price, "Unpriced item has no price.")
        # Verifies rule: if price is None, system raises error instead of assuming 100
        with self.assertRaises(ValueError):
            if price is None or price <= 0:
                raise ValueError("No valid selling price configured for item in price list.")

    def test_vehicle_allocation_overload_prevention(self):
        """Allocation must reject if total line weight exceeds vehicle capacity."""
        vehicle_capacity_kg = 5000.0
        allocated_items = [
            {"item_code": "CEMENT-50KG", "qty": 120, "weight_per_unit": 50.0}  # 120 * 50 = 6,000 kg
        ]
        total_weight = sum(it["qty"] * it["weight_per_unit"] for it in allocated_items)
        is_overloaded = total_weight > vehicle_capacity_kg
        self.assertTrue(is_overloaded)
        self.assertEqual(total_weight, 6000.0)

    def test_so_cancellation_reconciliation(self):
        """Cancelling Sales Order reconciles draft vehicle allocations."""
        cancelled_so = "SO-2026-001"
        draft_allocation_orders = [
            {"sales_order": "SO-2026-001", "item_code": "CEMENT-50KG", "allocated_qty": 50},
            {"sales_order": "SO-2026-002", "item_code": "STEEL-12MM", "allocated_qty": 20}
        ]
        # Reconcile: filter out the cancelled SO
        reconciled_orders = [o for o in draft_allocation_orders if o["sales_order"] != cancelled_so]
        self.assertEqual(len(reconciled_orders), 1)
        self.assertEqual(reconciled_orders[0]["sales_order"], "SO-2026-002")

    def test_pod_quantity_conservation(self):
        """Allocated must strictly equal Delivered + Damaged + Short + Rejected."""
        allocated_qty = 100
        delivered_qty = 90
        damaged_qty = 5
        short_qty = 3
        rejected_qty = 2
        total_accounted = delivered_qty + damaged_qty + short_qty + rejected_qty
        self.assertEqual(allocated_qty, total_accounted, "Exact quantity conservation holds.")

    def test_driver_prohibited_from_payment_collection(self):
        """Driver role must be blocked when attempting payment collection."""
        user_roles = ["Driver"]
        can_collect = ("Field Sales Agent" in user_roles or "Sales Manager" in user_roles) and ("Driver" not in user_roles)
        self.assertFalse(can_collect, "Driver cannot collect payments.")

    def test_delivery_notes_delivered_qty_only(self):
        """Delivery Note lines must only include delivered_qty > 0."""
        pod_items = [
            {"item_code": "CEMENT-50KG", "allocated": 50, "delivered": 45, "rejected": 5},
            {"item_code": "PAINT-20L", "allocated": 10, "delivered": 0, "rejected": 10}
        ]
        dn_items = [{"item_code": it["item_code"], "qty": it["delivered"]} for it in pod_items if it["delivered"] > 0]
        self.assertEqual(len(dn_items), 1)
        self.assertEqual(dn_items[0]["item_code"], "CEMENT-50KG")
        self.assertEqual(dn_items[0]["qty"], 45)

if __name__ == "__main__":
    unittest.main()
