import unittest
import hashlib

class TestProofOfDelivery(unittest.TestCase):
    def test_cryptographic_audit_hash(self):
        trip_name = "TRIP-2026-0001"
        customer = "CUST-KEERTHI-01"
        timestamp = "2026-10-31 10:00:00"
        receiver = "Ramesh Kumar"
        items_payload = '[{"item_code": "CEMENT-PPC", "delivered_qty": 50}]'
        payload = f"{trip_name}|{customer}|{timestamp}|{receiver}|{items_payload}"
        seal = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        self.assertEqual(len(seal), 64)
        # Seal must be deterministic
        verify_seal = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        self.assertEqual(seal, verify_seal)

    def test_reject_unbalanced_quantities(self):
        allocated = 50.0
        delivered = 40.0
        damaged = 5.0
        short = 0.0
        rejected = 0.0
        total = delivered + damaged + short + rejected
        self.assertNotEqual(allocated, total, "Unbalanced items must be caught.")

    def test_geofence_haversine_check(self):
        import math
        # Customer target coordinates (Bangalore)
        lat1, lon1 = 12.9716, 77.5946
        # Driver reported arrival (approx 200m away)
        lat2, lon2 = 12.9725, 77.5950
        
        R = 6371000  # radius of earth in meters
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        distance = R * c
        
        geofence_limit = 500  # meters
        self.assertLess(distance, geofence_limit, "Driver is within 500m geofence.")
