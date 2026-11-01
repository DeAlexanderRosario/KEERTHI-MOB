frappe.ui.form.on('Vehicle Allocation Territory', {
    territory: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.territory) {
            frappe.db.get_value('Territory', row.territory, 'territory_name', function(val) {
                if (val) {
                    frappe.model.set_value(cdt, cdn, 'territory_name', val);
                }
            });
        }
    }
});
