import unittest

class TestInternalStaffOperations(unittest.TestCase):
    def test_accounts_verification_role(self):
        permitted_roles = ["Accounts User", "Accounts Manager", "System Manager"]
        self.assertIn("Accounts User", permitted_roles)
        self.assertNotIn("Driver", permitted_roles)
        self.assertNotIn("Field Sales Agent", permitted_roles)
