frappe.ui.form.on('Proof of Delivery Item', {
    allocated_qty: function(frm, cdt, cdn) {
        calculate_balance(frm, cdt, cdn);
    },
    delivered_qty: function(frm, cdt, cdn) {
        calculate_balance(frm, cdt, cdn);
    },
    damaged_qty: function(frm, cdt, cdn) {
        calculate_balance(frm, cdt, cdn);
    },
    short_qty: function(frm, cdt, cdn) {
        calculate_balance(frm, cdt, cdn);
    },
    rejected_qty: function(frm, cdt, cdn) {
        calculate_balance(frm, cdt, cdn);
    }
});

function calculate_balance(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let allocated = flt(row.allocated_qty);
    let delivered = flt(row.delivered_qty);
    let damaged = flt(row.damaged_qty);
    let short = flt(row.short_qty);
    let rejected = flt(row.rejected_qty);
    let total = delivered + damaged + short + rejected;
    
    if (allocated > 0 && Math.abs(allocated - total) > 0.001) {
        frappe.utils.icon('warning', 'orange');
    }
}
