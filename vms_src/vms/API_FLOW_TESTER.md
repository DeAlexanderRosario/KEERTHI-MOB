# VMS API workflow tester

Import these Postman files:

- `api-tests/KEERTHI_VMS_Sales_to_POD.postman_collection.json`
- `api-tests/KEERTHI_VMS_Isolated_API_Test.postman_environment.json`

Point `base_url` at a **dedicated test site**, then set separate API tokens for `Field Sales Agent`, `Sales Manager`, `Dispatcher`, `Warehouse User`, and the assigned `Driver`. Supply a test customer, a priced item with `weight_per_unit`, a payload-capable vehicle, route, warehouse, and delivery date. Do not point this transaction collection at the live `frontend` site. Send requests in order; skip the optional private-photo upload step when testing without an image. Use only synthetic names and evidence in the test site.

The collection drives Shop Visit → draft Sales Order → manager submission → vehicle allocation → warehouse pick/verify → dispatch → driver trip → arrival → POD. It captures returned IDs between requests and checks each response, ownership path, and final SHA-256 hash.

To run the focused regression suite in the isolated Docker test site:

```powershell
docker run --rm --network codex-vms-api-test-net --mount type=volume,source=codex-vms-api-test-sites,target=/home/frappe/frappe-bench/sites custom:16-mobile-apps bash -lc "bench --site vms-api-test.local execute vms.tests.run_api_flow_tests.run"
```

The runner exercises Driver, Field Sales, Warehouse, Dispatch, Accounts, role/permission, and API-surface regressions. Its 23 tests use controlled records and mocks; they do not create production transactions or claim full live HTTP end-to-end data coverage.

## Sales Agent to POD handoff

| Stage | Role | API / action | Data source |
|---|---|---|---|
| Record shop visit | Field Sales Agent | `vms.api.field_sales.create_shop_visit` | Customer and visit notes; item demand and `order_qty` |
| Create order | Field Sales Agent | `vms.api.field_sales.create_sales_order` | Shop Visit order quantities; server Item Price; saved as draft |
| Review and submit | Sales Manager | ERPNext Sales Order submit | Manager confirms the draft before allocation |
| Plan vehicle | Dispatcher | `vms.api.dispatch.create_or_update_allocation`, then `submit_to_warehouse` | Submitted Sales Order line, vehicle, driver, route, date |
| Pick and verify | Warehouse User | `record_picking`, then `verify_loading` | Allocation lines and actual picked quantities |
| Dispatch | Dispatcher | `vms.api.dispatch.approve_dispatch` | Verified allocation creates the Delivery Trip and customer stops |
| Deliver | Assigned Driver | `get_my_trips`, `start_trip`, `record_arrival` | Only the driver's assigned active trip and its stops |
| Submit POD | Assigned Driver | `submit_pod` | Stop-bound customer and exact allocated Sales Order items; quantity conservation; private photo evidence when supplied |

## POD form auto-fill

On a new Proof of Delivery with a Delivery Trip selected, choose **Actions → Auto-fill from Delivery Trip**. The form fills the chosen stop ID, customer, Sales Order item links, planned quantities, and recorded arrival GPS when present. A separate checkbox explicitly confirms a full delivery before delivered quantities are prefilled; otherwise enter the actual delivered/damaged/short/rejected quantities. The server supplies the authoritative timestamp and generates the SHA-256 seal on submit.

Receiver name and actual delivery outcome must come from the person completing the delivery. Upload real, private POD photographs and capture a genuine signature if company policy requires it; never use test data as delivery evidence.
