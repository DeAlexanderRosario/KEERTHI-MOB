# Keerthi ERP AI Studio Reference Bundle — with Dart SDK source

## Purpose
Use this bundle as a source-grounded reference for implementing the Keerthi ERP web app's shared ERPNext/Frappe communication logic and role-aware UI.

## Start here
1. `keerthi_ai_studio_core_logic_role_plan.json` — implementation requirements, architecture, roles, module plan, security rules, tests, and phased execution instructions.
2. `reference_files/dart_sdk_source/lib/` — primary Dart SDK source (unpacked from `lib.zip`).
3. `reference_files/dart_sdk_archives/` — original archives preserved unchanged: `lib.zip`, `api.zip`, `sync.zip`, `services.zip`, `test.zip`, `example.zip`.
4. `reference_files/frappe_sdk.dart` and `reference_files/pubspec.yaml` — package entry point and dependencies.
5. `reference_files/keerthi-erp-core-starter.zip` — earlier TypeScript/Next.js starter scaffold; treat as unverified scaffolding, not production-ready code.

## How to reuse Dart logic safely in a web app
- Treat Dart as the behavioral reference, not code to paste directly into React/Next.js. Reimplement the same contracts and behavior in TypeScript/JavaScript for the web target.
- Study `RestHelper`/HTTP handling, auth, `client.dart`, `doctype_service.dart`, `document_service.dart`, exceptions, query building, idempotency, sync engines, services, and their tests.
- Preserve semantics for request/response envelopes, filters, pagination, metadata-driven fields, permission checks, error classification, retries, and idempotency where applicable.
- Do not implement offline sync unless the web app actually requires it; adapt the architecture to browser/server constraints.
- Never expose API secrets or privileged credentials in browser code. Prefer secure server-side routes and HttpOnly session cookies where suitable.
- Do not assume custom methods such as `mobile_sync.*` or `/api/v2/method/mobile_auth.permissions` exist on the live ERPNext site. Verify them against the installed apps/server before using them.
- ERPNext/Frappe server permissions, document validation, workflow, accounting, stock, and ledger remain authoritative. UI hiding is not authorization.
- Do not use mock data as a silent fallback for failed live API calls. Show explicit loading/error/empty states.

## Recommended AI Studio instruction
Read the entire JSON plan and the Dart reference source before editing the existing web app. First map each Dart responsibility to a TypeScript service and test. Inspect the actual web project and its package scripts. Verify endpoints and auth behavior against the live/configured ERPNext installation before coding. Preserve existing UI unless a change is required. Implement in small phases, run tests/build/type-checks, and report changed files, verified endpoints, tests run, and any unverified assumptions.

## Included references
The test and example archives are included as context for expected behavior; examples are Flutter-specific and should not be transplanted into the web UI. The original archives are preserved alongside extracted copies for convenient browsing.
