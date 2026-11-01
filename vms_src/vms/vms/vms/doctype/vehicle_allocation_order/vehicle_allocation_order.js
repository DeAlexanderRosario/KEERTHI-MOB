frappe.ui.form.on('Vehicle Allocation Order', {
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.db.get_value('Item', row.item_code, ['item_name', 'weight_per_unit'], function(val) {
                if (val) {
                    frappe.model.set_value(cdt, cdn, 'item_name', val.item_name);
                    let unit_w = flt(val.weight_per_unit);
                    frappe.model.set_value(cdt, cdn, 'weight_kg', unit_w * flt(row.allocated_qty || 1));
                    frm.trigger('calculate_total_weight');
                }
            });
        }
    },
    allocated_qty: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.db.get_value('Item', row.item_code, 'weight_per_unit', function(unit_w) {
                frappe.model.set_value(cdt, cdn, 'weight_kg', flt(unit_w) * flt(row.allocated_qty || 1));
                frm.trigger('calculate_total_weight');
            });
        }
    }
});
