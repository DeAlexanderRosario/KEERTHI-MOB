# KEERTHI VMS Issue Register & Resolution Log

| Issue ID | Severity | Description | Resolution Applied |
| :--- | :--- | :--- | :--- |
| **VMS-BUG-001** | CRITICAL | Nested directory path `vms/vms/vms` caused Frappe resource loader to fail discovering Number Cards and Workspaces. | Consolidated all modules into standard canonical path `vms/vms/`. Added migration patch `reconcile_vms_doctypes`. |
| **VMS-BUG-002** | HIGH | Legacy driver-COD logic allowed drivers to record cash collections, violating strict segregation of duties. | Purged all cash collection fields from Driver workflows. Created independent `Payment Collection` DocType strictly for Field Sales Agents. |
| **VMS-BUG-003** | CRITICAL | Direct database manipulation on Sales Invoice status was risking accounting ledger desynchronization. | Refactored verification workflow to generate standard ERPNext `Payment Entry` documents through standard Frappe controllers. |
| **VMS-BUG-004** | HIGH | Client-submitted allocated quantities allowed potential quantity falsification at stop delivery. | Locked allocated quantities against server-side database records. Enforced mathematical conservation formula. |
| **VMS-BUG-005** | MEDIUM | Mobile Control integration queried `fields=["*"]`, causing performance degradation and data leakage. | Restricted mobile endpoints to explicit field whitelists and role-based DocType permissions. |
