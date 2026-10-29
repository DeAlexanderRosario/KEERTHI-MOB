import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Trash2,
  Printer,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  Package,
} from 'lucide-react';
import { documentService } from '../../services/documentService';
import { authService } from '../../services/authService';
import { ErrorBanner } from '../common/ErrorBanner';
import type { ERPDocument } from '../../services/types';

interface BillingItemRow {
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
}

export function BillingModule() {
  const user = authService.getUser();

  // Search & Selector states
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState<ERPDocument[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');

  const [itemSearch, setItemSearch] = useState('');
  const [itemList, setItemList] = useState<ERPDocument[]>([]);

  // Cart / Line items
  const [cartItems, setCartItems] = useState<BillingItemRow[]>([]);
  const [company, setCompany] = useState<string>(user?.company || '');
  const [postingDate, setPostingDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Submission & state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<ERPDocument | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Search customers from ERPNext
  useEffect(() => {
    let active = true;
    const fetchCustomers = async () => {
      try {
        const filters: any[] = [];
        if (customerSearch.trim()) {
          filters.push(['customer_name', 'like', `%${customerSearch.trim()}%`]);
        }
        const res = await documentService.list('Customer', {
          fields: ['name', 'customer_name', 'customer_group'],
          filters,
          limit_page_length: 10,
        });
        if (active) {
          setCustomerList(res);
          if (!selectedCustomer && res.length > 0 && !customerSearch) {
            setSelectedCustomer(res[0].name);
          }
        }
      } catch {
        // Handled silently for live search dropdown
      }
    };

    fetchCustomers();
    return () => {
      active = false;
    };
  }, [customerSearch]);

  // Search items from ERPNext
  useEffect(() => {
    let active = true;
    const fetchItems = async () => {
      try {
        const filters: any[] = [['disabled', '=', 0]];
        if (itemSearch.trim()) {
          filters.push(['item_name', 'like', `%${itemSearch.trim()}%`]);
        }
        const res = await documentService.list('Item', {
          fields: ['name', 'item_name', 'standard_rate', 'stock_uom'],
          filters,
          limit_page_length: 8,
        });
        if (active) {
          setItemList(res);
        }
      } catch {
        // Handled silently for live search dropdown
      }
    };

    fetchItems();
    return () => {
      active = false;
    };
  }, [itemSearch]);

  const handleAddItem = (item: ERPDocument) => {
    const existingIndex = cartItems.findIndex((r) => r.item_code === item.name);
    const rate = Number(item.standard_rate || 0);

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].qty + 1;
      updated[existingIndex] = {
        ...updated[existingIndex],
        qty: newQty,
        amount: newQty * updated[existingIndex].rate,
      };
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          item_code: item.name,
          item_name: item.item_name || item.name,
          qty: 1,
          rate,
          amount: rate,
        },
      ]);
    }
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...cartItems];
    updated[index] = {
      ...updated[index],
      qty: newQty,
      amount: newQty * updated[index].rate,
    };
    setCartItems(updated);
  };

  const handleUpdateRate = (index: number, newRate: number) => {
    const updated = [...cartItems];
    updated[index] = {
      ...updated[index],
      rate: newRate,
      amount: updated[index].qty * newRate,
    };
    setCartItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const totalAmount = cartItems.reduce((acc, row) => acc + row.amount, 0);

  const handleCreateInvoice = async (submitDirectly: boolean = false) => {
    if (!selectedCustomer) {
      setError(new Error('Please select a customer.'));
      return;
    }
    if (cartItems.length === 0) {
      setError(new Error('Please add at least one item to the invoice.'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, any> = {
        customer: selectedCustomer,
        posting_date: postingDate,
        due_date: postingDate,
        items: cartItems.map((c) => ({
          item_code: c.item_code,
          qty: c.qty,
          rate: c.rate,
        })),
      };

      if (company) {
        payload.company = company;
      }

      // Create draft invoice on ERPNext
      const doc = await documentService.create('Sales Invoice', payload);

      let finalDoc = doc;
      if (submitDirectly) {
        finalDoc = await documentService.submit('Sales Invoice', doc.name);
      }

      setCreatedInvoice(finalDoc);
      setShowReceipt(true);
      // Reset cart
      setCartItems([]);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            Counter POS & Order Billing
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real ERPNext billing counter. Direct invoice creation with live validation and stock pricing.
          </p>
        </div>
      </div>

      {error && <ErrorBanner error={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customer and Item Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Customer Selection Card */}
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Select Customer
              </span>
              <span className="text-[11px] text-slate-400">Live Customer Database</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer name..."
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select customer...</option>
                  {customerList.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.customer_name || c.name} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Item Catalog Card */}
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-500" />
                Item Catalog Search
              </span>
              <span className="text-[11px] text-slate-400">ERPNext Price Master</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search items by code or name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Quick Item Picker Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pt-1">
              {itemList.length === 0 ? (
                <div className="col-span-2 py-6 text-center text-xs text-slate-400">
                  No items found matching &quot;{itemSearch}&quot;.
                </div>
              ) : (
                itemList.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleAddItem(item)}
                    className="p-2.5 text-left border border-slate-200 rounded-md hover:border-blue-400 hover:bg-blue-50/40 transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-900 truncate group-hover:text-blue-600">
                        {item.item_name || item.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {item.name} {item.stock_uom ? `(${item.stock_uom})` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                        ₹{Number(item.standard_rate || 0).toLocaleString()}
                      </div>
                      <span className="inline-flex items-center text-[10px] text-blue-600 font-medium">
                        <Plus className="w-3 h-3" /> Add
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Invoice Cart & Totals (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg shadow-xs p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Invoice Items ({cartItems.length})
            </span>
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => setCartItems([])}
                className="text-[11px] text-rose-600 hover:text-rose-700"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Table */}
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Cart is empty. Select items from the catalog on the left.
              </div>
            ) : (
              cartItems.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-900 truncate">{item.item_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.item_code}</div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => handleUpdateQty(idx, Number(e.target.value))}
                      className="w-12 px-1.5 py-1 text-xs border border-slate-200 rounded text-center font-mono"
                    />
                    <span className="text-xs text-slate-400">×</span>
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => handleUpdateRate(idx, Number(e.target.value))}
                      className="w-16 px-1.5 py-1 text-xs border border-slate-200 rounded text-right font-mono"
                    />
                  </div>

                  <div className="text-right shrink-0 w-16">
                    <div className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                      ₹{item.amount.toLocaleString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-slate-300 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Summary Calculation */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums font-medium">₹{totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Taxes & Charges</span>
              <span className="font-mono tabular-nums text-slate-400">Calculated by ERPNext</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
              <span>Total Payable</span>
              <span className="font-mono tabular-nums text-blue-600 text-base">
                ₹{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting || cartItems.length === 0}
              onClick={() => handleCreateInvoice(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl transition-colors"
            >
              {isSubmitting ? 'Communicating with ERP...' : 'Save as Draft Invoice'}
            </button>

            <button
              type="button"
              disabled={isSubmitting || cartItems.length === 0}
              onClick={() => handleCreateInvoice(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold text-white bg-[#0e1013] hover:bg-slate-900 active:scale-[0.99] disabled:opacity-50 rounded-xl shadow-md transition-all"
            >
              <CheckCircle className="w-4 h-4 text-lime-400" />
              {isSubmitting ? 'Posting to ERPNext...' : 'Save & Submit Official Invoice'}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Receipt Modal */}
      {showReceipt && createdInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Invoice Recorded in ERPNext</h3>
              </div>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Number:</span>
                <span className="font-bold text-slate-900">{createdInvoice.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span>{createdInvoice.customer || selectedCustomer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Grand Total:</span>
                <span className="font-bold text-blue-600">
                  ₹{Number(createdInvoice.grand_total || totalAmount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">DocStatus:</span>
                <span>{createdInvoice.docstatus === 1 ? 'Submitted (Official)' : 'Draft'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setShowReceipt(false)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
