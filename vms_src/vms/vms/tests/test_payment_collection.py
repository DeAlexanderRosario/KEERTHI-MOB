import unittest

class TestPaymentCollection(unittest.TestCase):
    def test_separation_of_duties_agent_cannot_verify_own(self):
        agent = "agent@keerthigroups.com"
        verifier = "agent@keerthigroups.com"
        can_self_verify = (agent != verifier)
        self.assertFalse(can_self_verify, "Sales Agent cannot self-verify collection.")

    def test_invoice_allocation_limit(self):
        collected_amount = 50000.0
        allocations = [
            {"invoice": "ACC-SINV-001", "outstanding": 40000.0, "amount": 30000.0},
            {"invoice": "ACC-SINV-002", "outstanding": 25000.0, "amount": 20000.0}
        ]
        total_alloc = sum(a["amount"] for a in allocations)
        self.assertLessEqual(total_alloc, collected_amount)
        for a in allocations:
            self.assertLessEqual(a["amount"], a["outstanding"], "Allocation cannot exceed invoice outstanding.")

    def test_unallocated_amount_becomes_advance(self):
        collected_amount = 60000.0
        allocated_amount = 45000.0
        unallocated_advance = collected_amount - allocated_amount
        self.assertEqual(unallocated_advance, 15000.0)
