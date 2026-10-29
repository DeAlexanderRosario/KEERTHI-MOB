import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Truck,
  Receipt,
  TrendingDown,
  CheckCircle2,
  Circle,
  Plus,
  Boxes,
  Users,
} from 'lucide-react';
import { DocTypeList } from '../doctype/DocTypeList';
import { DocTypeForm } from '../doctype/DocTypeForm';
import { documentService } from '../../services/documentService';
import { StatCard } from '../common/StatCard';

interface PurchasesModuleProps {
  initialDocType?: string;
  initialDocName?: string;
}

export function PurchasesModule({ initialDocType = 'Supplier', initialDocName }: PurchasesModuleProps) {
  const [activeDocType, setActiveDocType] = useState<string>(initialDocType);
  const [editingDocName, setEditingDocName] = useState<string | undefined>(initialDocName);
  const [isEditing, setIsEditing] = useState<boolean>(Boolean(initialDocName));

  // Live Buying operational metrics from ERPNext v16
  const [kpis, setKpis] = useState<{
    ordersToReceive: number;
    ordersToBill: number;
    annualPurchase: number;
    suppliersCount: number;
    itemsCount: number;
    purchaseOrdersCount: number;
  }>({
    ordersToReceive: 0,
    ordersToBill: 0,
    annualPurchase: 0,
    suppliersCount: 0,
    itemsCount: 0,
    purchaseOrdersCount: 0,
  });

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      documentService.count('Purchase Order', [['status', 'in', ['To Receive and Bill', 'To Receive']]]),
      documentService.count('Purchase Order', [['status', 'in', ['To Receive and Bill', 'To Bill']]]),
      documentService.count('Supplier'),
      documentService.count('Item'),
      documentService.count('Purchase Order'),
      documentService.list('Purchase Invoice', {
        fields: ['grand_total', 'docstatus'],
        filters: [['docstatus', '=', 1]],
        limit_page_length: 50,
      }),
    ]).then(([rec, bill, sup, itm, po, invs]) => {
      if (!mounted) return;

      const recCount = rec.status === 'fulfilled' ? rec.value : 0;
      const billCount = bill.status === 'fulfilled' ? bill.value : 0;
      const supCount = sup.status === 'fulfilled' ? sup.value : 0;
      const itmCount = itm.status === 'fulfilled' ? itm.value : 0;
      const poCount = po.status === 'fulfilled' ? po.value : 0;

      let purchaseTotal = 0;
      if (invs.status === 'fulfilled' && Array.isArray(invs.value)) {
        purchaseTotal = invs.value.reduce(
          (acc, inv) => acc + (typeof inv.grand_total === 'number' ? inv.grand_total : 0),
          0
        );
      }

      setKpis({
        ordersToReceive: recCount,
        ordersToBill: billCount,
        annualPurchase: purchaseTotal,
        suppliersCount: supCount,
        itemsCount: itmCount,
        purchaseOrdersCount: poCount,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const tabs = [
    { doctype: 'Supplier', label: 'Suppliers' },
    { doctype: 'Material Request', label: 'Material Requests' },
    { doctype: 'Supplier Quotation', label: 'Supplier Quotations' },
    { doctype: 'Purchase Order', label: 'Purchase Orders' },
    { doctype: 'Purchase Receipt', label: 'Purchase Receipts' },
    { doctype: 'Purchase Invoice', label: 'Purchase Invoices' },
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

  const hasSupplier = kpis.suppliersCount > 0;
  const hasItem = kpis.itemsCount > 0;
  const hasPO = kpis.purchaseOrdersCount > 0;
  const hasPurchase = kpis.annualPurchase > 0;
  const stepsDone = [hasSupplier, hasItem, hasPO, hasPurchase].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block mb-1">
          Procurement &amp; Supply Chain
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Buying &amp; Procurement
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Connected to ERPNext v16 live Buying workspace.
        </p>
      </div>

      {/* Buying Journey / Onboarding Wizard Card (Order from your suppliers) */}
      <div className="bg-white rounded-[32px] p-6 sm:p-7 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Order from your suppliers
            </h2>
            <p className="text-xs text-slate-500">
              Procurement cycle from supplier quotation to receipt and purchase billing.
            </p>
          </div>
          <span className="text-xs font-semibold font-mono px-3 py-1 bg-lime-50 text-lime-700 rounded-full border border-lime-200/60">
            {stepsDone} of 4 steps done
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Step 1: Add Supplier */}
          <div
            onClick={() => setActiveDocType('Supplier')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              hasSupplier
                ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/70'
                : 'bg-[#f8f9fa] border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">1. Add Supplier</span>
              {hasSupplier ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {hasSupplier
                ? `${kpis.suppliersCount} supplier(s) registered.`
                : 'A business or person you buy from.'}
            </p>
          </div>

          {/* Step 2: Add Item */}
          <div
            onClick={() => {
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
                : 'Raw materials or items you purchase.'}
            </p>
          </div>

          {/* Step 3: Purchase Order */}
          <div
            onClick={() => setActiveDocType('Purchase Order')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              hasPO
                ? 'bg-emerald-50/40 border-emerald-200/70'
                : 'bg-white border-slate-900 shadow-xs hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">3. Place PO</span>
              {hasPO ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Plus className="w-4 h-4 text-slate-900" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {hasPO
                ? `${kpis.purchaseOrdersCount} purchase order(s) placed.`
                : 'Place an order to receive or bill.'}
            </p>
          </div>

          {/* Step 4: Purchase Invoice */}
          <div
            onClick={() => setActiveDocType('Purchase Invoice')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              hasPurchase
                ? 'bg-emerald-50/40 border-emerald-200/70'
                : 'bg-[#f8f9fa] border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">4. Enter Bill</span>
              {hasPurchase ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Plus className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {hasPurchase
                ? `Annual: ₹${kpis.annualPurchase.toLocaleString()}`
                : 'Record bill & pay your supplier.'}
            </p>
          </div>
        </div>
      </div>

      {/* Buying Operational KPI Strip (Matches ERPNext Buying Workspace) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label="Purchase Orders to Receive"
          value={kpis.ordersToReceive.toLocaleString()}
          sublabel="Pending goods receipt"
          icon={<Truck className="w-4 h-4" />}
          onClick={() => setActiveDocType('Purchase Order')}
        />
        <StatCard
          label="Purchase Orders to Bill"
          value={kpis.ordersToBill.toLocaleString()}
          sublabel="Pending invoice"
          icon={<Receipt className="w-4 h-4" />}
          onClick={() => setActiveDocType('Purchase Order')}
        />
        <StatCard
          label="Annual Purchase"
          value={`₹${kpis.annualPurchase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sublabel="Live posted bills"
          icon={<ShoppingBag className="w-4 h-4" />}
          onClick={() => setActiveDocType('Purchase Invoice')}
        />
        <StatCard
          label="Total Suppliers"
          value={kpis.suppliersCount.toLocaleString()}
          sublabel="Registered vendors"
          icon={<Users className="w-4 h-4" />}
          onClick={() => setActiveDocType('Supplier')}
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
