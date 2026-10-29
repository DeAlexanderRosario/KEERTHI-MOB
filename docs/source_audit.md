# Keerthi ERPNext v16 Web App — Source Audit Report

## 1. Executive Summary
This audit reviews the Keerthi Groups ERPNext web application and its integration with the live ERPNext v16 instance (`https://erp.keerthigroup.co.in/`). The application has been upgraded to a full-stack TypeScript architecture with zero mock data, real cookie-based authentication, and a centralized shared communication core replicating the Dart SDK capabilities.

## 2. Framework & Environment
- **Frontend**: React 19 SPA running on Vite 8 with Tailwind CSS v4 and Lucide React icons.
- **Backend Adapter**: Node.js v22 Express server (`server.ts`) running on port 3000, mounting `/api/erp/*` routes and Vite middleware.
- **Target ERPNext**: ERPNext v16 / Frappe v16 at `https://erp.keerthigroup.co.in/`.
- **Session Model**: Server-side HttpOnly cookie storage (`keerthi_sid` and `keerthi_csrf`) preventing browser-side token exfiltration.
- **CSRF Defense**: Origin and Host validation on all mutating requests (`POST`, `PUT`, `DELETE`).

## 3. Mock Data & Fallback Audit
- **Mock Arrays**: Scanned all services and components. All hardcoded mock invoices, fake customer lists, randomized revenue charts, and demo personas have been completely eradicated.
- **Silent Fallbacks**: Any network error, permission failure (403), or invalid credential (401) immediately surfaces as a visible `ErrorBanner` with the exact server error message, HTTP status code, and correlation trace ID.
- **Analytics & Calculations**: Tax, total amount, and ledger entries are strictly calculated and posted by ERPNext server routines (`frappe.desk.query_report.run` and standard document controllers).

## 4. Dart SDK Mapping
The Dart SDK (`frappe_mobile_sdk`) behavioral patterns have been mapped directly into modular TypeScript services:
- `RestHelper` -> `src/services/httpClient.ts` (with timeout, abort controller, JSON envelope parsing)
- `AuthService` -> `src/services/authService.ts` (session state, role subscriptions)
- `DocTypeService` -> `src/services/metadataService.ts` (schema parsing, caching)
- `DocumentService` -> `src/services/documentService.ts` (CRUD, submit, cancel)
- `ReportService` -> `src/services/reportService.ts` (General Ledger, Trial Balance, P&L, Balance Sheet)
- `AttachmentService` -> `src/services/attachmentService.ts` (upload, link search)
- `PermissionService` -> `src/services/permissionService.ts` (least-privilege role checking)
- `QueryBuilder` -> `src/services/queryBuilder.ts` (filter tuples, order, pagination)
