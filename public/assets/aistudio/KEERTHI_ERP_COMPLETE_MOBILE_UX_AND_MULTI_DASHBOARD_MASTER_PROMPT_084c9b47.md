# KEERTHI ERP — Unified Master Prompt
## Complete Mobile-First UI/UX Refactor + Role-Aware Multi-Dashboard Analytics

**Target environment:** Google AI Studio / coding agent with access to the existing KEERTHI ERP repository  
**Existing frontend:** React + Vite  
**Backend:** ERPNext v16 / Frappe  
**Primary devices:** Android phones and mobile browsers; also tablet and desktop  
**Execution mode:** Inspect → plan → implement directly → test → report

> **How to use:** Open the existing KEERTHI ERP project/repository in your coding environment, provide this entire prompt, and ensure the agent has permission to read and edit the project files. This prompt is an implementation specification, not permission to invent backend capabilities or production data.


## A. Global mission and non-negotiable constraints

Transform the EXISTING KEERTHI ERP frontend into a production-quality, mobile-first ERP application with specialised, role-aware dashboards. The existing stack is React + Vite and the backend is ERPNext v16 / Frappe. Implement directly in the current repository. Do not create a demo, parallel app, static mockup, or replacement backend.

Preserve the existing:
- React + Vite architecture, routing, component conventions and state management unless a demonstrated technical reason requires a controlled change.
- ERPNext API endpoints, request/response contracts, field names, authentication/session handling, CSRF handling, permission checks and business rules.
- Invoice, tax, discount, stock, accounting, procurement, delivery and HR calculations.
- Existing working modules, routes, workflows and user access.
- Actual server data only. Never insert sample customers, products, invoices, stock quantities, employee records, financial metrics or simulated successful API responses into production screens.

Before changing code, inspect the entire repository and create a Git checkpoint or safe backup. If no Git repository exists, create a non-destructive backup. Record the current build status before editing. Make small, reversible changes and verify after each major phase.

Act as a senior ERP product architect, business intelligence designer, React engineer, data analyst, accessibility specialist and mobile UX engineer. Think through information architecture, metric definitions, permissions, API/data flow and responsive behaviour before implementing. Do not stop at an audit report: continue into implementation and testing.

## B. Repository audit before implementation

Inspect and map:
- package.json, lockfile, installed dependencies and build scripts.
- Application entry points, React tree, routing and route guards.
- Global CSS, CSS modules, Tailwind configuration and responsive breakpoints.
- Header, sidebar, bottom navigation, module selector and tabs.
- Dashboard and every existing module page.
- List/grid views, filters, search, forms, dialogs, empty/loading/error states.
- POS, cart, checkout, invoice creation and submission flows.
- ERPNext API clients/services, endpoint definitions, response parsing and error handling.
- Authentication, session persistence, CSRF token handling, logout and account switching.
- State management, caching, request deduplication and data refresh behaviour.
- Role/permission handling and any company/warehouse scoping.
- Existing charting libraries and reusable UI components.

Discover actual modules and routes from source. Candidate areas include Dashboard, Sales, Customers, Buying/Procurement, Suppliers, Material Requests, Supplier Quotations, Purchase Orders, Accounts, Sales Invoices, Purchase Invoices, Payment Entries, Counter POS, Inventory, Stock, Delivery Notes, Delivery Trips, HR, Employees, Attendance and Leave Applications. Do not assume every candidate exists.

Explicitly diagnose:
1. Why bottom navigation overlaps page content or important checkout/workflow controls.
2. Whether fixed, sticky or absolute positioning causes inconsistent layout.
3. Whether page containers use inconsistent widths, padding or bottom offsets.
4. Horizontal tab overflow, clipped labels and active-tab visibility.
5. Duplicate/conflicting CSS and breakpoint rules.
6. Android viewport-height and browser chrome behaviour.
7. Safe-area insets and system navigation bar interaction.
8. Keyboard-open behaviour for inputs, forms, POS and dialogs.
9. Oversized cards, unnecessary minimum heights and excessive empty space.
10. Duplicated components and redundant API requests.
11. Module switching, route transitions and avoidable data reloads.
12. Placeholder/mock records or calculations that could be mistaken for live data.

Produce an internal audit and dependency map grounded in the actual source. Do not invent findings. Then implement.

## C. Product information architecture: dashboards are not modules

Maintain four distinct layers:
- Dashboard: tells the user what is happening.
- Analytics: explains why it is happening.
- Module: lets the user perform the business transaction.
- Reports: supports detailed investigation and export.

Create one ERP with multiple specialised dashboards, one shared data architecture, one metric registry and one coherent design system. Do not put every KPI and chart on one giant dashboard. Each dashboard must have a distinct decision-making purpose, audience and drill-down destinations.

Implement these dashboards only where supported by actual data, routes and permissions:
1. Executive Dashboard — overall business health and management decisions.
2. Sales Dashboard — revenue, orders, customers, products and sales-team performance.
3. Purchasing Dashboard — procurement expenditure, supplier performance and purchasing requirements.
4. Inventory Intelligence — stock movement, demand, stock health and replenishment.
5. Accounts Dashboard — receivables, payables, cash flow, collections and payments.
6. Delivery Dashboard — fulfilment, dispatch, delivery notes, trips and delays.
7. HR Dashboard — workforce, attendance, leave and employee information.
8. Operations Dashboard — daily priorities, bottlenecks, approvals and actionable exceptions.

Dashboard selection:
- Resolve the default dashboard from authorised user preferences and actual role/user configuration.
- Show only dashboards the current user is authorised to access.
- Support users with multiple roles.
- Remember the last selected dashboard only where permitted.
- Provide a configurable default where supported.
- Never rely on frontend hiding as a security boundary; backend permissions remain authoritative.
- If no dashboard is authorised, show a clear access-denied or permitted fallback state.
- Do not hardcode assumptions about role names without inspecting actual ERPNext roles and configuration.

## D. Mobile-first design system and responsive application shell

Brand direction: premium, minimalist, operational enterprise software. Preserve KEERTHI ERP's charcoal, white and lime identity.

Use these semantic tokens unless the existing project already has equivalent tokens:
- Primary charcoal: #111318
- App background: #F3F5F8
- Surface: #FFFFFF
- Secondary text: #64748B
- Muted text: #94A3B8
- Border: #E2E8F0
- Accent lime: #84CC16
- Transactional action blue: #2563EB
- Success: #059669
- Warning: #D97706
- Danger: #DC2626

