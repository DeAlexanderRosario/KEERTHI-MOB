# AI Studio Build Brief: KEERTHI Driver & Field Sales Web App

Build a fast, simple, mobile-first web app that lets KEERTHI drivers and field sales agents complete their daily work with very few taps. This is a companion app for the existing KEERTHI VMS on Frappe v16; it must use the VMS APIs below rather than connecting to the database or rewriting business rules.

## Product goal

Make the common tasks easy to find and finish while standing at a customer site or delivery stop. A user should see their next task immediately after login. Keep forms short, use sensible defaults from the selected trip/customer, and show only fields needed for the action. Avoid long setup flows, duplicate entry, dense ERP tables, and unnecessary confirmation screens.

## Deliverables

Generate a runnable, installable Progressive Web App (PWA) using React + TypeScript. Include:

- Responsive app source, reusable API client, validation, and role-aware navigation.
- PWA manifest, app icons/placeholders, loading/error/empty/offline states, and accessible touch controls.
- `.env.example` with only a non-secret Frappe base URL setting.
- A Dockerfile and deployment notes for serving the web app beside the current ERP in Docker.
- README with local start/build instructions, API configuration, and test account setup.
- No API secrets, sample production data, or real credentials in source or build output.

Do not modify Frappe/ERPNext core, install another theme app, or change existing VMS APIs. Keep the new app separable from the current VMS app. Prefer serving it from the same HTTPS origin as Frappe (for example `/mobile`) so browser session cookies work without a cross-origin login setup. If a separate origin is required, describe a secure backend-for-frontend/OAuth approach; do not put API secrets in the browser.

## Users and access

Use individual Frappe accounts with the existing `Driver` or `Field Sales Agent` role. After login, call `vms.api.common.get_bootstrap` and show the matching workspace. Users with both roles may be shown a simple role switcher; do not merge their capabilities. Hide unsupported actions in the UI, but always treat server authorization as the final authority.

- Drivers see only their assigned trips/stops. They cannot collect or verify payments.
- Sales agents see only customers and records permitted by their assignments/customer scope. They can create orders and collections but cannot verify their own collections.
- Never accept a driver ID, sales-agent ID, or permission decision supplied by the client as proof of access. The VMS API derives identity and checks scope.

## Login and API rules

- Use Frappe authentication and the logged-in user's session. Use HTTPS in production.
- Send reads as `GET` and mutations as `POST` to `/api/method/<fully.qualified.method>`.
- Include the Frappe session cookie and CSRF token on cookie-authenticated write requests. If using Frappe's Desk runtime, prefer `frappe.call`; otherwise implement the documented session/CSRF behavior.
- Parse successful response values from the Frappe JSON `message` property. Show a concise human-readable error for rejected requests, permission errors, expired sessions, and connectivity failures. Never swallow an API error or display a false success state.
- Do not use direct `/api/resource` writes for VMS workflow records. Use the whitelisted workflow methods below so server validation and state transitions run.
- Do not hardcode passwords/API keys, put API tokens in local storage, or send credentials to analytics/logging services.

## UX direction and visual system

Use the KEERTHI ERP visual direction: charcoal `#090B0A`, brand green `#20D52E`, forest green `#0B4025`, white `#FFFFFF`, soft background `#F5F7F5`, border `#DCE5DE`. Keep contrast accessible; use the user's existing light/dark preference where possible.

- Premium, clean, high-contrast industrial operations UI. Use readable labels, clear status chips, large tap targets (minimum 44px), and plain language.
- Mobile first at 360px and 390px widths; also support tablet and desktop. Prevent horizontal page scrolling.
- Use a compact bottom navigation on phones and a simple side/top navigation on larger screens.
- Suggested Driver navigation: **Today**, **Trips**, **Profile**.
- Suggested Sales navigation: **Today**, **Customers**, **Visits**, **Orders**, **More** (collections/onboarding).
- Put the main action on the first screen. Do not make users navigate through ERP module menus.
- Show progress only when it helps; use inline editing, customer/item search, recent choices, prefilled values, and clear save/submit feedback.
- Status colors: completed/positive green, pending amber, failed/discrepancy red, neutral grey. Do not rely on color alone.

## Fast interaction requirements (high priority)

