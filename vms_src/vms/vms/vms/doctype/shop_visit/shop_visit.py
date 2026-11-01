import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import now_datetime
from vms.api.common import assert_customer_scope
from vms.api.common import parse_coordinates

class ShopVisit(Document):
    def validate(self):
        if not self.customer:
            frappe.throw(_("Customer is required for Shop Visit."))
        if not self.sales_agent:
            self.sales_agent = frappe.session.user
        roles = set(frappe.get_roles(frappe.session.user))
        if "Driver" in roles and "System Manager" not in roles:
            frappe.throw(_("Drivers cannot create or update Field Sales visits."), frappe.PermissionError)
        if "Field Sales Agent" in roles and not roles.intersection({"Sales Manager", "System Manager"}):
            if self.sales_agent != frappe.session.user:
                frappe.throw(_("You may create or update only your own Shop Visits."), frappe.PermissionError)
            assert_customer_scope(self.customer)
            if not frappe.has_permission("Customer", "read", self.customer):
                frappe.throw(_("You do not have access to this customer."), frappe.PermissionError)
        if self.client_mutation_id:
            duplicate = frappe.db.get_value(
                "Shop Visit",
                {"client_mutation_id": self.client_mutation_id, "name": ["!=", self.name or ""]},
                "name",
            )
            if duplicate:
                frappe.throw(_("This mobile visit has already been synchronized as {0}.").format(duplicate))
        if not self.visit_datetime:
            self.visit_datetime = now_datetime()
        if not self.purpose:
            frappe.throw(_("Visit purpose must be specified."))
        coordinates = parse_coordinates(self.latitude, self.longitude)
        if coordinates:
            self.latitude, self.longitude = coordinates
