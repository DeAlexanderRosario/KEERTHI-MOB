# KEERTHI VMS API Reference

API reference for the VMS Frappe v16 app. This file documents implemented whitelisted methods under `vms.api`; it does not grant access or replace the role and record-scope checks enforced by each method.

## Calling the APIs

All listed methods require an authenticated Frappe session or API token. Use the standard Frappe method route:

```text
/api/method/<fully.qualified.method>
```

For example:

```text
GET /api/method/vms.api.driver_portal.get_my_trips
POST /api/method/vms.api.driver_portal.start_trip
Content-Type: application/x-www-form-urlencoded
trip_name=TRIP-00001
```

Frappe returns successful values in the `message` property of its JSON response. Send read requests with `GET` and state-changing requests with `POST`; include Frappe's CSRF token when required for session-authenticated writes. API-token requests use `Authorization: token <api_key>:<api_secret>`. Never put credentials in a query string.

Arguments marked optional have Python defaults in the implementation. Arguments ending in `_json` are JSON-encoded strings when sent as form fields; with JSON request bodies, send the corresponding JSON value as accepted by the method. Frappe DocType REST APIs are separate from these custom methods.

Access is checked per method. Checks can include VMS roles, the authenticated Driver or Field Sales Agent mapping, ownership, assigned customer or territory scope, warehouse assignment, and normal Frappe document permissions. A successful login alone does not authorize every method. Use a dedicated role and user when integrating a client; do not expose credentials or APIs to Guest users.

## Session bootstrap and permissions

| Method | Arguments | Purpose |
| --- | --- | --- |
| `vms.api.common.get_bootstrap` | — | Current user, roles, default company, system date, and role flags for the VMS client. |
| `vms.api.common.get_permissions` | — | Dynamic UI capability flags. These flags are for display only; server-side authorization remains authoritative. |
| `vms.api.common.get_dashboard_summary` | — | Compact operational counts for active trips, pending collections, and pending loading. This is distinct from `vms.api.dashboard.get_dashboard_summary`. |
| `vms.api.common.get_user_profile` | — | Current user's identity and roles. |

## Operations dashboard

These read endpoints supply the VMS Operations Dashboard:

| Method | Arguments | Returns |
| --- | --- | --- |
| `vms.api.dashboard.get_dashboard_summary` | `company` (optional) | Trip counts, average planned route distance, pending allocations and collections, and open warehouse discrepancies. |
| `vms.api.dashboard.get_fleet_efficiency` | `company` (optional) | Fleet totals split into allocated, available and maintenance counts, plus utilization percentage and chart segments. |
| `vms.api.dashboard.get_featured_vehicle` | — | Most recent active trip/vehicle summary, or an explicit no-active-trip result. |
| `vms.api.dashboard.get_incoming_communications` | `filter_type` (default `all`), `limit` (default `10`) | Operational alerts and approval/message feed. |
| `vms.api.dashboard.get_revenue_collections_chart` | `period` (default `monthly`) | Verified collection totals by month and the current total. |
| `vms.api.dashboard.get_kerala_map_data` | — | Warehouses and delivery stops with coordinates, plus unmapped records and a notice when coordinates are absent. |
| `vms.api.dashboard.get_shipments_overview` | `status`, `search`, `page` (default `1`), `page_size` (default `10`) | Paginated Delivery Trip rows for the dashboard table. |
| `vms.api.dashboard_metrics.get_operational_metrics` | — | Operational summary metrics used by other VMS views. |
| `vms.api.reports.get_vms_dashboard_metrics` | — | Legacy/report dashboard metric payload. |

`get_fleet_efficiency` only reads a Vehicle maintenance field if the installed Vehicle schema provides a supported field (`status`, `custom_vehicle_status`, `maintenance_status`, or `custom_maintenance_status`). When no such field exists, `maintenance_status_available` is `false`; the maintenance count must be shown as unavailable rather than interpreted as a verified zero. Other dashboard values reflect saved ERP records. Missing map coordinates are reported and are not fabricated.

## Driver and delivery workflow

