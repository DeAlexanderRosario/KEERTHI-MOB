frappe.ui.form.on('Payment Discrepancy', {
    refresh: function(frm) {
        if (frm.doc.status === 'Open' && frappe.user_roles.includes('Accounts Manager')) {
            frm.add_custom_button(__('Approve Reconciliation'), function() {
                frm.set_value('status', 'Resolved');
                frm.save();
            }, __('Reconciliation'));
        }
    }
});
