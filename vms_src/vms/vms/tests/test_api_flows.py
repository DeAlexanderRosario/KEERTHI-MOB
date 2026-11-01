"""API flow regression tests using the installed Frappe app and mocked records."""
from unittest.mock import MagicMock, patch

import frappe
from frappe.tests.utils import FrappeTestCase

from vms.api import accounts, collections, dashboard, driver_portal, field_sales, fleet_monitoring, internal_staff, warehouse
from vms.vms.doctype.proof_of_delivery.proof_of_delivery import ProofofDelivery
from vms.vms.doctype.vehicle_allocation.vehicle_allocation import VehicleAllocation


class TestDriverApiFlow(FrappeTestCase):
    def setUp(self):
        self.driver = patch.object(driver_portal, "get_authenticated_driver", return_value="DRV-1")
        self.supervisor = patch.object(driver_portal, "has_driver_supervisor_access", return_value=False)
        self.driver.start()
        self.supervisor.start()

    def tearDown(self):
        self.driver.stop()
        self.supervisor.stop()

    def test_start_trip_requires_submitted_dispatch(self):
        trip = MagicMock(name="Trip")
        trip.driver, trip.docstatus, trip.status = "DRV-1", 0, "Dispatched"
        with patch.object(driver_portal.frappe, "get_doc", return_value=trip):
            with self.assertRaises(Exception):
                driver_portal.start_trip("TRIP-1")
        trip.save.assert_not_called()

    def test_start_trip_is_idempotent_once_in_transit(self):
        trip = MagicMock(name="Trip")
        trip.name, trip.driver, trip.docstatus, trip.status = "TRIP-1", "DRV-1", 1, "In Transit"
        with patch.object(driver_portal.frappe, "get_doc", return_value=trip):
            result = driver_portal.start_trip("TRIP-1")
        self.assertTrue(result["already_started"])
        trip.save.assert_not_called()

    def test_arrival_cannot_reopen_terminal_stop(self):
        stop = MagicMock(name="Stop")
        stop.name, stop.status = "STOP-1", "Delivered"
        trip = MagicMock(name="Trip")
        trip.driver, trip.docstatus, trip.status, trip.stops = "DRV-1", 1, "In Transit", [stop]
        with patch.object(driver_portal.frappe, "get_doc", return_value=trip):
            with self.assertRaises(Exception):
                driver_portal.record_arrival("TRIP-1", "STOP-1")
        trip.save.assert_not_called()

    def test_arrival_accepts_equator_and_prime_meridian_coordinates(self):
        stop = MagicMock(name="Stop")
        stop.name, stop.status = "STOP-1", "Pending"
        trip = MagicMock(name="Trip")
        trip.driver, trip.docstatus, trip.status, trip.stops = "DRV-1", 1, "In Transit", [stop]
        with patch.object(driver_portal.frappe, "get_doc", return_value=trip), \
             patch.object(driver_portal, "now_datetime", return_value="2026-01-01 00:00:00"):
            driver_portal.record_arrival("TRIP-1", "STOP-1", "0", "0")
        self.assertEqual(stop.arrival_lat, 0)
        self.assertEqual(stop.arrival_lng, 0)
        trip.save.assert_called_once()

    def test_coordinate_validation_requires_pair_and_rejects_nan(self):
        from vms.api.common import parse_coordinates
        self.assertEqual(parse_coordinates("0", "0"), (0.0, 0.0))
        with self.assertRaises(Exception):
            parse_coordinates("10", None)
        with self.assertRaises(Exception):
            parse_coordinates("NaN", "20")


