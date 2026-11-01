frappe.ui.form.on('Delivery Trip Stop', {
    customer: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.customer) {
            frappe.db.get_value('Customer', row.customer, ['customer_name', 'mobile_no'], function(val) {
                if (val) {
                    frappe.model.set_value(cdt, cdn, 'customer_name', val.customer_name);
                    frappe.model.set_value(cdt, cdn, 'contact_phone', val.mobile_no);
                }
            });
        }
    }
});
