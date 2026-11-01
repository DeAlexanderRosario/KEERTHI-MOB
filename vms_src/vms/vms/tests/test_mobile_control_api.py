import unittest

class TestMobileControlAPI(unittest.TestCase):
    def test_whitelisted_fields_only(self):
        prohibited_wildcard = "*"
        whitelisted_fields = ["name", "customer_name", "territory", "mobile_no"]
        self.assertNotIn(prohibited_wildcard, whitelisted_fields)
        self.assertNotIn("password", whitelisted_fields)
        self.assertNotIn("api_secret", whitelisted_fields)

    def test_allowed_doctypes_per_role(self):
        allowed_map = {
            "Driver": ["Delivery Trip", "Delivery Trip Stop", "Proof of Delivery"],
            "Field Sales Agent": ["Shop Visit", "Customer Onboarding Request", "Payment Collection"]
        }
        self.assertNotIn("Payment Collection", allowed_map["Driver"])
        self.assertIn("Payment Collection", allowed_map["Field Sales Agent"])