class TestFieldSalesOrderApi(FrappeTestCase):
    def _sale_order(self):
        order = MagicMock(name="SalesOrder")
        order.name, order.grand_total = "SO-TEST", 200
        return order

    @patch.object(field_sales, "assert_customer_scope")
    @patch.object(field_sales.frappe, "has_permission", return_value=True)
    @patch.object(field_sales.frappe, "get_roles", return_value=["Field Sales Agent"])
    def test_client_rate_is_ignored_and_server_price_used(self, *_mocks):
        order = self._sale_order()
        with patch.object(field_sales.frappe.db, "get_value", side_effect=["Retail Selling", 200]), \
             patch.object(field_sales.frappe.db, "get_single_value", return_value="Keerthi Groups Hardware"), \
             patch.object(field_sales.frappe, "new_doc", return_value=order), \
             patch.object(field_sales.frappe.utils, "today", return_value="2026-01-01"), \
             patch.object(field_sales.frappe.utils, "add_days", return_value="2026-01-03"):
            field_sales.create_sales_order("CUST-1", [{"item_code": "ITEM-1", "qty": 2, "rate": 1}])
        order.append.assert_called_once_with("items", {
            "item_code": "ITEM-1", "qty": 2.0, "rate": 200.0, "delivery_date": order.delivery_date
        })
        order.insert.assert_called_once()

    @patch.object(field_sales, "assert_customer_scope")
    @patch.object(field_sales.frappe, "has_permission", return_value=True)
    @patch.object(field_sales.frappe, "get_roles", return_value=["Field Sales Agent"])
    def test_non_positive_quantity_is_rejected(self, *_mocks):
        with patch.object(field_sales.frappe.db, "get_value", return_value="Retail Selling"), \
             patch.object(field_sales.frappe.db, "get_single_value", return_value="Keerthi Groups Hardware"), \
             patch.object(field_sales.frappe, "new_doc") as new_doc, \
             patch.object(field_sales.frappe.utils, "today", return_value="2026-01-01"), \
             patch.object(field_sales.frappe.utils, "add_days", return_value="2026-01-03"):
            with self.assertRaises(Exception):
                field_sales.create_sales_order("CUST-1", [{"item_code": "ITEM-1", "qty": -2, "rate": 100}])
        new_doc.assert_called_once()

    @patch.object(field_sales, "validate_role_access")
    @patch.object(field_sales.frappe, "get_roles", return_value=["Field Sales Agent"])
    def test_complete_shop_visit_returns_separate_result_and_visit_state(self, *_mocks):
        visit = MagicMock(name="ShopVisit")
        visit.name, visit.sales_agent, visit.purpose, visit.notes = "VISIT-1", "agent@example.com", "Stock Check", "Started"
        with patch.object(field_sales.frappe, "get_doc", return_value=visit), \
             patch.dict(field_sales.frappe.session, {"user": "agent@example.com"}):
            result = field_sales.complete_shop_visit("VISIT-1", "Completed")
        self.assertEqual(result, {
            "status": "success", "visit_name": "VISIT-1", "visit_status": "Completed"
        })
        visit.save.assert_called_once()


class TestInternalQueueApi(FrappeTestCase):
    @patch.object(internal_staff, "validate_role")
    @patch.object(internal_staff.frappe, "get_roles", return_value=["Warehouse User"])
    def test_queue_counts_only_submitted_allocations(self, *_mocks):
        with patch.object(internal_staff.frappe.db, "count", side_effect=[3]) as count:
            result = internal_staff.get_internal_operational_queue()
        self.assertEqual(result, {"allocations_to_load": 3})
        count.assert_called_once_with("Vehicle Allocation", {"docstatus": 1, "status": "In Progress"})


class TestFleetOverviewFlow(FrappeTestCase):
    @patch.object(fleet_monitoring, "validate_role_access")
    def test_fleet_status_keeps_dispatched_vehicle_allocated(self, _role):
        vehicles = [frappe._dict(name="VH-1")]
        allocations = [frappe._dict(vehicle="VH-1", status="Dispatched")]
        with patch.object(fleet_monitoring.frappe, "get_list", side_effect=[vehicles, allocations]) as get_list:
            result = fleet_monitoring.get_fleet_status()
        self.assertEqual(result[0]["status"], "Allocated")
        self.assertEqual(result[0]["allocation_details"]["status"], "Dispatched")
        self.assertIn("Dispatched", get_list.call_args_list[1].kwargs["filters"]["status"][1])


class TestDashboardFleetEfficiency(FrappeTestCase):
    @patch.object(dashboard, "check_dashboard_access")
    @patch.object(dashboard, "get_fleet_status", return_value=[frappe._dict(name="VH-1", status="Available")])
    def test_standard_vehicle_without_status_column_does_not_read_missing_column(self, _fleet, _access):
        with patch.object(dashboard.frappe.db, "has_column", return_value=False), \
             patch.object(dashboard.frappe.db, "get_value") as get_value:
            result = dashboard.get_fleet_efficiency()
        self.assertEqual(result["total_fleet"], 1)
        self.assertEqual(result["unutilized"], 1)
        self.assertEqual(result["in_maintenance"], 0)
        self.assertFalse(result["maintenance_status_available"])
        get_value.assert_not_called()

    @patch.object(dashboard, "check_dashboard_access")
    @patch.object(dashboard, "get_fleet_status", return_value=[frappe._dict(name="VH-1", status="Available")])
    def test_site_maintenance_status_is_counted_when_configured(self, _fleet, _access):
        with patch.object(dashboard.frappe.db, "has_column", side_effect=lambda _doctype, field: field == "status"), \
             patch.object(dashboard.frappe.db, "get_value", return_value="Under Maintenance"):
            result = dashboard.get_fleet_efficiency()
        self.assertEqual(result["in_maintenance"], 1)
        self.assertEqual(result["unutilized"], 0)
        self.assertTrue(result["maintenance_status_available"])


