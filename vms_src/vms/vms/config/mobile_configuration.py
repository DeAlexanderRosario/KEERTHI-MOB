import frappe

def get_mobile_sync_config():
    return {
        "sync_interval_seconds": 300,
        "max_batch_size": 50,
        "supported_roles": ["Field Sales Agent", "Driver"],
        "geofence_verification": True
    }