Visual rules:
- Strong hierarchy, readable typography, restrained colour and subtle borders/shadows.
- Avoid excessive gradients, glassmorphism, oversized headings, excessive rounded cards and unnecessary animation.
- Keep content dense enough for daily operations without making touch targets cramped.
- Use tabular numerals for financial values.
- Prevent truncation of important labels, identifiers, amounts and statuses.
- Use consistent semantic status colours and sufficient contrast.

Suggested sizing:
- Mobile page padding: 16–20px.
- Card padding: about 16px.
- Card gap: 12–16px.
- Section gap: 20–24px.
- Inputs: 48–52px high.
- Buttons: 46–52px high.
- Minimum touch target: 44×44px.
- Card radius: 16–22px; input radius: about 12px.
- Page title: 24–28px desktop, scaled appropriately on small phones.
- Section title: 17–20px; card title: 15–17px; body: 14–16px; secondary: 12–13px.

Create or standardise reusable components, reusing existing equivalents where possible:
ApplicationHeader, PageHeader, ModuleHeader, DashboardSwitcher, DashboardHeader, DateRangeFilter, KpiCard, TrendCard, ChartCard, RankingList, AlertCard, ActivityFeed, BottomNavigation, HorizontalTabs, SearchField, PrimaryButton, SecondaryButton, StatusBadge, EmptyState, LoadingSkeleton, ErrorState, RecordCard, SectionCard, ConfirmationDialog, ResponsiveFormField, FilterDrawer and ResponsiveDataTable.

Do not add a UI library or charting dependency unless the audit proves it is needed.

### Global header and module navigation
- Keep KEERTHI ERP identity visible and consistent.
- Provide accessible profile/account actions.
- Preserve logout and account-switch behaviour.
- Prevent header overflow and reduce wasted vertical space.
- Provide one consistent All Modules entry point.
- Show the current module title.
- Respect permissions; unavailable modules must not appear as active choices.

### Mobile bottom navigation
Use a consistent, premium floating-pill treatment on mobile, with labels and accessible names:
- Home — house
- People — users
- Billing — receipt
- Reports — chart
- Modules — grid

Preserve existing routes and permissions; map destinations to actual routes rather than inventing routes. Highlight the active destination. Do not use this five-item mobile navigation as desktop navigation. Desktop should use an appropriate sidebar/top navigation.

The mobile navigation must:
- Never cover page content, procurement steps, POS cart, totals, checkout buttons or form controls.
- Respect `env(safe-area-inset-bottom)` and Android browser safe areas.
- Reserve sufficient bottom scroll padding in every route/layout.
- Handle short-height screens.
- Avoid interfering with keyboard-open states; hide, reposition or otherwise handle it safely while editing forms.
- Use consistent positioning across all modules.

### Horizontal tabs
- Use genuine horizontal scrolling where necessary.
- Never squeeze tabs until labels become unreadable or clipped.
- Keep the active tab visible and bring it into view when selection changes.
- Preserve swipe/touch interaction.
- Prevent accidental page-level horizontal scrolling.
- Use consistent active/inactive states.

## E. Dashboard-specific content and mobile layout

Use the eight-dashboard content definitions in the attached dashboard specification (included verbatim in the appendix). The following mobile and operational rules apply across all dashboards:
- On phones, use a readable one-column primary KPI layout or a two-column grid only when each card remains legible.
- Use full-width charts on narrow screens; allow analytical sections to scroll vertically.
- Use compact operational lists and avoid large empty chart containers.
- Load primary KPIs first; do not block the dashboard while secondary charts load.
- Provide loading, error, no-data, stale-data and permission-aware states for every widget.
- Show last-updated time and active filters.
- Provide meaningful chart titles, legends, units, currency, tooltips and drill-down actions.
- Never draw a misleading zero-data chart. Distinguish zero from unavailable, no records and API failure.
- Use the appropriate chart type: line for time series, horizontal bar for rankings, stacked bar/donut for composition, revenue/profit comparison for profitability, ageing buckets for receivables/payables, actual-vs-target for target progress, heatmap for demand variation and stock movement time series for movement.
- Avoid decorative graphs that do not answer a business question.

### Executive dashboard
Keep it high-level: Total Sales, Sales Growth, Gross Profit, Gross Margin, Purchase Value, Outstanding Receivables, Outstanding Payables and Cash/Bank Balance. Show monthly sales, revenue vs purchase, gross profit trend, target progress, revenue by item group, top customers and top revenue-generating products. Operational widgets should surface pending sales/purchase orders, pending deliveries, low stock, overdue receivables, approvals and recent transactions. Drill down to specialised dashboards instead of duplicating their full analysis.

### Sales dashboard
Include daily/monthly sales, growth, invoice count, average invoice value, returns, outstanding orders and target achievement. Analyse daily/weekly/monthly trends, target vs actual, customer/item-group contribution, top products, salesperson performance and new vs repeat customers. Include top products/customers, salesperson ranking, pending orders and recent invoices. Support revenue, volume, acquisition, repeat purchasing, average selling price, product contribution and return-rate analysis.

### Purchasing dashboard
Include monthly purchase value, PO count, pending POs, pending receipts, pending purchase invoices, supplier count and average PO value. Analyse purchase trends, supplier/item-group contribution, PO status, lead time and purchase-price variation. Show top suppliers, pending orders/receipts, supplier comparisons and recently purchased items. Support supplier reliability, lead time, price history, supplier concentration, reorder requirements and fulfilment.

### Inventory intelligence and product performance
Include stock valuation/quantity, available/reserved/incoming stock, low-stock count, slow-moving count and non-moving count. Analyse stock movement, stock vs sales, fast/slow rankings, ABC/XYZ, valuation by item group, warehouse distribution, demand heatmap and turnover trend. Surface low stock, potential stockouts, excess/dead stock, reorder recommendations, rising/declining demand.

Provide individual product intelligence where data supports it:
- Quantity sold, revenue, gross profit/margin, average selling price.
- Customer count and repeat purchase frequency.
- Daily sales velocity and monthly demand.
- Current stock, turnover and days of inventory.
- Last sale date, purchase history and returns.
- Forecast demand only when sufficient history exists.

Movement classes: Fast Moving, Medium Moving, Slow Moving, Non Moving, Seasonal and New Product. Make thresholds configurable. Do not label new products as dead stock. Separate sales from stock transfers. Show historical evidence for classifications. Distinguish no sales from unavailable data. Explain forecast limitations.

### Accounts dashboard
Include receivables, payables, cash/bank balances, collections, supplier payments, overdue customer and supplier invoices. Analyse cash flow, receivable/payable ageing, collections, payments, monthly income/expenses and profitability. Show top outstanding customers, overdue invoices, upcoming payments, recent payments and unallocated payments.