The driver flow is: fetch assigned trips, inspect trip and stops, start a submitted dispatch, record arrival at a stop, then submit POD or report/reschedule a failed delivery. Driver endpoints resolve the authenticated user's Driver record and enforce trip/stop access.

| Method | Arguments | Purpose |
| --- | --- | --- |
| `vms.api.driver_portal.get_my_trips` | — | Trips assigned to the authenticated driver. |
| `vms.api.driver_portal.get_trip_details` | `trip_name` | Trip and stop details after assignment/access validation. |
| `vms.api.driver_portal.start_trip` | `trip_name` | Start an eligible submitted dispatch; repeat calls are idempotent once in transit. |
| `vms.api.driver_portal.record_arrival` | `trip_name`, `stop_name`, `lat` (optional), `lng` (optional) | Record arrival and optional coordinate pair. Coordinates are validated as a pair and finite values. |
| `vms.api.driver_portal.submit_pod` | `trip_name`, `stop_name`, `receiver_name`, `receiver_phone` (optional), `items_json` (optional), `signature_base64` (optional), `photos_json` (optional), `device_timestamp` (optional), `lat` (optional), `lng` (optional) | Submit proof of delivery against the trip stop, with evidence and server-generated audit seal. |
| `vms.api.driver_portal.record_failed_delivery` | `trip_name`, `stop_name`, `reason`, `lat` (optional), `lng` (optional) | Record a failed delivery outcome. |
| `vms.api.driver_portal.request_reschedule` | `trip_name`, `stop_name`, `requested_date`, `reason` | Request a new delivery date for a stop. |
| `vms.api.delivery.get_pod_details` | `pod_name` | Read POD details and evidence subject to permissions. |
| `vms.api.delivery.get_delivery_history` | `customer` (optional), `limit` (default `50`) | Delivery history, scoped by the caller's access. |
| `vms.api.delivery.get_delivery_note_status` | `trip_name` | Delivery Note status for a trip. |
| `vms.api.delivery.generate_delivery_notes_for_trip` | `trip_name` | Generate ERPNext Delivery Notes for an eligible trip. This is a write operation. |
| `vms.api.exceptions_management.log_delivery_exception` | `trip_name`, `stop_name`, `reason`, `remarks` (optional) | Log a delivery exception. |
| `vms.api.customer_documents.get_customer_delivery_dossier` | `customer` | Customer delivery dossier subject to customer scope. |

POD item quantities and duplicate-stop rules are validated server-side. The server timestamp and cryptographic seal are authoritative; client-supplied time/location remain evidence fields and must not be treated as proof of live tracking.

## Field Sales and customer onboarding

Sales agents are restricted to assigned customers/territories and their own order capture. Order pricing and item values are validated server-side; clients must not treat submitted prices as authoritative.

| Method | Arguments | Purpose |
| --- | --- | --- |
| `vms.api.field_sales.search_customers` | `query` (optional), `territory` (optional) | Search customers within the caller's permitted scope. |
| `vms.api.field_sales.get_customer_context` | `customer` | Customer credit/context data; returns safe defaults when optional credit-limit configuration is absent. |
| `vms.api.field_sales.get_item_context` | `item_code`, `customer` (optional) | Item and customer-specific selling context. |
| `vms.api.field_sales.get_assigned_customers` | `territory` (optional), `search_term` (optional) | Customers assigned to the authenticated sales agent. |
| `vms.api.field_sales.create_shop_visit` | `customer`, `purpose`, `notes` (optional), `lat` (optional), `lng` (optional), `follow_up_date` (optional), `items` (optional) | Create a Shop Visit; `items` may be a JSON-encoded value when submitted as a form field. |
| `vms.api.field_sales.complete_shop_visit` | `visit_name`, `outcome`, `follow_up_date` (optional), `notes` (optional) | Complete an existing visit and record its outcome. |
| `vms.api.field_sales.create_sales_order` | `customer`, `items_json`, `delivery_date` (optional) | Create a Sales Order from validated items and server-side rates. |
| `vms.api.field_sales.get_my_sales_orders` | — | Sales Orders captured by the authenticated agent. |
| `vms.api.customer.submit_onboarding_request` | `customer_name`, `territory`, `mobile_no`, `gst_in` (optional), `address` (optional), `proposed_credit_limit` (default `0`), `documents_json` (optional), `owner_name` (optional), `email` (optional) | Submit a customer onboarding request for review. |
| `vms.api.customer.review_onboarding_request` | `request_name`, `action`, `rejection_reason` (optional), `adjusted_credit_limit` (optional) | Review an onboarding request. This is a privileged write operation. |
| `vms.api.customer.approve_onboarding_request` | `request_name` | Approve an onboarding request. |
| `vms.api.customer.reject_onboarding_request` | `request_name`, `reason` | Reject an onboarding request with a reason. |

