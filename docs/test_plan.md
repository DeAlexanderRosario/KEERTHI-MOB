# Keerthi ERP Next Web App — Test Plan & Results

## 1. Automated Test Suites
Run command: `npm test` (using Node.js 22 built-in `--test` runner with `tsx`).

### Test Suite 1: HTTP Client & Error Normalization (`src/tests/client.test.ts`)
- [PASS] Unwraps `data` envelope from Frappe responses.
- [PASS] Unwraps `message` envelope from Frappe responses.
- [PASS] Passes raw payloads when no envelope wrapper exists.
- [PASS] Parses Frappe `_server_messages` JSON array and strips HTML tags.
- [PASS] Parses standard message strings.
- [PASS] Correctly maps HTTP status codes (401 -> `UNAUTHENTICATED`, 403 -> `FORBIDDEN`, 417 -> `VALIDATION`, etc.) to `ErpError`.

### Test Suite 2: Metadata Service Schema Logic (`src/tests/metadata.test.ts`)
- [PASS] Filters out Section Break, Column Break, and Tab Break fields from form inputs.
- [PASS] Correctly extracts list view columns based on `in_list_view` flag.
- [PASS] Extracts mandatory (`reqd = 1`) fields for pre-submission form validation.
- [PASS] Identifies child table fields (`fieldtype: Table`) and resolves options.

### Test Suite 3: Role & Persona Resolution (`src/tests/permission.test.ts`)
- [PASS] Resolves `Administrator` and `System Manager` to `system_admin` persona.
- [PASS] Resolves `Order Biller` role to `order_biller` persona with POS module default.
- [PASS] Resolves `Accounts User` to `accountant` persona with accounts module default.
- [PASS] Resolves `Stock User` to `stock_user` persona with stock module default.
- [PASS] Resolves `Delivery Staff` to `delivery_staff` persona with delivery module default.
- [PASS] Resolves `HR User` to `hr_user` persona with HR module default.

### Test Suite 4: Query Builder Constraints (`src/tests/queryBuilder.test.ts`)
- [PASS] Constructs typed filter tuples `[fieldname, operator, value]`.
- [PASS] Formats valid JSON search parameters for ERPNext list requests.
- [PASS] Enforces bounded pagination limits (max page length 100).

## 2. Live Verification Results
- **Target Host**: `https://erp.keerthigroup.co.in/`
- **Probe Status**: Connected (`200 OK`, average round-trip ~2500ms).
- **Authentication**: Tested `POST /api/method/login` with invalid credentials; received clean 401 `{"message":"Invalid login credentials","exc_type":"AuthenticationError"}`.
- **Custom Endpoint Audit**: Tested `POST /api/method/mobile_auth.login`; confirmed target server does not have `mobile_auth` installed (`"App mobile_auth is not installed"`). Handled properly via standard Frappe auth.
