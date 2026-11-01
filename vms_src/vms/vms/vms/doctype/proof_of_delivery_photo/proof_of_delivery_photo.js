frappe.ui.form.on('Proof of Delivery Photo', {
    photo_url: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.photo_url) {
            frappe.model.set_value(cdt, cdn, 'capture_timestamp', frappe.datetime.now_datetime());
        }
    }
});