class TestSalesCollectionApi(FrappeTestCase):
    @patch.object(collections.frappe, "get_roles", return_value=["Field Sales Agent"])
    @patch.object(collections, "validate_role_access")
    @patch.object(collections, "assert_customer_scope")
    @patch.object(collections.frappe, "has_permission", return_value=False)
    def test_collection_requires_customer_read_permission(self, *_mocks):
        with patch.object(collections.frappe, "new_doc") as new_doc:
            with self.assertRaises(Exception):
                collections.create_payment_collection("OUT-OF-SCOPE", 25, "Cash")
        new_doc.assert_not_called()

    @patch.object(collections.frappe, "get_roles", return_value=["Driver"])
    def test_driver_cannot_create_payment_collection(self, *_mocks):
        with patch.object(collections.frappe, "new_doc") as new_doc:
            with self.assertRaises(Exception):
                collections.create_payment_collection("CUST-1", 25, "Cash")
        new_doc.assert_not_called()


class TestAccountsApi(FrappeTestCase):
    @patch.object(accounts.frappe, "get_roles", return_value=["Accounts User", "Field Sales Agent"])
    @patch.object(accounts, "validate_role")
    def test_agent_cannot_verify_own_collection(self, *_mocks):
        collection = MagicMock(name="PaymentCollection")
        collection.sales_agent = "agent@example.com"
        with patch.object(accounts.frappe, "get_doc", return_value=collection), \
             patch.dict(accounts.frappe.session, {"user": "agent@example.com"}):
            with self.assertRaises(Exception):
                accounts.verify_collection("COL-1")
        collection.save.assert_not_called()

    @patch.object(accounts, "_validate_accounts_access")
    def test_payment_entry_posting_locks_collection_before_idempotency_check(self, _access):
        collection = MagicMock(name="PaymentCollection")
        collection.status = "Verified"
        collection.payment_entry_reference = "ACC-PAY-1"
        with patch.object(accounts.frappe.db, "sql") as sql, \
             patch.object(accounts.frappe, "get_doc", return_value=collection):
            with self.assertRaises(Exception):
                accounts.create_payment_entry("COL-1")
        sql.assert_called_once_with(
            "SELECT name FROM `tabPayment Collection` WHERE name = %s FOR UPDATE", "COL-1"
        )


class TestWarehouseApi(FrappeTestCase):
    @patch.object(warehouse, "validate_role_access")
    def test_verify_loading_requires_every_line_fully_picked(self, _role):
        allocation = MagicMock(name="Allocation")
        allocation.docstatus, allocation.status = 1, "In Progress"
        allocation.orders = [MagicMock(item_code="ITEM-1", allocated_qty=10, picked_qty=9)]
        with patch.object(warehouse.frappe, "get_doc", return_value=allocation), \
             patch.object(warehouse.frappe, "has_permission", return_value=True), \
             patch.object(warehouse.frappe, "get_list", return_value=[]):
            with self.assertRaises(Exception):
                warehouse.verify_loading("ALLOC-1")
        allocation.save.assert_not_called()


class TestDispatchApi(FrappeTestCase):
    def test_dispatch_approval_calls_lifecycle_controller(self):
        from vms.api import dispatch
        allocation = MagicMock(name="Allocation")
        allocation.approve_and_generate_trip.return_value = "TRIP-1"
        with patch.object(dispatch, "validate_role_access"), \
             patch.object(dispatch.frappe, "get_doc", return_value=allocation):
            result = dispatch.approve_dispatch("ALLOC-1")
        self.assertEqual(result["trip_name"], "TRIP-1")
        allocation.approve_and_generate_trip.assert_called_once_with()


