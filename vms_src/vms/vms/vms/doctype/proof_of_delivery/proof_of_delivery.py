import hashlib
import json
import math

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime
from vms.api.common import parse_coordinates


def _evidence_manifest(value, require_private_file=False):
    """Hash uploaded file bytes where a File record exists; otherwise hash text."""
    if not value:
        return None
    file_record = frappe.db.get_value(
        "File", {"file_url": value}, ["name", "is_private"], as_dict=True
    )
    if require_private_file and (not file_record or not file_record.is_private):
        frappe.throw(_("POD photographs must be uploaded as private Frappe files."))
    if file_record:
        content = frappe.get_doc("File", file_record.name).get_content()
        if isinstance(content, str):
            content = content.encode("utf-8")
        digest = hashlib.sha256(content).hexdigest()
    else:
        digest = hashlib.sha256(str(value).encode("utf-8")).hexdigest()
    return {"reference": value, "content_sha256": digest}


class ProofofDelivery(Document):
    def validate(self):
        self.validate_quantities()
        self.enforce_no_cash_boundary()
        coordinates = parse_coordinates(self.gps_latitude, self.gps_longitude)
        if coordinates:
            self.gps_latitude, self.gps_longitude = coordinates
        self.validate_trip_stop_link()
        if not self.server_timestamp:
            self.server_timestamp = now_datetime()

    def validate_trip_stop_link(self):
        """Bind every POD to a stop on its selected trip and its customer."""
        if not self.delivery_trip or not self.delivery_trip_stop:
            frappe.throw(_("A delivery trip and trip stop are required."))

        # A stop row lock serializes the duplicate-POD check through submission.
        frappe.db.sql(
            "SELECT name FROM `tabDelivery Trip Stop` WHERE name = %s FOR UPDATE",
            (self.delivery_trip_stop,),
        )

        trip = frappe.get_doc("Delivery Trip", self.delivery_trip)
        stop = next((row for row in trip.stops if row.name == self.delivery_trip_stop), None)
        if not stop:
            frappe.throw(_("The selected stop does not belong to Delivery Trip {0}.").format(self.delivery_trip))
        if self.customer != stop.customer:
            frappe.throw(_("POD customer must match the customer assigned to the selected trip stop."))
        if trip.docstatus != 1 or trip.status not in ("Dispatched", "In Transit"):
            frappe.throw(_("POD can be submitted only for a dispatched or in-transit trip."))
        if stop.status not in ("Pending", "Arrived"):
            frappe.throw(_("This trip stop is already complete or otherwise unavailable for POD submission."))
        if frappe.db.exists("Proof of Delivery", {
            "delivery_trip": self.delivery_trip,
            "delivery_trip_stop": self.delivery_trip_stop,
            "docstatus": 1,
        }):
            frappe.throw(_("A submitted POD already exists for this trip stop."))

        self.validate_trip_item_allocations(trip, stop)

        roles = frappe.get_roles(frappe.session.user)
        if "Driver" in roles and "System Manager" not in roles:
            driver = frappe.db.get_value("Driver", {"user_id": frappe.session.user}, "name")
            if not driver or trip.driver != driver:
                frappe.throw(_("You may submit a POD only for a trip assigned to your Driver account."), frappe.PermissionError)

    def validate_trip_item_allocations(self, trip, stop):
        """Reject client-supplied item quantities that do not match the trip plan."""
        expected = {}
        same_customer_stops = sum(1 for row in trip.stops if row.customer == stop.customer)
        for trip_item in trip.items:
            stop_reference = str(trip_item.stop_reference or "")
            if stop_reference:
                belongs_to_stop = stop_reference in (str(stop.name), str(stop.stop_sequence))
            else:
                so_customer = frappe.db.get_value("Sales Order", trip_item.sales_order, "customer")
                # A customer match is safe only when this customer occurs once
                # on the trip. Repeated stops require explicit stop_reference.
                belongs_to_stop = same_customer_stops == 1 and so_customer == stop.customer
            if belongs_to_stop:
                so_customer = frappe.db.get_value("Sales Order", trip_item.sales_order, "customer")
                if so_customer != stop.customer:
                    frappe.throw(_("Trip item Sales Order customer does not match the selected stop."))
                sales_order_item = trip_item.sales_order_item
                if not sales_order_item:
                    so_items = frappe.get_all(
                        "Sales Order Item",
                        filters={"parent": trip_item.sales_order, "item_code": trip_item.item_code},
                        fields=["name"],
                    )
                    if len(so_items) != 1:
                        frappe.throw(_("This trip item needs an exact Sales Order Item reference before POD can be submitted."))
                    sales_order_item = so_items[0].name
                expected[(trip_item.item_code, sales_order_item)] = {
                    "qty": expected.get((trip_item.item_code, sales_order_item), {}).get("qty", 0.0)
                    + float(trip_item.allocated_qty or 0),
                    "sales_order": trip_item.sales_order,
                }

        if not expected:
            frappe.throw(_("No server-side item allocation is linked to this trip stop."))

        supplied = {}
        for row in self.items:
            candidates = [key for key in expected if key[0] == row.item_code]
            line = row.sales_order_item
            if not line and len(candidates) == 1:
                line = candidates[0][1]
                row.sales_order_item = line
            key = (row.item_code, line)
            if key not in expected:
                frappe.throw(_("POD item {0} is not allocated to this trip stop.").format(row.item_code), frappe.PermissionError)
            if key in supplied:
                frappe.throw(_("Each Sales Order Item may appear once in a POD."))
            if row.sales_order and row.sales_order != expected[key]["sales_order"]:
                frappe.throw(_("POD Sales Order does not match the trip allocation."), frappe.PermissionError)
            row.sales_order = expected[key]["sales_order"]
            supplied[key] = float(row.allocated_qty or 0)

        if supplied.keys() != expected.keys() or any(
            abs(supplied[key] - allocation["qty"]) > 0.0001 for key, allocation in expected.items()
        ):
            frappe.throw(_("POD item allocations must exactly match the server-side trip plan for this stop."), frappe.PermissionError)
            
    def validate_quantities(self):
        """
        Enforces mathematical conservation:
        Allocated Qty = Delivered Qty + Damaged Qty + Short Qty + Rejected Qty
        """
        if not self.items:
            frappe.throw(_("At least one item must be verified in Proof of Delivery."))
            
        for row in self.items:
            allocated = float(row.allocated_qty or 0)
            delivered = float(row.delivered_qty or 0)
            damaged = float(row.damaged_qty or 0)
            short = float(row.short_qty or 0)
            rejected = float(row.rejected_qty or 0)

            if not all(math.isfinite(value) for value in (allocated, delivered, damaged, short, rejected)):
                frappe.throw(_("Row #{0}: POD quantities must be finite numbers.").format(row.idx))
            if min(allocated, delivered, damaged, short, rejected) < 0:
                frappe.throw(_("Row #{0}: POD quantities cannot be negative.").format(row.idx))
            if allocated <= 0:
                frappe.throw(_("Row #{0}: Allocated quantity must be greater than zero.").format(row.idx))
            
            total_sum = delivered + damaged + short + rejected
            if abs(total_sum - allocated) > 0.0001:
                frappe.throw(
                    _("Row #{0}: Allocated Qty ({1}) must strictly equal Delivered ({2}) + Damaged ({3}) + Short ({4}) + Rejected ({5}).")
                    .format(row.idx, allocated, delivered, damaged, short, rejected)
                )

        has_exception = any(
            float(row.damaged_qty or 0) > 0
            or float(row.short_qty or 0) > 0
            or float(row.rejected_qty or 0) > 0
            for row in self.items
        )
        if has_exception and len((self.delivery_notes or "").strip()) < 5:
            frappe.throw(_("Explain short, damaged, or rejected quantities in Delivery Notes (at least 5 characters)."))
        if any(float(row.damaged_qty or 0) > 0 for row in self.items) and not self.photos:
            frappe.throw(_("Add at least one photo when damaged quantities are recorded."))
        for photo in self.photos:
            if not photo.photo_url:
                frappe.throw(_("Each POD photo row must contain an uploaded image."))
            _evidence_manifest(photo.photo_url, require_private_file=True)
                
    def enforce_no_cash_boundary(self):
        """Security Rule: Drivers are strictly prohibited from collecting cash or COD."""
        user_roles = frappe.get_roles(frappe.session.user)
        if "Driver" in user_roles and "System Manager" not in user_roles:
            if getattr(self, "cash_collected", 0) or getattr(self, "cod_amount", 0):
                frappe.throw(_("Security Violation: Drivers are not authorized to collect payments or COD."), frappe.PermissionError)

    def compute_audit_hash(self):
        """Return the canonical SHA-256 seal, including private evidence bytes."""
        signature_is_file = isinstance(self.signature_data, str) and self.signature_data.startswith(("/files/", "/private/files/"))
        payload = {
            "manifest_version": 1,
            "delivery_trip": self.delivery_trip,
            "delivery_trip_stop": self.delivery_trip_stop,
            "customer": self.customer,
            "receiver_name": self.receiver_name,
            "receiver_phone": self.receiver_phone,
            "delivery_notes": self.delivery_notes,
            "server_timestamp": str(self.server_timestamp),
            "gps_latitude": self.gps_latitude,
            "gps_longitude": self.gps_longitude,
            "signature": _evidence_manifest(self.signature_data, require_private_file=signature_is_file),
            "items": [
                {field: row.get(field) for field in (
                    "sales_order", "sales_order_item", "item_code", "allocated_qty", "delivered_qty",
                    "damaged_qty", "short_qty", "rejected_qty"
                )}
                for row in self.items
            ],
            "photos": [
                {
                    "category": row.get("category"),
                    "evidence": _evidence_manifest(row.get("photo_url"), require_private_file=True),
                    "remarks": row.get("remarks"),
                }
                for row in self.photos
            ],
        }
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)
        return hashlib.sha256(encoded.encode("utf-8")).hexdigest()
        
    def on_submit(self):
        self.audit_hash = self.compute_audit_hash()
        self.status = "Submitted"
        frappe.db.set_value(self.doctype, self.name, {
            "audit_hash": self.audit_hash,
            "status": self.status,
        })

        trip = frappe.get_doc("Delivery Trip", self.delivery_trip)
        stop = next(row for row in trip.stops if row.name == self.delivery_trip_stop)
        fully_delivered = all(
            abs(float(row.delivered_qty or 0) - float(row.allocated_qty or 0)) <= 0.0001
            and not float(row.damaged_qty or 0)
            and not float(row.short_qty or 0)
            and not float(row.rejected_qty or 0)
            for row in self.items
        )
        any_delivered = any(float(row.delivered_qty or 0) > 0 for row in self.items)
        stop_status = "Delivered" if fully_delivered else "Partially Delivered" if any_delivered else "Failed"
        frappe.db.set_value("Delivery Trip Stop", stop.name, {
            "pod_reference": self.name,
            "status": stop_status,
        })
            
        # Re-read after the stop update so completion uses current child statuses.
        trip = frappe.get_doc("Delivery Trip", self.delivery_trip)
        all_completed = all(s.status in ("Delivered", "Failed", "Partially Delivered") for s in trip.stops)
        if all_completed and trip.status != "Completed":
            trip.status = "Completed"
            trip.actual_completion = now_datetime()
            trip.flags.ignore_validate_update_after_submit = True
            trip.save(ignore_permissions=True)
