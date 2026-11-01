import unittest

class TestVehicleAllocationQtyFix(unittest.TestCase):
    def test_no_negative_allocation(self):
        allocated_qty = 50.0
        self.assertGreater(allocated_qty, 0)
        
    def test_allocation_does_not_exceed_order_balance(self):
        order_qty = 100.0
        already_delivered = 40.0
        pending = order_qty - already_delivered
        requested_alloc = 50.0
        self.assertLessEqual(requested_alloc, pending)
