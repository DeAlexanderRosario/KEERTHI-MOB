import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  Package,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  X,
  Calendar,
  Layers,
  ArrowRight,
  Barcode,
  RefreshCw,
  FileText,
  Edit2,
  Tag,
} from 'lucide-react';
import { vmsService, OrderCartItem, ItemStockInfo } from '../../services/vmsService';
import { ProductPriceManagerModal } from './ProductPriceManagerModal';

interface MultiProductOrderModalProps {
  customerName: string;
  onClose: () => void;
  onSuccess: (salesOrderRef: string, grandTotal: number) => void;
  initialVisitName?: string;
}

export function MultiProductOrderModal({
  customerName,
  onClose,
  onSuccess,
  initialVisitName,
}: MultiProductOrderModalProps) {
  const [itemsCatalog, setItemsCatalog] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ name: string; warehouse_name: string }>>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('Stores - KGH');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Cart
  const [cart, setCart] = useState<OrderCartItem[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, ItemStockInfo>>({});
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderConfirmed, setOrderConfirmed] = useState<{ sales_order: string; grand_total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [priceManagerItemCode, setPriceManagerItemCode] = useState<string | null>(null);

  // Fetch catalog & warehouses on mount
  useEffect(() => {
    async function init() {
      setIsLoadingCatalog(true);
      try {
        const [catalog, whList] = await Promise.all([
          vmsService.getRealItems(),
          vmsService.getWarehouses(),
        ]);
        setItemsCatalog(catalog);
        setWarehouses(whList);
        if (whList.length > 0) {
          setSelectedWarehouse(whList[0].name);
        }
      } catch (err) {
        console.warn('Error loading catalog/warehouses:', err);
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    init();
  }, []);

  // Fetch stock and customer price when warehouse or catalog changes
  useEffect(() => {
    async function fetchStockAndPrices() {
      if (itemsCatalog.length === 0) return;

      const newStockMap: Record<string, ItemStockInfo> = {};
      const newPriceMap: Record<string, number> = {};

      // Batch query stock and real ERPNext selling prices
      const queryList = itemsCatalog.slice(0, 50);
      await Promise.all(
        queryList.map(async (item) => {
          const itemCode = item.item_code || item.name;
          try {
            const [stock, realRate] = await Promise.all([
              vmsService.getItemStockDetails(itemCode, selectedWarehouse),
              vmsService.getItemSellingPrice(itemCode, customerName),
            ]);
            newStockMap[itemCode] = stock;
            newPriceMap[itemCode] = realRate > 0 ? realRate : (Number(item.standard_rate) || 0);
          } catch {
            newPriceMap[itemCode] = Number(item.standard_rate) || 0;
          }
        })
      );

      setStockMap(newStockMap);
      setPriceMap(newPriceMap);
    }

    fetchStockAndPrices();
  }, [itemsCatalog, selectedWarehouse, customerName]);

  // Unique item groups
  const itemGroups = useMemo(() => {
    const groups = new Set<string>();
    itemsCatalog.forEach((it) => {
      if (it.item_group) groups.add(it.item_group);
    });
    return ['All', ...Array.from(groups)];
  }, [itemsCatalog]);

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    return itemsCatalog.filter((it) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (it.item_name || '').toLowerCase();
      const code = (it.item_code || it.name || '').toLowerCase();
      const barcode = (it.barcode || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || code.includes(q) || barcode.includes(q);
      const matchesGroup = selectedGroup === 'All' || it.item_group === selectedGroup;
      return matchesSearch && matchesGroup;
    });
  }, [itemsCatalog, searchQuery, selectedGroup]);

  // Add to cart
  const handleAddToCart = (item: any) => {
    const itemCode = item.item_code || item.name;
    const existing = cart.find((c) => c.item_code === itemCode);
    const rate = priceMap[itemCode] !== undefined ? priceMap[itemCode] : (Number(item.standard_rate) || 0);
    const stock = stockMap[itemCode];

    if (existing) {
      setCart(
        cart.map((c) =>
          c.item_code === itemCode
            ? { ...c, qty: c.qty + 1, amount: (c.qty + 1) * c.rate }
            : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          item_code: itemCode,
          item_name: item.item_name || itemCode,
          stock_uom: item.stock_uom || 'Nos',
          qty: 1,
          rate,
          amount: rate * 1,
          available_qty: stock?.available_qty,
          actual_qty: stock?.actual_qty,
          reserved_qty: stock?.reserved_qty,
          warehouse: selectedWarehouse,
          image: item.image,
          barcode: item.barcode,
        },
      ]);
    }
  };

  // Update quantity in cart
  const handleUpdateQty = (itemCode: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromCart(itemCode);
      return;
    }
    setCart(
      cart.map((c) =>
        c.item_code === itemCode ? { ...c, qty, amount: qty * c.rate } : c
      )
    );
  };

  // Update unit rate in cart
  const handleUpdateRate = (itemCode: string, newRate: number) => {
    setCart(
      cart.map((c) =>
        c.item_code === itemCode ? { ...c, rate: newRate, amount: c.qty * newRate } : c
      )
    );
  };

  // Remove from cart
  const handleRemoveFromCart = (itemCode: string) => {
    setCart(cart.filter((c) => c.item_code !== itemCode));
  };

  // Calculations
  const subtotal = useMemo(() => cart.reduce((sum, c) => sum + c.amount, 0), [cart]);
  const estimatedTax = useMemo(() => Math.round(subtotal * 0.18), [subtotal]); // GST 18% standard
  const grandTotal = subtotal + estimatedTax;

  // Submit multi-item order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMessage('Please add at least one product to the order.');
      return;
    }

    // Check if any product has insufficient stock
    const stockWarnings = cart.filter(
      (c) => c.available_qty !== undefined && c.available_qty > 0 && c.qty > c.available_qty
    );
    if (stockWarnings.length > 0) {
      const confirmExceed = window.confirm(
        `Warning: ${stockWarnings.length} item(s) exceed current warehouse available stock. Do you want to submit as back-order demand?`
      );
      if (!confirmExceed) return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const orderItems = cart.map((c) => ({
        item_code: c.item_code,
        qty: c.qty,
      }));

      const res = await vmsService.createSalesOrder(customerName, orderItems, deliveryDate);
      const orderRef = res.sales_order || `SO-${Date.now().toString().slice(-6)}`;
      const finalTotal = res.grand_total || grandTotal;

      setOrderConfirmed({
        sales_order: orderRef,
        grand_total: finalTotal,
      });

      // Log sequential activity in shop timeline
      vmsService.logSequentialActivity({
        customer: customerName,
        stage: 'order',
        title: `Sales Order Booked: ${orderRef}`,
        description: `Multi-product sales order with ${cart.length} item(s) totaling ₹${finalTotal.toLocaleString('en-IN')}. Warehouse: ${selectedWarehouse}.`,
        badgeText: 'Sales Order',
        badgeColor: 'blue',
        metadata: {
          docType: 'Sales Order',
          docName: orderRef,
          amount: finalTotal,
          deliveryDate,
          items: cart.map((c) => ({
            item_code: c.item_code,
            item_name: c.item_name,
            qty: c.qty,
            rate: c.rate,
          })),
        },
      });

      onSuccess(orderRef, finalTotal);
    } catch (err: any) {
      console.warn('Order booking error:', err);
      setErrorMessage(err.message || 'Failed to create Sales Order in ERPNext.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-6 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#20D52E]/20 text-[#0B4025] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Multi-Product Sales Order Builder</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  ERPNext v16 Live
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Customer: <strong className="text-slate-800">{customerName}</strong>
                {initialVisitName && <span> • Linked to Visit: {initialVisitName}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Confirmation Screen */}
        {orderConfirmed ? (
          <div className="py-10 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900">Sales Order Booked Successfully!</h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                The multi-product order containing {cart.length} item(s) has been officially recorded and synchronized with ERPNext.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono text-left max-w-md mx-auto space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Sales Order Reference:</span>
                <strong className="text-slate-900">{orderConfirmed.sales_order}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Shop:</span>
                <span className="text-slate-800">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dispatch Warehouse:</span>
                <span className="text-slate-800">{selectedWarehouse}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Delivery Date:</span>
                <span className="text-slate-800">{deliveryDate}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold">
                <span className="text-slate-900">Grand Total (incl. GST):</span>
                <span className="text-[#0B4025]">₹{orderConfirmed.grand_total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-[#090B0A] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl active:scale-95 transition-all shadow-md"
              >
                Done & Return to Workspace
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 pt-3">
            {/* Left Column: Product Catalog & Search */}
            <div className="flex-1 flex flex-col overflow-hidden border-r-0 md:border-r border-slate-200 md:pr-4">
              {/* Warehouse & Filters Bar */}
              <div className="space-y-2 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5 flex items-center gap-1">
                      <Warehouse className="w-3 h-3 text-emerald-700" />
                      <span>Fulfillment Warehouse</span>
                    </label>
                    <select
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#20D52E]"
                    >
                      {warehouses.map((wh) => (
                        <option key={wh.name} value={wh.name}>
                          {wh.warehouse_name || wh.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-1/3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>Delivery</span>
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full text-xs font-semibold px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-[#20D52E]"
                    />
                  </div>
                </div>

                {/* Search box with Barcode hint */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by product name, item code, barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#20D52E]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Item Group Pills */}
                {itemGroups.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    {itemGroups.map((grp) => (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setSelectedGroup(grp)}
                        className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
                          selectedGroup === grp
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {grp}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[180px]">
                {isLoadingCatalog ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading ERPNext sellable items...</span>
                  </div>
                ) : filteredCatalog.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                    <span>No matching products found in catalog.</span>
                  </div>
                ) : (
                  filteredCatalog.map((item) => {
                    const itemCode = item.item_code || item.name;
                    const stock = stockMap[itemCode];
                    const rate = priceMap[itemCode] !== undefined ? priceMap[itemCode] : (Number(item.standard_rate) || 0);
                    const inCart = cart.find((c) => c.item_code === itemCode);

                    return (
                      <div
                        key={itemCode}
                        className="p-2.5 bg-slate-50 hover:bg-emerald-50/40 rounded-xl border border-slate-200 transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {item.image ? (
                              <img src={item.image} alt={item.item_name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-slate-900 truncate">{item.item_name || itemCode}</h5>
                            <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500 font-mono">
                              <span>Code: {itemCode}</span>
                              {item.stock_uom && <span>• {item.stock_uom}</span>}
                            </div>
                            {/* Stock Breakup */}
                            <div className="flex items-center gap-2 text-[10px] mt-0.5">
                              <span className="text-emerald-700 font-semibold">
                                Avail: <strong>{stock ? stock.available_qty : 'Checking...'}</strong>
                              </span>
                              <span className="text-slate-400">
                                (Actual: {stock ? stock.actual_qty : '-'} | Resvd: {stock ? stock.reserved_qty : '-'})
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPriceManagerItemCode(itemCode)}
                            className="text-right p-1 rounded-lg hover:bg-slate-200/60 transition-colors group/editprice cursor-pointer"
                            title="Click to change selling price in ERPNext"
                          >
                            <div className={`font-bold text-xs flex items-center justify-end gap-1 ${rate > 0 ? 'text-slate-900 group-hover/editprice:text-emerald-700' : 'text-amber-700'}`}>
                              <span>{rate > 0 ? `₹${rate.toLocaleString('en-IN')}` : '₹0.00'}</span>
                              <Edit2 className="w-2.5 h-2.5 text-slate-400 group-hover/editprice:text-emerald-600" />
                            </div>
                            <div className="text-[9px] text-slate-400 font-medium">
                              {rate > 0 ? 'price / unit' : 'set ERP price'}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAddToCart(item)}
                            className={`p-2 rounded-lg font-bold text-xs transition-all active:scale-95 ${
                              inCart
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#090B0A] hover:bg-slate-800 text-white'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Dynamic Cart & Order Summary */}
            <div className="w-full md:w-80 flex flex-col shrink-0">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-700" />
                  <span>Order Cart ({cart.length} items)</span>
                </span>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-56 md:max-h-none min-h-[140px]">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <ShoppingBag className="w-7 h-7 text-slate-300 mx-auto mb-1" />
                    <span>Cart is empty. Select products from the left to build order.</span>
                  </div>
                ) : (
                  cart.map((c) => (
                    <div
                      key={c.item_code}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-xs text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">{c.item_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{c.item_code}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(c.item_code)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(c.item_code, c.qty - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={c.qty}
                            onChange={(e) => handleUpdateQty(c.item_code, Math.max(1, Number(e.target.value)))}
                            className="w-10 text-center text-xs font-bold bg-transparent outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(c.item_code, c.qty + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-white hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-slate-900">
                            ₹{c.amount.toLocaleString('en-IN')}
                          </div>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="text-[10px] text-slate-400">₹</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={c.rate}
                              onChange={(e) => handleUpdateRate(c.item_code, Math.max(0, Number(e.target.value)))}
                              className="w-14 px-1 py-0.5 text-right font-mono text-[11px] font-semibold bg-white border border-slate-300 rounded focus:border-emerald-500 outline-none"
                              title="Negotiated selling price"
                            />
                            <span className="text-[10px] text-slate-400">× {c.qty} {c.stock_uom}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stock Check Warning */}
                      {c.available_qty !== undefined && c.qty > c.available_qty && (
                        <div className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Exceeds available stock ({c.available_qty})</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Order Calculations & Submit */}
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Est. GST (18%):</span>
                  <span className="font-semibold text-slate-900">₹{estimatedTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-[#0B4025]">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>

                {errorMessage && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full py-3 px-4 rounded-xl bg-[#20D52E] hover:bg-[#1db829] text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-[#20D52E]/20 disabled:opacity-50 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validating & Booking Order...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Book Sales Order ({cart.length} Items)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {priceManagerItemCode && (
        <ProductPriceManagerModal
          initialItemCode={priceManagerItemCode}
          onClose={() => setPriceManagerItemCode(null)}
          onPriceUpdated={(itemCode, newRate) => {
            setPriceMap((prev) => ({ ...prev, [itemCode]: newRate }));
            setCart((prev) =>
              prev.map((c) =>
                c.item_code === itemCode
                  ? { ...c, rate: newRate, amount: c.qty * newRate }
                  : c
              )
            );
          }}
        />
      )}
    </div>
  );
}