## Collections and accounts

The agent records a collection; accounts staff review it and can create the standard ERPNext Payment Entry. The create operation accepts `allocations_json` (not `invoice_allocations`).

| Method | Arguments | Purpose |
| --- | --- | --- |
| `vms.api.collections.create_payment_collection` | `customer`, `amount`, `mode_of_payment`, `transaction_reference` (optional), `allocations_json` (optional) | Record a collection for a permitted customer. |
| `vms.api.collections.get_my_collections` | — | Collections belonging to the authenticated agent. |
| `vms.api.collections.create_collection_followup` | `customer`, `due_date`, `expected_amount`, `notes` (optional) | Create a collection follow-up. |
| `vms.api.accounts.get_pending_collections` | `company` (optional) | Accounts queue of pending collections. |
| `vms.api.accounts.verify_collection` | `collection_name`, `notes` (optional) | Verify a collection; self-verification is prohibited. |
| `vms.api.accounts.get_open_invoices` | `customer` | Open invoices visible to the caller for that customer. |
| `vms.api.accounts.preview_collection_allocation` | `collection_name` | Preview invoice allocation for a collection. |
| `vms.api.accounts.create_payment_entry` | `collection_name` | Create/link an ERPNext Payment Entry using the verified collection. |
| `vms.api.accounts.get_customer_ledger_summary` | `customer` | Customer ledger summary subject to accounts/customer permissions. |
| `vms.api.accounts.reject_payment_collection` | `collection_name`, `reason` | Reject a collection with a reason. |
| `vms.api.reports.get_collection_report` | `from_date` (optional), `to_date` (optional) | Collection report for a date range. |

## Dispatch, warehouse, and fleet

Dispatch planning validates allocations and vehicle capacity before dispatch. Warehouse staff record picks/loading and resolve discrepancies; approval and transition methods are restricted by role and workflow state.

