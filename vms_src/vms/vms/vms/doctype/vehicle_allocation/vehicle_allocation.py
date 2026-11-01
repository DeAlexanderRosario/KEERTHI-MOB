import math

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


ACTIVE_ALLOCATION_STATUSES = (
    "In Progress",
    "Loading Verified",
    "Discrepancy Reported",
    "Ready for Dispatch",
    "Dispatched",
)


def get_vehicle_capacity(vehicle):
    for fieldname in ("custom_max_weight_capacity_kg", "custom_capacity_kg", "capacity_kg", "weight_capacity"):
        if frappe.db.has_column("Vehicle", fieldname):
            capacity = frappe.db.get_value("Vehicle", vehicle, fieldname)
            if capacity and float(capacity) > 0:
                return float(capacity)
    frappe.throw(_("Set a positive maximum payload capacity on vehicle {0} before dispatch planning.").format(vehicle))


def check_vehicle_availability(vehicle):
    """Check optional vehicle availability fields without assuming site schema."""
    vehicle_meta = frappe.get_meta("Vehicle")
    if vehicle_meta.has_field("status"):
        vehicle_status = (frappe.db.get_value("Vehicle", vehicle, "status") or "").strip().lower()
        if vehicle_status in {"inactive", "disabled", "out of order", "under maintenance", "maintenance"}:
            frappe.throw(_("Vehicle {0} is not available for dispatch.").format(vehicle))
    elif vehicle_meta.has_field("disabled") and frappe.db.get_value("Vehicle", vehicle, "disabled"):
        frappe.throw(_("Vehicle {0} is not available for dispatch.").format(vehicle))


