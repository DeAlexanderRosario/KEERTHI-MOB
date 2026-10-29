import React, { useState, useEffect } from 'react';
import {
  Users,
  Receipt,
  FileText,
  TrendingUp,
  Truck,
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  BarChart3,
  Search,
} from 'lucide-react';
import { DocTypeList } from '../doctype/DocTypeList';
import { DocTypeForm } from '../doctype/DocTypeForm';
import { documentService } from '../../services/documentService';
import { StatCard } from '../common/StatCard';

interface SalesModuleProps {
  initialDocType?: string;
  initialDocName?: string;
}

export function SalesModule({ initialDocType = 'Customer', initialDocName }: SalesModuleProps) {
  const [activeDocType, setActiveDocType] = useState<string>(initialDocType);
  const [editingDocName, setEditingDocName] = useState<string | undefined>(initialDocName);
  const [isEditing, setIsEditing] = useState<boolean>(Boolean(initialDocName));

  // Live Selling & CRM operational metrics from ERPNext v16
  const [kpis, setKpis] = useState<{
    ordersToDeliver: number;
    ordersToBill: number;
    annualSales: number;
    customersCount: number;
    itemsCount: number;
    salesOrdersCount: number;
  }>({
    ordersToDeliver: 0,
    ordersToBill: 0,
    annualSales: 0,
    customersCount: 0,
    itemsCount: 0,
    salesOrdersCount: 0,
  });

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      documentService.count('Sales Order', [['status', 'in', ['To Deliver and Bill', 'To Deliver']]]),
      documentService.count('Sales Order', [['status', 'in', ['To Deliver and Bill', 'To Bill']]]),
      documentService.count('Customer'),
      documentService.count('Item'),
      documentService.count('Sales Order'),
      documentService.list('Sales Invoice', {
        fields: ['grand_total', 'docstatus'],
        filters: [['docstatus', '=', 1]],
        limit_page_length: 50,
      }),
    ]).then(([del, bill, cust, itm, ord, invs]) => {
      if (!mounted) return;

      const delCount = del.status === 'fulfilled' ? del.value : 0;
      const billCount = bill.status === 'fulfilled' ? bill.value : 0;
      const custCount = cust.status === 'fulfilled' ? cust.value : 0;
      const itmCount = itm.status === 'fulfilled' ? itm.value : 0;
      const ordCount = ord.status === 'fulfilled' ? ord.value : 0;

      let salesTotal = 0;
      if (invs.status === 'fulfilled' && Array.isArray(invs.value)) {
        salesTotal = invs.value.reduce(
          (acc, inv) => acc + (typeof inv.grand_total === 'number' ? inv.grand_total : 0),
          0
        );
      }

      setKpis({
        ordersToDeliver: delCount,
        ordersToBill: billCount,
        annualSales: salesTotal,
        customersCount: custCount,
        itemsCount: itmCount,
        salesOrdersCount: ordCount,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const tabs = [
    { doctype: 'Customer', label: 'Customers' },
    { doctype: 'Lead', label: 'Leads' },
    { doctype: 'Opportunity', label: 'Opportunities' },
    { doctype: 'Quotation', label: 'Quotations' },
    { doctype: 'Sales Order', label: 'Sales Orders' },
    { doctype: 'Sales Invoice', label: 'Sales Invoices' },
  ];

  const handleOpenDoc = (name?: string) => {
    setEditingDocName(name);
    setIsEditing(true);
  };

  const handleBack = () => {
    setIsEditing(false);
    setEditingDocName(undefined);
  };

  if (isEditing) {
    return (
      <DocTypeForm
        doctype={activeDocType}
        docName={editingDocName}
        onBack={handleBack}
      />
    );
  }

  const hasCustomer = kpis.customersCount > 0;
  const hasItem = kpis.itemsCount > 0;
  const hasOrder = kpis.salesOrdersCount > 0;
  const hasSales = kpis.annualSales > 0;
  const stepsDone = [hasCustomer, hasItem, hasOrder, hasSales].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Title */}
      <div>
        <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block mb-1">
          Revenue &amp; CRM Operations
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Selling &amp; CRM
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Connected to ERPNext v16 live Selling workspace.
        </p>
      </div>

      {/* Selling Journey / Onboarding Wizard Card (Make your first sale) */}
      <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Make your first sale
            </h2>
            <p className="text-xs text-slate-500">
              Complete the foundational sales pipeline steps on your ERPNext instance.
            </p>
          </div>
          <span className="text-xs font-semibold font-mono px-3 py-1 bg-lime-50 text-lime-700 rounded-full border border-lime-200/60">
            {stepsDone} of 4 steps done
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Step 1: Customer */}
          <div
            onClick={() => setActiveDocType('Customer')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              hasCustomer
                ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                : 'bg-[#f8f9fa] border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">1. Add Customer</span>
              {hasCustomer ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {hasCustomer
                ? `${kpis.customersCount} customer(s) registered.`
                : 'A business or person you sell to.'}
            </p>
          </div>

          {/* Step 2: Item */}
          <div
            onClick={() => {
              // open item via global tab or notify
              window.dispatchEvent(new CustomEvent('navigate-module', { detail: { moduleId: 'stock', view: 'Item' } }));
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              hasItem
                ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                : 'bg-[#f8f9fa] border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">2. Add Item</span>
              {hasItem ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {hasItem
                ? `${kpis.itemsCount} catalog item(s) ready.`
                : 'Products or services you offer.'}
            </p>
          </div>

          {/* Step 3: Sales Order */}
          <div
            onClick={() => setActiveDocType('Sales Order')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              hasOrder
                ? 'bg-emerald-50/40 border-emerald-200/70'
                : 'bg-white border-slate-900 shadow-xs hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">3. Confirm Order</span>
              {hasOrder ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Plus className="w-4 h-4 text-slate-900" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {hasOrder
                ? `${kpis.salesOrdersCount} sales order(s) booked.`
                : 'Confirm sales order to deliver or bill.'}
            </p>
          </div>

          {/* Step 4: Invoice */}
          <div
            onClick={() => setActiveDocType('Sales Invoice')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              hasSales
                ? 'bg-emerald-50/40 border-emerald-200/70'
                : 'bg-[#f8f9fa] border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">4. Send Invoice</span>
              {hasSales ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Plus className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {hasSales
                ? `Annual: ₹${kpis.annualSales.toLocaleString()}`
                : 'Send your first invoice & get paid.'}
            </p>
          </div>
        </div>
      </div>

      {/* Selling Operational KPI Strip (Matches ERPNext Selling Workspace) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label="Sales Orders to Deliver"
          value={kpis.ordersToDeliver.toLocaleString()}
          sublabel="Pending fulfillment"
          icon={<Truck className="w-4 h-4" />}
          onClick={() => setActiveDocType('Sales Order')}
        />
        <StatCard
          label="Sales Orders to Bill"
          value={kpis.ordersToBill.toLocaleString()}
          sublabel="Pending invoice"
          icon={<Receipt className="w-4 h-4" />}
          onClick={() => setActiveDocType('Sales Order')}
        />
        <StatCard
          label="Annual Sales"
          value={`₹${kpis.annualSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sublabel="Live posted invoices"
          icon={<TrendingUp className="w-4 h-4" />}
          onClick={() => setActiveDocType('Sales Invoice')}
        />
        <StatCard
          label="Total Customers"
          value={kpis.customersCount.toLocaleString()}
          sublabel="Master records"
          icon={<Users className="w-4 h-4" />}
          onClick={() => setActiveDocType('Customer')}
        />
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200/80 rounded-full shadow-xs overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.doctype}
            onClick={() => {
              setActiveDocType(tab.doctype);
              setIsEditing(false);
            }}
            className={`px-4 py-2 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
              activeDocType === tab.doctype
                ? 'bg-[#0f1115] text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active DocType Grid */}
      <DocTypeList
        doctype={activeDocType}
        onSelectDoc={(name) => handleOpenDoc(name)}
        onNewDoc={() => handleOpenDoc()}
      />
    </div>
  );
}
