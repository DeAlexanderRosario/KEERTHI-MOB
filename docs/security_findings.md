# Keerthi ERP Next Web App — Security Review & Audit Findings

## 1. Credential Security & Storage
- **Browser Protection**: No API keys, API secrets, or database passwords exist in the browser bundle or `VITE_*` environment variables.
- **Session Tokens**: Frappe `sid` and `csrf_token` are stored exclusively in HttpOnly, SameSite cookies (`keerthi_sid`, `keerthi_csrf`). Browser-side JavaScript cannot read or exfiltrate them.
- **Local Storage Policy**: Passwords and session IDs are never saved in `localStorage` or `sessionStorage`.

## 2. Proxy Governance
- **Constrained Target Scope**: The server adapter (`server.ts`) only connects to `ERPNEXT_BASE_URL` (`https://erp.keerthigroup.co.in/`). Arbitrary destination URLs are forbidden.
- **CSRF Defense**: All mutating HTTP methods (`POST`, `PUT`, `DELETE`) verify `Origin` and `Host` headers before forwarding upstream.
- **Whitelisted Endpoints**: The proxy exposes only explicit business operations (`/api/erp/auth/*`, `/api/erp/doctype/*`, `/api/erp/documents/*`, `/api/erp/reports/*`, `/api/erp/search/*`, `/api/erp/attachments/*`, `/api/erp/diagnostics/*`). Arbitrary method execution is prohibited.

## 3. Authorization & Permissions
- **Server-Authoritative Enforcement**: ERPNext server-side permissions (`User`, `Has Role`, DocType permissions) are authoritative. The frontend UI uses permission checks strictly for navigation visibility and disabling inaccessible controls.
- **Least-Privilege Principle**: Users are restricted to permitted documents and company scopes defined in ERPNext.
