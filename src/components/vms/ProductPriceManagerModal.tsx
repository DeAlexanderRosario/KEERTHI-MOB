import React, { useState, useEffect } from 'react';
import {
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  IndianRupee,
  Package,
  Warehouse,
  ArrowRight,
  RefreshCw,
  Edit3,
  Layers,
} from 'lucide-react';
import { vmsService } from '../../services/vmsService';
import { documentService } from '../../services/documentService';

interface ProductPriceManagerModalProps {
  initialItemCode?: string;
  onClose: () => void;
  onPriceUpdated?: (itemCode: string, newRate: number, priceList: string) => void;
}

export function ProductPriceManagerModal({
  initialItemCode,
  onClose,
  onPriceUpdated,
}: ProductPriceManagerModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [selectedItemCode, setSelectedItemCode] = useState<string>(initialItemCode || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priceList, setPriceList] = useState<string>('Standard Selling');
  const [priceLists, setPriceLists] = useState<Array<{ name: string }>>([]);
  const [newSellingPrice, setNewSellingPrice] = useState<number | ''>('');
  const [currentRealPrice, setCurrentRealPrice] = useState<number>(0);
  const [stockInfo, setStockInfo] = useState<{ actual: number; available: number; warehouse: string } | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load active sellable items catalog
  useEffect(() => {
    vmsService.getSellingPriceLists().then((lists) => {
      setPriceLists(lists);
      if (lists.length && !lists.some((list) => list.name === priceList)) setPriceList(lists[0].name);
    }).catch((error) => setErrorMessage(error.message || 'Could not load selling price lists.'));
    async function loadCatalog() {
      try {
        const catalog = await vmsService.getRealItems();
        setItems(catalog);
        if (!selectedItemCode && catalog.length > 0) {
          const firstCode = catalog[0].item_code || catalog[0].name;
          setSelectedItemCode(firstCode);
        }
      } catch (e) {
        console.warn('Failed to load item catalog:', e);
      }
    }
    loadCatalog();
  }, []);

  // Fetch real details whenever selectedItemCode or priceList changes
  useEffect(() => {
    if (!selectedItemCode) return;

    let isMounted = true;
    async function loadItemPriceAndStock() {
      setIsLoadingItem(true);
      setErrorMessage(null);
      try {
        const [rate, stock] = await Promise.all([
          vmsService.getItemSellingPrice(selectedItemCode, undefined, priceList),
          vmsService.getItemStockDetails(selectedItemCode, 'Stores - KGH'),
        ]);

        if (isMounted) {
          setCurrentRealPrice(rate);
          setNewSellingPrice(rate > 0 ? rate : '');
          setStockInfo({
            actual: stock.actual_qty,
            available: stock.available_qty,
            warehouse: stock.warehouse,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage('Could not load current ERP rates: ' + (err.message || 'Error'));
        }
      } finally {
        if (isMounted) {
          setIsLoadingItem(false);
        }
      }
    }

    loadItemPriceAndStock();
    return () => {
      isMounted = false;
    };
  }, [selectedItemCode, priceList]);

  const selectedItem = items.find(
    (it) => (it.item_code || it.name) === selectedItemCode
  );

  const filteredItems = items.filter((it) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (it.item_name || '').toLowerCase();
    const code = (it.item_code || it.name || '').toLowerCase();
    const group = (it.item_group || '').toLowerCase();
    return name.includes(q) || code.includes(q) || group.includes(q);
  });

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemCode) return;
    if (newSellingPrice === '' || Number(newSellingPrice) < 0) {
      setErrorMessage('Please enter a valid positive selling price.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const priceVal = Number(newSellingPrice);

    try {
      await vmsService.updateItemSellingPrice(selectedItemCode, priceVal, priceList);
      setCurrentRealPrice(priceVal);
      setSuccessMessage(
        `Successfully updated ${selectedItem?.item_name || selectedItemCode} selling price to ₹${priceVal.toLocaleString(
          'en-IN'
        )} in ERPNext!`
      );
      if (onPriceUpdated) {
        onPriceUpdated(selectedItemCode, priceVal, priceList);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save selling price to ERPNext.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#20D52E]/20 text-[#0B4025] flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5 text-[#0B4025]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Change Product Selling Price
              </h3>
              <p className="text-[11px] text-slate-500">
                Updates the selected enabled ERPNext selling price list
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="p-3 my-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 shrink-0 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 my-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2 shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="overflow-y-auto flex-1 py-3 space-y-4 text-xs sm:text-sm">
          {/* Step 1: Select Item from Catalog */}
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Select Product to Reprice
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search product by name, item code (e.g. 1, Cement)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#20D52E] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
              {filteredItems.map((it) => {
                const code = it.item_code || it.name;
                const isSelected = selectedItemCode === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setSelectedItemCode(code);
                      setSuccessMessage(null);
                      setErrorMessage(null);
                    }}
                    className={`p-2 rounded-lg text-left transition-all border flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-[#090B0A] text-white border-[#090B0A] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-[#20D52E]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold truncate">{it.item_name || code}</div>
                      <div
                        className={`text-[10px] font-mono ${
                          isSelected ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        Code: {code} • {it.stock_uom || 'Nos'}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#20D52E] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Selected Item Overview & ERP Status */}
          {selectedItem && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {selectedItem.item_name || selectedItemCode}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                    <span>Item Code: <strong>{selectedItemCode}</strong></span>
                    <span>•</span>
                    <span>UOM: <strong>{selectedItem.stock_uom || 'Nos'}</strong></span>
                    {selectedItem.item_group && (
                      <>
                        <span>•</span>
                        <span>Group: {selectedItem.item_group}</span>
                      </>
                    )}
                  </div>
                </div>

                {isLoadingItem && (
                  <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                )}
              </div>

              {/* ERP Live Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Current ERP Selling Price</span>
                  <span
                    className={`text-sm font-bold block mt-0.5 ${
                      currentRealPrice > 0 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {currentRealPrice > 0 ? `₹${currentRealPrice.toLocaleString('en-IN')}` : '₹0.00 (Not Set)'}
                  </span>
                  <span className="text-[9px] text-slate-400">price list: {priceList}</span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Stock in {stockInfo?.warehouse || 'Warehouse'}</span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">
                    {stockInfo ? `${stockInfo.available} ${selectedItem.stock_uom || 'Nos'}` : 'Checking...'}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    Actual: {stockInfo?.actual ?? '-'}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Last Purchase Rate</span>
                  <span className="text-sm font-bold text-slate-700 block mt-0.5">
                    ₹{typeof selectedItem.last_purchase_rate === 'number' && selectedItem.last_purchase_rate > 0 ? selectedItem.last_purchase_rate.toLocaleString('en-IN') : 'Not available'}
                  </span>
                  <span className="text-[9px] text-slate-400">from vendor invoices</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: New Price Form */}
          <form onSubmit={handleSavePrice} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Target Price List <span className="text-rose-500">*</span>
                </label>
                <select
                  value={priceList}
                  onChange={(e) => setPriceList(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-semibold text-slate-900"
                >
                  {priceLists.map((list) => <option key={list.name} value={list.name}>{list.name}</option>)}
                </select>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Creates or updates the Item Price record in this Price List.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  New Selling Price / Unit (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    required
                    placeholder="e.g. 600"
                    value={newSellingPrice}
                    onChange={(e) =>
                      setNewSellingPrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-bold text-slate-900 text-sm sm:text-base font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Will be recorded in ERPNext for future sales orders and invoices.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={isSubmitting || newSellingPrice === ''}
                className="px-5 py-2.5 bg-[#20D52E] text-slate-900 font-bold text-xs sm:text-sm rounded-lg hover:bg-[#1db829] shadow-md shadow-[#20D52E]/20 disabled:opacity-50 flex items-center gap-1.5 transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                    <span>Saving to ERPNext...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-900" />
                    <span>Update Price in ERPNext</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