| Method | Arguments | Purpose |
| --- | --- | --- |
| `vms.api.dispatch.get_orders_awaiting_allocation` | `warehouse` (optional) | Eligible orders awaiting allocation. |
| `vms.api.dispatch.preview_allocation` | `vehicle`, `orders_json` | Preview allocation loads and capacity checks without saving. |
| `vms.api.dispatch.create_or_update_allocation` | `vehicle`, `driver`, `route`, `delivery_date`, `orders_json`, `allocation_name` (optional) | Create or update a draft Vehicle Allocation. |
| `vms.api.dispatch.submit_to_warehouse` | `allocation_name` | Submit allocation into warehouse picking flow. |
| `vms.api.dispatch.approve_dispatch` | `allocation_name` | Approve and dispatch a warehouse-verified allocation. |
| `vms.api.dispatch.cancel_or_reconcile_allocation` | `allocation_name`, `reason` | Cancel/reconcile an allocation according to workflow permissions. |
| `vms.api.dispatch_management.get_dispatch_queue` | `warehouse` (optional) | Dispatch approval queue. |
| `vms.api.dispatch_management.process_allocation_approval` | `allocation_name` | Process allocation approval through the lifecycle controller. |
| `vms.api.warehouse.get_picking_queue` | — | Allocations available to the authenticated warehouse staff member. |
| `vms.api.warehouse.record_picking` | `allocation_name`, `item_code`, `picked_qty`, `bin_location` (optional), `sales_order` (optional) | Record picked quantity for an allocation line. |
| `vms.api.warehouse.record_loading` | `allocation_name`, `remarks` (optional) | Record loading activity. |
| `vms.api.warehouse.create_discrepancy` | `allocation_name`, `item_code`, `discrepancy_type`, `discrepancy_qty`, `remarks` (optional), `sales_order` (optional) | Report a warehouse discrepancy. |
| `vms.api.warehouse.resolve_discrepancy` | `discrepancy_name`, `resolution_notes` | Resolve a discrepancy. |
| `vms.api.warehouse.verify_loading` | `allocation_name`, `verified_by_staff_id` (optional), `remarks` (optional) | Verify loading after all allocation lines are fully picked. |
| `vms.api.fleet.get_vehicle_availability` | `date` (optional) | Vehicle availability for planning. |
| `vms.api.fleet.get_driver_availability` | `date` (optional) | Driver availability for planning. |
| `vms.api.fleet.save_vehicle` | `vehicle_data` | Create/update a Vehicle through the VMS validation path. |
| `vms.api.fleet.save_driver_profile` | `driver_data` | Create/update a Driver profile through the VMS validation path. |
| `vms.api.fleet.get_fleet_overview` | — | Fleet overview. |
| `vms.api.fleet_monitoring.get_fleet_status` | — | Vehicles and their active allocation status. |
| `vms.api.internal_staff.get_internal_operational_queue` | — | Internal staff queue counts. |
| `vms.api.reports.get_fleet_utilization` | — | Fleet utilization report. |

## Mobile synchronization and integration

These APIs synchronize records for supported mobile clients. They have separate scope and conflict rules; do not use them as a general-purpose DocType read/write API.

| Method | Arguments | Purpose |
| --- | --- | --- |
| `vms.api.mobile_sync.get_sync_bootstrap` | — | Initial synchronization metadata and permitted data. |
| `vms.api.mobile_sync.get_changes` | `since_timestamp` (optional) | Changes since the supplied timestamp, within the caller's scope. |
| `vms.api.mobile_sync.push_changes` | `mutations_json` | Submit supported mobile mutations for server validation. |
| `vms.api.mobile_sync.resolve_conflict` | `conflict_id`, `client_resolution` | Resolve a reported synchronization conflict. |
| `vms.api.mobile_control_integration.sync_mobile_data` | `doctype`, `filters` (optional) | Compatibility sync for explicitly allowed DocTypes/fields only. Wildcard field access and secret fields are not allowed. |
| `vms.api.external_staff.get_agent_profile` | — | Profile for the authenticated field agent. |
| `vms.api.external_api.get_system_health` | — | Authenticated system health check (`allow_guest=False`). |

## Reports

| Method | Arguments | Purpose |
| --- | --- | --- |
| `vms.api.reports.get_sales_agent_performance` | `from_date` (optional), `to_date` (optional) | Sales agent performance for a date range. |
| `vms.api.reports.get_delivery_performance` | `from_date` (optional), `to_date` (optional) | Delivery performance for a date range. |

## Operational notes

- Use the exact Python method names and arguments in this reference. Older names such as `record_shop_visit`, `register_customer_onboarding`, and `record_payment_collection` are not current custom API methods. `vms.api.dispatch.create_vehicle_allocation` and `vms.api.dispatch.approve_dispatch_and_generate_trip` remain backward-compatible aliases; new clients should use `create_or_update_allocation` and `approve_dispatch`.
- API writes participate in the relevant DocType workflow; a successful draft creation does not imply warehouse verification, dispatch, delivery, payment verification, or accounting submission is complete.
- For POD, preserve uploaded photo/signature evidence and use the returned server-side POD/document identifiers. Do not fabricate GPS values or audit hashes in a client.
- Use `vms/tests/run_api_flow_tests.py` via the focused test runner for mocked workflow regression coverage. Live-site checks are separate and must use an authorized test account and records; do not test write endpoints against production data without a planned test record and cleanup path.
- When a method's implementation changes, update this reference and the Postman collection/environment under `api-tests/` in the same change.
