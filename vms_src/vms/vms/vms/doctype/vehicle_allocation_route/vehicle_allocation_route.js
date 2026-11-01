frappe.ui.form.on('Vehicle Allocation Route', {
    route: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.route) {
            frappe.db.get_value('Route', row.route, ['estimated_distance_km', 'estimated_transit_hours'], function(val) {
                if (val) {
                    frappe.model.set_value(cdt, cdn, 'distance_km', val.estimated_distance_km);
                    frappe.model.set_value(cdt, cdn, 'transit_hours', val.estimated_transit_hours);
                }
            });
        }
    }
});