### Delivery dashboard
Include total delivery notes, pending, ready for dispatch, in transit, completed, delayed and returned deliveries. Analyse daily volume, status distribution, on-time vs delayed, customer volume and performance trends. Show pending deliveries, recent delivery notes, trips and delayed orders. Do not imply a delivery state unless supported by actual ERPNext fields/workflow.

### HR dashboard
Include active employees, present/absent/on-leave today, pending leave applications and attendance percentage. Analyse attendance trends, department attendance, leave trends and employee distribution. Show directory, pending leave, attendance exceptions and recent joiners. Respect HR permissions and date selection.

### Operations dashboard
Prioritise today's actionable work: approvals, sales/purchase/delivery bottlenecks, low stock, unpaid invoices, recent transactions and system/API alerts. Show responsible user where available; distinguish overdue from upcoming; avoid repeated context-free alerts; link directly to affected records.

## F. Shared filters and metric governance

Relevant shared filters: Company, Date Range, Warehouse, Item Group, Customer and Supplier. Date presets: Today, Yesterday, This Week, Last 7 Days, This Month, Previous Month, Last 3 Months, Last 6 Months, This Year, Previous Year and Custom Range.

Only show filters relevant to each dashboard. Preserve filters during drill-down. Show active filters and a reset action. Use consistent timezone boundaries. Never mix company currencies. Provide comparison periods where meaningful.

Create a central metric registry. Each KPI must document:
- Business definition and formula.
- Source DocType/fields or trusted existing API.
- Document status inclusion/exclusion.
- Date basis and timezone.
- Company, currency and warehouse scope.
- Return/credit-note treatment.
- UOM and currency precision.
- Permission requirements.
- Known limitations and minimum data sufficiency.

All dashboards must use shared calculations. Do not calculate the same KPI independently in multiple components.

Metric definitions to validate against the actual ERPNext setup:
- Net Sales: posted sales revenue adjusted for applicable returns and credit notes.
- Gross Profit: net sales less valid corresponding cost of goods sold.
- Gross Margin: gross profit / net sales × 100, where denominator is valid.
- Purchase Value: posted purchase invoice value with appropriate return adjustments.
- Receivables: outstanding customer balances from authoritative accounting data.
- Stock Valuation: ERPNext stock valuation.
- Sales Velocity: net quantity sold divided by eligible selling days.
- Days of Inventory: available inventory divided by average daily demand, only where sufficient data exists.

Validate all definitions against ERPNext v16 accounting configuration, stock valuation method, UOM conversions, returns, credit notes and transaction status. Do not assume a simple frontend sum is financially authoritative. Prefer ERPNext reports/aggregations or existing trusted APIs for accounting-sensitive values.

## G. Module-level UI/UX requirements

### Existing dashboard and onboarding
- Keep the dark financial summary card if it fits the established brand.
- Improve greeting and user identity.
- Show annual invoiced sales from actual posted ERPNext data.
- Show pending delivery/billing orders, customers, sales orders, catalogue items and delivery notes where supported.
- Make metric cards clickable only when a valid destination exists.
- Make setup progress compact and actionable.
- Reduce empty chart height; show a compact no-data state.
- Show recent actual invoices and a direct create-invoice action only when permitted.
- Distinguish zero from unavailable and draft from submitted.

### Procurement
Keep the four-step workflow: Add Supplier → Add Item → Place PO → Enter Bill. Use compact actionable cards, accurate completion logic and clear statuses. Do not mark a step complete merely because a record exists if the workflow requires a later status. Show purchase-order metrics, pending goods receipts, pending purchase invoices, annual purchase value and supplier count. Preserve supplier, material request and quotation functionality.

### Delivery management
Preserve Delivery Notes and Delivery Trips. Use compact empty states and responsive record cards showing identifier, customer, date, relevant status and actions. Provide search/filters and list/grid views where supported. Empty state text: “No delivery notes found” and “No matching delivery notes are available from the ERPNext server.” Show Create Delivery Note only if permitted. Distinguish no records from API failure.

### Counter POS and billing — P0
Optimise for fast, reliable, one-handed billing:
- Compact searchable customer selector using actual ERPNext customers; clearly show selected customer and allow change/clear.
- Responsive product search by item name and item code.
- Product results show name, code, selling price, UOM and stock only when available/relevant.
- Never silently assign zero price when selling price is missing. Prevent invalid/unavailable item addition where applicable.
- Compact cart with item count, rows, quantity controls, remove action, unit price and line total.
- Preserve cart state appropriately during navigation and follow existing duplicate-item business rules.
- Show subtotal, ERPNext-calculated taxes/charges, supported discounts and prominent payable total.
- Support Save as Draft and Submit Official Invoice only if the current integration and permissions support them.
- Prevent invalid and duplicate submissions.
- Preserve ERPNext calculations and server-side validation.
- Show success/error feedback and created document identifier.
- Never label a draft as submitted.
- Keep checkout accessible without being obscured by bottom navigation or keyboard.
- Use sticky checkout summary only if it does not cover content.

### Accounts
Preserve Sales Invoices, Purchase Invoices and Payment Entries. Fix clipped tabs. Show identifier, customer/supplier, amount, posting date, due date and accurate draft/submitted/paid/unpaid/overdue status. Provide status filters, search and create actions. Respect currency precision and keep draft/submitted records distinct. Do not infer payment status from incomplete frontend data.

### HR
Preserve Employee Directory, Daily Attendance and Leave Applications. Fix clipped labels. Use compact employee cards with name, ID, department, designation and status where available. Provide attendance date selection and actual present/absent/on-leave counts. Show leave statuses accurately. Respect HR permissions and preserve create/edit flows.

### Lists, grids, search and forms
- Standardise list/grid toggles and retain view state consistently.
- Keep search/filter placement consistent and preserve server-side filtering/pagination.
- Record cards should show identifier/title, party/employee, relevant date, amount where relevant, status and contextual action.
- Provide accurate record counts, loading skeletons, compact empty states and retryable error states.
- Debounce search requests and avoid duplicate network calls.
- Forms use consistent labels, validation, accessible focus, suitable input sizing and keyboard-safe scrolling.
- Confirmation dialogs must identify the action and consequences clearly.

## H. API, authentication, permissions and data protection — critical

Keep the existing API integration unless source inspection proves a specific defect. Inspect endpoints before adding anything. Reuse current services and request/response structures.

Never:
- Replace ERPNext or migrate to another ERP.
- Rewrite API integration without necessity.
- Change endpoint names or payload fields without proof and compatibility plan.
- Remove CSRF protection, session validation, authentication or permission checks.
- Expose API secrets, tokens or credentials.
- Trust frontend role visibility as authorization.
- Insert mock records or fake API success.
- Modify ERPNext accounting, tax, pricing, stock or document submission calculations.
- Make destructive database/schema changes for a visual redesign.

