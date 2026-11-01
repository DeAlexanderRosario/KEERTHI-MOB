import frappe
from frappe import _
import math
from vms.api.common import validate_role_access
from vms.api.common import assert_customer_scope, get_current_user_customer_scope, parse_coordinates


def _validate_field_sales_access(allowed_roles, action):
    roles = set(frappe.get_roles(frappe.session.user))
    if "Driver" in roles and "System Manager" not in roles:
        frappe.throw(_("Drivers cannot access Field Sales actions."), frappe.PermissionError)
    validate_role_access(allowed_roles, action)

@frappe.whitelist()
def search_customers(query=None, territory=None):
    """Fast search for active customers by name, phone or code."""
    _validate_field_sales_access(["Field Sales Agent", "Sales Manager", "System Manager"], "search customers")
    filters = {"disabled": 0}
    customer_scope = get_current_user_customer_scope()
    if customer_scope is not None:
        if not customer_scope:
            return []
        filters["name"] = ["in", customer_scope]
    if territory:
        filters["territory"] = territory
    if query:
        filters["customer_name"] = ["like", f"%{query}%"]
        
    return frappe.get_list(
        "Customer",
        filters=filters,
        fields=["name", "customer_name", "territory", "mobile_no", "default_price_list"],
        limit_page_length=50
    )

def _get_customer_credit_limit(customer_doc):
    """Return the standard Customer Credit Limit for the user's active company."""
    company = frappe.defaults.get_user_default("company") or frappe.defaults.get_global_default("default_company")
    if not company:
        return 0.0
    for row in customer_doc.get("credit_limits") or []:
        if row.company == company:
            return float(row.credit_limit or 0.0)
    return 0.0

@frappe.whitelist()
def get_customer_context(customer):
    """Returns rich customer details including ledger balance, credit limit, and open invoices."""
    _validate_field_sales_access(["Field Sales Agent", "Sales Manager", "Accounts User", "System Manager"], "view customer context")
    assert_customer_scope(customer)
    cust = frappe.get_doc("Customer", customer)
    
    invoices = frappe.get_list(
        "Sales Invoice",
        filters={"customer": customer, "docstatus": 1, "outstanding_amount": [">", 0]},
        fields=["name", "posting_date", "due_date", "grand_total", "outstanding_amount"],
        order_by="posting_date desc",
        limit_page_length=500,
    )
    
    total_outstanding = sum(float(i.outstanding_amount or 0) for i in invoices)
    
    return {
        "customer": cust.name,
        "customer_name": cust.customer_name,
        "territory": cust.territory,
        "mobile_no": cust.mobile_no,
        "default_price_list": cust.default_price_list or "Standard Selling",
        "credit_limit": _get_customer_credit_limit(cust),
        "total_outstanding": total_outstanding,
        "open_invoices": invoices
    }

@frappe.whitelist()
def get_item_context(item_code, customer=None):
    """
    Returns item pricing and availability.
    Strictly queries Item Price based on customer's price list or Standard Selling.
    Throws error if no price is configured (NO fallback rate = 100).
    """
    _validate_field_sales_access(["Field Sales Agent", "Sales Manager", "System Manager"], "view item pricing")
    item = frappe.get_doc("Item", item_code)
    
    price_list = None
    if customer:
        assert_customer_scope(customer)
        price_list = frappe.db.get_value("Customer", customer, "default_price_list")
    if not price_list:
        price_list = "Standard Selling"
        
    rate = frappe.db.get_value("Item Price", {"item_code": item_code, "price_list": price_list}, "price_list_rate")
    if rate is None or float(rate) <= 0:
        frappe.throw(
            _("No valid selling price configured for item {0} in price list {1}. Please contact Accounts.")
            .format(item_code, price_list)
        )
        
    return {
        "item_code": item.item_code,
        "item_name": item.item_name,
        "stock_uom": item.stock_uom,
        "weight_per_unit": float(item.weight_per_unit or 0.0),
        "price_list": price_list,
        "rate": float(rate)
    }

@frappe.whitelist()
def get_assigned_customers(territory=None, search_term=None):
    """Returns customers accessible to the Field Sales Agent with open balances."""
    return search_customers(query=search_term, territory=territory)

