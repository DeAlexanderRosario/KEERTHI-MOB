import React, { useState, useEffect } from 'react';
import {
  Users,
  Receipt,
  ShoppingBag,
  CreditCard,
  Truck,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { documentService } from '../../services/documentService';
import { StatusBadge } from '../common/StatusBadge';
import { EmptyState } from '../common/EmptyState';
import type { ERPDocument } from '../../services/types';

interface CustomerDetail360Props {
  customerName: string;
  customerDoc: ERPDocument;
  onNavigateDoc?: (doctype: string, docName: string) => void;
  onSwitchToEdit?: () => void;
}

export function CustomerDetail360({
  customerName,
  customerDoc,
  onNavigateDoc,
  onSwitchToEdit,
}: CustomerDetail360Props) {
  const [activeTab, setActiveTab] = useState<'invoices' | 'orders' | 'payments' | 'deliveries'>('invoices');

  const [invoices, setInvoices] = useState<ERPDocument[]>([]);
  const [orders, setOrders] = useState<ERPDocument[]>([]);
  const [payments, setPayments] = useState<ERPDocument[]>([]);
  const [deliveries, setDeliveries] = useState<ERPDocument[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    Promise.allSettled([
      // 0: Sales Invoices for this customer
      documentService.list('Sales Invoice', {
        fields: ['name', 'posting_date', 'grand_total', 'outstanding_amount', 'status', 'docstatus'],
        filters: [['customer', '=', customerName]],
        order_by: 'posting_date desc',
        limit_page_length: 25,
      }),
      // 1: Sales Orders for this customer
      documentService.list('Sales Order', {
        fields: ['name', 'transaction_date', 'grand_total', 'status', 'docstatus'],
        filters: [['customer', '=', customerName]],
        order_by: 'transaction_date desc',
        limit_page_length: 25,
      }),
      // 2: Payment Entries for this customer (party)
      documentService.list('Payment Entry', {
        fields: ['name', 'posting_date', 'paid_amount', 'mode_of_payment', 'docstatus'],
        filters: [['party', '=', customerName]],
        order_by: 'posting_date desc',
        limit_page_length: 25,
      }),
      // 3: Delivery Notes for this customer
      documentService.list('Delivery Note', {
        fields: ['name', 'posting_date', 'status', 'docstatus'],
        filters: [['customer', '=', customerName]],
        order_by: 'posting_date desc',
        limit_page_length: 25,
      }),
    ])
      .then(([invRes, ordRes, payRes, delRes]) => {
        if (!mounted) return;

        if (invRes.status === 'fulfilled') setInvoices(invRes.value || []);
        if (ordRes.status === 'fulfilled') setOrders(ordRes.value || []);
        if (payRes.status === 'fulfilled') setPayments(payRes.value || []);
        if (delRes.status === 'fulfilled') setDeliveries(delRes.value || []);
      })
      .catch((err) => {
        if (mounted) setError(err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [customerName]);

  // Derived summaries strictly calculated from returned records
  const totalInvoiced = invoices.reduce(
    (acc, inv) => acc + (typeof inv.grand_total === 'number' ? inv.grand_total : 0),
    0
  );
  const totalOutstanding = invoices.reduce(
    (acc, inv) => acc + (typeof inv.outstanding_amount === 'number' ? inv.outstanding_amount : 0),
    0
  );

  // Classification: strictly check customer_group and customer_type returned by ERP
  const rawClassification =
    (customerDoc.customer_type as string) || (customerDoc.customer_group as string) || '';
  const isWholesale = /wholesale/i.test(rawClassification);
  const isRetail = /retail/i.test(rawClassification);

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Profile Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                {customerDoc.customer_name || customerName}
              </h2>
              {customerDoc.customer_name && customerDoc.customer_name !== customerName && (
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {customerName}
                </span>
              )}
            </div>

            {/* Verified classification only if present in ERP */}
            <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
              {isWholesale && (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                  Wholesale Commercial
                </span>
              )}
              {isRetail && (
                <span className="inline-flex items-center gap-1 font-semibold text-sky-800 bg-sky-50 border border-sky-200/80 px-2.5 py-0.5 rounded-full">
                  Retail Customer
                </span>
              )}
              {rawClassification && !isWholesale && !isRetail && (
                <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                  {rawClassification}
                </span>
              )}
              {!rawClassification && (
                <span className="text-slate-400 text-xs italic">
                  Classification not recorded in ERP
                </span>
              )}
            </div>
          </div>

          {onSwitchToEdit && (
            <button
              type="button"
              onClick={onSwitchToEdit}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all self-start cursor-pointer shrink-0"
            >
              Edit Form Fields
            </button>
          )}
        </div>

        {/* Verified Metadata Row: GST, Territory, Contact, Credit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5 mt-4 border-t border-slate-100 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400 font-medium block">GSTIN / Tax ID</span>
            <span className="font-mono font-semibold text-slate-800">
              {(customerDoc.gstin as string) || (customerDoc.tax_id as string) || 'Not registered'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-medium block">Territory / Area</span>
            <span className="font-medium text-slate-800">
              {(customerDoc.territory as string) || 'All Territories'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-medium block">Phone / Mobile</span>
            <span className="font-mono font-medium text-slate-800">
              {(customerDoc.mobile_no as string) || (customerDoc.phone as string) || 'Not provided'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-medium block">Credit Limit</span>
            <span className="font-mono font-bold text-slate-900">
              {typeof customerDoc.credit_limit === 'number'
                ? formatCurrency(customerDoc.credit_limit)
                : 'No explicit limit'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Transaction Summary Cards (Derived strictly from returned live records) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            Total Invoiced (Recent Records)
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {formatCurrency(totalInvoiced)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {invoices.length} posted invoices on file
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            Current Outstanding Balance
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-600">
            {formatCurrency(totalOutstanding)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Sum of unpaid invoice amounts
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            Sales Orders On Record
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {orders.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Recent customer orders
          </span>
        </div>
      </div>

      {/* 3. Transaction Sub-Tabs (Invoices, Orders, Payments, Deliveries) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center gap-1 p-2 border-b border-slate-100 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            Sales Invoices ({invoices.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            Sales Orders ({orders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            Payments ({payments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deliveries')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'deliveries'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            Deliveries ({deliveries.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5">
          {isLoading && (
            <div className="py-10 text-center space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs text-slate-500">Querying ERP transactions for {customerName}...</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to load transaction history: {error.message}</span>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* INVOICES TABLE */}
              {activeTab === 'invoices' && (
                <>
                  {invoices.length === 0 ? (
                    <EmptyState
                      title="No Sales Invoices Recorded"
                      description="No posted sales invoices found in ERPNext for this customer account."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                            <th className="pb-2.5 font-bold">Invoice ID</th>
                            <th className="pb-2.5 font-bold">Posting Date</th>
                            <th className="pb-2.5 font-bold text-right">Grand Total</th>
                            <th className="pb-2.5 font-bold text-right">Outstanding</th>
                            <th className="pb-2.5 font-bold text-center">Status</th>
                            <th className="pb-2.5 font-bold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                          {invoices.map((inv) => (
                            <tr key={inv.name} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 font-mono font-bold text-slate-900">{inv.name}</td>
                              <td className="py-3 text-slate-600 font-mono">
                                {(inv.posting_date as string) || 'N/A'}
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(inv.grand_total || 0)}
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-rose-600">
                                {formatCurrency(inv.outstanding_amount || 0)}
                              </td>
                              <td className="py-3 text-center">
                                <StatusBadge docstatus={inv.docstatus} status={inv.status} />
                              </td>
                              <td className="py-3 text-right">
                                {onNavigateDoc && (
                                  <button
                                    type="button"
                                    onClick={() => onNavigateDoc('Sales Invoice', inv.name)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-950 cursor-pointer"
                                  >
                                    <span>View</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* SALES ORDERS TABLE */}
              {activeTab === 'orders' && (
                <>
                  {orders.length === 0 ? (
                    <EmptyState
                      title="No Sales Orders Recorded"
                      description="No sales orders have been entered for this customer yet."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                            <th className="pb-2.5 font-bold">Order ID</th>
                            <th className="pb-2.5 font-bold">Order Date</th>
                            <th className="pb-2.5 font-bold text-right">Grand Total</th>
                            <th className="pb-2.5 font-bold text-center">Status</th>
                            <th className="pb-2.5 font-bold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                          {orders.map((ord) => (
                            <tr key={ord.name} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 font-mono font-bold text-slate-900">{ord.name}</td>
                              <td className="py-3 text-slate-600 font-mono">
                                {(ord.transaction_date as string) || 'N/A'}
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(ord.grand_total || 0)}
                              </td>
                              <td className="py-3 text-center">
                                <StatusBadge docstatus={ord.docstatus} status={ord.status} />
                              </td>
                              <td className="py-3 text-right">
                                {onNavigateDoc && (
                                  <button
                                    type="button"
                                    onClick={() => onNavigateDoc('Sales Order', ord.name)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-950 cursor-pointer"
                                  >
                                    <span>View</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* PAYMENTS TABLE */}
              {activeTab === 'payments' && (
                <>
                  {payments.length === 0 ? (
                    <EmptyState
                      title="No Payment Entries Found"
                      description="No payment vouchers logged for this party in ERPNext."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                            <th className="pb-2.5 font-bold">Payment Voucher</th>
                            <th className="pb-2.5 font-bold">Date</th>
                            <th className="pb-2.5 font-bold">Mode of Payment</th>
                            <th className="pb-2.5 font-bold text-right">Paid Amount</th>
                            <th className="pb-2.5 font-bold text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                          {payments.map((pay) => (
                            <tr key={pay.name} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 font-mono font-bold text-slate-900">{pay.name}</td>
                              <td className="py-3 text-slate-600 font-mono">
                                {(pay.posting_date as string) || 'N/A'}
                              </td>
                              <td className="py-3 text-slate-700">
                                {(pay.mode_of_payment as string) || 'Cash / Bank Transfer'}
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-emerald-700">
                                {formatCurrency(pay.paid_amount || 0)}
                              </td>
                              <td className="py-3 text-center">
                                <StatusBadge docstatus={pay.docstatus} status={pay.docstatus === 1 ? 'Submitted' : 'Draft'} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* DELIVERIES TABLE */}
              {activeTab === 'deliveries' && (
                <>
                  {deliveries.length === 0 ? (
                    <EmptyState
                      title="No Delivery Notes Found"
                      description="No dispatch delivery notes recorded for this customer."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                            <th className="pb-2.5 font-bold">Delivery Note ID</th>
                            <th className="pb-2.5 font-bold">Posting Date</th>
                            <th className="pb-2.5 font-bold text-center">Status</th>
                            <th className="pb-2.5 font-bold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                          {deliveries.map((del) => (
                            <tr key={del.name} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 font-mono font-bold text-slate-900">{del.name}</td>
                              <td className="py-3 text-slate-600 font-mono">
                                {(del.posting_date as string) || 'N/A'}
                              </td>
                              <td className="py-3 text-center">
                                <StatusBadge docstatus={del.docstatus} status={del.status} />
                              </td>
                              <td className="py-3 text-right">
                                {onNavigateDoc && (
                                  <button
                                    type="button"
                                    onClick={() => onNavigateDoc('Delivery Note', del.name)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-950 cursor-pointer"
                                  >
                                    <span>View</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
