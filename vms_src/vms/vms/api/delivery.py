import frappe
from frappe import _
from vms.api.common import validate_role_access

@frappe.whitelist()
def get_pod_details(pod_name):
    """Retrieves full verified Proof of Delivery document with item breakdowns."""
    validate_role_access(["Dispatcher", "Fleet Manager", "Accounts User", "System Manager"], "view POD")
    pod = frappe.get_doc("Proof of Delivery", pod_name)
    return {
        "name": pod.name,
        "delivery_trip": pod.delivery_trip,
        "customer": pod.customer,
        "receiver_name": pod.receiver_name,
        "receiver_phone": pod.receiver_phone,
        "server_timestamp": pod.server_timestamp,
        "audit_hash": pod.audit_hash,
        "items": [it.as_dict() for it in pod.items],
        "photos": [p.as_dict() for p in pod.photos]
    }

@frappe.whitelist()
def get_delivery_history(customer=None, limit=50):
    """Returns historical completed trips and verified PODs."""
    validate_role_access(["Dispatcher", "Fleet Manager", "Sales Manager", "System Manager"], "view delivery history")
    filters = {"docstatus": 1}
    if customer:
        filters["customer"] = customer
        
    return frappe.get_all(
        "Proof of Delivery",
        filters=filters,
        fields=["name", "delivery_trip", "customer", "receiver_name", "server_timestamp", "status", "audit_hash"],
        order_by="server_timestamp desc",
        limit=int(limit)
    )

@frappe.whitelist()
def get_delivery_note_status(trip_name):
    """Checks whether Delivery Notes have been generated for a given trip."""
    validate_role_access(["Dispatcher", "Fleet Manager", "Accounts User", "System Manager"], "view Delivery Note status")
    trip = frappe.get_doc("Delivery Trip", trip_name)
    notes = frappe.get_list(
        "Delivery Note",
        filters={"vms_delivery_trip": trip_name, "docstatus": ["!=", 2]},
        fields=["name", "customer", "grand_total", "status", "posting_date"],
        limit_page_length=100,
    )
    return {"trip_name": trip_name, "delivery_notes": notes}

@frappe.whitelist()
def generate_delivery_notes_for_trip(trip_name):
    """
    Generates standard ERPNext Delivery Notes from completed Delivery Trip items.
    INVARIANTS:
    - Uses ONLY verified delivered quantities from Proof of Delivery Item (delivered_qty > 0).
    - Prevents duplicate Delivery Notes per trip & sales order.
    - Idempotent and safe.
    """
    validate_role_access(["Dispatcher", "Fleet Manager", "System Manager"], "generate Delivery Note")
    trip = frappe.get_doc("Delivery Trip", trip_name)
    if trip.docstatus != 1 or trip.status not in ["Completed", "In Transit", "Dispatched"]:
        frappe.throw(_("Trip {0} must be Dispatched, In Transit or Completed to generate Delivery Notes.").format(trip_name))
    
    # Collect verified delivered quantities across all submitted PODs for this trip
    pods = frappe.get_list(
        "Proof of Delivery",
        filters={"delivery_trip": trip_name, "docstatus": 1},
        fields=["name", "customer"],
        limit_page_length=500,
    )
    if not pods:
        frappe.throw(_("No submitted Proof of Delivery found for trip {0}. Cannot generate Delivery Notes without verified delivery.").format(trip_name))
        
    created_notes = []
    
    for pod_summary in pods:
        # Serialize creation per POD so concurrent requests cannot create duplicate DNs.
        frappe.db.sql(
            "SELECT name FROM `tabProof of Delivery` WHERE name = %s AND docstatus = 1 FOR UPDATE",
            pod_summary.name,
        )
        pod = frappe.get_doc("Proof of Delivery", pod_summary.name)
        if not pod.audit_hash or pod.compute_audit_hash() != pod.audit_hash:
            frappe.throw(_("POD {0} evidence no longer matches its audit seal.").format(pod.name), frappe.ValidationError)

        by_order = {}
        for it in pod.items:
            delivered = float(it.delivered_qty or 0)
            if delivered > 0:
                if not it.sales_order_item:
                    frappe.throw(_("POD item {0} is missing its Sales Order Item reference.").format(it.item_code))
                so_item = frappe.db.get_value(
                    "Sales Order Item", it.sales_order_item,
                    ["parent", "item_code"], as_dict=True
                )
                if not so_item or so_item.item_code != it.item_code or so_item.parent != it.sales_order:
                    frappe.throw(_("POD item Sales Order references are inconsistent."), frappe.ValidationError)
                so_customer = frappe.db.get_value("Sales Order", so_item.parent, "customer")
                if so_customer != pod.customer:
                    frappe.throw(_("POD customer does not match its Sales Order."), frappe.ValidationError)
                order_items = by_order.setdefault(so_item.parent, {})
                order_items[it.sales_order_item] = order_items.get(it.sales_order_item, 0.0) + delivered

        for so_name, delivered_by_line in by_order.items():
            existing_dn = frappe.db.get_value(
                "Delivery Note",
                {"vms_pod_reference": pod.name, "vms_sales_order": so_name, "docstatus": ["!=", 2]},
                "name",
            )
            if existing_dn:
                continue

            from erpnext.selling.doctype.sales_order.sales_order import make_delivery_note

            dn = make_delivery_note(so_name, kwargs={"filtered_children": list(delivered_by_line)})
            if not dn or not dn.items:
                frappe.throw(_("ERPNext could not map submitted Sales Order {0} to a Delivery Note.").format(so_name))
            for row in dn.items:
                requested_qty = delivered_by_line.get(row.so_detail)
                if requested_qty is None:
                    frappe.throw(_("ERPNext mapper returned an unexpected Sales Order Item."), frappe.ValidationError)
                row.qty = requested_qty
            dn.vms_delivery_trip = trip.name
            dn.vms_pod_reference = pod.name
            dn.vms_sales_order = so_name
            dn.run_method("calculate_taxes_and_totals")
            dn.insert()
            dn.submit()
            created_notes.append(dn.name)
            
    return {"status": "success", "trip": trip_name, "delivery_notes": created_notes}

# Backward compatibility alias
generate_delivery_note_for_trip = generate_delivery_notes_for_trip
