import frappe
from frappe import _
from vms.api.common import validate_role_access

@frappe.whitelist()
def get_vehicle_availability(date=None):
    """Returns fleet vehicles categorized by availability on specified date."""
    validate_role_access(["Fleet Manager", "Dispatcher", "System Manager"], "view fleet availability")
    target_date = date or frappe.utils.today()
    
    vehicles = frappe.get_list("Vehicle", fields=["name", "make", "model", "license_plate", "status"], limit_page_length=500)
    busy_vehicles = frappe.get_list(
        "Vehicle Allocation",
        filters={"delivery_date": target_date, "docstatus": 1, "status": ["in", ["In Progress", "Loading Verified", "Discrepancy Reported", "Ready for Dispatch", "Dispatched"]]},
        pluck="vehicle"
    )
    
    result = []
    for v in vehicles:
        is_available = (v.name not in busy_vehicles) and (v.status not in ["In Maintenance", "Out of Order"])
        result.append({
            "vehicle": v.name,
            "license_plate": v.license_plate or v.name,
            "make": v.make,
            "model": v.model,
            "is_available": is_available,
            "reason": "Allocated on target date" if v.name in busy_vehicles else v.status
        })
    return result

@frappe.whitelist()
def get_driver_availability(date=None):
    """Returns drivers categorized by availability on specified date."""
    validate_role_access(["Fleet Manager", "Dispatcher", "System Manager"], "view driver availability")
    target_date = date or frappe.utils.today()
    
    drivers = frappe.get_list("Driver", fields=["name", "full_name", "status", "cell_number"], limit_page_length=500)
    busy_drivers = frappe.get_list(
        "Vehicle Allocation",
        filters={"delivery_date": target_date, "docstatus": 1, "status": ["in", ["In Progress", "Loading Verified", "Discrepancy Reported", "Ready for Dispatch", "Dispatched"]]},
        pluck="driver"
    )
    
    result = []
    for d in drivers:
        is_available = (d.name not in busy_drivers) and (d.status not in ["Suspended", "On Leave"])
        result.append({
            "driver": d.name,
            "full_name": d.full_name or d.name,
            "cell_number": d.cell_number,
            "is_available": is_available,
            "reason": "Assigned on target date" if d.name in busy_drivers else d.status
        })
    return result

@frappe.whitelist()
def save_vehicle(vehicle_data):
    """Creates or updates a Vehicle master document."""
    validate_role_access(["Fleet Manager", "System Manager"], "manage vehicles")
    import json
    data = json.loads(vehicle_data) if isinstance(vehicle_data, str) else vehicle_data
    
    name = data.get("name")
    if name and frappe.db.exists("Vehicle", name):
        doc = frappe.get_doc("Vehicle", name)
    else:
        doc = frappe.new_doc("Vehicle")
        doc.license_plate = data.get("license_plate")
        
    for k, v in data.items():
        if hasattr(doc, k) and k not in ["name", "doctype"]:
            setattr(doc, k, v)
    doc.save()
    return {"status": "success", "vehicle": doc.name}

@frappe.whitelist()
def save_driver_profile(driver_data):
    """Creates or updates a Driver profile."""
    validate_role_access(["Fleet Manager", "System Manager"], "manage drivers")
    import json
    data = json.loads(driver_data) if isinstance(driver_data, str) else driver_data
    
    name = data.get("name")
    if name and frappe.db.exists("Driver", name):
        doc = frappe.get_doc("Driver", name)
    else:
        doc = frappe.new_doc("Driver")
        doc.full_name = data.get("full_name")
        
    for k, v in data.items():
        if hasattr(doc, k) and k not in ["name", "doctype"]:
            setattr(doc, k, v)
    doc.save()
    return {"status": "success", "driver": doc.name}

@frappe.whitelist()
def get_fleet_overview():
    """Returns overview statistics of vehicles and drivers."""
    validate_role_access(["Fleet Manager", "Dispatcher", "VMS Executive", "System Manager"], "view fleet overview")
    total_vehicles = frappe.db.count("Vehicle")
    total_drivers = frappe.db.count("Driver")
    active_trips = frappe.db.count("Delivery Trip", {"status": "In Transit"})
    
    return {
        "total_vehicles": total_vehicles,
        "total_drivers": total_drivers,
        "active_trips": active_trips,
        "timestamp": frappe.utils.now_datetime()
    }
