frappe.ui.form.on('Payment Collection', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 1 && frm.doc.status === 'Submitted' && (frappe.user_roles.includes('Accounts User') || frappe.user_roles.includes('Accounts Manager'))) {
            frm.add_custom_button(__('Verify Collection'), function() {
                frappe.call({
                    method: 'vms.api.accounts.verify_payment_collection',
                    args: { collection_name: frm.doc.name },
                    callback: function(r) {
                        if (!r.exc) frm.reload_doc();
                    }
                });
            }).addClass('btn-success');
        }
        
        if (frm.doc.docstatus === 1 && frm.doc.status === 'Verified' && !frm.doc.payment_entry_reference && (frappe.user_roles.includes('Accounts User') || frappe.user_roles.includes('Accounts Manager'))) {
            frm.add_custom_button(__('Create ERPNext Payment Entry'), function() {
                frappe.call({
                    method: 'vms.api.accounts.create_erpnext_payment_entry',
                    args: { collection_name: frm.doc.name },
                    callback: function(r) {
                        if (!r.exc) frm.reload_doc();
                    }
                });
            }).addClass('btn-primary');
        }
    }
});
