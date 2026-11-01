"""Run focused VMS API/workflow tests without unrelated app fixture generation."""

import unittest


def run():
    """Run the Driver, Field Sales, Warehouse, Dispatch, Accounts and API surface checks."""
    from frappe.tests.utils import FrappeTestCase
    from vms.tests import test_api_flows, test_api_surface

    loader = unittest.defaultTestLoader
    suite = unittest.TestSuite()
    for module in (test_api_flows, test_api_surface):
        for value in vars(module).values():
            if isinstance(value, type) and issubclass(value, FrappeTestCase) and value is not FrappeTestCase:
                suite.addTests(loader.loadTestsFromTestCase(value))

    result = unittest.TextTestRunner(verbosity=2).run(suite)
    summary = {
        "status": "passed" if result.wasSuccessful() else "failed",
        "tests_run": result.testsRun,
        "failures": len(result.failures),
        "errors": len(result.errors),
    }
    if not result.wasSuccessful():
        raise AssertionError(f"VMS API workflow test run failed: {summary}")
    return summary
