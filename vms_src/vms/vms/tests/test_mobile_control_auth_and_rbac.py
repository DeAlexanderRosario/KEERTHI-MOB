import unittest

class TestMobileControlAuthAndRBAC(unittest.TestCase):
    def test_unauthorized_role_rejection(self):
        roles = ["Guest"]
        allowed = ["Driver", "Field Sales Agent"]
        has_access = any(r in allowed for r in roles)
        self.assertFalse(has_access)

if __name__ == "__main__":
    unittest.main()