1. No unnecessary fields. Ask only for values required by the selected API or missing from the selected record.
2. Prefill trip, stop, customer, route, item, allocated quantities, dates and current user from API results. Never ask users to re-enter values already known.
3. Use search/select controls for customers and items; do not ask users to type IDs or document names.
4. Use one clear primary action per screen, sensible defaults, inline validation, and an immediately visible result.
5. Keep common actions within one or two taps from the home screen. Preserve form input if a request fails.
6. Don't show large tables on mobile. Use compact cards with the key facts and an expandable detail area.
7. Never invent GPS, status, price, stock, credit, trip, or payment data. Show “Unavailable” when the API has no value.

## Driver experience

### Driver home / trip list

Call `vms.api.driver_portal.get_my_trips` after login and on refresh. Sort with the current/next trip first when the API data supports it. Each card should show trip ID, route/date, vehicle, stop count/progress, and a single **Open trip** action. Provide clear loading, empty (“No trips assigned”), retry, and permission states.

### Trip detail and stops

Call `vms.api.driver_portal.get_trip_details` with the selected `trip_name`. Show the route, assigned vehicle, stops in sequence, customer name/address/contact, and status. Prefill stop/trip IDs internally; do not expose them as editable fields.

Actions:

- **Start trip** → `vms.api.driver_portal.start_trip` with `trip_name`.
- **I'm at this stop** → `vms.api.driver_portal.record_arrival` with `trip_name`, `stop_name`, and coordinates when device location is available and the user permits it. Send both `lat` and `lng`, or omit both; never send `0,0` as a placeholder.
- **Deliver / capture POD** → short single-screen form: receiver name, receiver phone, delivered/damaged/short/rejected quantities, optional signature, optional photos, optional delivery note, and optional GPS. Prefill the item and allocated quantity from trip details. The quantities must total the allocated quantity for each item.
- **Couldn't deliver** → `vms.api.driver_portal.record_failed_delivery` with trip, stop, and a required reason; coordinates are optional as a pair.
- **Ask to reschedule** → `vms.api.driver_portal.request_reschedule` with trip, stop, requested date, and required reason.

POD API:

```text
POST /api/method/vms.api.driver_portal.submit_pod
Required: trip_name, stop_name, receiver_name, receiver_phone, items_json
Optional: signature_base64, photos_json, lat, lng, delivery_notes
```

`items_json` entries contain `sales_order`, `sales_order_item`, `item_code`, `allocated_qty`, `delivered_qty`, `damaged_qty`, `short_qty`, and `rejected_qty`. For each item, the four outcome quantities must add up exactly to `allocated_qty`. `photos_json` entries contain `category`, `photo_url`, and optional `remarks`. Show selected photos as previews and allow removal before submit. If photos are uploaded separately, use the standard permitted Frappe file upload flow and pass the returned file URL as `photo_url`.

After submit, show the returned POD number and audit hash as read-only confirmation. The server records its own timestamp and computes the SHA-256 audit seal. Do not request a timestamp or hash from the driver and do not claim that GPS proves live tracking.

## Field Sales experience

### Sales home

Use `vms.api.field_sales.get_assigned_customers` with optional `territory`/`search_term` to provide a fast customer list and search. Show only useful context such as customer name, territory, contact and API-returned balances/credit information. Do not preload the entire Customer table.

### Customer context and item selection

- `vms.api.field_sales.get_customer_context` with `customer` for customer details/credit context.
- `vms.api.field_sales.get_item_context` with `item_code` and optional `customer` for item selling context.
- Use API-provided results; render an explicit empty/unavailable value if optional customer credit configuration is missing.

### Shop visit (fast form)

Call `vms.api.field_sales.create_shop_visit` with `customer`, `purpose`, and optional `notes`, `lat`, `lng`, `follow_up_date`, `items`. Keep the first screen to customer (preselected if opened from a customer), a small purpose choice, and **Save visit**. Put optional stock/interest observations behind a compact **Add item note** action. Item entries may contain `item_code`, `order_qty`, `stock_level_at_shop`, `customer_interest`, and `notes`. Capture GPS only with permission; send a coordinate pair or omit both.

Use `vms.api.field_sales.complete_shop_visit` with `visit_name`, `outcome`, and optional `follow_up_date`/`notes` when the agent completes the visit. Show the created visit ID in a small confirmation, not as a field the user has to copy.

### Sales order (quick capture)

