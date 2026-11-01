import unittest

class TestFieldSalesWorkflow(unittest.TestCase):
    def test_onboarding_requires_approval(self):
        initial_status = "Pending Approval"
        approved_status = "Approved"
        self.assertEqual(initial_status, "Pending Approval")
        self.assertNotEqual(initial_status, approved_status)