Preserve the separation:
1. Presentation layer — components and responsive layouts.
2. Business logic layer — existing business rules and calculations.
3. API layer — existing ERPNext services/contracts.
4. State layer — existing state management and cache.

Keep API calls out of presentation components where the current architecture supports service separation. Handle network, unauthorized, forbidden, validation, malformed/empty response and server errors distinctly. Avoid duplicate requests, preserve authentication across navigation and keep server validation authoritative. Use server-side aggregation for large datasets and efficient pagination; never fetch unbounded transaction histories to calculate dashboard KPIs in the browser.

For analytics, inspect existing APIs and ERPNext reports first. If a new backend aggregation is genuinely required, document why, implement the smallest permission-checked addition, and do not weaken existing security. Scope by company, user permissions and warehouse restrictions. Verify that restricted data cannot leak through dashboard APIs.

## I. Performance, accessibility and responsive acceptance

Test these exact viewports:
- 320×640 small Android.
- 360×800 standard Android.
- 393×852 modern Android.
- 430×932 large Android.
- 768×1024 tablet.
- 1440×900 desktop.

Acceptance:
- No unintended horizontal page scrolling.
- No clipped buttons, labels, tabs or identifiers.
- No overlapping cards or content hidden behind navigation.
- No keyboard-obscured primary form actions.
- Safe-area support on Android browsers.
- Touch targets at least 44×44px where practical.
- Keyboard navigation and visible focus indicators on desktop.
- Accessible names for icon-only controls.
- Readable contrast and practical text scaling.
- Desktop navigation remains appropriate and usable.
- Lazy-load noncritical analytics where useful.
- Avoid excessive animations, large unnecessary assets and layout shifts.
- Optimise list rendering and chart work.
- Cache analytics sensibly with clear invalidation.
- Show data freshness and stale warnings.

## J. Implementation order

1. Create Git checkpoint/backup and record baseline build/test status.
2. Audit repository, routes, modules, APIs, permissions and components.
3. Diagnose mobile navigation, tabs, spacing, viewport and keyboard issues.
4. Design dashboard ownership map, role matrix, route map and metric registry.
5. Implement shared design tokens and reusable shell/components.
6. Fix header, module selector, bottom navigation, safe areas and horizontal tabs.
7. Implement shared analytics service and metric selectors using existing APIs.
8. Implement Executive Dashboard.
9. Implement Sales and Purchasing dashboards.
10. Implement Inventory Intelligence and product-level analytics.
11. Implement Accounts, Delivery, HR and Operations dashboards.
12. Refine procurement, delivery, POS, accounts, HR and generic list/form screens.
13. Add filters, drill-downs, freshness, loading/error/empty states.
14. Verify real ERPNext data and role/company/warehouse permissions.
15. Run responsive, accessibility, functional and regression tests.
16. Fix issues and run final production build.
17. Capture before/after screenshots at mobile and desktop sizes.
18. Produce a truthful implementation report.

Do not ask for approval between phases. If a feature cannot be implemented safely because the backend does not expose required data or permissions, do not fake it. Implement the supported parts, document the exact blocker and propose the smallest safe backend/API change separately.

## K. Mandatory verification checklist

Verify, where the existing project supports each workflow:
- Application starts and production build succeeds.
- Authentication, session persistence and logout.
- All existing routes and module navigation.
- Dashboard switcher and permission filtering.
- Actual ERPNext data, date filters and drill-downs.
- Customer search and item search.
- POS cart add/update/remove and totals.
- Tax/discount calculations unchanged.
- Draft invoice creation and submitted invoice flow.
- Duplicate-submit prevention and document ID feedback.
- Supplier, procurement, PO and receipt flows.
- Delivery notes and delivery trips.
- Sales/purchase invoices and payment entries.
- Employee, attendance and leave interfaces.
- Search, filters, pagination and list/grid state.
- Loading, empty, stale and error states.
- Unauthorized/forbidden response handling.
- Bottom navigation never obscures content.
- Tabs remain accessible on narrow screens.
- Android keyboard and safe-area behaviour.
- No unintended horizontal overflow at all target sizes.
- Desktop remains usable.
- No critical console/runtime errors.

Do not claim a test passed unless it was actually run. Clearly separate implemented, verified, partially verified and blocked items.

## L. Final report

Deliver a structured Markdown report containing:
1. Root-cause audit findings with evidence and affected files.
2. Existing module/route/API/component inventory.
3. Dashboard information architecture and dashboard-to-role matrix.
4. Metric registry and source/definition notes.
5. Files created, modified and removed (with reasons).
6. Shared components and design-system changes.
7. Navigation, safe-area, tab and responsive changes.
8. Dashboard and module improvements.
9. ERPNext API/authentication/permission preservation details.
10. Tests actually run and their results.
11. Production build result.
12. Before/after screenshots.
13. Remaining limitations, blockers and risks.

## M. Final execution instruction

Start by inspecting the existing repository, not by writing new dashboard screens. Understand the real application, API contracts, permissions and business logic. Back up first. Design the information architecture and metric governance before implementation. Then refactor the existing application in controlled phases. Build specialised dashboards with distinct purposes, real ERPNext data, shared calculations, role-aware access and excellent mobile UX. Preserve every working workflow. Test the result at the specified viewports and run the production build. Deliver the working implementation and an honest report. A beautiful static dashboard, mock data, or successful build alone is not completion.


---

# Appendix 1 — Supplied Multi-Dashboard Architecture Specification (preserved)

The following JSON is the supplied dashboard specification. Treat it as a detailed requirements source and reconcile it with the actual repository before implementation. If a requested feature is not supported by existing modules, APIs, data or permissions, document that limitation rather than fabricating it.

