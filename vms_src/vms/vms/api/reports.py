import frappe
from frappe import _
from vms.api.common import validate_role_access

@frappe.whitelist()
def get_sales_agent_performance(from_date=None, to_date=None):
    """Aggregates sales agent visits, orders booked and collections achieved."""
    validate_role_access(["Sales Manager", "VMS Executive", "System Manager"], "view sales performance")
    f_date = from_date or frappe.utils.add_months(frappe.utils.today(), -1)
    t_date = to_date or frappe.utils.today()
    
    visits = frappe.db.sql("""
        SELECT sales_agent, count(name) as total_visits
        FROM `tabShop Visit`
        WHERE visit_datetime BETWEEN %s AND %s
        GROUP BY sales_agent
    """, (f_date, t_date), as_dict=True)
    
    orders = frappe.db.sql("""
        SELECT owner as sales_agent, count(name) as orders_count, ifnull(sum(grand_total), 0) as total_value
        FROM `tabSales Order`
        WHERE transaction_date BETWEEN %s AND %s AND docstatus = 1
        GROUP BY owner
    """, (f_date, t_date), as_dict=True)
    
    return {"from_date": f_date, "to_date": t_date, "visits": visits, "orders": orders}

@frappe.whitelist()
def get_collection_report(from_date=None, to_date=None):
    """Returns verified collections breakdown by mode of payment."""
    validate_role_access(["Accounts User", "Accounts Manager", "VMS Executive", "System Manager"], "view collection report")
    f_date = from_date or frappe.utils.add_months(frappe.utils.today(), -1)
    t_date = to_date or frappe.utils.today()
    
    return frappe.db.sql("""
        SELECT mode_of_payment, count(name) as collection_count, ifnull(sum(amount), 0) as total_amount
        FROM `tabPayment Collection`
        WHERE collection_date BETWEEN %s AND %s AND docstatus = 1
        GROUP BY mode_of_payment
    """, (f_date, t_date), as_dict=True)

@frappe.whitelist()
def get_delivery_performance(from_date=None, to_date=None):
    """Returns on-time delivery rates and damaged/shortage metrics."""
    validate_role_access(["Fleet Manager", "Dispatcher", "VMS Executive", "System Manager"], "view delivery metrics")
    return {
        "completed_trips": frappe.db.count("Delivery Trip", {"status": "Completed"}),
        "in_transit_trips": frappe.db.count("Delivery Trip", {"status": "In Transit"}),
        "total_pods": frappe.db.count("Proof of Delivery", {"docstatus": 1})
    }

@frappe.whitelist()
def get_fleet_utilization():
    """Returns vehicle utilization percentages and active assignments."""
    validate_role_access(["Fleet Manager", "Dispatcher", "System Manager"], "view fleet utilization")
    vehicles = frappe.get_all("Vehicle", fields=["name", "status"])
    return {
        "total_vehicles": len(vehicles),
        "available": len([v for v in vehicles if v.status == "Available"]),
        "in_transit": len([v for v in vehicles if v.status == "In Transit"])
    }

@frappe.whitelist()
def get_vms_dashboard_metrics():
    """Master high-level executive KPIs."""
    validate_role_access(["VMS Executive", "System Manager", "Fleet Manager"], "view VMS dashboard")
    return {
        "pending_allocations": frappe.db.count("Vehicle Allocation", {"docstatus": 0}),
        "active_trips": frappe.db.count("Delivery Trip", {"status": "In Transit"}),
        "pending_collections": frappe.db.count("Payment Collection", {"status": "Submitted"}),
        "unassigned_orders": frappe.db.count("Sales Order", {"status": "To Deliver and Bill", "docstatus": 1})
    }
