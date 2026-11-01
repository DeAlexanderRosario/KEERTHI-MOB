frappe.ui.form.on('Shop Visit Item', {
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.call({
                method: 'vms.api.field_sales.get_item_context',
                args: { item_code: row.item_code, customer: frm.doc.customer },
                callback: function(r) {
                    if (r.message) {
                        frappe.model.set_value(cdt, cdn, 'stock_uom', r.message.stock_uom);
                    }
                }
            });
        }
    }
});
