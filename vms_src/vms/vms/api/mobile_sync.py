import json

import frappe
from frappe import _
from vms.api.permissions import validate_role


SYNC_ROLES = [
    "Driver",
    "Field Sales Agent",
    "Sales Manager",
    "Dispatcher",
    "Fleet Manager",
    "Accounts User",
    "Accounts Manager",
    "System Manager",
]
SUPERVISOR_ROLES = {"Dispatcher", "Fleet Manager", "System Manager"}


def _assert_sync_access():
    if frappe.session.user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)
    validate_role(SYNC_ROLES)
    return set(frappe.get_roles(frappe.session.user))


@frappe.whitelist()
def get_sync_bootstrap():
    """Return permission-aware reference data and only the caller's trip queue."""
    roles = _assert_sync_access()
    dataset = {
        "user": frappe.session.user,
        "server_time": frappe.utils.now_datetime(),
        "routes": frappe.get_list(
            "Route",
            fields=["name", "route_name", "origin_warehouse", "destination_territory"],
            limit_page_length=500,
        ),
        "modes_of_payment": frappe.get_list(
            "Mode of Payment", fields=["name", "type"], limit_page_length=100
        ),
    }

    if "Driver" in roles:
        if roles.intersection(SUPERVISOR_ROLES):
            dataset["trips"] = []
        else:
            from vms.api.driver_portal import get_authenticated_driver

            driver = get_authenticated_driver()
            dataset["trips"] = frappe.get_list(
                "Delivery Trip",
                filters={
                    "driver": driver,
                    "docstatus": 1,
                    "status": ["in", ["Dispatched", "In Transit"]],
                },
                fields=["name", "vehicle", "route", "departure_time", "status"],
                limit_page_length=200,
            )

    # Customer downloads are intentionally omitted; the customer search API
    # applies the current user's permission and territory rules.
    return dataset


# Backward compatibility alias
get_sync_dataset = get_sync_bootstrap


@frappe.whitelist()
def get_changes(since_timestamp=None):
    """Return permission-aware, user-scoped records for incremental sync."""
    roles = _assert_sync_access()
    since = since_timestamp or frappe.utils.add_days(frappe.utils.today(), -1)
    result = {"since": since, "server_time": frappe.utils.now_datetime()}

    if "Driver" in roles and not roles.intersection(SUPERVISOR_ROLES):
        from vms.api.driver_portal import get_authenticated_driver

        driver = get_authenticated_driver()
        result["updated_trips"] = frappe.get_list(
            "Delivery Trip",
            filters={
                "driver": driver,
                "modified": [">", since],
                "docstatus": 1,
            },
            fields=["name", "status", "modified"],
            limit_page_length=500,
        )
    elif roles.intersection(SUPERVISOR_ROLES):
        result["updated_trips"] = frappe.get_list(
            "Delivery Trip",
            filters={"modified": [">", since], "docstatus": 1},
            fields=["name", "status", "modified"],
            limit_page_length=500,
        )

    # Driver membership always suppresses finance data, even when the same
    # account has additional non-supervisor roles.
    if "Driver" not in roles:
        if roles.intersection({"Accounts User", "Accounts Manager", "System Manager"}):
            collection_filters = {"modified": [">", since]}
        else:
            collection_filters = {
                "sales_agent": frappe.session.user,
                "modified": [">", since],
            }
        result["updated_collections"] = frappe.get_list(
            "Payment Collection",
            filters=collection_filters,
            fields=["name", "status", "modified"],
            limit_page_length=500,
        )
    return result


@frappe.whitelist()
def push_changes(mutations_json):
    """Accept only idempotent field-agent Shop Visit creation from offline clients."""
    roles = _assert_sync_access()
    if "Driver" in roles or "Field Sales Agent" not in roles:
        frappe.throw(_("Offline mutations are available only to Field Sales Agents."), frappe.PermissionError)

    mutations = json.loads(mutations_json) if isinstance(mutations_json, str) else mutations_json
    if not isinstance(mutations, list) or len(mutations) > 100:
        frappe.throw(_("Submit a list of at most 100 mobile mutations."))

    results = []
    for mutation in mutations:
        client_id = str(mutation.get("id") or "").strip()
        data = mutation.get("data") or {}
        if not client_id or len(client_id) > 140:
            results.append({"client_id": client_id or None, "status": "error", "error": _("A valid mutation ID is required.")})
            continue
        if mutation.get("operation") != "insert" or mutation.get("doctype") != "Shop Visit" or not isinstance(data, dict):
            results.append({"client_id": client_id, "status": "error", "error": _("This offline operation is not supported.")})
            continue

        existing = frappe.db.get_value(
            "Shop Visit",
            {"client_mutation_id": client_id},
            ["name", "sales_agent"],
            as_dict=True,
        )
        if existing:
            if existing.sales_agent == frappe.session.user:
                results.append({"client_id": client_id, "server_id": existing.name, "status": "success", "replayed": True})
            else:
                results.append({"client_id": client_id, "status": "error", "error": _("Mutation ID is already in use.")})
            continue

        doc = frappe.new_doc("Shop Visit")
        doc.client_mutation_id = client_id
        doc.sales_agent = frappe.session.user
        for field in ("customer", "purpose", "notes", "next_followup_date"):
            if field in data:
                doc.set(field, data[field])
        for field in ("latitude", "longitude"):
            if data.get(field) not in (None, ""):
                doc.set(field, float(data[field]))
        for item in data.get("items") or []:
            if not isinstance(item, dict):
                frappe.throw(_("Each visit item must be an object."))
            doc.append("items", {
                "item_code": item.get("item_code"),
                "stock_level_at_shop": float(item.get("stock_level_at_shop") or 0),
                "customer_interest": item.get("customer_interest") or "Medium",
                "notes": item.get("notes"),
            })

        doc.insert()
        results.append({"client_id": client_id, "server_id": doc.name, "status": "success", "replayed": False})

    return {"processed": len(results), "results": results}


@frappe.whitelist()
def resolve_conflict(conflict_id, client_resolution):
    """Do not report success until a server-side conflict policy is implemented."""
    _assert_sync_access()
    frappe.throw(_("Conflict resolution is unavailable. Refresh the server record and retry."))
