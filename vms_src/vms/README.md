# KEERTHI Vehicle Management System (VMS)
**Platform:** Native Frappe v16 / ERPNext v16 Module  
**Business:** KEERTHI GROUPS HARDWARE (Building Materials, Steel & Cement Distribution)  

---

## 1. Overview
KEERTHI VMS is a 100% native Frappe v16 application built specifically to streamline logistics, dispatch planning, electronic Proof of Delivery (POD), field sales check-ins, customer onboarding, and independent payment collection directly within ERPNext Desk.

ERPNext acts as the single source of truth for all accounting, stock ledgers, and master records. VMS owns vehicle allocations, trips, stop progression, GPS telemetry, POD verification, and operational collection records.

---

## 2. Installation on ERPNext v16

### Standard Bench Installation:
```bash
# 1. Switch to bench user & directory
cd ~/frappe-bench

# 2. Fetch the app
bench get-app /path/to/vms.zip
# or from git:
# bench get-app https://github.com/keerthi/vms.git

# 3. Install app on target site
bench --site erp.keerthigroups.com install-app vms

# 4. Run migrations
bench --site erp.keerthigroups.com migrate

# 5. Build desk assets & restart
bench build --app vms
bench restart
```

---

## 3. Seven Role-Based Workspaces
1. **Vehicle Management:** Fleet records, vehicle utilization, active transit tracking.
2. **Field Sales:** Customer onboarding, shop visit check-ins, independent payment collection.
3. **Dispatch Management:** Sales orders awaiting allocation, vehicle load planning, trip dispatch approval.
4. **Warehouse Operations:** Picking lists, loading verification, warehouse discrepancy logging.
5. **Accounts Operations:** Operational collection verification, invoice allocation, ERPNext Payment Entry generation.
6. **Sales Management:** Agent visit analytics, customer pipeline, collection follow-ups.
7. **Executive Cockpit:** Management KPIs, delivery success rates, receivables, fleet utilization.

---

## 4. Key Architectural Guarantees
- **Strict Driver Boundary:** Drivers only deliver and record POD. Drivers never collect cash or handle COD.
- **Decoupled Collections:** Payment Collection by Sales Agents is completely independent of delivery status.
- **Accounting Integrity:** All financial postings occur strictly via ERPNext `Payment Entry`. No direct DB alterations.
- **Quantity Conservation:** Enforces Allocated = Delivered + Damaged + Short + Rejected on every POD.
- **Cryptographic Audit Seal:** SHA-256 seal computed on server over signatures, photographs, and timestamps.