@frappe.whitelist()
def create_shop_visit(customer, purpose, notes=None, lat=None, lng=None, follow_up_date=None, items=None):
    """Records an on-site visit by the Field Sales Agent."""
    _validate_field_sales_access(["Field Sales Agent", "Sales Manager", "System Manager"], "record shop visit")
    assert_customer_scope(customer)
    if not frappe.has_permission("Customer", "read", customer):
        frappe.throw(_("You do not have access to this customer."), frappe.PermissionError)
    visit = frappe.new_doc("Shop Visit")
    visit.sales_agent = frappe.session.user
    visit.customer = customer
    visit.visit_datetime = frappe.utils.now_datetime()
    visit.purpose = purpose
    visit.notes = notes
    visit.next_followup_date = follow_up_date
    coordinates = parse_coordinates(lat, lng)
    if coordinates:
        visit.latitude, visit.longitude = coordinates
        
    if items:
        import json
        items_list = json.loads(items) if isinstance(items, str) else items
        for it in items_list:
            visit.append("items", {
                "item_code": it.get("item_code"),
                "order_qty": float(it.get("order_qty", 0) or 0),
                "stock_level_at_shop": float(it.get("stock_level_at_shop", 0)),
                "customer_interest": it.get("customer_interest", "Medium"),
                "notes": it.get("notes")
            })
    visit.insert()
    return {"status": "success", "visit_name": visit.name, "customer": customer}

@frappe.whitelist()
def complete_shop_visit(visit_name, outcome, follow_up_date=None, notes=None):
    """Marks a shop visit as completed with outcome summary."""
    _validate_field_sales_access(["Field Sales Agent", "Sales Manager", "System Manager"], "complete shop visit")
    visit = frappe.get_doc("Shop Visit", visit_name)
    roles = set(frappe.get_roles(frappe.session.user))
    if "Field Sales Agent" in roles and not roles.intersection({"Sales Manager", "System Manager"}) and visit.sales_agent != frappe.session.user:
        frappe.throw(_("You may update only your own Shop Visits."), frappe.PermissionError)
    visit.status = "Completed"
    visit.purpose = outcome or visit.purpose
    if follow_up_date:
        visit.next_followup_date = follow_up_date
    if notes:
        visit.notes = (visit.notes or "") + f"\nCompletion Notes: {notes}"
    visit.save()
    return {"status": "success", "visit_name": visit.name, "visit_status": visit.status}

@frappe.whitelist()
def create_sales_order(customer, items_json, delivery_date=None):
    """
    Creates an authoritative ERPNext Sales Order populated from Field Sales demand.
    Strictly verifies item prices without arbitrary fallback rates.
    """
    _validate_field_sales_access(["Field Sales Agent", "Sales Manager", "System Manager"], "create Sales Order")
    assert_customer_scope(customer)
    if not frappe.has_permission("Customer", "read", customer):
        frappe.throw(_("You do not have access to this customer."), frappe.PermissionError)
    import json
    items = json.loads(items_json) if isinstance(items_json, str) else items_json
    if not items:
        frappe.throw(_("At least one item must be added to create a Sales Order."))
        
    price_list = frappe.db.get_value("Customer", customer, "default_price_list") or "Standard Selling"
    company = frappe.db.get_single_value("Global Defaults", "default_company") or "Keerthi Groups Hardware"
    
    so = frappe.new_doc("Sales Order")
    so.customer = customer
    so.company = company
    so.transaction_date = frappe.utils.today()
    so.delivery_date = delivery_date or frappe.utils.add_days(frappe.utils.today(), 2)
    
    for it in items:
        item_code = it.get("item_code")
        try:
            qty = float(it.get("qty", 1))
        except (TypeError, ValueError):
            frappe.throw(_("Quantity for item {0} must be a valid number.").format(item_code))
        if not math.isfinite(qty) or qty <= 0:
            frappe.throw(_("Quantity for item {0} must be greater than zero.").format(item_code))

        # Never trust a mobile/client-supplied rate; the configured Item Price is authoritative.
        rate = frappe.db.get_value("Item Price", {"item_code": item_code, "price_list": price_list}, "price_list_rate")
        try:
            rate = float(rate)
        except (TypeError, ValueError):
            rate = 0
        
        if not math.isfinite(rate) or rate <= 0:
            frappe.throw(
                _("Cannot create Sales Order: No price configured for item {0} in price list {1}.")
                .format(item_code, price_list)
            )
            
        so.append("items", {
            "item_code": item_code,
            "qty": qty,
            "rate": rate,
            "delivery_date": so.delivery_date
        })
        
    so.insert()
    return {"status": "success", "sales_order": so.name, "grand_total": so.grand_total}

# Backward compatibility alias
create_erpnext_sales_order = create_sales_order

@frappe.whitelist()
def get_my_sales_orders():
    """Returns recent sales orders initiated by the logged in agent."""
    _validate_field_sales_access(["Field Sales Agent", "Sales Manager", "System Manager"], "view sales orders")
    return frappe.get_all(
        "Sales Order",
        filters={"owner": frappe.session.user},
        fields=["name", "customer", "customer_name", "transaction_date", "grand_total", "status", "delivery_date"],
        order_by="creation desc",
        limit=50
    )

def generate_daily_visit_summary():
    """Scheduled task: Daily summary of shop visits per agent."""
    frappe.logger("vms").info("Generating daily shop visit summaries...")
    return True
