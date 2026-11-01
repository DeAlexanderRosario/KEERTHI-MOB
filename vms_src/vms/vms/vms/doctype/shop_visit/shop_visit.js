frappe.ui.form.on('Shop Visit', {
    refresh: function(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button(__('Create Sales Order'), function() {
                var create_order = function() {
                    var items = (frm.doc.items || []).filter(function(row) {
                        return flt(row.order_qty) > 0;
                    }).map(function(row) {
                        return { item_code: row.item_code, qty: flt(row.order_qty) };
                    });

                    if (!items.length) {
                        frappe.msgprint(__('Enter an Order Quantity greater than zero for at least one item.'));
                        return;
                    }

                    return frappe.call({
                        method: 'vms.api.field_sales.create_sales_order',
                        args: {
                            customer: frm.doc.customer,
                            items_json: items
                        }
                    }).then(function(r) {
                        var order = r.message && r.message.sales_order;
                        if (!order) return;
                        frappe.show_alert({ message: __('Sales Order {0} created', [order]), indicator: 'green' });
                        frappe.set_route('Form', 'Sales Order', order);
                    });
                };

                if (frm.is_dirty()) {
                    frm.save().then(create_order);
                } else {
                    create_order();
                }
            }, __('Actions'));

            frm.add_custom_button(__('Record Collection'), function() {
                frappe.new_doc('Payment Collection', {
                    customer: frm.doc.customer
                });
            }, __('Actions'));
        }

        frm.set_query('customer', function() {
            return {
                filters: {
                    'disabled': 0
                }
            };
        });
    },

    customer: function(frm) {
        if (frm.doc.customer) {
            frappe.call({
                method: 'vms.api.field_sales.get_customer_context',
                args: { customer: frm.doc.customer },
                callback: function(r) {
                    if (r.message) {
                        frm.set_value('territory', r.message.territory);
                        frm.dashboard.set_headline_alert(
                            __('Total Outstanding: {0} | Credit Limit: {1}', [
                                format_currency(r.message.total_outstanding),
                                format_currency(r.message.credit_limit)
                            ]),
                            r.message.total_outstanding > r.message.credit_limit ? 'red' : 'blue'
                        );
                    }
                }
            });
        }
    }
});
