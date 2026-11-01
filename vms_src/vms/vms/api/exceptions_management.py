import frappe
from frappe import _
from vms.api.common import validate_role_access

@frappe.whitelist()
def log_delivery_exception(trip_name, stop_name, reason, remarks=None):
    validate_role_access(["Driver", "Dispatcher", "Fleet Manager", "System Manager"], "record delivery exception")
    if not reason or not reason.strip():
        frappe.throw(_("A failure reason is required."))
    trip = frappe.get_doc("Delivery Trip", trip_name)
    roles = set(frappe.get_roles(frappe.session.user))
    if "Driver" in roles and not roles.intersection({"Dispatcher", "Fleet Manager", "System Manager"}):
        from vms.api.driver_portal import get_authenticated_driver

        if trip.driver != get_authenticated_driver():
            frappe.throw(_("You are not assigned to this delivery trip."), frappe.PermissionError)
    if trip.docstatus != 1 or trip.status not in ("Dispatched", "In Transit"):
        frappe.throw(_("An exception may be recorded only for an active trip."))
    for s in trip.stops:
        if s.name == stop_name:
            if s.status not in ("Pending", "Arrived"):
                frappe.throw(_("This trip stop is already complete or unavailable."))
            s.status = "Failed"
            s.failure_reason = reason
            trip.save()
            trip.add_comment("Comment", text=f"Delivery exception for {s.customer}: {reason}. {remarks or ''}")
            return {"status": "success", "message": _("Exception recorded for stop {0}").format(stop_name)}
    frappe.throw(_("Stop not found in trip"))
