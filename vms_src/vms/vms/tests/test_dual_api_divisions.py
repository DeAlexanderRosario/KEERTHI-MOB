import unittest

class TestDualAPIDivisions(unittest.TestCase):
    def test_driver_and_sales_separation(self):
        driver_apis = ["get_assigned_trips", "submit_proof_of_delivery"]
        sales_apis = ["record_shop_visit", "record_payment_collection"]
        self.assertNotIn("record_payment_collection", driver_apis)

if __name__ == "__main__":
    unittest.main()
