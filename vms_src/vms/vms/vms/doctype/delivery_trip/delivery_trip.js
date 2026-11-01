frappe.ui.form.on('Delivery Trip', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 1 && frm.doc.status === 'Dispatched') {
            frm.add_custom_button(__('Start Transit'), function() {
                frappe.confirm(__('Are you sure you want to mark this trip as In Transit?'), function() {
                    frappe.call({
                        method: 'vms.api.driver_portal.start_trip',
                        args: { trip_name: frm.doc.name },
                        callback: function(r) {
                            if (!r.exc) {
                                frappe.show_alert({message: __('Trip is now In Transit'), indicator: 'green'});
                                frm.reload_doc();
                            }
                        }
                    });
                });
            }).addClass('btn-primary');
        }
        
        if (frm.doc.docstatus === 1 && (frm.doc.status === 'In Transit' || frm.doc.status === 'Completed')) {
            frm.add_custom_button(__('Generate Delivery Notes'), function() {
                frappe.call({
                    method: 'vms.api.delivery.generate_delivery_note_for_trip',
                    args: { trip_name: frm.doc.name },
                    callback: function(r) {
                        if (!r.exc) {
                            frappe.msgprint(__('Delivery Notes generated: {0}', [r.message.delivery_notes.join(', ')]));
                            frm.reload_doc();
                        }
                    }
                });
            }, __('Operations'));
        }
    }
});
