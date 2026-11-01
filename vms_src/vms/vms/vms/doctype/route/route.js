frappe.ui.form.on('Route', {
    refresh: function(frm) {
        frm.set_query('origin_warehouse', function() {
            return {
                filters: {
                    'is_group': 0
                }
            };
        });
    },
    validate: function(frm) {
        if (frm.doc.estimated_distance_km && frm.doc.estimated_distance_km < 0) {
            frappe.throw(__('Estimated distance must be a positive number.'));
        }
    }
});
