frappe.ui.form.on('Delivery Trip Item', {
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.db.get_value('Item', row.item_code, ['item_name', 'stock_uom', 'weight_per_unit'], function(val) {
                if (val) {
                    frappe.model.set_value(cdt, cdn, 'item_name', val.item_name);
                    frappe.model.set_value(cdt, cdn, 'uom', val.stock_uom);
                }
            });
        }
    }
});
