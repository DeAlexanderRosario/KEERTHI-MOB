/**
 * Keerthi VMS - Global Desk Client Utilities
 * Frappe v16 / ERPNext v16
 */

frappe.provide('frappe.vms');

(function() {
    var vmsPages = ['vms_dashboard', 'delivery_planning'];
    var vmsWorkspaces = [
        'vms overview', 'field sales', 'accounts & collections',
        'warehouse operations', 'fleet & dispatch', 'delivery operations',
        'vms reports & analytics'
    ];
    var vmsDoctypes = [
        'Collection Follow Up', 'Customer Onboarding Request', 'Delivery Trip',
        'Delivery Trip Item', 'Delivery Trip Stop', 'Payment Collection',
        'Payment Collection Allocation', 'Payment Discrepancy', 'Proof of Delivery',
        'Proof of Delivery Item', 'Proof of Delivery Photo', 'Route', 'Shop Visit',
        'Shop Visit Item', 'Vehicle Allocation', 'Vehicle Allocation Order',
        'Vehicle Allocation Route', 'Vehicle Allocation Territory', 'VMS POD Settings',
        'Warehouse Discrepancy'
    ];

    function normalizeRoute(value) {
        return String(value || '').toLowerCase().replace(/&/g, 'and')
            .replace(/[-_]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    }

    function updateVmsRouteState() {
        if (!frappe.get_route || !document.body) return;
        var route = frappe.get_route() || [];
        var routeName = normalizeRoute(route[0]);
        var routeTarget = normalizeRoute(route[1]);
        var isVmsWorkspace = routeName === 'workspaces' && vmsWorkspaces.map(normalizeRoute).indexOf(routeTarget) !== -1;
        var isVmsPage = vmsPages.map(normalizeRoute).indexOf(routeName) !== -1;
        var isVmsRecord = ['form', 'list', 'report', 'query report'].indexOf(routeName) !== -1 &&
            vmsDoctypes.map(normalizeRoute).indexOf(routeTarget) !== -1;
        document.body.classList.toggle('keerthi-vms-workspace', isVmsWorkspace);
        document.body.classList.toggle('keerthi-vms-page', isVmsPage);
        document.body.classList.toggle('keerthi-vms-record', isVmsRecord);
    }

    $(document).on('page-change', updateVmsRouteState);
    $(updateVmsRouteState);
})();

frappe.vms = {
    open_operations_dashboard: function() {
        frappe.set_route('vms_dashboard');
    },

    open_planning_console: function() {
        frappe.set_route('delivery_planning');
    },

    open_trip_register: function() {
        frappe.set_route('query-report', 'Delivery Trip Register');
    },

    open_collections_audit: function() {
        frappe.set_route('query-report', 'Payment Collections Audit');
    },

    format_quantity_status: function(allocated, delivered, damaged, short, rejected) {
        var diff = allocated - (delivered + damaged + short + rejected);
        if (diff !== 0) {
            return '<span class="text-danger font-weight-bold">Unbalanced (' + diff + ')</span>';
        }
        return '<span class="text-success font-weight-bold">Balanced</span>';
    }
};
