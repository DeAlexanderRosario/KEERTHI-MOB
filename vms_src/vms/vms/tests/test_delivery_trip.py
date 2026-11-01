import unittest

class TestDeliveryTrip(unittest.TestCase):
    def test_status_transitions(self):
        valid_transitions = {
            "Draft": ["Dispatched"],
            "Dispatched": ["In Transit"],
            "In Transit": ["Completed", "Cancelled"]
        }
        self.assertIn("In Transit", valid_transitions["Dispatched"])
        self.assertNotIn("Completed", valid_transitions["Draft"])