class TestSerializedWorkflowTransitions(FrappeTestCase):
    def test_allocation_approval_reuses_existing_trip(self):
        allocation = MagicMock(name="VehicleAllocation")
        allocation.name, allocation.docstatus = "ALLOC-1", 1
        with patch("vms.vms.doctype.vehicle_allocation.vehicle_allocation.frappe.db.sql") as sql, \
             patch("vms.vms.doctype.vehicle_allocation.vehicle_allocation.frappe.db.get_value", return_value="TRIP-1"):
            result = VehicleAllocation.approve_and_generate_trip(allocation)
        sql.assert_called_once_with(
            "SELECT name FROM `tabVehicle Allocation` WHERE name = %s FOR UPDATE", ("ALLOC-1",)
        )
        self.assertEqual(result, "TRIP-1")
        allocation.reload.assert_called_once()

    def test_pod_duplicate_check_is_protected_by_stop_row_lock(self):
        pod = MagicMock(name="POD")
        pod.delivery_trip, pod.delivery_trip_stop, pod.customer = "TRIP-1", "STOP-1", "CUST-1"
        stop = MagicMock(name="Stop")
        stop.name, stop.customer, stop.status = "STOP-1", "CUST-1", "Pending"
        trip = MagicMock(name="Trip")
        trip.stops, trip.docstatus, trip.status = [stop], 1, "In Transit"
        with patch("vms.vms.doctype.proof_of_delivery.proof_of_delivery.frappe.db.sql") as sql, \
             patch("vms.vms.doctype.proof_of_delivery.proof_of_delivery.frappe.get_doc", return_value=trip), \
             patch("vms.vms.doctype.proof_of_delivery.proof_of_delivery.frappe.db.exists", return_value=False), \
             patch("vms.vms.doctype.proof_of_delivery.proof_of_delivery.frappe.get_roles", return_value=[]), \
             patch.object(ProofofDelivery, "validate_trip_item_allocations"):
            ProofofDelivery.validate_trip_stop_link(pod)
        sql.assert_called_once_with(
            "SELECT name FROM `tabDelivery Trip Stop` WHERE name = %s FOR UPDATE", ("STOP-1",)
        )


class TestVehicleAllocationSchemaCompatibility(FrappeTestCase):
    def test_standard_vehicle_without_status_field_does_not_read_missing_column(self):
        from unittest.mock import patch
        from vms.vms.doctype.vehicle_allocation.vehicle_allocation import check_vehicle_availability

        with patch("vms.vms.doctype.vehicle_allocation.vehicle_allocation.frappe.get_meta") as get_meta, patch(
            "vms.vms.doctype.vehicle_allocation.vehicle_allocation.frappe.db.get_value"
        ) as get_value:
            get_meta.return_value.has_field.return_value = False
            check_vehicle_availability("KL-TEST-0001")
            get_value.assert_not_called()


class TestFieldSalesCustomerContextSchema(FrappeTestCase):
    def test_context_uses_standard_customer_credit_limits_table(self):
        from unittest.mock import patch
        from vms.api.field_sales import get_customer_context

        customer = frappe._dict(
            name="CUST-1", customer_name="Customer 1", territory="South",
            mobile_no="", default_price_list="Standard Selling",
            credit_limits=[frappe._dict(company="KEERTHI GROUPS HARDWARE", credit_limit=25000)],
        )
        with patch("vms.api.field_sales._validate_field_sales_access"), patch(
            "vms.api.field_sales.assert_customer_scope"
        ), patch("vms.api.field_sales.frappe.get_doc", return_value=customer), patch(
            "vms.api.field_sales.frappe.get_list", return_value=[]
        ), patch("vms.api.field_sales.frappe.defaults.get_user_default", return_value="KEERTHI GROUPS HARDWARE"):
            result = get_customer_context("CUST-1")
        self.assertEqual(result["credit_limit"], 25000.0)

    def test_context_returns_zero_when_no_company_credit_limit_is_configured(self):
        from unittest.mock import patch
        from vms.api.field_sales import get_customer_context

        customer = frappe._dict(
            name="CUST-1", customer_name="Customer 1", territory="South",
            mobile_no="", default_price_list=None, credit_limits=[],
        )
        with patch("vms.api.field_sales._validate_field_sales_access"), patch(
            "vms.api.field_sales.assert_customer_scope"
        ), patch("vms.api.field_sales.frappe.get_doc", return_value=customer), patch(
            "vms.api.field_sales.frappe.get_list", return_value=[]
        ), patch("vms.api.field_sales.frappe.defaults.get_user_default", return_value="KEERTHI GROUPS HARDWARE"):
            result = get_customer_context("CUST-1")
        self.assertEqual(result["credit_limit"], 0.0)