```json
{
  "project": {
    "name": "KEERTHI ERP",
    "initiative": "Multi-Dashboard Architecture and Complete UI/UX Redesign",
    "version": "2.0",
    "backend": "ERPNext v16 / Frappe",
    "frontend": "Existing React + Vite application",
    "targets": [
      "Android mobile",
      "Mobile browser",
      "Tablet",
      "Desktop"
    ],
    "implementation_type": "Refactor existing application",
    "primary_goal": "Create a unified, role-aware, multi-dashboard business intelligence and operations interface."
  },
  "master_mission": {
    "description": "Transform KEERTHI ERP into a complete multi-dashboard enterprise application. Each dashboard serves a specific business responsibility with relevant KPIs, graphs, alerts, performance measurements and operational shortcuts.",
    "principles": [
      "One ERP system",
      "Multiple specialised dashboards",
      "One shared data architecture",
      "One consistent design system",
      "Different dashboards for different responsibilities",
      "Actual ERPNext data only",
      "Role-aware information access",
      "Mobile-first interaction design",
      "Deep analytics without dashboard clutter",
      "Fast access to business operations"
    ],
    "separation": {
      "dashboard": "Understand what is happening.",
      "analytics": "Understand why it is happening.",
      "module": "Perform the actual business operation.",
      "reports": "Investigate and export detailed records."
    },
    "important": "Do not place every business metric and graph on one dashboard. Distribute information by business purpose, user responsibility and decision-making needs."
  },
  "phase_01_existing_project_investigation": {
    "priority": "MANDATORY",
    "instruction": "Inspect the existing repository completely before implementing the new architecture.",
    "inspect": [
      "package.json",
      "Application entry point",
      "React component hierarchy",
      "Routing system",
      "Global CSS",
      "Tailwind configuration if used",
      "Existing design system",
      "Header and navigation",
      "Dashboard components",
      "All module pages",
      "ERPNext API service layer",
      "Authentication system",
      "Session management",
      "Role and permission handling",
      "Existing chart libraries",
      "Existing data fetching and caching",
      "State management",
      "Error handling",
      "Reusable components"
    ],
    "discover_existing_modules": [
      "Dashboard",
      "Sales",
      "Customers",
      "Buying and Procurement",
      "Suppliers",
      "Material Requests",
      "Supplier Quotations",
      "Purchase Orders",
      "Accounts",
      "Sales Invoices",
      "Purchase Invoices",
      "Payment Entries",
      "Counter POS",
      "Inventory",
      "Stock",
      "Delivery",
      "Delivery Notes",
      "Delivery Trips",
      "HR",
      "Employees",
      "Attendance",
      "Leave Applications"
    ],
    "deliverables": [
      "Existing module inventory",
      "Existing route inventory",
      "Existing API inventory",
      "Existing permission model",
      "Existing component inventory",
      "Current dashboard assessment",
      "Proposed component architecture",
      "Implementation dependency map"
    ],
    "rule": "Do not assume all listed modules exist. Verify each against source code and the live application."
  },
  "phase_02_dashboard_architecture": {
    "architecture": "Multi-dashboard with shared analytics services",
    "dashboards": [
      {
        "id": "executive",
        "name": "Executive Dashboard",
        "audience": [
          "Business Owner",
          "Managing Director",
          "Management"
        ],
        "purpose": "Understand overall financial and operational health.",
        "priority": 1
      },
      {
        "id": "sales",
        "name": "Sales Dashboard",
        "audience": [
          "Sales Manager",
          "Sales Executive"
        ],
        "purpose": "Understand sales revenue, orders, customers, product sales and sales team performance.",
        "priority": 2
      },
      {
        "id": "purchasing",
        "name": "Purchasing Dashboard",
        "audience": [
          "Purchase Manager",
          "Purchase Executive"
        ],
        "purpose": "Understand procurement expenditure, supplier performance and purchase requirements.",
        "priority": 3
      },
      {
        "id": "inventory",
        "name": "Inventory Intelligence",
        "audience": [
          "Inventory Manager",
          "Storekeeper",
          "Warehouse Manager"
        ],
        "purpose": "Understand stock movement, product demand, inventory health and replenishment.",
        "priority": 4
      },
      {
        "id": "accounts",
        "name": "Accounts Dashboard",
        "audience": [
          "Accountant",
          "Finance Manager"
        ],
        "purpose": "Monitor receivables, payables, cash flow, collections and financial performance.",
        "priority": 5
      },
      {
        "id": "delivery",
        "name": "Delivery Dashboard",
        "audience": [
          "Delivery Manager",
          "Dispatch Executive"
        ],
        "purpose": "Monitor fulfilment, dispatches, delivery notes and pending deliveries.",
        "priority": 6
      },
      {
        "id": "hr",
        "name": "HR Dashboard",
        "audience": [
          "HR Manager",
          "HR Executive"
        ],
        "purpose": "Monitor employee activity, attendance, leave and workforce information.",
        "priority": 7
      },
      {
        "id": "operations",
        "name": "Operations Dashboard",
        "audience": [
          "Operations Manager",
          "Management"
        ],
        "purpose": "Identify operational bottlenecks and tasks requiring immediate attention.",
        "priority": 8
      }
    ],
    "dashboard_selection": {
      "default": "Resolve from authorised user preferences and role configuration.",
      "requirements": [
        "Show only authorised dashboards",
        "Remember last selected dashboard where permitted",
        "Provide configurable default dashboard",
        "Support multiple roles per employee",
        "Do not expose restricted data through dashboard switching"
      ],
      "fallback": "Show an authorised default dashboard or access-denied state."
    }
  },
  "phase_03_dashboard_content_distribution": {
    "executive_dashboard": {
      "objective": "Business health and management decisions.",
      "kpis": [
        "Total Sales",
        "Sales Growth",
        "Gross Profit",
        "Gross Profit Margin",
        "Purchase Value",
        "Outstanding Receivables",
        "Outstanding Payables",
        "Cash and Bank Balance"
      ],
      "graphs": [
        "Monthly Sales Trend",
        "Revenue versus Purchase Trend",
        "Gross Profit Trend",
        "Sales versus Target",
        "Revenue by Item Group",
        "Top Customers",
        "Top Revenue Generating Products"
      ],
      "operational_widgets": [
        "Pending Sales Orders",
        "Pending Purchase Orders",
        "Pending Deliveries",
        "Low Stock Alerts",
        "Overdue Receivables",
        "Pending Approvals",
        "Recent Business Transactions"
      ],
      "rules": [
        "Keep this dashboard high level.",
        "Avoid detailed transaction tables dominating the screen.",
        "Provide drill-down into specialised dashboards.",
        "Do not duplicate the complete Inventory or Accounts dashboards."
      ]
    },
    "sales_dashboard": {
      "objective": "Sales growth and commercial performance.",
      "kpis": [
        "Daily Sales",
        "Monthly Sales",
        "Sales Growth",
        "Invoice Count",
        "Average Invoice Value",
        "Sales Returns",
        "Outstanding Sales Orders",
        "Sales Target Achievement"
      ],
      "graphs": [
        "Daily Sales Trend",
        "Weekly Sales Trend",
        "Monthly Sales Trend",
        "Sales Target versus Actual",
        "Sales by Customer",
        "Sales by Item Group",
        "Top Selling Products",
        "Salesperson Performance",
        "New versus Repeat Customers"
      ],
      "tables": [
        "Top 10 Products",
        "Top 10 Customers",
        "Salesperson Ranking",
        "Pending Sales Orders",
        "Recent Sales Invoices"
      ],
      "analysis": [
        "Revenue growth",
        "Sales volume growth",
        "Customer acquisition",
        "Repeat purchasing",
        "Average selling price",
        "Product sales contribution",
        "Return percentage"
      ]
    },
    "purchasing_dashboard": {
      "objective": "Purchasing control and supplier performance.",
      "kpis": [
        "Monthly Purchase Value",
        "Purchase Order Count",
        "Pending Purchase Orders",
        "Pending Receipts",
        "Pending Purchase Invoices",
        "Supplier Count",
        "Average Purchase Order Value"
      ],
      "graphs": [
        "Purchase Value Trend",
        "Purchase by Supplier",
        "Purchase by Item Group",
        "Purchase Order Status",
        "Supplier Lead Time",
        "Purchase Price Variation",
        "Monthly Procurement Trend"
      ],
      "tables": [
        "Top Suppliers",
        "Pending Purchase Orders",
        "Purchase Receipt Pending",
        "Supplier Price Comparison",
        "Recently Purchased Items"
      ],
      "analysis": [
        "Supplier reliability",
        "Purchase lead time",
        "Purchase price history",
        "Supplier concentration",
        "Reorder requirements",
        "Purchase fulfilment"
      ]
    },
    "inventory_dashboard": {
      "objective": "Complete inventory intelligence.",
      "kpis": [
        "Total Stock Valuation",
        "Total Stock Quantity",
        "Available Stock",
        "Reserved Stock",
        "Incoming Stock",
        "Low Stock Count",
        "Slow Moving Product Count",
        "Non Moving Product Count"
      ],
      "graphs": [
        "Stock Movement Trend",
        "Stock versus Sales",
        "Fast Moving Product Ranking",
        "Slow Moving Product Ranking",
        "ABC Analysis",
        "XYZ Analysis",
        "Stock Valuation by Item Group",
        "Warehouse Distribution",
        "Product Demand Heatmap",
        "Stock Turnover Trend"
      ],
      "widgets": [
        "Low Stock Alerts",
        "Potential Stockouts",
        "Excess Stock",
        "Dead Stock",
        "Reorder Recommendations",
        "Products with Increasing Demand",
        "Products with Declining Demand"
      ],
      "product_intelligence": {
        "enabled": true,
        "features": [
          "Individual product performance",
          "Quantity sold",
          "Revenue",
          "Gross profit",
          "Gross margin",
          "Average selling price",
          "Customer count",
          "Repeat purchase frequency",
          "Daily sales velocity",
          "Monthly demand",
          "Current stock",
          "Stock turnover",
          "Days of inventory",
          "Last sale date",
          "Purchase history",
          "Returns",
          "Forecast demand"
        ],
        "movement_classes": [
          "Fast Moving",
          "Medium Moving",
          "Slow Moving",
          "Non Moving",
          "Seasonal",
          "New Product"
        ],
        "rules": [
          "Make classification thresholds configurable.",
          "Distinguish no sales from unavailable data.",
          "Do not classify new products as dead stock.",
          "Separate actual sales from stock transfers.",
          "Display historical evidence supporting classifications."
        ]
      }
    },
    "accounts_dashboard": {
      "objective": "Financial control and cash management.",
      "kpis": [
        "Accounts Receivable",
        "Accounts Payable",
        "Cash Balance",
        "Bank Balance",
        "Collections",
        "Supplier Payments",
        "Overdue Customer Invoices",
        "Overdue Supplier Invoices"
      ],
      "graphs": [
        "Cash Flow Trend",
        "Receivables Ageing",
        "Payables Ageing",
        "Collections Trend",
        "Payment Trend",
        "Monthly Income",
        "Monthly Expenses",
        "Profitability Trend"
      ],
      "tables": [
        "Top Outstanding Customers",
        "Overdue Invoices",
        "Upcoming Payments",
        "Recent Payment Entries",
        "Unallocated Payments"
      ]
    },
    "delivery_dashboard": {
      "objective": "Order fulfilment and delivery monitoring.",
      "kpis": [
        "Total Delivery Notes",
        "Pending Delivery",
        "Ready for Dispatch",
        "In Transit",
        "Completed Deliveries",
        "Delayed Deliveries",
        "Delivery Returns"
      ],
      "graphs": [
        "Daily Delivery Trend",
        "Delivery Status Distribution",
        "On Time versus Delayed",
        "Delivery Volume by Customer",
        "Delivery Performance Trend"
      ],
      "tables": [
        "Pending Deliveries",
        "Recent Delivery Notes",
        "Delivery Trips",
        "Delayed Orders"
      ]
    },
    "hr_dashboard": {
      "objective": "Workforce and attendance management.",
      "kpis": [
        "Active Employees",
        "Present Today",
        "Absent Today",
        "On Leave",
        "Pending Leave Applications",
        "Attendance Percentage"
      ],
      "graphs": [
        "Attendance Trend",
        "Department Attendance",
        "Leave Trend",
        "Employee Distribution"
      ],
      "tables": [
        "Employee Directory",
        "Pending Leave Applications",
        "Attendance Exceptions",
        "Recently Joined Employees"
      ]
    },
    "operations_dashboard": {
      "objective": "Daily operational control.",
      "widgets": [
        "Today's Priorities",
        "Pending Approvals",
        "Sales Order Bottlenecks",
        "Purchase Order Bottlenecks",
        "Delivery Bottlenecks",
        "Low Stock Alerts",
        "Unpaid Invoices",
        "Recent Transactions",
        "System and API Alerts"
      ],
      "requirements": [
        "Prioritise actionable issues.",
        "Provide direct navigation to affected records.",
        "Show responsible user where available.",
        "Distinguish overdue from upcoming tasks.",
        "Avoid repeated alerts without context."
      ]
    }
  },
  "phase_04_metric_governance": {
    "priority": "CRITICAL",
    "objective": "Create one central definition for every business metric.",
    "requirements": [
      "Every KPI must have a documented definition and known source.",
      "Every metric must have a date basis and company scope.",
      "All dashboards must use shared calculations.",
      "Respect permissions and document status.",
      "Distinguish actual values from forecasts and gross values from net values.",
      "Account for credit notes, returns and cancellations.",
      "Do not independently calculate the same metric in different dashboards."
    ],
    "metric_registry": [
      {
        "id": "net_sales",
        "name": "Net Sales",
        "definition": "Posted sales revenue adjusted for applicable returns and credit notes.",
        "source": "ERPNext accounting and Sales Invoice data"
      },
      {
        "id": "gross_profit",
        "name": "Gross Profit",
        "definition": "Net sales less valid corresponding cost of goods sold.",
        "source": "ERPNext valuation and accounting records"
      },
      {
        "id": "gross_margin",
        "name": "Gross Margin",
        "definition": "Gross profit divided by net sales multiplied by 100.",
        "source": "Shared financial calculation"
      },
      {
        "id": "purchase_value",
        "name": "Purchase Value",
        "definition": "Posted purchase invoice value with appropriate return adjustments.",
        "source": "Purchase Invoice and accounting records"
      },
      {
        "id": "receivables",
        "name": "Receivables",
        "definition": "Outstanding customer balances.",
        "source": "Accounts receivable accounting records"
      },
      {
        "id": "stock_valuation",
        "name": "Stock Valuation",
        "definition": "Inventory valuation according to ERPNext stock valuation.",
        "source": "Stock ledger and valuation data"
      },
      {
        "id": "sales_velocity",
        "name": "Sales Velocity",
        "definition": "Net quantity sold divided by selected eligible selling days.",
        "source": "Sales Invoice Item data"
      },
      {
        "id": "inventory_days",
        "name": "Days of Inventory",
        "definition": "Available inventory divided by average daily demand, where sufficient data exists.",
        "source": "Current stock and historical sales"
      }
    ],
    "validation": "Validate definitions against actual ERPNext accounting configuration, UOM rules, valuation methods and transaction status."
  },
  "phase_05_shared_dashboard_filters": {
    "global_filters": [
      "Company",
      "Date Range",
      "Warehouse",
      "Item Group",
      "Customer",
      "Supplier"
    ],
    "date_presets": [
      "Today",
      "Yesterday",
      "This Week",
      "Last 7 Days",
      "This Month",
      "Previous Month",
      "Last 3 Months",
      "Last 6 Months",
      "This Year",
      "Previous Year",
      "Custom Range"
    ],
    "rules": [
      "Show only relevant filters per dashboard.",
      "Preserve filters during drill-down.",
      "Clearly display active filters.",
      "Provide reset option.",
      "Use consistent timezone boundaries.",
      "Do not mix company currencies.",
      "Support comparison periods where meaningful."
    ]
  },
  "phase_06_visualisation_system": {
    "chart_mapping": {
      "time_series": "Line chart",
      "ranking": "Horizontal bar chart",
      "composition": "Stacked bar or donut chart",
      "profitability": "Revenue and profit comparison",
      "ageing": "Ageing bucket bar chart",
      "target_progress": "Actual versus target",
      "demand_variation": "Calendar heatmap",
      "stock_comparison": "Grouped bar chart",
      "movement": "Inventory movement time series"
    },
    "requirements": [
      "Meaningful chart titles",
      "Correct units and currency",
      "Useful legends and tooltips",
      "Loading, error and no-data states",
      "Relevant chart drill-down",
      "Consistent series definitions",
      "Avoid excessive colours",
      "Avoid meaningless zero-data graphs"
    ]
  },
  "phase_07_mobile_first_design": {
    "brand": {
      "primary": "#111318",
      "background": "#F3F5F8",
      "surface": "#FFFFFF",
      "secondary_text": "#64748B",
      "border": "#E2E8F0",
      "accent": "#84CC16",
      "action": "#2563EB",
      "success": "#059669",
      "warning": "#D97706",
      "danger": "#DC2626"
    },
    "design_direction": "Premium minimalist enterprise application.",
    "shared_components": [
      "ApplicationHeader",
      "DashboardSwitcher",
      "DashboardHeader",
      "DateRangeFilter",
      "KpiCard",
      "TrendCard",
      "ChartCard",
      "RankingList",
      "AlertCard",
      "ActivityFeed",
      "EmptyState",
      "LoadingSkeleton",
      "ErrorState",
      "FilterDrawer",
      "BottomNavigation",
      "ResponsiveDataTable"
    ],
    "mobile_layout": [
      "Single-column primary KPI layout where appropriate",
      "Compact two-column KPI grid when readable",
      "Scrollable analytics sections",
      "Full-width charts on small screens",
      "Horizontal scrolling only for suitable tabs or comparisons",
      "Compact operational lists",
      "Sticky controls only when useful",
      "Safe-area-aware bottom navigation",
      "No overlapping content",
      "No clipped labels"
    ],
    "desktop_layout": [
      "Responsive multi-column dashboard grid",
      "Larger analytical charts",
      "Detailed data tables",
      "Optional persistent dashboard navigation",
      "Appropriate sidebar and header layout"
    ],
    "viewports": [
      "320x640",
      "360x800",
      "393x852",
      "430x932",
      "768x1024",
      "1440x900"
    ]
  },
  "phase_08_dashboard_navigation": {
    "primary_navigation": [
      "Home",
      "People",
      "Billing",
      "Reports",
      "Modules"
    ],
    "dashboard_switcher": {
      "location": "Dashboard header",
      "style": "Compact dropdown or mobile bottom sheet",
      "features": [
        "List authorised dashboards",
        "Dashboard descriptions",
        "Active dashboard indication",
        "Remember last selected dashboard",
        "Role-based availability"
      ]
    },
    "rules": [
      "Do not place eight dashboard icons in bottom navigation.",
      "Do not confuse dashboards with ERP modules.",
      "Dashboards provide insights.",
      "Modules provide business transactions.",
      "Reports provide detailed investigation and exports."
    ]
  },
  "phase_09_role_based_access": {
    "requirements": [
      "Inspect actual ERPNext roles and user permissions.",
      "Map dashboards to authorised roles.",
      "Support multiple roles.",
      "Support explicit user-specific dashboard permissions where appropriate.",
      "Respect company and warehouse restrictions.",
      "Do not trust frontend visibility as a security boundary.",
      "Enforce access on the backend.",
      "Do not expose restricted analytics through APIs."
    ],
    "default_dashboard_strategy": "Use configurable dashboard assignment, not hardcoded role-name assumptions.",
    "fallback": "Show a permitted dashboard or access-denied state when no dashboard is authorised."
  },
  "phase_10_erpnext_data_architecture": {
    "backend": "Existing ERPNext v16",
    "preferred_sources": [
      "Sales Invoice",
      "Sales Invoice Item",
      "Sales Order",
      "Sales Order Item",
      "Purchase Invoice",
      "Purchase Invoice Item",
      "Purchase Order",
      "Purchase Order Item",
      "Delivery Note",
      "Delivery Note Item",
      "Payment Entry",
      "GL Entry",
      "Account",
      "Customer",
      "Supplier",
      "Item",
      "Item Group",
      "Bin",
      "Warehouse",
      "Stock Ledger Entry",
      "Employee",
      "Attendance",
      "Leave Application"
    ],
    "architecture": [
      "Existing ERPNext API service layer",
      "Shared analytics data service",
      "Metric definition and calculation layer",
      "Dashboard-specific data selectors",
      "Reusable chart components",
      "Dashboard presentation components"
    ],
    "rules": [
      "Inspect existing API endpoints before creating new ones.",
      "Reuse existing working API integrations.",
      "Use server-side aggregation for large datasets.",
      "Use efficient pagination.",
      "Avoid fetching entire transaction histories.",
      "Use actual company and permission filters.",
      "Do not expose credentials.",
      "Do not bypass authentication.",
      "Do not introduce mock production data."
    ]
  },
  "phase_11_data_quality_and_reliability": {
    "requirements": [
      "Distinguish zero from unavailable",
      "Distinguish no records from API failure",
      "Display last updated timestamp",
      "Show stale data warnings where appropriate",
      "Handle incomplete historical periods",
      "Handle cancelled transactions",
      "Handle returns and credit notes",
      "Handle UOM conversions",
      "Handle multiple warehouses",
      "Handle different currencies correctly",
      "Prevent duplicate counting",
      "Identify insufficient data for forecasting"
    ],
    "every_dashboard": [
      "Loading state",
      "Error state",
      "Empty state",
      "Data freshness indicator",
      "Permission-aware content",
      "Retry behaviour"
    ]
  },
  "phase_12_performance_and_caching": {
    "requirements": [
      "Avoid duplicate API requests",
      "Cache appropriate analytics",
      "Use sensible cache invalidation",
      "Debounce search and filter interactions",
      "Lazy-load noncritical analytics",
      "Optimise chart rendering",
      "Paginate large tables",
      "Avoid excessive component rerenders",
      "Do not block primary dashboard rendering while loading secondary charts"
    ]
  },
  "phase_13_implementation_strategy": [
    {
      "stage": 1,
      "name": "Repository Investigation",
      "tasks": [
        "Inspect source code",
        "Map modules and APIs",
        "Identify current roles",
        "Audit existing dashboard",
        "Identify reusable components",
        "Document architectural risks"
      ]
    },
    {
      "stage": 2,
      "name": "Dashboard Information Architecture",
      "tasks": [
        "Create dashboard ownership map",
        "Define information distribution",
        "Define metric registry",
        "Define role permissions",
        "Define dashboard drill-down destinations"
      ]
    },
    {
      "stage": 3,
      "name": "Shared Design System",
      "tasks": [
        "Standardise typography",
        "Standardise cards",
        "Standardise chart containers",
        "Standardise filters",
        "Standardise navigation",
        "Fix safe-area behaviour"
      ]
    },
    {
      "stage": 4,
      "name": "Executive Dashboard",
      "tasks": [
        "Implement business KPI cards",
        "Implement sales and purchase trends",
        "Implement profit analysis",
        "Implement operational alerts",
        "Implement drill-down navigation"
      ]
    },
    {
      "stage": 5,
      "name": "Specialised Dashboards",
      "tasks": [
        "Implement Sales",
        "Implement Purchasing",
        "Implement Inventory",
        "Implement Accounts",
        "Implement Delivery",
        "Implement HR",
        "Implement Operations"
      ]
    },
    {
      "stage": 6,
      "name": "Product Intelligence",
      "tasks": [
        "Implement product rankings",
        "Implement individual product analytics",
        "Implement movement classifications",
        "Implement demand patterns",
        "Implement inventory alerts",
        "Implement forecasting where data supports it"
      ]
    },
    {
      "stage": 7,
      "name": "Integration and Verification",
      "tasks": [
        "Test live ERPNext data",
        "Verify metric calculations",
        "Verify role-based access",
        "Verify dashboard filters",
        "Verify chart drill-down",
        "Verify navigation",
        "Verify mobile layouts",
        "Verify production build"
      ]
    }
  ],
  "phase_14_acceptance_criteria": {
    "architecture": [
      "Eight specialised dashboards are available where supported by actual modules and permissions.",
      "Dashboards have clear and nonduplicative purposes.",
      "Shared metric definitions are used.",
      "Dashboard switching works.",
      "Permissions are enforced."
    ],
    "visual": [
      "Consistent visual language",
      "Mobile-first responsive design",
      "Readable KPI cards",
      "Appropriate graphs",
      "Functional date filters",
      "Useful empty states",
      "No navigation overlap",
      "No clipped tabs"
    ],
    "data": [
      "Real ERPNext data",
      "Correct date filtering",
      "Accurate calculations",
      "Correct document statuses",
      "No duplicate revenue",
      "No invented stock figures",
      "Clear forecast limitations"
    ],
    "technical": [
      "Existing authentication works",
      "Existing API integrations work",
      "Existing module routes work",
      "Production build succeeds",
      "No critical console errors",
      "No critical runtime errors",
      "No broken business workflows"
    ]
  },
  "phase_15_final_deliverables": [
    "Repository audit report",
    "Dashboard information architecture",
    "Dashboard-to-role matrix",
    "Dashboard-to-module mapping",
    "Metric definition registry",
    "Shared component architecture",
    "Eight dashboard implementations",
    "Responsive mobile interfaces",
    "Analytics visualisations",
    "Product intelligence",
    "API integration verification",
    "Permission verification",
    "Production build report",
    "Before and after screenshots",
    "Known limitations report"
  ],
  "execution_rules": {
    "backup": "Create a Git checkpoint or backup before modifications.",
    "inspect_first": true,
    "implement_directly": true,
    "preserve_existing_api": true,
    "preserve_business_logic": true,
    "preserve_authentication": true,
    "preserve_existing_routes": true,
    "no_mock_production_data": true,
    "no_fake_financial_metrics": true,
    "no_unverified_success_claims": true,
    "no_unnecessary_framework_migration": true,
    "no_unnecessary_dependency_installation": true,
    "no_destructive_database_changes": true
  },
  "final_instruction": "Act as a senior ERP product architect, business intelligence designer, React engineer and mobile UX specialist. First study the entire existing KEERTHI ERP repository and understand the actual ERPNext v16 integration. Design the information architecture before writing dashboard code. Distribute business information according to user responsibilities. Create a central metric definition and analytics architecture so every dashboard uses consistent calculations. Implement specialised dashboards with distinct purposes, shared components and role-based access. Build mobile and desktop interfaces. Connect actual ERPNext data. Test every critical workflow. Do not create attractive static dashboards or mockup screens. Deliver a working implementation inside the existing application."
}
```
