frappe.ui.form.on('Proof of Delivery', {
    refresh: function(frm) {
        render_photo_gallery(frm);
        if (frm.is_new() && frappe.user_roles.some(function(role) {
            return ['Driver', 'Dispatcher', 'Fleet Manager', 'System Manager'].includes(role);
        })) {
            frm.add_custom_button(__('Auto-fill from Delivery Trip'), function() {
                load_trip_stop_details(frm);
            }, __('Actions'));
        }
        if (frm.doc.docstatus === 1 && frm.doc.status === 'Submitted' && frappe.user_roles.includes('Accounts User')) {
            frm.add_custom_button(__('Verify POD'), function() {
                frappe.prompt([
                    {fieldname: 'notes', fieldtype: 'Small Text', label: __('Verification Notes')}
                ], function(values) {
                    frm.set_value('status', 'Verified');
                    frm.set_value('verified_by', frappe.session.user);
                    frm.set_value('verification_notes', values.notes);
                    frm.save();
                }, __('Verify Proof of Delivery'));
            }).addClass('btn-success');
        }
    }
});

frappe.ui.form.on('Proof of Delivery Photo', {
    photo_url: function(frm) {
        render_photo_gallery(frm);
    },
    category: function(frm) {
        render_photo_gallery(frm);
    },
    remarks: function(frm) {
        render_photo_gallery(frm);
    }
});


function load_trip_stop_details(frm) {
    if (!frm.doc.delivery_trip) {
        frappe.msgprint(__('Select a Delivery Trip first.'));
        return;
    }
    frappe.call({
        method: 'vms.api.driver_portal.get_trip_details',
        args: { trip_name: frm.doc.delivery_trip }
    }).then(function(response) {
        var trip = response.message;
        if (!trip) return;
        var availableStops = (trip.stops || []).filter(function(stop) {
            return ['Pending', 'Arrived'].includes(stop.status) && !stop.pod_reference;
        });
        if (!availableStops.length) {
            frappe.msgprint(__('This trip has no stops available for proof of delivery.'));
            return;
        }

        var stopByOption = {};
        var options = availableStops.map(function(stop) {
            var label = __('Stop {0} — {1} ({2})', [
                stop.stop_sequence,
                stop.customer_name || stop.customer,
                stop.status
            ]);
            stopByOption[label] = stop;
            return label;
        });
        var dialog = new frappe.ui.Dialog({
            title: __('Load Delivery Details'),
            fields: [
                { fieldname: 'stop', fieldtype: 'Select', label: __('Trip Stop'), options: options.join('\n'), reqd: 1 },
                { fieldname: 'confirm_full_delivery', fieldtype: 'Check', label: __('I confirm every planned quantity was delivered in full'), default: 0 }
            ],
            primary_action_label: __('Load Details'),
            primary_action: function(values) {
                var stop = stopByOption[values.stop];
                if (!stop) return;
                var matchingStops = (trip.stops || []).filter(function(row) { return row.customer === stop.customer; });
                var allocations = (trip.items || []).filter(function(item) {
                    var reference = String(item.stop_reference || '');
                    if (reference) return reference === String(stop.name) || reference === String(stop.stop_sequence);
                    return matchingStops.length === 1 && item.customer === stop.customer;
                });
                if (!allocations.length) {
                    frappe.msgprint(__('No allocated Sales Order items are linked to this stop. Ask Dispatch to refresh the trip allocation.'));
                    return;
                }

                var grouped = {};
                allocations.forEach(function(item) {
                    var key = [item.sales_order, item.sales_order_item, item.item_code].join('|');
                    grouped[key] = grouped[key] || {
                        sales_order: item.sales_order,
                        sales_order_item: item.sales_order_item,
                        item_code: item.item_code,
                        allocated_qty: 0
                    };
                    grouped[key].allocated_qty += flt(item.allocated_qty);
                });

                frm.set_value('delivery_trip_stop', stop.name);
                frm.set_value('customer', stop.customer);
                if (stop.arrival_lat !== undefined && stop.arrival_lat !== null) frm.set_value('gps_latitude', stop.arrival_lat);
                if (stop.arrival_lng !== undefined && stop.arrival_lng !== null) frm.set_value('gps_longitude', stop.arrival_lng);
                frm.clear_table('items');
                Object.keys(grouped).forEach(function(key) {
                    var item = grouped[key];
                    var row = frm.add_child('items');
                    row.sales_order = item.sales_order;
                    row.sales_order_item = item.sales_order_item;
                    row.item_code = item.item_code;
                    row.allocated_qty = item.allocated_qty;
                    row.delivered_qty = values.confirm_full_delivery ? item.allocated_qty : 0;
                    row.damaged_qty = 0;
                    row.short_qty = 0;
                    row.rejected_qty = 0;
                });
                frm.refresh_field('items');
                dialog.hide();
                frappe.show_alert({
                    message: __('Trip, stop, customer, planned items and arrival GPS were loaded. Confirm actual quantities and receiver details.'),
                    indicator: 'green'
                });
            }
        });
        dialog.show();
    });
}

function render_photo_gallery(frm) {
    var field = frm.fields_dict.photo_gallery;
    if (!field || !field.$wrapper) return;

    var $gallery = $('<div class="vms-pod-evidence-gallery" role="list"></div>');
    var photos = (frm.doc.photos || []).filter(function(photo) {
        return typeof photo.photo_url === 'string' && photo.photo_url.startsWith('/') && !photo.photo_url.startsWith('//');
    });

    if (!photos.length) {
        $gallery.append($('<p class="vms-pod-evidence-empty"></p>').text(__('No delivery photos have been attached.')));
    } else {
        photos.forEach(function(photo) {
            var $link = $('<a class="vms-pod-evidence-tile" role="listitem"></a>')
                .attr('href', photo.photo_url)
                .attr('target', '_blank')
                .attr('rel', 'noopener noreferrer')
                .attr('aria-label', __('Open {0} photo', [photo.category || __('Delivery evidence')]));
            $('<img class="vms-pod-evidence-image" loading="lazy">')
                .attr('src', photo.photo_url)
                .attr('alt', photo.category || __('Delivery evidence'))
                .appendTo($link);
            var $caption = $('<span class="vms-pod-evidence-caption"></span>');
            $('<strong></strong>').text(photo.category || __('Delivery evidence')).appendTo($caption);
            if (photo.remarks) $('<span></span>').text(photo.remarks).appendTo($caption);
            $link.append($caption);
            $gallery.append($link);
        });
    }

    field.$wrapper.empty().append($gallery);
}
