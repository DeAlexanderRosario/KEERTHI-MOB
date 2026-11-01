frappe.ui.form.on('Vehicle Allocation', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 1 && frm.doc.status === 'In Progress') {
            frm.add_custom_button(__('Verify Loading'), function() {
                frappe.prompt([
                    {fieldname: 'notes', fieldtype: 'Small Text', label: __('Warehouse Loading Notes')}
                ], function(values) {
                    frappe.call({
                        method: 'vms.api.warehouse.record_loading_verification',
                        args: {
                            allocation_name: frm.doc.name,
                            loaded_items_json: JSON.stringify(frm.doc.orders)
                        },
                        callback: function(r) {
                            if (!r.exc) {
                                frappe.show_alert({message: __('Loading verified successfully'), indicator: 'green'});
                                frm.reload_doc();
                            }
                        }
                    });
                }, __('Confirm Warehouse Loading'));
            }).addClass('btn-primary');
        }
        
        if (frm.doc.docstatus === 1 && (frm.doc.status === 'Loading Verified' || frm.doc.status === 'Ready for Dispatch')) {
            frm.add_custom_button(__('Approve Dispatch & Generate Trip'), function() {
                frappe.confirm(__('Approve dispatch and generate Delivery Trip?'), function() {
                    frappe.call({
                        method: 'vms.api.dispatch.approve_dispatch_and_generate_trip',
                        args: { allocation_name: frm.doc.name },
                        callback: function(r) {
                            if (!r.exc) {
                                frappe.msgprint(__('Delivery Trip {0} generated successfully.', [r.message.trip_name]));
                                frm.reload_doc();
                            }
                        }
                    });
                });
            }).addClass('btn-success');
        }
    }
});
