frappe.ui.form.on('Collection Follow Up', {
    refresh: function(frm) {
        if (frm.doc.status === 'Open') {
            frm.add_custom_button(__('Record Payment'), function() {
                frappe.new_doc('Payment Collection', {
                    customer: frm.doc.customer,
                    amount: frm.doc.expected_amount
                });
            });
        }
    },
    validate: function(frm) {
        if (frm.doc.expected_amount && frm.doc.expected_amount <= 0) {
            frappe.throw(__('Expected amount must be greater than zero.'));
        }
    }
});
