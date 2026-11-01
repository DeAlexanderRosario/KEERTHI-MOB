frappe.ui.form.on('Warehouse Discrepancy', {
    refresh: function(frm) {
        if (frm.doc.status === 'Open' && frappe.user_roles.includes('Warehouse Manager')) {
            frm.add_custom_button(__('Mark as Resolved'), function() {
                frappe.prompt([
                    {
                        fieldname: 'resolution_notes',
                        fieldtype: 'Small Text',
                        label: __('Resolution Notes'),
                        reqd: 1
                    }
                ], function(values) {
                    frappe.call({
                        method: 'vms.api.warehouse.resolve_discrepancy',
                        args: {
                            discrepancy_name: frm.doc.name,
                            resolution_notes: values.resolution_notes
                        },
                        callback: function(r) {
                            if (r.message && r.message.status === 'success') {
                                frm.reload_doc();
                            }
                        }
                    });
                }, __('Resolve Discrepancy'), __('Submit'));
            });
        }
    }
});