class VehicleAllocation(Document):
    def validate(self):
        self.calculate_weights()
        self.check_conflicts()
        self.validate_quantities()

    def calculate_weights(self):
        total_weight = 0.0
        for order in self.orders:
            weight_per_unit = frappe.db.get_value("Item", order.item_code, "weight_per_unit")
            if weight_per_unit is None or float(weight_per_unit) <= 0:
                frappe.throw(_("Set a positive weight_per_unit for item {0} before dispatch planning.").format(order.item_code))
            quantity = float(order.allocated_qty or 0)
            if not math.isfinite(quantity) or quantity <= 0:
                frappe.throw(_("Allocated quantity for item {0} must be a positive finite number.").format(order.item_code))
            order.weight_kg = float(weight_per_unit) * quantity
            total_weight += order.weight_kg

        self.total_weight_kg = total_weight
        if not self.vehicle:
            return

        self.max_capacity_kg = get_vehicle_capacity(self.vehicle)
        if total_weight > self.max_capacity_kg:
            frappe.throw(
                _("Vehicle overload: allocated load {0} kg exceeds capacity {1} kg.").format(
                    round(total_weight, 3), self.max_capacity_kg
                )
            )

    def check_conflicts(self):
        if not self.vehicle or not self.driver or not self.delivery_date:
            frappe.throw(_("Vehicle, Driver, and Delivery Date are required for allocation."))

        # Lock master rows to serialize competing allocations for the same
        # vehicle or driver until the current transaction commits.
        frappe.db.sql("SELECT name FROM `tabVehicle` WHERE name = %s FOR UPDATE", (self.vehicle,))
        frappe.db.sql("SELECT name FROM `tabDriver` WHERE name = %s FOR UPDATE", (self.driver,))

        check_vehicle_availability(self.vehicle)

        driver_status = (frappe.db.get_value("Driver", self.driver, "status") or "").strip().lower()
        if driver_status in {"inactive", "disabled", "suspended"}:
            frappe.throw(_("Driver {0} is not active for dispatch.").format(self.driver))

        status_marks = ", ".join(["%s"] * len(ACTIVE_ALLOCATION_STATUSES))
        conflict_sql = f"""
            SELECT name FROM `tabVehicle Allocation`
            WHERE name != %s AND delivery_date = %s AND docstatus = 1
              AND status IN ({status_marks}) AND {{resource_field}} = %s
            LIMIT 1 FOR UPDATE
        """
        vehicle_conflict = frappe.db.sql(
            conflict_sql.format(resource_field="vehicle"),
            (self.name or "", self.delivery_date, *ACTIVE_ALLOCATION_STATUSES, self.vehicle),
            as_dict=True,
        )
        if vehicle_conflict:
            frappe.throw(_("Vehicle {0} is already allocated on {1} under {2}.").format(self.vehicle, self.delivery_date, vehicle_conflict[0].name))

        driver_conflict = frappe.db.sql(
            conflict_sql.format(resource_field="driver"),
            (self.name or "", self.delivery_date, *ACTIVE_ALLOCATION_STATUSES, self.driver),
            as_dict=True,
        )
        if driver_conflict:
            frappe.throw(_("Driver {0} is already allocated on {1} under {2}.").format(self.driver, self.delivery_date, driver_conflict[0].name))

    def validate_quantities(self):
        requested = {}
        for order in self.orders:
            quantity = float(order.allocated_qty or 0)
            if not math.isfinite(quantity) or quantity <= 0:
                frappe.throw(_("Allocated quantity for item {0} in order {1} must be positive.").format(order.item_code, order.sales_order))

            sales_order = frappe.db.get_value(
                "Sales Order", order.sales_order, ["customer", "docstatus"], as_dict=True
            )
            if not sales_order or sales_order.docstatus != 1:
                frappe.throw(_("Allocation requires a submitted Sales Order: {0}.").format(order.sales_order))
            if sales_order.customer != order.customer:
                frappe.throw(_("Customer on allocation line does not match Sales Order {0}.").format(order.sales_order))
            if order.sales_order_item:
                so_item = frappe.db.get_value(
                    "Sales Order Item", order.sales_order_item,
                    ["parent", "item_code", "qty", "delivered_qty"], as_dict=True
                )
                if not so_item or so_item.parent != order.sales_order or so_item.item_code != order.item_code:
                    frappe.throw(_("Sales Order Item does not match allocation line {0}.").format(order.item_code))
            else:
                so_items = frappe.get_all(
                    "Sales Order Item",
                    filters={"parent": order.sales_order, "item_code": order.item_code},
                    fields=["name", "qty", "delivered_qty"],
                )
                if len(so_items) != 1:
                    frappe.throw(_("Select the exact Sales Order Item line for {0} on order {1}.").format(order.item_code, order.sales_order))
                order.sales_order_item = so_items[0].name
                so_item = frappe._dict(so_items[0])

            line_name = order.sales_order_item
            requested[line_name] = requested.get(line_name, 0.0) + quantity

        for sales_order_item, quantity in requested.items():
            locked_item = frappe.db.sql(
                "SELECT parent, item_code, qty, delivered_qty FROM `tabSales Order Item` WHERE name = %s FOR UPDATE",
                sales_order_item,
                as_dict=True,
            )
            if not locked_item:
                frappe.throw(_("Sales Order Item {0} no longer exists.").format(sales_order_item))
            so_item = locked_item[0]
            pending = float(so_item.qty or 0) - float(so_item.delivered_qty or 0)
            other_allocations = frappe.db.sql(
                """
                SELECT alloc.allocated_qty
                FROM `tabVehicle Allocation Order` alloc
                INNER JOIN `tabVehicle Allocation` parent ON parent.name = alloc.parent
                WHERE alloc.sales_order_item = %s
                  AND parent.name != %s
                  AND parent.docstatus = 1
                  AND parent.status IN (%s, %s, %s, %s, %s)
                FOR UPDATE
                """,
                (sales_order_item, self.name or "", *ACTIVE_ALLOCATION_STATUSES),
                as_dict=True,
            )
            reserved = sum(float(row.allocated_qty or 0) for row in other_allocations)
            if quantity + reserved > pending + 0.0001:
                frappe.throw(
                    _("Allocation of {0} {1} exceeds unreserved Sales Order balance {2}.").format(
                        quantity, so_item.item_code, max(0, pending - reserved)
                    )
                )

    def approve_and_generate_trip(self):
        # Serialize approvals and reload the state after the lock. Without this,
        # two simultaneous requests can both observe Loading Verified and make
        # separate trips for the same allocation.
        frappe.db.sql(
            "SELECT name FROM `tabVehicle Allocation` WHERE name = %s FOR UPDATE",
            (self.name,),
        )
        self.reload()
        if self.docstatus != 1:
            frappe.throw(_("Submit the allocation to the warehouse before dispatch approval."))

        existing_trip = frappe.db.get_value(
            "Delivery Trip",
            {"vehicle_allocation": self.name, "docstatus": ["!=", 2]},
            "name",
        )
        if existing_trip:
            return existing_trip

        if self.status not in ("Loading Verified", "Ready for Dispatch"):
            frappe.throw(_("Loading must be verified by Warehouse before dispatch approval."))

        trip = frappe.new_doc("Delivery Trip")
        trip.vehicle = self.vehicle
        trip.driver = self.driver
        trip.route = self.route
        trip.vehicle_allocation = self.name
        trip.departure_time = now_datetime()
        trip.status = "Dispatched"

        stop_sequences = {}
        for order in self.orders:
            if order.customer not in stop_sequences:
                sequence = len(stop_sequences) + 1
                trip.append("stops", {
                    "stop_sequence": sequence,
                    "customer": order.customer,
                    "status": "Pending",
                })
                stop_sequences[order.customer] = sequence

        for order in self.orders:
            trip.append("items", {
                "sales_order": order.sales_order,
                "sales_order_item": order.sales_order_item,
                "item_code": order.item_code,
                "allocated_qty": order.allocated_qty,
                "warehouse": order.warehouse,
                "stop_reference": str(stop_sequences[order.customer]),
            })

        trip.insert()
        trip.submit()

        self.status = "Dispatched"
        self.dispatch_approved_by = frappe.session.user
        self.dispatch_approved_at = now_datetime()
        self.save()
        return trip.name


def on_sales_order_cancel(doc, method):
    """Warn when a cancelled Sales Order is still reserved by an allocation."""
    alloc_orders = frappe.get_all(
        "Vehicle Allocation Order",
        filters={"sales_order": doc.name},
        fields=["name", "parent"],
    )
    for row in alloc_orders:
        allocation = frappe.get_doc("Vehicle Allocation", row.parent)
        if allocation.docstatus == 0:
            allocation.orders = [line for line in allocation.orders if line.sales_order != doc.name]
            if not allocation.orders:
                allocation.status = "Cancelled"
            allocation.save()
            allocation.add_comment("Comment", text=f"Sales Order {doc.name} was cancelled and removed from this draft allocation.")
        elif allocation.docstatus == 1 and allocation.status in ACTIVE_ALLOCATION_STATUSES:
            allocation.add_comment(
                "Comment",
                text=f"WARNING: Sales Order {doc.name} was cancelled while reserved by allocation {allocation.name}; review the trip before delivery.",
            )
