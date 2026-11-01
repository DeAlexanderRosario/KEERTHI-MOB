import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Briefcase,
  TrendingUp,
  ShoppingBag,
  Boxes,
  CreditCard,
  Truck,
  Users,
  Sliders,
  RefreshCw,
  Bell,
  ArrowRight,
  CheckCircle2,
  Circle,
  Plus,
  ChevronRight,
  AlertTriangle,
  Clock,
  Calendar,
  Receipt,
  FileText,
  DollarSign,
  Package,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Store,
} from 'lucide-react';
import { documentService } from '../../services/documentService';
import { authService } from '../../services/authService';
import { StatCard } from '../common/StatCard';
import { ErrorBanner } from '../common/ErrorBanner';
import { StatusBadge } from '../common/StatusBadge';
import type { ERPDocument } from '../../services/types';

interface DashboardModuleProps {
  onNavigateModule: (moduleId: string, view?: string, docName?: string) => void;
  onOpenLogin: () => void;
}

export type DashboardTabId =
  | 'executive'
  | 'sales'
  | 'purchasing'
  | 'inventory'
  | 'accounts'
  | 'delivery'
  | 'hr'
  | 'operations';

interface DashboardTabConfig {
  id: DashboardTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const DASHBOARD_TABS: DashboardTabConfig[] = [
  {
    id: 'executive',
    label: 'Executive Dashboard',
    shortLabel: 'Executive',
    icon: Briefcase,
    description: 'High-level financial health, revenue trends, and operational pulse.',
  },
  {
    id: 'sales',
    label: 'Sales & CRM',
    shortLabel: 'Sales',
    icon: TrendingUp,
    description: 'Orders, customer acquisition, pipeline conversion, and selling milestones.',
  },
  {
    id: 'purchasing',
    label: 'Purchasing & Buying',
    shortLabel: 'Purchasing',
    icon: ShoppingBag,
    description: 'Procurement value, supplier relationships, purchase orders, and receipts.',
  },
  {
    id: 'inventory',
    label: 'Inventory Intelligence',
    shortLabel: 'Inventory',
    icon: Boxes,
    description: 'Stock valuation, item movement, low-stock warnings, and warehouse health.',
  },
  {
    id: 'accounts',
    label: 'Accounts & Finance',
    shortLabel: 'Accounts',
    icon: CreditCard,
    description: 'Receivables, payables, cash flow positions, and payment tracking.',
  },
  {
    id: 'delivery',
    label: 'Order Fulfilment',
    shortLabel: 'Delivery',
    icon: Truck,
    description: 'Dispatch performance, delivery notes, transit status, and delivery trips.',
  },
  {
    id: 'hr',
    label: 'HR & Workforce',
    shortLabel: 'Workforce',
    icon: Users,
    description: 'Active employee headcount, daily attendance metrics, and pending leaves.',
  },
  {
    id: 'operations',
    label: 'Daily Operations',
    shortLabel: 'Operations',
    icon: Sliders,
    description: 'Priorities for today, bottlenecks requiring immediate action, and live system latency.',
  },
];

export function DashboardModule({ onNavigateModule, onOpenLogin }: DashboardModuleProps) {
  const user = authService.getUser();

  // Active dashboard selection with localStorage persistence
  const [activeTab, setActiveTab] = useState<DashboardTabId>(() => {
    try {
      const saved = localStorage.getItem('keerthi_active_dashboard_tab');
      if (saved && DASHBOARD_TABS.some((t) => t.id === saved)) {
        return saved as DashboardTabId;
      }
    } catch {
      // fallback
    }
    return 'executive';
  });

  const handleSelectTab = (tabId: DashboardTabId) => {
    setActiveTab(tabId);
    try {
      localStorage.setItem('keerthi_active_dashboard_tab', tabId);
    } catch {
      // ignore
    }
  };

  // State for all 8 dashboards
  const [counts, setCounts] = useState<{
    invoices: number;
    orders: number;
    items: number;
    customers: number;
    suppliers: number;
    purchaseOrders: number;
    purchaseInvoices: number;
    deliveryNotes: number;
    employees: number;
    attendance: number;
    leaves: number;
    pendingDelivery: number;
    pendingBilling: number;
    pendingReceipts: number;
    pendingPurchaseBills: number;
  }>({
    invoices: 0,
    orders: 0,
    items: 0,
    customers: 0,
    suppliers: 0,
    purchaseOrders: 0,
    purchaseInvoices: 0,
    deliveryNotes: 0,
    employees: 0,
    attendance: 0,
    leaves: 0,
    pendingDelivery: 0,
    pendingBilling: 0,
    pendingReceipts: 0,
    pendingPurchaseBills: 0,
  });

  const [invoicesRevenue, setInvoicesRevenue] = useState<number>(0);
  const [purchaseTotal, setPurchaseTotal] = useState<number>(0);
  const [receivablesTotal, setReceivablesTotal] = useState<number>(0);
  const [payablesTotal, setPayablesTotal] = useState<number>(0);

  const [recentSalesOrders, setRecentSalesOrders] = useState<ERPDocument[]>([]);
  const [recentPurchaseOrders, setRecentPurchaseOrders] = useState<ERPDocument[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<ERPDocument[]>([]);
  const [topItems, setTopItems] = useState<ERPDocument[]>([]);
  const [serverPing, setServerPing] = useState<{ online: boolean; latencyMs?: number }>({
    online: true,
  });

  const [dateFilter, setDateFilter] = useState<'all' | 'year' | '30days'>('all');
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>(new Array(12).fill(0));
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(new Date().getMonth());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Fetch real ERPNext data across all modules
  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const results = await Promise.allSettled([
        // 0: Counts
        documentService.count('Sales Invoice'),
        documentService.count('Sales Order'),
        documentService.count('Item'),
        documentService.count('Customer'),
        documentService.count('Supplier'),
        documentService.count('Purchase Order'),
        documentService.count('Purchase Invoice'),
        documentService.count('Delivery Note'),
        documentService.count('Employee'),
        documentService.count('Attendance'),
        documentService.count('Leave Application'),
        // 11: Pending Operational Counts
        documentService.count('Sales Order', [['status', 'in', ['To Deliver and Bill', 'To Deliver']]]),
        documentService.count('Sales Order', [['status', 'in', ['To Deliver and Bill', 'To Bill']]]),
        documentService.count('Purchase Order', [['status', 'in', ['To Receive and Bill', 'To Receive']]]),
        documentService.count('Purchase Order', [['status', 'in', ['To Receive and Bill', 'To Bill']]]),
        // 15: Financial Lists (Filtered strictly by supported ERP parameters)
        (() => {
          const invFilters: any[] = [['docstatus', '=', 1]];
          const now = new Date();
          if (dateFilter === 'year') {
            invFilters.push(['posting_date', '>=', `${now.getFullYear()}-01-01`]);
          } else if (dateFilter === '30days') {
            const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            invFilters.push(['posting_date', '>=', d30]);
          }
          return documentService.list('Sales Invoice', {
            fields: ['name', 'grand_total', 'docstatus', 'outstanding_amount', 'customer', 'status', 'posting_date'],
            filters: invFilters,
            limit_page_length: 100,
          });
        })(),
        documentService.list('Purchase Invoice', {
          fields: ['name', 'grand_total', 'docstatus', 'outstanding_amount', 'supplier', 'status', 'posting_date'],
          filters: [['docstatus', '=', 1]],
          limit_page_length: 100,
        }),
        // 17: Operational Lists
        documentService.list('Sales Order', {
          fields: ['name', 'customer', 'grand_total', 'status', 'transaction_date'],
          order_by: 'creation desc',
          limit_start: 0,
          limit_page_length: 5,
        }),
        documentService.list('Purchase Order', {
          fields: ['name', 'supplier', 'grand_total', 'status', 'transaction_date'],
          order_by: 'creation desc',
          limit_start: 0,
          limit_page_length: 5,
        }),
        documentService.list('Sales Invoice', {
          fields: ['name', 'customer', 'grand_total', 'status', 'posting_date'],
          order_by: 'creation desc',
          limit_start: 0,
          limit_page_length: 5,
        }),
        documentService.list('Item', {
          fields: ['name', 'item_name', 'item_group', 'stock_uom'],
          order_by: 'creation desc',
          limit_start: 0,
          limit_page_length: 5,
        }),
      ]);

      const val = (idx: number) => {
        const r = results[idx];
        return r && r.status === 'fulfilled' ? (r.value as number) : 0;
      };

      setCounts({
        invoices: val(0),
        orders: val(1),
        items: val(2),
        customers: val(3),
        suppliers: val(4),
        purchaseOrders: val(5),
        purchaseInvoices: val(6),
        deliveryNotes: val(7),
        employees: val(8),
        attendance: val(9),
        leaves: val(10),
        pendingDelivery: val(11),
        pendingBilling: val(12),
        pendingReceipts: val(13),
        pendingPurchaseBills: val(14),
      });

      // Sum revenue, outstanding & compute real monthly breakdown
      const salesInvoicesResult = results[15];
      if (salesInvoicesResult && salesInvoicesResult.status === 'fulfilled') {
        const invs = salesInvoicesResult.value as ERPDocument[];
        const totalSales = invs.reduce((acc, i) => acc + (typeof i.grand_total === 'number' ? i.grand_total : 0), 0);
        const totalReceivables = invs.reduce(
          (acc, i) => acc + (typeof i.outstanding_amount === 'number' ? i.outstanding_amount : 0),
          0
        );
        setInvoicesRevenue(totalSales);
        setReceivablesTotal(totalReceivables);
        setFilteredCount(invs.length);

        // Real month grouping for calendar year
        const curYear = new Date().getFullYear();
        const monthly = new Array(12).fill(0);
        invs.forEach((inv) => {
          if (inv.posting_date && typeof inv.grand_total === 'number') {
            const d = new Date(inv.posting_date);
            if (!isNaN(d.getTime()) && d.getFullYear() === curYear) {
              monthly[d.getMonth()] += inv.grand_total;
            }
          }
        });
        setMonthlyRevenue(monthly);
      }

      const purchaseInvoicesResult = results[16];
      if (purchaseInvoicesResult && purchaseInvoicesResult.status === 'fulfilled') {
        const pinvs = purchaseInvoicesResult.value as ERPDocument[];
        const totalPurch = pinvs.reduce((acc, i) => acc + (typeof i.grand_total === 'number' ? i.grand_total : 0), 0);
        const totalPayables = pinvs.reduce(
          (acc, i) => acc + (typeof i.outstanding_amount === 'number' ? i.outstanding_amount : 0),
          0
        );
        setPurchaseTotal(totalPurch);
        setPayablesTotal(totalPayables);
      }

      if (results[17] && results[17].status === 'fulfilled') {
        setRecentSalesOrders(results[17].value as ERPDocument[]);
      }
      if (results[18] && results[18].status === 'fulfilled') {
        setRecentPurchaseOrders(results[18].value as ERPDocument[]);
      }
      if (results[19] && results[19].status === 'fulfilled') {
        setRecentInvoices(results[19].value as ERPDocument[]);
      }
      if (results[20] && results[20].status === 'fulfilled') {
        setTopItems(results[20].value as ERPDocument[]);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, dateFilter]);

  // Ping ERPNext server for live latency
  useEffect(() => {
    fetch('/api/erp/diagnostics/ping')
      .then((res) => res.json())
      .then((data) => {
        setServerPing({
          online: data.status === 'online',
          latencyMs: data.latencyMs,
        });
      })
      .catch(() => setServerPing({ online: false }));
  }, []);

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIdx = new Date().getMonth();

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm text-center space-y-4">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-800">
          <CreditCard className="w-6 h-6 stroke-[1.5]" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Access</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Sign in with your ERPNext account to access live revenue data, customer ledgers, and inventory balances.
        </p>
        <button
          onClick={onOpenLogin}
          className="w-full inline-flex items-center justify-center gap-2 h-12 text-xs font-semibold text-white bg-[#0f1115] hover:bg-black active:scale-[0.99] rounded-2xl shadow-sm transition-all"
        >
          <span>Sign In with ERP Credentials</span>
          <ArrowRight className="w-4 h-4 text-lime-400" />
        </button>
      </div>
    );
  }

  // Selling progress checklist calculation
  const hasCustomers = counts.customers > 0;
  const hasItems = counts.items > 0;
  const hasOrders = counts.orders > 0;
  const hasInvoices = counts.invoices > 0;
  const sellingStepsDone = [hasCustomers, hasItems, hasOrders, hasInvoices].filter(Boolean).length;

  // Buying progress checklist calculation
  const hasSuppliers = counts.suppliers > 0;
  const hasPurchaseOrders = counts.purchaseOrders > 0;
  const hasPurchaseInvoices = counts.purchaseInvoices > 0;
  const buyingStepsDone = [hasSuppliers, hasItems, hasPurchaseOrders, hasPurchaseInvoices].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Profile & Greeting Bar (inspired by mobile reference) */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-[#0f1115] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {user.fullName ? user.fullName[0].toUpperCase() : 'A'}
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block leading-none mb-1">
              {greeting}
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
              {user.fullName || user.user}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            className="w-10 h-10 rounded-full bg-white border border-slate-200/60 shadow-xs flex items-center justify-center text-slate-500 hover:text-slate-900 active:scale-95 transition-all"
            title="Refresh metrics"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-lime-600' : ''}`} />
          </button>

          <button
            onClick={() => onNavigateModule('settings')}
            className="relative w-10 h-10 rounded-full bg-white border border-slate-200/60 shadow-xs flex items-center justify-center text-slate-700 hover:text-slate-900 active:scale-95 transition-all"
            title="Diagnostics & Alerts"
            aria-label="View alerts and system diagnostics"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
        </div>
      </div>

      {/* 2. Role-Aware Multi-Dashboard Switcher */}
      <div className="border-b border-slate-200/70 pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500">
              Active Dashboard
            </span>
            <span>·</span>
            <span className="text-slate-700 font-medium">
              {DASHBOARD_TABS.find((t) => t.id === activeTab)?.description}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-500">
            <span
              className={`w-1.5 h-1.5 rounded-full ${serverPing.online ? 'bg-lime-500' : 'bg-rose-500'}`}
            />
            <span>{serverPing.latencyMs ? `${serverPing.latencyMs}ms` : 'online'}</span>
          </div>
        </div>

        {/* Horizontal Scrollable Segmented Control */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {DASHBOARD_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isActive
                    ? 'bg-[#0f1115] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-lime-400' : 'text-slate-400'}`} />
                <span>{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <ErrorBanner error={error} onRetry={() => fetchDashboardData(true)} />}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: EXECUTIVE DASHBOARD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          {/* Obsidian Hero Card (from reference image) */}
          <div className="bg-[#0f1115] text-white rounded-[32px] p-6 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.16)] relative overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 items-center">
              <div>
                <span className="text-xs text-slate-400 font-medium block mb-1.5">
                  Annual Invoiced Sales (Net)
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono tabular-nums">
                  {formatCurrency(invoicesRevenue)}
                </div>
                <div className="flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-lime-400">
                  <span>{counts.invoices} Total Posted Invoices</span>
                  <span className="text-slate-400 font-normal">on ERPNext</span>
                </div>
              </div>

              <div className="sm:border-l sm:border-white/10 sm:pl-8 pt-4 sm:pt-0 border-t border-white/10">
                <span className="text-xs text-slate-400 font-medium block mb-1.5">
                  Sales Orders Status
                </span>
                <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white mb-3">
                  {counts.pendingDelivery} To Deliver · {counts.pendingBilling} To Bill
                </div>

                <div className="w-full bg-[#24272e] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-lime-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${counts.orders > 0 ? Math.min(100, (counts.invoices / counts.orders) * 100) : (sellingStepsDone / 4) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                  <span className="text-slate-300 font-medium">
                    {counts.orders > 0 ? `${counts.orders} Total Orders` : `${sellingStepsDone} of 4 steps setup`}
                  </span>
                  <span>erp.keerthigroup.co.in</span>
                </div>
              </div>
            </div>
          </div>

          {/* Field Operations & Driver Quick Launch (VMS End-to-End Flow) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <button
              onClick={() => onNavigateModule('field_sales')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-[#20D52E] hover:shadow-sm text-left transition-all group flex items-start justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#20D52E]/15 text-[#0B4025] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">
                      Field Sales Agent Portal
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#20D52E]/20 text-[#0B4025]">
                      Active Flow
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Onboard retail shops with storefront photo, log customer visits, book sales orders, and capture payment collections.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 shrink-0 mt-1" />
            </button>

            <button
              onClick={() => onNavigateModule('delivery')}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-[#20D52E] hover:shadow-sm text-left transition-all group flex items-start justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-slate-900 text-[#20D52E] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">
                      Driver Delivery Portal
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Trip POD
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Inspect assigned dispatch, identify shops by storefront photo, record arrival, and capture digital POD with zero COD.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 shrink-0 mt-1" />
            </button>
          </div>

          {/* Quick Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <StatCard
              label="Accounts Receivable"
              value={formatCurrency(receivablesTotal)}
              sublabel="Outstanding from clients"
              trend="Current"
              trendDirection="neutral"
              icon={<CreditCard className="w-4 h-4" />}
              onClick={() => onNavigateModule('accounts', 'sales_invoices')}
            />
            <StatCard
              label="Accounts Payable"
              value={formatCurrency(payablesTotal)}
              sublabel="Owed to suppliers"
              trend="Current"
              trendDirection="neutral"
              icon={<DollarSign className="w-4 h-4" />}
              onClick={() => onNavigateModule('accounts', 'purchase_invoices')}
            />
            <StatCard
              label="Catalog Items"
              value={counts.items.toLocaleString()}
              sublabel="Stock items recorded"
              trend="Active"
              trendDirection="up"
              icon={<Boxes className="w-4 h-4" />}
              onClick={() => onNavigateModule('stock', 'Item')}
            />
            <StatCard
              label="Customers"
              value={counts.customers.toLocaleString()}
              sublabel="Commercial accounts"
              trend="Active"
              trendDirection="up"
              icon={<Users className="w-4 h-4" />}
              onClick={() => onNavigateModule('sales', 'Customer')}
            />
          </div>

          {/* Revenue Flow Card with Date Filters and Verified Monthly Data */}
          <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Revenue Flow
                </h3>
                <span className="text-xs text-slate-400 font-medium block">
                  Total Filtered Revenue: {formatCurrency(invoicesRevenue)} · {filteredCount} Posted Invoices
                </span>
              </div>

              {/* Verified ERP Date Filter Controls */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setDateFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    dateFilter === 'all'
                      ? 'bg-white text-slate-950 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  All Sample (100)
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('year')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    dateFilter === 'year'
                      ? 'bg-white text-slate-950 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  {new Date().getFullYear()} Year-to-Date
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('30days')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    dateFilter === '30days'
                      ? 'bg-white text-slate-950 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            <div className="h-44 sm:h-52 w-full pt-4 flex flex-col justify-end">
              <div className="flex items-end justify-between gap-1 sm:gap-2 h-36 px-2">
                {(() => {
                  const maxMonthlyRev = Math.max(...monthlyRevenue, 1);
                  return months.map((m, idx) => {
                    const isCurrent = idx === currentMonthIdx;
                    const isSelected = idx === selectedMonthIndex;
                    const monthVal = monthlyRevenue[idx] || 0;
                    const heightPct = monthVal > 0 ? Math.max(12, Math.round((monthVal / maxMonthlyRev) * 100)) : 4;

                    return (
                      <div
                        key={m}
                        onClick={() => setSelectedMonthIndex(idx)}
                        className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                      >
                        <div className="w-full flex items-end justify-center h-28 relative">
                          {isSelected && (
                            <div className="absolute -top-7 px-2 py-0.5 bg-[#0f1115] text-white text-[10px] rounded-md font-mono whitespace-nowrap shadow-xs z-10">
                              {formatCurrency(monthVal)}
                            </div>
                          )}
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full max-w-[28px] rounded-t-lg transition-all duration-200 ${
                              isSelected
                                ? 'bg-lime-400'
                                : monthVal > 0
                                ? 'bg-lime-500/80 hover:bg-lime-400'
                                : 'bg-slate-100 group-hover:bg-slate-200'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-[10px] sm:text-xs font-medium ${
                            isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {m}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Selected Month: {months[selectedMonthIndex]} ({formatCurrency(monthlyRevenue[selectedMonthIndex] || 0)})</span>
              <span className="font-mono">Live ERPNext Source · Zero Synthetic Data</span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: SALES & CRM DASHBOARD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <StatCard
              label="Sales Orders"
              value={counts.orders.toLocaleString()}
              sublabel={`${counts.pendingDelivery} awaiting delivery`}
              icon={<TrendingUp className="w-4 h-4" />}
              onClick={() => onNavigateModule('sales', 'Sales Order')}
            />
            <StatCard
              label="Customers"
              value={counts.customers.toLocaleString()}
              sublabel="Commercial accounts"
              icon={<Users className="w-4 h-4" />}
              onClick={() => onNavigateModule('sales', 'Customer')}
            />
            <StatCard
              label="Invoices"
              value={counts.invoices.toLocaleString()}
              sublabel="Official bills posted"
              icon={<Receipt className="w-4 h-4" />}
              onClick={() => onNavigateModule('billing')}
            />
            <StatCard
              label="To Bill"
              value={counts.pendingBilling.toLocaleString()}
              sublabel="Orders requiring invoice"
              trend={counts.pendingBilling > 0 ? 'Pending' : 'Done'}
              trendDirection={counts.pendingBilling > 0 ? 'down' : 'up'}
              icon={<CreditCard className="w-4 h-4" />}
              onClick={() => onNavigateModule('sales', 'Sales Order')}
            />
          </div>

          {/* 4-Step Selling Wizard */}
          <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Selling Lifecycle
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Make your first sale
                </h2>
              </div>
              <span className="text-xs font-semibold font-mono px-3 py-1 bg-lime-50 text-lime-700 rounded-full border border-lime-200/60">
                {sellingStepsDone} of 4 steps completed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div
                onClick={() => onNavigateModule('sales', 'Customer')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  hasCustomers
                    ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                    : 'bg-[#f8f9fa] border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">1. Add Customer</span>
                  {hasCustomers ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-300" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {hasCustomers ? `${counts.customers} customer(s) registered.` : 'Add a business or contact to bill.'}
                </p>
              </div>

              <div
                onClick={() => onNavigateModule('stock', 'Item')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  hasItems
                    ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                    : 'bg-[#f8f9fa] border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">2. Add Item</span>
                  {hasItems ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-300" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {hasItems ? `${counts.items} catalog item(s) available.` : 'Products or items you sell.'}
                </p>
              </div>

              <div
                onClick={() => onNavigateModule('sales', 'Sales Order')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  hasOrders
                    ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                    : 'bg-white border-slate-900 shadow-xs hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">3. Confirm Sales Order</span>
                  {hasOrders ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4 text-slate-900" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {hasOrders ? `${counts.orders} sales order(s) entered.` : 'Confirm an order to deliver.'}
                </p>
              </div>

              <div
                onClick={() => onNavigateModule('billing')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  hasInvoices
                    ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                    : 'bg-[#f8f9fa] border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">4. Send Invoice</span>
                  {hasInvoices ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4 text-slate-400" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {hasInvoices ? `${counts.invoices} invoices posted.` : 'Post invoice & receive payment.'}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Sales Orders */}
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Recent Sales Orders</h3>
              <button
                onClick={() => onNavigateModule('sales', 'Sales Order')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentSalesOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No sales orders created yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentSalesOrders.map((so) => (
                  <div
                    key={so.name}
                    onClick={() => onNavigateModule('sales', 'Sales Order', so.name)}
                    className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 px-2 rounded-xl transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{so.customer || so.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {so.name} · {so.transaction_date || ''}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-slate-900 block">
                        {formatCurrency(Number(so.grand_total) || 0)}
                      </span>
                      <span className="text-[10px] text-slate-500">{so.status || 'Draft'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PURCHASING & BUYING */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'purchasing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <StatCard
              label="Purchase Orders"
              value={counts.purchaseOrders.toLocaleString()}
              sublabel={`${counts.pendingReceipts} to receive`}
              icon={<ShoppingBag className="w-4 h-4" />}
              onClick={() => onNavigateModule('purchases', 'Purchase Order')}
            />
            <StatCard
              label="Suppliers"
              value={counts.suppliers.toLocaleString()}
              sublabel="Active vendors"
              icon={<Users className="w-4 h-4" />}
              onClick={() => onNavigateModule('purchases', 'Supplier')}
            />
            <StatCard
              label="Purchase Invoices"
              value={counts.purchaseInvoices.toLocaleString()}
              sublabel="Vendor bills registered"
              icon={<Receipt className="w-4 h-4" />}
              onClick={() => onNavigateModule('accounts', 'purchase_invoices')}
            />
            <StatCard
              label="Total Purchase Value"
              value={formatCurrency(purchaseTotal)}
              sublabel="Official bills"
              icon={<DollarSign className="w-4 h-4" />}
            />
          </div>

          {/* 4-Step Procurement Wizard */}
          <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Procurement Workflow
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Order from your suppliers
                </h2>
              </div>
              <span className="text-xs font-semibold font-mono px-3 py-1 bg-lime-50 text-lime-700 rounded-full border border-lime-200/60">
                {buyingStepsDone} of 4 steps completed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div
                onClick={() => onNavigateModule('purchases', 'Supplier')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  hasSuppliers
                    ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                    : 'bg-[#f8f9fa] border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">1. Add Supplier</span>
                  {hasSuppliers ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-300" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {hasSuppliers ? `${counts.suppliers} supplier(s) recorded.` : 'A business or person you buy from.'}
                </p>
              </div>

              <div
                onClick={() => onNavigateModule('stock', 'Item')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  hasItems
                    ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                    : 'bg-[#f8f9fa] border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">2. Add Item</span>
                  {hasItems ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-300" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {hasItems ? `${counts.items} item(s) cataloged.` : 'Item or material you buy.'}
                </p>
              </div>

              <div
                onClick={() => onNavigateModule('purchases', 'Purchase Order')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  hasPurchaseOrders
                    ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                    : 'bg-white border-slate-900 shadow-xs hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">3. Place PO</span>
                  {hasPurchaseOrders ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4 text-slate-900" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {hasPurchaseOrders ? `${counts.purchaseOrders} PO(s) placed.` : 'Send formal purchase order.'}
                </p>
              </div>

              <div
                onClick={() => onNavigateModule('accounts', 'purchase_invoices')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  hasPurchaseInvoices
                    ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                    : 'bg-[#f8f9fa] border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">4. Enter Bill</span>
                  {hasPurchaseInvoices ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4 text-slate-400" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {hasPurchaseInvoices ? `${counts.purchaseInvoices} bill(s) registered.` : 'Record invoice & pay supplier.'}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Purchase Orders */}
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Recent Purchase Orders</h3>
              <button
                onClick={() => onNavigateModule('purchases', 'Purchase Order')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentPurchaseOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No purchase orders created yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentPurchaseOrders.map((po) => (
                  <div
                    key={po.name}
                    onClick={() => onNavigateModule('purchases', 'Purchase Order', po.name)}
                    className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 px-2 rounded-xl transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{po.supplier || po.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {po.name} · {po.transaction_date || ''}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-slate-900 block">
                        {formatCurrency(Number(po.grand_total) || 0)}
                      </span>
                      <span className="text-[10px] text-slate-500">{po.status || 'Draft'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: INVENTORY INTELLIGENCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <StatCard
              label="Catalog Items"
              value={counts.items.toLocaleString()}
              sublabel="Active product master"
              icon={<Boxes className="w-4 h-4" />}
              onClick={() => onNavigateModule('stock', 'Item')}
            />
            <StatCard
              label="Delivery Notes"
              value={counts.deliveryNotes.toLocaleString()}
              sublabel="Stock shipments"
              icon={<Truck className="w-4 h-4" />}
              onClick={() => onNavigateModule('delivery')}
            />
            <StatCard
              label="Pending To Deliver"
              value={counts.pendingDelivery.toLocaleString()}
              sublabel="Orders awaiting dispatch"
              trend={counts.pendingDelivery > 0 ? 'Action Needed' : 'Clear'}
              trendDirection={counts.pendingDelivery > 0 ? 'down' : 'up'}
              icon={<Package className="w-4 h-4" />}
              onClick={() => onNavigateModule('sales', 'Sales Order')}
            />
            <StatCard
              label="Pending Receipts"
              value={counts.pendingReceipts.toLocaleString()}
              sublabel="Supplier shipments inbound"
              icon={<ShoppingBag className="w-4 h-4" />}
              onClick={() => onNavigateModule('purchases', 'Purchase Order')}
            />
          </div>

          {/* Catalog Snapshot */}
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Inventory Items Master</h3>
                <span className="text-xs text-slate-400">Recent catalog products in ERPNext</span>
              </div>
              <button
                onClick={() => onNavigateModule('stock', 'Item')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {topItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No items recorded in ERPNext yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {topItems.map((itm) => (
                  <div
                    key={itm.name}
                    onClick={() => onNavigateModule('stock', 'Item', itm.name)}
                    className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 px-2 rounded-xl transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{itm.item_name || itm.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Code: {itm.name} · Group: {itm.item_group || 'All'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium text-slate-700 block">{itm.stock_uom || 'Nos'}</span>
                      <span className="text-[10px] text-slate-400">Inspect ledger →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: ACCOUNTS & FINANCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <StatCard
              label="Accounts Receivable"
              value={formatCurrency(receivablesTotal)}
              sublabel="Outstanding invoices"
              trend={receivablesTotal > 0 ? 'Uncollected' : 'Settled'}
              trendDirection={receivablesTotal > 0 ? 'down' : 'up'}
              icon={<CreditCard className="w-4 h-4" />}
              onClick={() => onNavigateModule('accounts', 'sales_invoices')}
            />
            <StatCard
              label="Accounts Payable"
              value={formatCurrency(payablesTotal)}
              sublabel="Owed to suppliers"
              icon={<DollarSign className="w-4 h-4" />}
              onClick={() => onNavigateModule('accounts', 'purchase_invoices')}
            />
            <StatCard
              label="Sales Invoices"
              value={counts.invoices.toLocaleString()}
              sublabel="Total billing documents"
              icon={<Receipt className="w-4 h-4" />}
              onClick={() => onNavigateModule('billing')}
            />
            <StatCard
              label="Purchase Invoices"
              value={counts.purchaseInvoices.toLocaleString()}
              sublabel="Total supplier bills"
              icon={<FileText className="w-4 h-4" />}
              onClick={() => onNavigateModule('accounts', 'purchase_invoices')}
            />
          </div>

          {/* Quick Ledger Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onNavigateModule('accounts', 'sales_invoices')}
              className="p-5 bg-white border border-slate-100 rounded-[24px] text-left hover:border-slate-300 transition-all shadow-xs"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 block">Sales Invoices</span>
              <p className="text-[11px] text-slate-400 mt-1">Review posted billing and customer balances.</p>
            </button>

            <button
              onClick={() => onNavigateModule('accounts', 'purchase_invoices')}
              className="p-5 bg-white border border-slate-100 rounded-[24px] text-left hover:border-slate-300 transition-all shadow-xs"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 block">Purchase Invoices</span>
              <p className="text-[11px] text-slate-400 mt-1">Manage vendor bills and payment schedules.</p>
            </button>

            <button
              onClick={() => onNavigateModule('accounts', 'payment_entries')}
              className="p-5 bg-white border border-slate-100 rounded-[24px] text-left hover:border-slate-300 transition-all shadow-xs"
            >
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 block">Payment Entries</span>
              <p className="text-[11px] text-slate-400 mt-1">Record incoming collections & vendor disbursements.</p>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: DELIVERY & FULFILMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'delivery' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <StatCard
              label="Delivery Notes"
              value={counts.deliveryNotes.toLocaleString()}
              sublabel="Dispatches recorded"
              icon={<Truck className="w-4 h-4" />}
              onClick={() => onNavigateModule('delivery')}
            />
            <StatCard
              label="Pending To Deliver"
              value={counts.pendingDelivery.toLocaleString()}
              sublabel="Sales orders waiting"
              trend={counts.pendingDelivery > 0 ? 'Backlog' : 'Clear'}
              trendDirection={counts.pendingDelivery > 0 ? 'down' : 'up'}
              icon={<Package className="w-4 h-4" />}
              onClick={() => onNavigateModule('sales', 'Sales Order')}
            />
            <StatCard
              label="Customers"
              value={counts.customers.toLocaleString()}
              sublabel="Destination accounts"
              icon={<Users className="w-4 h-4" />}
              onClick={() => onNavigateModule('sales', 'Customer')}
            />
            <StatCard
              label="Catalog Items"
              value={counts.items.toLocaleString()}
              sublabel="Deliverable items"
              icon={<Boxes className="w-4 h-4" />}
              onClick={() => onNavigateModule('stock', 'Item')}
            />
          </div>

          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Fulfilment Hub</h3>
                <span className="text-xs text-slate-400">Generate dispatch notes and monitor orders</span>
              </div>
              <button
                onClick={() => onNavigateModule('delivery')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0f1115] hover:bg-black rounded-full transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-lime-400" />
                <span>New Delivery Note</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 leading-relaxed">
              Delivery Notes deduct inventory from your specified warehouse upon posting. Ensure all Sales Orders are confirmed prior to dispatching items.
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: HR & WORKFORCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'hr' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <StatCard
              label="Active Employees"
              value={counts.employees.toLocaleString()}
              sublabel="Staff profiles recorded"
              icon={<Users className="w-4 h-4" />}
              onClick={() => onNavigateModule('hr')}
            />
            <StatCard
              label="Attendance Records"
              value={counts.attendance.toLocaleString()}
              sublabel="Historical entries"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => onNavigateModule('hr')}
            />
            <StatCard
              label="Leave Applications"
              value={counts.leaves.toLocaleString()}
              sublabel="Pending & processed"
              icon={<Clock className="w-4 h-4" />}
              onClick={() => onNavigateModule('hr')}
            />
            <StatCard
              label="HR Health"
              value={counts.employees > 0 ? 'Active' : 'Setup'}
              sublabel="Workforce module"
              icon={<ShieldAlert className="w-4 h-4" />}
              onClick={() => onNavigateModule('hr')}
            />
          </div>

          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Workforce Overview</h3>
                <span className="text-xs text-slate-400">Employee records and daily attendance tracking</span>
              </div>
              <button
                onClick={() => onNavigateModule('hr')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0f1115] hover:bg-black rounded-full transition-colors"
              >
                <span>Open HR Workspace</span>
                <ChevronRight className="w-3.5 h-3.5 text-lime-400" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 leading-relaxed">
              Access the Employee Directory, track daily shifts, record check-ins, and approve leave applications in accordance with company policy.
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 8: DAILY OPERATIONS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            <StatCard
              label="Orders To Deliver"
              value={counts.pendingDelivery.toLocaleString()}
              sublabel="Awaiting shipment"
              trend={counts.pendingDelivery > 0 ? 'Priority' : 'Good'}
              trendDirection={counts.pendingDelivery > 0 ? 'down' : 'up'}
              icon={<Truck className="w-4 h-4" />}
              onClick={() => onNavigateModule('sales', 'Sales Order')}
            />
            <StatCard
              label="Orders To Bill"
              value={counts.pendingBilling.toLocaleString()}
              sublabel="Awaiting billing"
              trend={counts.pendingBilling > 0 ? 'Priority' : 'Good'}
              trendDirection={counts.pendingBilling > 0 ? 'down' : 'up'}
              icon={<Receipt className="w-4 h-4" />}
              onClick={() => onNavigateModule('billing')}
            />
            <StatCard
              label="PO Receipts Pending"
              value={counts.pendingReceipts.toLocaleString()}
              sublabel="Goods pending receipt"
              icon={<ShoppingBag className="w-4 h-4" />}
              onClick={() => onNavigateModule('purchases', 'Purchase Order')}
            />
            <StatCard
              label="Live Latency"
              value={serverPing.latencyMs ? `${serverPing.latencyMs}ms` : 'Online'}
              sublabel="erp.keerthigroup.co.in"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => onNavigateModule('settings')}
            />
          </div>

          {/* Actionable Exceptions List */}
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Today's Actionable Priorities</h3>

            <div className="space-y-3">
              {counts.pendingDelivery > 0 && (
                <div
                  onClick={() => onNavigateModule('sales', 'Sales Order')}
                  className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between cursor-pointer hover:bg-amber-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {counts.pendingDelivery} Sales Orders waiting to be delivered
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Generate Delivery Notes to dispatch stock to customers.
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
                </div>
              )}

              {counts.pendingBilling > 0 && (
                <div
                  onClick={() => onNavigateModule('billing')}
                  className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {counts.pendingBilling} Sales Orders waiting to be billed
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Create Sales Invoices to request customer payment.
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-600 shrink-0" />
                </div>
              )}

              {counts.pendingReceipts > 0 && (
                <div
                  onClick={() => onNavigateModule('purchases', 'Purchase Order')}
                  className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex items-center justify-between cursor-pointer hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {counts.pendingReceipts} Purchase Orders awaiting goods receipt
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Record Purchase Receipts upon arrival at warehouse.
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-600 shrink-0" />
                </div>
              )}

              {counts.pendingDelivery === 0 && counts.pendingBilling === 0 && counts.pendingReceipts === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <span>No operational bottlenecks detected today! All orders and dispatches are up to date.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
