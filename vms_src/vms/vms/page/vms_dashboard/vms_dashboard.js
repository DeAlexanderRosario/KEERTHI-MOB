/**
 * Keerthi VMS - Native Frappe v16 Operations Dashboard Controller
 * Connects directly to ERPNext Desk and live VMS APIs.
 */

frappe.pages['vms_dashboard'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('VMS Operations Dashboard'),
        single_column: true
    });

    // Scoped state
    var state = {
        currentPage: 1,
        pageSize: 8,
        activeTab: 'all',
        shipmentStatus: 'All',
        searchQuery: '',
        mapInstance: null
    };

    // Load template HTML into page wrapper
    $(wrapper).find('.page-content').html(frappe.render_template('vms_dashboard', {}) || get_dashboard_html());

    // Bind event listeners
    bind_events();

    // Initial data fetch
    refresh_all();

    function bind_events() {
        var $w = $(wrapper);

        // Refresh button
        $w.find('#vms-btn-refresh').on('click', function() {
            refresh_all();
        });

        // Communication tabs
        $w.find('.vms-tab-btn').on('click', function() {
            $w.find('.vms-tab-btn').removeClass('active');
            $(this).addClass('active');
            state.activeTab = $(this).attr('data-tab');
            load_communications();
        });

        // KPI card click actions
        $w.find('#kpi-ontime-card').on('click keydown', function(event) {
            if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
            if (event.type === 'keydown') event.preventDefault();
            frappe.set_route('List', 'Delivery Trip', {'status': 'In Transit'});
        });
        $w.find('#kpi-avgkm-card').on('click', function() {
            frappe.set_route('List', 'Route');
        });
        $w.find('#kpi-orders-card').on('click keydown', function(event) {
            if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
            if (event.type === 'keydown') event.preventDefault();
            frappe.set_route('List', 'Delivery Trip', {'status': 'Completed'});
        });
        $w.find('#vms-btn-track-all').on('click', function() {
            frappe.set_route('List', 'Delivery Trip', {'status': 'In Transit'});
        });
        $w.find('#vms-pulse-allocations').on('click', function() { frappe.set_route('List', 'Vehicle Allocation'); });
        $w.find('#vms-pulse-collections').on('click', function() { frappe.set_route('List', 'Payment Collection', {'status': 'Submitted'}); });
        $w.find('#vms-pulse-discrepancies').on('click', function() { frappe.set_route('List', 'Warehouse Discrepancy', {'resolution_status': 'Pending Resolution'}); });

        // Shipments search & filter
        $w.find('#vms-shipment-search').on('input', frappe.utils.debounce(function() {
            state.searchQuery = $(this).val();
            state.currentPage = 1;
            load_shipments();
        }, 300));

        $w.find('#vms-shipment-filter').on('change', function() {
            state.shipmentStatus = $(this).val();
            state.currentPage = 1;
            load_shipments();
        });

        // Pagination
        $w.find('#vms-prev-page').on('click', function() {
            if (state.currentPage > 1) {
                state.currentPage--;
                load_shipments();
            }
        });
        $w.find('#vms-next-page').on('click', function() {
            state.currentPage++;
            load_shipments();
        });

        // Export links
        $w.find('#vms-export-trips').on('click', function(e) {
            e.preventDefault();
            frappe.set_route('query-report', 'Delivery Trip Register');
        });
        $w.find('#vms-export-allocations').on('click', function(e) {
            e.preventDefault();
            frappe.set_route('List', 'Vehicle Allocation');
        });
        $w.find('#vms-export-discrepancies').on('click', function(e) {
            e.preventDefault();
            frappe.set_route('query-report', 'Warehouse Discrepancy Report');
        });
    }

    function refresh_all() {
        var $w = $(wrapper);
        $w.find('#vms-user-display').text(frappe.session.user_fullname || frappe.session.user || 'Operations User');
        load_summary_kpis();
        load_fleet_efficiency();
        load_featured_vehicle();
        load_communications();
        load_revenue_chart();
        load_kerala_map();
        load_shipments();
    }

    function load_summary_kpis() {
        var $w = $(wrapper);
        frappe.call({
            method: 'vms.api.dashboard.get_dashboard_summary',
            callback: function(r) {
                if (r.message) {
                    var d = r.message;
                    $w.find('#vms-company-name').text(d.company || 'Keerthi Groups Hardware');
                    $w.find('#kpi-ontime-val').text(d.active_in_transit || '0');
                    $w.find('#kpi-avgkm-val').text(d.average_km ? d.average_km.value : '--');
                    $w.find('#kpi-orders-val').text(d.accepted_orders ? d.accepted_orders.value : '0');
                    $w.find('#vms-active-trips-heading').text(d.active_in_transit ? d.active_in_transit : '0');
                    $w.find('#vms-pending-allocation-count').text(d.pending_allocation || 0);
                    $w.find('#vms-pending-collection-count').text(d.pending_collections_count || 0);
                    $w.find('#vms-open-discrepancy-count').text(d.open_discrepancies || 0);
                }
            }
        });
    }

    function load_fleet_efficiency() {
        var $w = $(wrapper);
        frappe.call({
            method: 'vms.api.dashboard.get_fleet_efficiency',
            callback: function(r) {
                if (r.message) {
                    var d = r.message;
                    $w.find('#vms-fleet-util-pct').text(d.utilization_percentage + '%');
                    $w.find('#vms-donut-total').text(d.total_fleet || '0');
                    $w.find('#vms-count-onthemove').text(d.on_the_move || '0');
                    $w.find('#vms-count-unutilized').text(d.unutilized || '0');
                    $w.find('#vms-count-maintenance').text(d.maintenance_status_available ? (d.in_maintenance || 0) : '—');
                    $w.find('#vms-maintenance-label').text(d.maintenance_status_available ? 'in maintenance' : 'maintenance status unavailable');

                    // Compute SVG Donut dash strokes
                    var circumference = 2 * Math.PI * 60; // ~377
                    var total = d.total_fleet || 1;
                    var pActive = (d.on_the_move / total) * circumference;
                    var pAvail = (d.unutilized / total) * circumference;
                    var pMaint = (d.in_maintenance / total) * circumference;

                    $w.find('#vms-donut-active').attr('stroke-dasharray', pActive + ' ' + (circumference - pActive));
                    $w.find('#vms-donut-avail').attr('stroke-dasharray', pAvail + ' ' + (circumference - pAvail));
                    $w.find('#vms-donut-maint').attr('stroke-dasharray', pMaint + ' ' + (circumference - pMaint));
                }
            }
        });
    }

    function load_featured_vehicle() {
        var $w = $(wrapper);
        frappe.call({
            method: 'vms.api.dashboard.get_featured_vehicle',
            callback: function(r) {
                if (r.message) {
                    var d = r.message;
                    if (d.has_active_vehicle) {
                    $w.find('#vms-feat-plate').text((d.vehicle_id || '') + (d.model ? ' (' + d.model + ')' : ''));
                        $w.find('#vms-feat-driver').text(d.driver_name || 'Driver Assigned');
                    $w.find('#vms-feat-route').text((d.route_name || 'Direct Route') + ' · ' + (d.capacity_utilization_pct || 0) + '% capacity');
                    $w.find('#vms-telemetry-notice').text(d.current_location || d.telemetry_notice || 'Trip location unavailable');
                    } else {
                        $w.find('#vms-feat-plate').text('No active delivery trips');
                        $w.find('#vms-feat-driver').text('Fleet Standby');
                        $w.find('#vms-feat-route').text('Vehicles stationed at distribution depots.');
                        $w.find('#vms-telemetry-notice').text('All vehicles available for dispatch.');
                    }
                }
            }
        });
    }

    function load_communications() {
        var $w = $(wrapper);
        frappe.call({
            method: 'vms.api.dashboard.get_incoming_communications',
            args: { filter_type: state.activeTab, limit: 8 },
            callback: function(r) {
                if (r.message) {
                    var d = r.message;
                    $w.find('#vms-unread-badge').text(d.total_count || '0');
                    var container = $w.find('#vms-comm-feed-container');
                    container.empty();

                    if (!d.items || d.items.length === 0) {
                        container.html('<div class="vms-empty-state"><i class="fa fa-check-circle-o"></i> No unread operational alerts.</div>');
                        return;
                    }

                    d.items.forEach(function(item) {
                        var $item = $('<button type="button" class="vms-comm-item"></button>');
                        var $icon = $('<span class="vms-comm-icon" aria-hidden="true"></span>');
                        var iconName = /^[a-z0-9-]+$/.test(item.icon || '') ? item.icon : 'info-circle';
                        $('<i></i>').addClass('fa fa-' + iconName).appendTo($icon);
                        var $content = $('<span class="vms-comm-content"></span>');
                        var $top = $('<span class="vms-comm-top"></span>');
                        $('<span class="vms-comm-title"></span>').text(item.title || '').appendTo($top);
                        $('<span class="vms-comm-time"></span>').text(item.time_ago || '').appendTo($top);
                        $('<span class="vms-comm-body"></span>').text(item.body || '').appendTo($content);
                        $content.prepend($top);
                        $item.append($icon, $content);
                        $item.attr('data-dt', item.reference_doctype || '').attr('data-dn', item.reference_name || '');
                        $item.on('click', function() {
                            var dt = $(this).attr('data-dt');
                            var dn = $(this).attr('data-dn');
                            if (dt && dn) frappe.set_route('Form', dt, dn);
                        });
                        container.append($item);
                    });
                }
            }
        });
    }

    function load_revenue_chart() {
        var $w = $(wrapper);
        frappe.call({
            method: 'vms.api.dashboard.get_revenue_collections_chart',
            callback: function(r) {
                if (r.message) {
                    var d = r.message;
                    $w.find('#vms-collections-total').text(d.current_total_formatted);
                    draw_collections_chart($w.find('#vms-chart-bars'), d.labels || [], d.data || []);
                }
            }
        });
    }

    function draw_collections_chart($container, labels, values) {
        var ns = 'http://www.w3.org/2000/svg';
        var width = 640, height = 190, left = 40, right = 12, top = 12, bottom = 32;
        var plotWidth = width - left - right, plotHeight = height - top - bottom;
        var numbers = labels.map(function(_, i) { return Number(values[i]) || 0; });
        var maxValue = Math.max.apply(null, numbers.concat([1]));
        var points = numbers.map(function(value, index) {
            var x = left + (labels.length <= 1 ? plotWidth / 2 : index * plotWidth / (labels.length - 1));
            var y = top + plotHeight - (value / maxValue) * plotHeight;
            return { x: x, y: y, value: value, label: labels[index] };
        });
        var svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        svg.setAttribute('class', 'vms-collections-svg');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Monthly verified collections trend');

        [0, 1, 2, 3].forEach(function(step) {
            var y = top + (plotHeight * step / 3);
            var line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', left); line.setAttribute('x2', width - right);
            line.setAttribute('y1', y); line.setAttribute('y2', y);
            line.setAttribute('class', 'vms-chart-gridline'); svg.appendChild(line);
        });

        if (points.length) {
            var linePoints = points.map(function(point) { return point.x + ',' + point.y; }).join(' ');
            var area = document.createElementNS(ns, 'polygon');
            area.setAttribute('points', left + ',' + (top + plotHeight) + ' ' + linePoints + ' ' + (width - right) + ',' + (top + plotHeight));
            area.setAttribute('class', 'vms-chart-area'); svg.appendChild(area);
            var line = document.createElementNS(ns, 'polyline');
            line.setAttribute('points', linePoints); line.setAttribute('class', 'vms-chart-line'); svg.appendChild(line);
            points.forEach(function(point) {
                var circle = document.createElementNS(ns, 'circle');
                circle.setAttribute('cx', point.x); circle.setAttribute('cy', point.y); circle.setAttribute('r', '3.5');
                circle.setAttribute('class', 'vms-chart-point');
                var title = document.createElementNS(ns, 'title');
                title.textContent = point.label + ': ₹' + point.value.toLocaleString('en-IN');
                circle.appendChild(title); svg.appendChild(circle);
                if (points.length <= 7 || index % 2 === 0 || index === points.length - 1) {
                    var label = document.createElementNS(ns, 'text');
                    label.setAttribute('x', point.x); label.setAttribute('y', height - 8);
                    label.setAttribute('text-anchor', 'middle'); label.setAttribute('class', 'vms-chart-axis-label');
                    label.textContent = point.label; svg.appendChild(label);
                }
            });
        }
        $container.empty().append(svg);
    }

    function load_kerala_map() {
        var $w = $(wrapper);
        frappe.call({
            method: 'vms.api.dashboard.get_kerala_map_data',
            callback: function(r) {
                if (r.message) {
                    var d = r.message;
                    if (d.has_coordinates && window.L) {
                        init_leaflet_map(d);
                    } else {
                        // Display configured depots list view
                        $w.find('#vms-leaflet-map').hide();
                        var fallback = $w.find('#vms-map-fallback');
                        fallback.show();
                        var listItems = $w.find('#vms-fallback-list-items');
                        listItems.empty();

                        var allWh = (d.warehouses || []).concat(d.unmapped_warehouses || []);
                        if (allWh.length === 0) {
                            listItems.html('<div class="text-muted p-3 text-center">No warehouses configured in ERPNext.</div>');
                        } else {
                            allWh.forEach(function(wh) {
                                var $row = $('<div class="vms-depot-row"></div>');
                                var $info = $('<div class="vms-depot-info"></div>');
                                $('<strong></strong>').text(wh.name || '').appendTo($info);
                                $('<span class="text-muted"></span>').text(wh.city ? ' (' + wh.city + ')' : '').appendTo($info);
                                var $stat = $('<div class="vms-depot-stat"><span class="badge badge-success"></span></div>');
                                $stat.find('.badge').text((wh.active_dispatches || 0) + ' Dispatches');
                                listItems.append($row.append($info, $stat));
                            });
                        }
                    }
                }
            }
        });
    }

    function init_leaflet_map(data) {
        var $w = $(wrapper);
        var mapEl = $w.find('#vms-leaflet-map')[0];
        if (!mapEl) return;

        if (state.mapInstance) {
            state.mapInstance.remove();
        }

        var map = L.map(mapEl).setView([9.9816, 76.2999], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        (data.warehouses || []).forEach(function(wh) {
            if (wh.lat && wh.lng) {
                L.marker([wh.lat, wh.lng]).addTo(map).bindPopup('<strong>' + frappe.utils.escape_html(wh.name || '') + '</strong><br>' + frappe.utils.escape_html(wh.city || ''));
            }
        });

        (data.stops || []).forEach(function(s) {
            if (s.lat && s.lng) {
                L.circleMarker([s.lat, s.lng], { radius: 6, color: '#20d52e' }).addTo(map).bindPopup('<strong>' + frappe.utils.escape_html(s.customer_name || '') + '</strong><br>Trip: ' + frappe.utils.escape_html(s.trip_id || ''));
            }
        });

        state.mapInstance = map;
    }

    function load_shipments() {
        var $w = $(wrapper);
        frappe.call({
            method: 'vms.api.dashboard.get_shipments_overview',
            args: {
                status: state.shipmentStatus,
                search: state.searchQuery,
                page: state.currentPage,
                page_size: state.pageSize
            },
            callback: function(r) {
                if (r.message) {
                    var d = r.message;
                    var tbody = $w.find('#vms-shipments-tbody');
                    tbody.empty();

                    if (!d.items || d.items.length === 0) {
                        tbody.html('<tr><td colspan="7" class="text-center text-muted p-4">No shipments matching current filters.</td></tr>');
                        $w.find('#vms-pagination-info').text('Showing 0 shipments');
                        $w.find('#vms-prev-page').prop('disabled', true);
                        $w.find('#vms-next-page').prop('disabled', true);
                        return;
                    }

                    d.items.forEach(function(row) {
                        var tr = $('<tr></tr>');
                        $('<td></td>').append($('<strong></strong>').text(row.id || '')).appendTo(tr);
                        $('<td></td>').text(row.route || '').appendTo(tr);
                        $('<td></td>').text(row.weight_formatted || '').appendTo(tr);
                        var statusClass = ['green', 'blue', 'orange', 'gray'].indexOf(row.status_color) >= 0 ? row.status_color : 'gray';
                        $('<td></td>').append($('<span class="vms-badge"></span>').addClass('vms-status-' + statusClass).text(row.status || '')).appendTo(tr);
                        $('<td></td>').text(row.truck || '').appendTo(tr);
                        $('<td></td>').text(row.arrival_date || '').appendTo(tr);
                        $('<td></td>').append($('<button type="button" class="btn btn-xs btn-default vms-open-trip"><i class="fa fa-external-link" aria-hidden="true"></i> View</button>').attr('data-id', row.id || '')).appendTo(tr);

                        tr.find('.vms-open-trip').on('click', function() {
                            frappe.set_route('Form', 'Delivery Trip', $(this).attr('data-id'));
                        });

                        tbody.append(tr);
                    });

                    $w.find('#vms-pagination-info').text('Showing ' + d.items.length + ' of ' + d.total + ' shipments (Page ' + d.page + ' of ' + d.total_pages + ')');
                    $w.find('#vms-prev-page').prop('disabled', d.page <= 1);
                    $w.find('#vms-next-page').prop('disabled', d.page >= d.total_pages);
                }
            }
        });
    }

    function get_dashboard_html() {
        return $(wrapper).find('.vms-dashboard-wrapper').html() || '';
    }
};
