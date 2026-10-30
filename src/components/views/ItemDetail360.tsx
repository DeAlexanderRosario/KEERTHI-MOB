import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Package,
  Layers,
  Building,
  Tag,
  DollarSign,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { documentService } from '../../services/documentService';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import type { ERPDocument } from '../../services/types';

interface ItemDetail360Props {
  itemCode: string;
  itemDoc: ERPDocument;
  onNavigateDoc?: (doctype: string, docName: string) => void;
  onSwitchToEdit?: () => void;
}

export function ItemDetail360({
  itemCode,
  itemDoc,
  onNavigateDoc,
  onSwitchToEdit,
}: ItemDetail360Props) {
  const [activeTab, setActiveTab] = useState<'warehouses' | 'movements'>('warehouses');

  const [bins, setBins] = useState<ERPDocument[]>([]);
  const [recentEntries, setRecentEntries] = useState<ERPDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    Promise.allSettled([
      // 0: Real Bin balances per warehouse from ERPNext
      documentService.list('Bin', {
        fields: ['name', 'warehouse', 'actual_qty', 'reserved_qty', 'projected_qty', 'valuation_rate'],
        filters: [['item_code', '=', itemCode]],
        order_by: 'actual_qty desc',
        limit_page_length: 50,
      }),
      // 1: Recent Stock Entries for item
      documentService.list('Stock Entry', {
        fields: ['name', 'posting_date', 'stock_entry_type', 'docstatus'],
        order_by: 'posting_date desc',
        limit_page_length: 15,
      }),
    ])
      .then(([binRes, stockRes]) => {
        if (!mounted) return;
        if (binRes.status === 'fulfilled') setBins(binRes.value || []);
        if (stockRes.status === 'fulfilled') setRecentEntries(stockRes.value || []);
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
  }, [itemCode]);

  // Total stock across all warehouses from returned bins
  const totalActualQty = bins.reduce(
    (acc, b) => acc + (typeof b.actual_qty === 'number' ? b.actual_qty : 0),
    0
  );
  const totalReservedQty = bins.reduce(
    (acc, b) => acc + (typeof b.reserved_qty === 'number' ? b.reserved_qty : 0),
    0
  );

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Item Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                {itemDoc.item_name || itemCode}
              </h2>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
                {itemCode}
              </span>
              <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full font-semibold">
                {(itemDoc.item_group as string) || 'Hardware Goods'}
              </span>
            </div>

            {itemDoc.description && (
              <p className="text-xs text-slate-500 max-w-2xl line-clamp-2 pt-1">
                {String(itemDoc.description).replace(/<[^>]*>?/gm, '')}
              </p>
            )}
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

        {/* Verified Metadata Row: Rates & UOM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5 mt-4 border-t border-slate-100 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400 font-medium block">Standard Selling Rate</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {typeof itemDoc.standard_rate === 'number'
                ? formatCurrency(itemDoc.standard_rate)
                : 'Not defined'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-medium block">Valuation Rate</span>
            <span className="font-mono font-semibold text-slate-800 text-sm">
              {typeof itemDoc.valuation_rate === 'number'
                ? formatCurrency(itemDoc.valuation_rate)
                : 'N/A'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-medium block">Stock UOM</span>
            <span className="font-semibold text-slate-800">
              {(itemDoc.stock_uom as string) || 'Nos'}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 font-medium block">Item Group</span>
            <span className="font-medium text-slate-800">
              {(itemDoc.item_group as string) || 'Products'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Warehouse Stock Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            Total Actual Stock
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
            {totalActualQty.toLocaleString()} {itemDoc.stock_uom || 'Nos'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {bins.length} warehouse bins
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            Reserved Stock
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-700">
            {totalReservedQty.toLocaleString()} {itemDoc.stock_uom || 'Nos'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Committed to approved orders
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            Warehouses Storing Item
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {bins.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Verified bin locations
          </span>
        </div>
      </div>

      {/* 3. Sub-Tabs: Warehouse Stock Breakdown vs Recent Vouchers */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex items-center gap-1 p-2 border-b border-slate-100 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('warehouses')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'warehouses'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            Warehouse-Wise Stock ({bins.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'movements'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            Recent Stock Entries ({recentEntries.length})
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {isLoading && (
            <div className="py-10 text-center space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs text-slate-500">Querying stock bins for {itemCode}...</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to load stock balances: {error.message}</span>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {activeTab === 'warehouses' && (
                <>
                  {bins.length === 0 ? (
                    <EmptyState
                      title="No Warehouse Bin Balances"
                      description="No physical warehouse stock balances recorded or permitted for this item."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                            <th className="pb-2.5 font-bold">Warehouse Location</th>
                            <th className="pb-2.5 font-bold text-right">Actual Qty</th>
                            <th className="pb-2.5 font-bold text-right">Reserved Qty</th>
                            <th className="pb-2.5 font-bold text-right">Projected Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                          {bins.map((b) => (
                            <tr key={b.name} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 font-semibold text-slate-900">
                                {(b.warehouse as string) || 'Default Warehouse'}
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-emerald-700">
                                {typeof b.actual_qty === 'number' ? b.actual_qty.toLocaleString() : 0} {itemDoc.stock_uom || ''}
                              </td>
                              <td className="py-3 text-right font-mono text-slate-600">
                                {typeof b.reserved_qty === 'number' ? b.reserved_qty.toLocaleString() : 0}
                              </td>
                              <td className="py-3 text-right font-mono font-semibold text-slate-800">
                                {typeof b.projected_qty === 'number' ? b.projected_qty.toLocaleString() : 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'movements' && (
                <>
                  {recentEntries.length === 0 ? (
                    <EmptyState
                      title="No Stock Entries Logged"
                      description="No material transfers or receipts recorded on file."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                            <th className="pb-2.5 font-bold">Voucher ID</th>
                            <th className="pb-2.5 font-bold">Date</th>
                            <th className="pb-2.5 font-bold">Purpose / Type</th>
                            <th className="pb-2.5 font-bold text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                          {recentEntries.map((entry) => (
                            <tr key={entry.name} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 font-mono font-bold text-slate-900">{entry.name}</td>
                              <td className="py-3 text-slate-600 font-mono">
                                {(entry.posting_date as string) || 'N/A'}
                              </td>
                              <td className="py-3 text-slate-700 font-medium">
                                {(entry.stock_entry_type as string) || 'Material Transfer'}
                              </td>
                              <td className="py-3 text-center">
                                <StatusBadge docstatus={entry.docstatus} status={entry.docstatus === 1 ? 'Submitted' : 'Draft'} />
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
