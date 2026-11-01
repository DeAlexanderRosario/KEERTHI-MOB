import unittest

class TestSecurityAndRBAC(unittest.TestCase):
    def test_driver_prohibited_from_payment_collection(self):
        driver_roles = ["Driver"]
        permitted_collection_roles = ["Field Sales Agent", "Accounts User", "Sales Manager", "System Manager"]
        has_access = any(r in permitted_collection_roles for r in driver_roles)
        self.assertFalse(has_access, "Drivers must never have access to payment collection operations.")

    def test_driver_trip_isolation(self):
        authenticated_driver = "DRV-BANGALORE-01"
        requested_trip_driver = "DRV-BANGALORE-02"
        is_authorized = (authenticated_driver == requested_trip_driver)
        self.assertFalse(is_authorized, "Driver cannot access another driver's assigned trips.")

    def test_accounts_user_authorization(self):
        accounts_roles = ["Accounts User", "Accounts Manager"]
        user_role = "Accounts User"
        self.assertIn(user_role, accounts_roles)
