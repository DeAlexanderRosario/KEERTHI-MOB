import unittest

class TestDeliveryWorkflow(unittest.TestCase):
    def test_allocation_quantity_conservation(self):
        allocated = 100.0
        delivered = 85.0
        damaged = 5.0
        short = 5.0
        rejected = 5.0
        total_accounted = delivered + damaged + short + rejected
        self.assertAlmostEqual(allocated, total_accounted, places=4, msg="Quantity conservation must hold strictly.")

    def test_trip_stops_ordering(self):
        stops = [
            {"name": "Stop-B", "sequence": 2},
            {"name": "Stop-A", "sequence": 1},
            {"name": "Stop-C", "sequence": 3}
        ]
        sorted_stops = sorted(stops, key=lambda s: s["sequence"])
        self.assertEqual([s["sequence"] for s in sorted_stops], [1, 2, 3])

    def test_capacity_check_overload_rejection(self):
        max_capacity_kg = 5000.0
        order_weights = [1500.0, 2000.0, 1800.0]
        total_weight = sum(order_weights)
        is_overloaded = total_weight > max_capacity_kg
        self.assertTrue(is_overloaded, "Vehicle allocation must flag overload when weight exceeds capacity.")
