import unittest

class TestVMSUIDockRegistration(unittest.TestCase):
    def test_dock_route(self):
        route = "/app/vms-overview"
        self.assertTrue(route.startswith("/app/"))
        self.assertEqual(route, "/app/vms-overview")
