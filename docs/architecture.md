# Keerthi ERP Next Web App — System Architecture

## 1. Architectural Model
The application is structured as a full-stack, layered modular monolith with a React 19 SPA frontend and an Express proxy adapter running in Node.js 22 (`server.ts`):

```
+--------------------------------------------------------------------------+
|                        BROWSER (React 19 SPA)                            |
|                                                                          |
|   +------------------------------------------------------------------+   |
|   |                       Presentation Layer                         |   |
|   |  - Header (Status, Latency, User, Persona Badge)                 |   |
|   |  - Sidebar (Role-filtered Business Modules)                      |   |
|   |  - Reusable Metadata Components (DocTypeList, DocTypeForm)       |   |
|   |  - Domain Screens (POS Billing, Financials, Reports Hub)         |   |
|   +---------------------------------+--------------------------------+   |
|                                     |                                    |
|   +---------------------------------v--------------------------------+   |
|   |                      Shared Core Services                        |   |
|   |  - httpClient (centralized requests, errors, timeouts, abort)    |   |
|   |  - authService (session health, login, logout, roles)            |   |
|   |  - metadataService (DocType schema, fields, in-memory TTL cache) |   |
|   |  - documentService (CRUD, count, submit, cancel)                 |   |
|   |  - reportService (Server queries: General Ledger, P&L, etc.)     |   |
|   |  - permissionService (Least-privilege role validation)           |   |
|   |  - attachmentService (Uploads, Link field auto-completion)       |   |
|   |  - queryBuilder (Safe filter tuples, sorting, pagination)        |   |
|   +---------------------------------+--------------------------------+   |
+-------------------------------------|------------------------------------+
                                      | HTTP Same-Origin (/api/erp/*)
+-------------------------------------v------------------------------------+
|                   EXPRESS BACKEND ADAPTER (server.ts)                    |
|                                                                          |
|   - Cookie Parser & Session Manager (HttpOnly `keerthi_sid`, CSRF)       |
|   - Origin & Host Verification (Cross-site request blocking)             |
|   - Redacted Structured Logging (credentials, secrets, cookies masked)   |
|   - Constrained Endpoints (No arbitrary upstream URL execution)          |
|   - Vite SPA Middleware (Dev) / Static Dist Fallback (Prod)              |
+-------------------------------------+------------------------------------+
                                      | HTTPS (Forwarded Cookies & Token)
+-------------------------------------v------------------------------------+
|               ERPNEXT v16 SERVER (erp.keerthigroup.co.in)                |
|                                                                          |
|   - Authoritative User Authentication (/api/method/login)                |
|   - Schema Metadata Loader (/api/method/frappe.desk.form.load.getdoctype)|
|   - Standard Resource CRUD (/api/resource/{doctype})                     |
|   - Document Submit & Cancel Lifecycle (docstatus 0 -> 1 -> 2)           |
|   - Financial Accounting & Stock Ledger Enforcement                      |
|   - Server Report Generation (/api/method/frappe.desk.query_report.run)  |
+--------------------------------------------------------------------------+
```

## 2. Key Design Decisions
1. **Zero Mock Data Principle**: No client-side mock fallback. When an API call fails or the user is not authenticated, the UI surfaces a clean `ErrorBanner` or `EmptyState` explaining the state.
2. **Authoritative Ledger & Stock**: Accounting and inventory math is executed by ERPNext v16; the browser never calculates financial statements independently.
3. **Secure Cookie Handling**: All credentials and tokens live in HttpOnly cookies managed by the server-side proxy; JavaScript never reads or exposes raw passwords or session tokens.
4. **Metadata-Driven Forms**: All DocType forms dynamically adapt to mandatory fields, read-only constraints, link options, and child tables loaded from ERPNext's `getdoctype`.
