frappe.pages['delivery_planning'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Delivery Planning'),
        single_column: true
    });
    const root = $(frappe.render_template('delivery_planning', {}));
    $(wrapper).find('.page-content').empty().append(root);

    let rows = [];
    let requestInFlight = false;
    const tableRoot = root.find('#allocation-table-wrapper');

    page.set_primary_action(__('Refresh queue'), load_queue, 'refresh');
    root.find('#planning-search').on('input', frappe.utils.debounce(render_rows, 150));

    function load_queue() {
        if (requestInFlight) return;
        requestInFlight = true;
        tableRoot.html('<div class="planning-state"><i class="fa fa-circle-o-notch fa-spin" aria-hidden="true"></i> ' + __('Loading orders awaiting allocation…') + '</div>');
        frappe.call({
            method: 'vms.api.dispatch.get_orders_awaiting_allocation',
            callback: function(r) {
                rows = r.message || [];
                root.find('#planning-result-count').text(__("{0} order lines", [rows.length]));
                render_rows();
            },
            error: function() {
                tableRoot.empty().append(
                    $('<div class="planning-state is-error" role="alert"></div>').text(__('Could not load the dispatch queue. Check your connection and refresh to try again.'))
                );
                root.find('#planning-result-count').text(__('Queue unavailable'));
            },
            always: function() { requestInFlight = false; }
        });
    }

    function render_rows() {
        const query = (root.find('#planning-search').val() || '').trim().toLowerCase();
        const visible = rows.filter(function(row) {
            return [row.sales_order, row.customer_name, row.customer, row.item_code, row.item_name, row.warehouse]
                .some(function(value) { return String(value || '').toLowerCase().includes(query); });
        });
        root.find('#planning-result-count').text(__("{0} of {1} order lines", [visible.length, rows.length]));
        tableRoot.empty();
        if (!visible.length) {
            const message = rows.length ? __('No order lines match this search.') : __('There are no orders awaiting allocation.');
            tableRoot.append($('<div class="planning-state"></div>').text(message));
            return;
        }

        const table = $('<table class="table planning-table"></table>');
        table.append('<thead><tr><th>' + __('SALES ORDER') + '</th><th>' + __('CUSTOMER') + '</th><th>' + __('ITEM') + '</th><th>' + __('PENDING QTY') + '</th><th>' + __('WAREHOUSE') + '</th></tr></thead>');
        const body = $('<tbody></tbody>');
        visible.forEach(function(row) {
            const tr = $('<tr></tr>');
            const orderCell = make_cell(__('Sales Order'), $('<span class="planning-order"></span>').text(row.sales_order || ''));
            if (row.delivery_date) orderCell.append($('<span class="planning-muted"></span>').text(__('Due {0}', [frappe.datetime.str_to_user(row.delivery_date)])));
            const customerCell = make_cell(__('Customer'), $('<span class="planning-customer"></span>').text(row.customer_name || row.customer || ''));
            if (row.customer_name && row.customer) customerCell.append($('<span class="planning-muted"></span>').text(row.customer));
            const itemCell = make_cell(__('Item'), $('<span></span>').text(row.item_name || row.item_code || ''));
            if (row.item_name && row.item_code) itemCell.append($('<span class="planning-muted"></span>').text(row.item_code));
            tr.append(orderCell, customerCell, itemCell,
                make_cell(__('Pending Qty'), $('<span class="planning-qty"></span>').text(format_qty(row.pending_delivery_qty))),
                make_cell(__('Warehouse'), row.warehouse || '—'));
            body.append(tr);
        });
        table.append(body);
        tableRoot.append(table);
    }

    function format_qty(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 3 }) : '—';
    }

    function make_cell(label, content) {
        const cell = $('<td></td>').attr('data-label', label);
        if (content && content.jquery) cell.append(content);
        else cell.text(content);
        return cell;
    }

    load_queue();
};
