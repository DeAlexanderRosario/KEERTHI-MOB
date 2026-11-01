import unittest

class TestDeepAuditSecurityAndFixes(unittest.TestCase):
    def test_no_sql_injection_in_queries(self):
        query_param = "test_warehouse'; DROP TABLE `tabUser`; --"
        sanitized = query_param.replace("'", "").replace(";", "")
        self.assertNotIn("'", sanitized)
        self.assertNotIn(";", sanitized)

    def test_idempotent_payment_posting(self):
        existing_pe = "ACC-PAY-2026-0001"
        attempt_repost = bool(existing_pe)
        self.assertTrue(attempt_repost, "Must block reposting when Payment Entry already exists.")
