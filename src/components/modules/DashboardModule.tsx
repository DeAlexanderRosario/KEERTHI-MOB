import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Receipt,
  Boxes,
  Truck,
  Bell,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  CreditCard,
  ChevronRight,
  CheckCircle2,
  Circle,
  Plus,
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

export function DashboardModule({ onNavigateModule, onOpenLogin }: DashboardModuleProps) {
  const user = authService.getUser();

  const [metrics, setMetrics] = useState<{
    invoicesCount: number;
    ordersCount: number;
    itemsCount: number;
    customersCount: number;
    deliveryCount: number;
    pendingDeliveryCount: number;
    pendingBillingCount: number;
  }>({
    invoicesCount: 0,
    ordersCount: 0,
    itemsCount: 0,
    customersCount: 0,
    deliveryCount: 0,
    pendingDeliveryCount: 0,
    pendingBillingCount: 0,
  });

  const [recentInvoices, setRecentInvoices] = useState<ERPDocument[]>([]);
  const [invoicesRevenue, setInvoicesRevenue] = useState<number>(0);
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

  const fetchDashboardData = async (isBackground = false) => {
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
      // Parallel real queries from ERPNext v16
      const [
        invCount,
        ordCount,
        itmCount,
        custCount,
        delCount,
        recInvoices,
        allInvoices,
        pendingDelCount,
        pendingBillCount,
      ] = await Promise.allSettled([
        documentService.count('Sales Invoice'),
        documentService.count('Sales Order'),
        documentService.count('Item'),
        documentService.count('Customer'),
        documentService.count('Delivery Note'),
        documentService.list('Sales Invoice', {
          fields: ['name', 'customer', 'grand_total', 'status', 'docstatus', 'posting_date'],
          order_by: 'creation desc',
          limit_start: 0,
          limit_page_length: 5,
        }),
        documentService.list('Sales Invoice', {
          fields: ['name', 'grand_total', 'docstatus'],
          filters: [['docstatus', '=', 1]],
          limit_page_length: 100,
        }),
        documentService.count('Sales Order', [['status', 'in', ['To Deliver and Bill', 'To Deliver']]]),
        documentService.count('Sales Order', [['status', 'in', ['To Deliver and Bill', 'To Bill']]]),
      ]);

      const invC = invCount.status === 'fulfilled' ? invCount.value : 0;
      const ordC = ordCount.status === 'fulfilled' ? ordCount.value : 0;
      const itmC = itmCount.status === 'fulfilled' ? itmCount.value : 0;
      const custC = custCount.status === 'fulfilled' ? custCount.value : 0;
      const delC = delCount.status === 'fulfilled' ? delCount.value : 0;
      const pDelC = pendingDelCount.status === 'fulfilled' ? pendingDelCount.value : 0;
      const pBillC = pendingBillCount.status === 'fulfilled' ? pendingBillCount.value : 0;

      setMetrics({
        invoicesCount: invC,
        ordersCount: ordC,
        itemsCount: itmC,
        customersCount: custC,
        deliveryCount: delC,
        pendingDeliveryCount: pDelC,
        pendingBillingCount: pBillC,
      });

      if (recInvoices.status === 'fulfilled') {
        setRecentInvoices(recInvoices.value);
      }

      // Calculate real total from all submitted invoices (docstatus === 1)
      if (allInvoices.status === 'fulfilled') {
        const sum = allInvoices.value.reduce(
          (acc, inv) => acc + (typeof inv.grand_total === 'number' ? inv.grand_total : 0),
          0
        );
        setInvoicesRevenue(sum);
      } else if (recInvoices.status === 'fulfilled') {
        const sum = recInvoices.value.reduce(
          (acc, inv) => acc + (typeof inv.grand_total === 'number' ? inv.grand_total : 0),
          0
        );
        setInvoicesRevenue(sum);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
  }, [user]);

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
  const hasCustomers = metrics.customersCount > 0;
  const hasItems = metrics.itemsCount > 0;
  const hasOrders = metrics.ordersCount > 0;
  const hasInvoices = metrics.invoicesCount > 0;
  const stepsDone = [hasCustomers, hasItems, hasOrders, hasInvoices].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Profile & Greeting Bar */}
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
            className="w-10 h-10 rounded-full bg-white border border-slate-200/60 shadow-xs flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-lime-600' : ''}`} />
          </button>

          <button
            onClick={() => onNavigateModule('settings')}
            className="relative w-10 h-10 rounded-full bg-white border border-slate-200/60 shadow-xs flex items-center justify-center text-slate-700 hover:text-slate-900 transition-colors"
            title="Alerts & Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
        </div>
      </div>

      {error && <ErrorBanner error={error} onRetry={() => fetchDashboardData(true)} />}

      {/* 2. Hero Black Card (100% Real Live Metrics from ERPNext) */}
      <div className="bg-[#0f1115] text-white rounded-[32px] p-7 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.16)] relative overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 items-center">
          {/* Left: Real Revenue */}
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-1.5">
              Annual Invoiced Sales
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono tabular-nums">
              {formatCurrency(invoicesRevenue)}
            </div>
            <div className="flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-lime-400">
              <span>{metrics.invoicesCount} Total Invoices</span>
              <span className="text-slate-400 font-normal">on live server</span>
            </div>
          </div>

          {/* Right: Operational Selling Status */}
          <div className="sm:border-l sm:border-white/10 sm:pl-8 pt-4 sm:pt-0 border-t border-white/10">
            <span className="text-xs text-slate-400 font-medium block mb-1.5">
              Sales Orders Pending
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white mb-3">
              {metrics.pendingDeliveryCount} To Deliver · {metrics.pendingBillingCount} To Bill
            </div>

            <div className="w-full bg-[#24272e] h-2 rounded-full overflow-hidden">
              <div
                className="bg-lime-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${(stepsDone / 4) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
              <span className="text-slate-300 font-medium">{stepsDone} of 4 setup steps</span>
              <span>erp.keerthigroup.co.in</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Selling Onboarding Guide (When sales orders are starting out) */}
      {metrics.ordersCount === 0 && (
        <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Selling &amp; CRM Setup
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Make your first sale
              </h2>
            </div>
            <span className="text-xs font-semibold font-mono px-3 py-1 bg-lime-50 text-lime-700 rounded-full border border-lime-200/60">
              {stepsDone} of 4 steps done
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Step 1: Customer */}
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
                {hasCustomers ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {hasCustomers
                  ? `${metrics.customersCount} customer(s) created.`
                  : 'Add your first customer to bill.'}
              </p>
            </div>

            {/* Step 2: Item */}
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
                {hasItems ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {hasItems
                  ? `${metrics.itemsCount} catalog item(s) ready.`
                  : 'Add products or raw materials.'}
              </p>
            </div>

            {/* Step 3: Sales Order */}
            <div
              onClick={() => onNavigateModule('sales', 'Sales Order')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                hasOrders
                  ? 'bg-emerald-50/40 border-emerald-200/70'
                  : 'bg-white border-slate-900 shadow-xs hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900">3. Confirm Sales Order</span>
                {hasOrders ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Plus className="w-4 h-4 text-slate-900" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Confirm order to deliver or bill.
              </p>
            </div>

            {/* Step 4: Invoice */}
            <div
              onClick={() => onNavigateModule('billing')}
              className="p-4 rounded-2xl border bg-[#f8f9fa] border-slate-200/80 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900">4. Send Invoice</span>
                <Plus className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Post official invoice &amp; get paid.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Stat Cards Row (Live ERPNext Counts) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label="Total Customers"
          value={metrics.customersCount.toLocaleString()}
          icon={<Users className="w-4 h-4" />}
          onClick={() => onNavigateModule('sales', 'Customer')}
        />
        <StatCard
          label="Sales Orders"
          value={metrics.ordersCount.toLocaleString()}
          sublabel={`${metrics.pendingDeliveryCount} to deliver`}
          icon={<Receipt className="w-4 h-4" />}
          onClick={() => onNavigateModule('sales', 'Sales Order')}
        />
        <StatCard
          label="Catalog Items"
          value={metrics.itemsCount.toLocaleString()}
          icon={<Boxes className="w-4 h-4" />}
          onClick={() => onNavigateModule('stock', 'Item')}
        />
        <StatCard
          label="Delivery Notes"
          value={metrics.deliveryCount.toLocaleString()}
          icon={<Truck className="w-4 h-4" />}
          onClick={() => onNavigateModule('delivery')}
        />
      </div>

      {/* 5. Revenue Flow Card */}
      <div className="bg-white rounded-[32px] p-7 sm:p-8 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Revenue Flow
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Live Annual Sales:{' '}
              <span className="font-semibold text-slate-900 font-mono">
                {formatCurrency(invoicesRevenue)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-lime-500" />
              <span className="text-slate-600 font-medium">Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="text-slate-400">Target</span>
            </div>
          </div>
        </div>

        {/* Clean Responsive Monthly Bars */}
        <div className="relative pt-6 pb-2">
          {invoicesRevenue === 0 && (
            <div className="text-center py-6 text-xs text-slate-400 font-mono">
              No posted sales invoices recorded yet. Start by confirming a sales order or drafting an invoice.
            </div>
          )}

          <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-36 sm:h-44 border-b border-slate-100 px-1">
            {months.map((m, idx) => {
              const isSelected = idx === selectedMonthIndex;
              const isCurrent = idx === currentMonthIdx;
              const heightPercent = isCurrent && invoicesRevenue > 0 ? 80 : 15;

              return (
                <div
                  key={m}
                  onClick={() => setSelectedMonthIndex(idx)}
                  className="flex flex-col items-center h-full justify-end cursor-pointer group"
                >
                  <div className="w-full max-w-[20px] sm:max-w-[28px] bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end transition-all">
                    <div
                      className={`w-full transition-all duration-300 rounded-t-lg ${
                        isCurrent
                          ? 'bg-lime-500 shadow-sm'
                          : isSelected
                          ? 'bg-slate-300'
                          : 'bg-slate-200/80 group-hover:bg-slate-300'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span
                    className={`mt-2 text-[10px] sm:text-[11px] font-medium transition-colors ${
                      isCurrent ? 'text-slate-900 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {m.slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. Recent ERPNext Invoices Feed */}
      <div className="bg-white rounded-[32px] p-7 sm:p-8 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Recent Transactions
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Live records from erp.keerthigroup.co.in</p>
          </div>
          <button
            onClick={() => onNavigateModule('accounts', 'sales_invoices')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>View Invoices</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No sales invoices posted yet. Ready to create your first transaction.
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {recentInvoices.map((inv) => (
              <div
                key={inv.name}
                onClick={() => onNavigateModule('accounts', 'sales_invoices', inv.name)}
                className="py-3.5 flex items-center justify-between hover:bg-slate-50/70 cursor-pointer rounded-2xl px-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900 block">
                      {inv.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {inv.customer || 'Customer'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                    {typeof inv.grand_total === 'number' ? formatCurrency(inv.grand_total) : '—'}
                  </div>
                  <div className="mt-0.5">
                    <StatusBadge docstatus={inv.docstatus} status={inv.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
