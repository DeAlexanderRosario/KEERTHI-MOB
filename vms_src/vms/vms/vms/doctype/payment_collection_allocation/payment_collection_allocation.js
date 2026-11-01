frappe.ui.form.on('Payment Collection Allocation', {
    sales_invoice: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.sales_invoice) {
            frappe.db.get_value('Sales Invoice', row.sales_invoice, ['grand_total', 'outstanding_amount'], function(val) {
                if (val) {
                    frappe.model.set_value(cdt, cdn, 'invoice_amount', val.grand_total);
                    frappe.model.set_value(cdt, cdn, 'outstanding_amount', val.outstanding_amount);
                    if (!row.allocated_amount) {
                        frappe.model.set_value(cdt, cdn, 'allocated_amount', val.outstanding_amount);
                    }
                }
            });
        }
    },
    allocated_amount: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (flt(row.allocated_amount) > flt(row.outstanding_amount)) {
            frappe.msgprint(__('Allocated amount cannot exceed invoice outstanding balance.'));
            frappe.model.set_value(cdt, cdn, 'allocated_amount', row.outstanding_amount);
        }
    }
});
