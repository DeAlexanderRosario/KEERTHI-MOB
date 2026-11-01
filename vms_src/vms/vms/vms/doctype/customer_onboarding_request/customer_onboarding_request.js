frappe.ui.form.on('Customer Onboarding Request', {
    refresh: function(frm) {
        if (frm.doc.status === 'Pending Approval' && (frappe.user_roles.includes('Sales Manager') || frappe.user_roles.includes('System Manager'))) {
            frm.add_custom_button(__('Approve & Create Customer'), function() {
                frappe.confirm(__('Approve customer onboarding and create ERPNext Customer record?'), function() {
                    frappe.call({
                        method: 'vms.api.customer.approve_onboarding_request',
                        args: { request_name: frm.doc.name },
                        callback: function(r) {
                            if (!r.exc) {
                                frappe.show_alert({message: __('Customer created successfully: ' + r.message.customer), indicator: 'green'});
                                frm.reload_doc();
                            }
                        }
                    });
                });
            }).addClass('btn-success');
            
            frm.add_custom_button(__('Reject Request'), function() {
                frappe.prompt([
                    {fieldname: 'reason', fieldtype: 'Small Text', label: __('Rejection Reason'), reqd: 1}
                ], function(values) {
                    frappe.call({
                        method: 'vms.api.customer.reject_onboarding_request',
                        args: { request_name: frm.doc.name, rejection_reason: values.reason },
                        callback: function(r) {
                            if (!r.exc) {
                                frappe.show_alert({message: __('Request rejected'), indicator: 'red'});
                                frm.reload_doc();
                            }
                        }
                    });
                }, __('Reject Customer Onboarding'));
            }).addClass('btn-danger');
        }
    }
});
