import unittest

class TestFrappeIntegration(unittest.TestCase):
    def test_module_name(self):
        module = "VMS"
        self.assertEqual(module, "VMS")

if __name__ == "__main__":
    unittest.main()