Call `vms.api.field_sales.create_sales_order` with `customer`, `items_json`, and optional `delivery_date`. Item entries contain `item_code` and positive `qty`. Do not ask for or send a selling rate: the server derives the authoritative rate from the customer's price list and rejects missing prices. Show the server-returned order ID and total after creation. Provide **My orders** using `vms.api.field_sales.get_my_sales_orders`.

### Collection (quick capture)

Use `vms.api.collections.create_payment_collection` with `customer`, `amount`, `mode_of_payment`, optional `transaction_reference`, and optional `allocations_json`. Allocation entries contain `sales_invoice` and `allocated_amount`. Keep the first form short; show invoice allocation only when the agent requests it. This API submits the collection immediately. Make the final button explicit (for example **Submit collection**) and show its returned collection ID. Do not present it as an unsaved draft. Agents can view their records with `vms.api.collections.get_my_collections`; payment verification is an Accounts workflow, not a sales-agent action.

### Customer onboarding (when the shop is new)

Use `vms.api.customer.submit_onboarding_request` with required `customer_name`, `territory`, and `mobile_no`. Optional fields are `gst_in`, `address`, `proposed_credit_limit` (default `0`), `documents_json`, `owner_name`, and `email`. Keep optional fields collapsed under **More details**. Onboarding creates a request for later review; don't imply that it creates an approved customer immediately.

## Data and reliability

- Show a small last-updated/network status; allow a manual refresh.
- Default to online-first behavior. Do not replay queued POST requests automatically. If offline draft support is added later, define an explicit review/retry queue and use the VMS `mobile_sync` endpoints only after their supported data and conflict behavior are understood.
- Prevent double taps on submit while a request is in progress. The driver start/arrival workflows are designed to tolerate retries, but the client must still display the server result and must not submit POD twice.
- For session expiry, preserve unsent form data locally for the current device session, send the user to sign in again, and never persist passwords or API secrets.
- Handle API failures with a short message, the affected action, and a Retry button where safe. Do not show internal exception traces to users.

## Suggested API client shape

Create one typed API helper that prefixes the configured Frappe base URL, includes session credentials, handles CSRF for writes, unwraps the `message` field, and converts Frappe errors into safe UI messages. Keep API names and argument shapes in one module. The app must not make direct SQL or call Frappe core internals.

Example endpoint call (same-origin session already established):

```text
GET /api/method/vms.api.driver_portal.get_my_trips
POST /api/method/vms.api.field_sales.create_shop_visit
POST /api/method/vms.api.field_sales.create_sales_order
```

The exact current API catalog and signatures are in `API_DOCUMENTATION.md`. Frappe reference: [REST API](https://docs.frappe.io/framework/user/en/api/rest) and [Authentication](https://docs.frappe.io/framework-git/rest-api/authentication).

## Acceptance checklist

### Speed and mobile

- At 360px, 390px, tablet, and desktop widths, no page-level horizontal overflow; all primary buttons are reachable and touch-sized.
- A driver can open an assigned trip, start it, record arrival, and submit a valid POD without manually typing trip/customer/item IDs.
- A sales agent can find an assigned customer, record a visit, create an order, and submit a collection with minimal typing and no client-entered price.
- Main action is clear on each screen; optional details are collapsed; existing selections and entered values survive validation/network errors.
- Loading, no-data, unavailable, API-error, permission-denied, and session-expired states are understandable and do not look like successful completion.

### Security and workflow

- Driver cannot access an unassigned trip or customer and cannot create/view a payment collection.
- Field Sales Agent cannot access an out-of-scope customer or verify their own payment collection.
- Client-supplied rates are ignored; the server price is shown after order creation.
- POD quantity mismatch is blocked; successful POD confirmation uses the server-returned POD name and audit hash.
- Frappe API secrets are absent from source, browser storage, and production bundles.
- Test the app with separate Driver and Field Sales Agent accounts and use the project's Postman flow collection as a backend reference.

## Existing project references

- `API_DOCUMENTATION.md` — complete current custom API reference.
- `api-tests/KEERTHI_VMS_Sales_to_POD.postman_collection.json` — sales-to-delivery/POD flow requests.
- `api-tests/KEERTHI_VMS_Isolated_API_Test.postman_environment.json` — API test environment template; populate credentials privately and never commit them.
- `API_FLOW_TESTER.md` — isolated API flow test guidance.

