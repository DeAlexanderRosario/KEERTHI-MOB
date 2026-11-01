frappe.ui.form.on('VMS POD Settings', {
    validate: function(frm) {
        if (frm.doc.geofence_radius_meters && frm.doc.geofence_radius_meters < 10) {
            frappe.throw(__('Geofence radius must be at least 10 meters for accurate GPS resolution.'));
        }
    }
});
