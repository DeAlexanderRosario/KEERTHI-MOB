import React, { useState, useEffect } from 'react';
import {
  Store,
  Camera,
  MapPin,
  Phone,
  Plus,
  Clock,
  IndianRupee,
  ShoppingBag,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Search,
  ExternalLink,
  FileText,
  UserCheck,
  ChevronRight,
  UploadCloud,
  X,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { vmsService, CustomerOnboardingData, ShopVisitData, PaymentCollectionData } from '../../services/vmsService';
import { authService } from '../../services/authService';
import { VisitTimelineView } from './VisitTimelineView';

export function FieldSalesWorkspace() {
  const user = authService.getUser();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timeline' | 'shops' | 'orders' | 'collections'>('dashboard');
  const [timelineShopName, setTimelineShopName] = useState<string>('');

  // Modals
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [showVisitModal, setShowVisitModal] = useState<boolean>(false);
  const [showCollectionModal, setShowCollectionModal] = useState<boolean>(false);
  const [selectedShopForAction, setSelectedShopForAction] = useState<string>('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Real Data states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTerritory, setSelectedTerritory] = useState<string>('All');
  const [realCustomers, setRealCustomers] = useState<any[]>([]);
  const [realItems, setRealItems] = useState<any[]>([]);
  const [onboardedShops, setOnboardedShops] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Shop Form State
  const [shopName, setShopName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [territory, setTerritory] = useState<string>('Ernakulam North');
  const [mobileNo, setMobileNo] = useState<string>('');
  const [gstIn, setGstIn] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [creditLimit, setCreditLimit] = useState<number>(50000);
  const [remarks, setRemarks] = useState<string>('');
  const [shopPhotoData, setShopPhotoData] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Visit & Order Form State
  const [visitPurpose, setVisitPurpose] = useState<string>('Sales Pitch');
  const [visitNotes, setVisitNotes] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [orderItemCode, setOrderItemCode] = useState<string>('');
  const [orderQty, setOrderQty] = useState<number>(1);

  // Payment Collection Form State
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMode, setCollectMode] = useState<'Cash' | 'UPI' | 'Cheque' | 'Bank Transfer'>('UPI');
  const [collectRef, setCollectRef] = useState<string>('');

  const loadData = async () => {
    setOnboardedShops(vmsService.getLocalOnboardedShops());
    setVisits(vmsService.getLocalVisits());
    setCollections(vmsService.getLocalCollections());
    setOrders(vmsService.getLocalSalesOrders());

    try {
      const custs = await vmsService.getRealCustomers();
      setRealCustomers(custs);
      if (custs.length > 0 && !selectedShopForAction) {
        setSelectedShopForAction(custs[0].customer_name || custs[0].name);
      }
    } catch (e) {
      console.warn('Real customers fetch:', e);
    }

    try {
      const itms = await vmsService.getRealItems();
      setRealItems(itms);
      if (itms.length > 0 && itms[0].item_code) {
        setOrderItemCode(itms[0].item_code);
      }
    } catch (e) {
      console.warn('Real items fetch:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Real ERPNext Customer mapping
  const allShops = realCustomers.map((s) => ({
    customer_name: s.customer_name || s.name,
    owner_name: s.customer_name || s.name,
    territory: s.territory || 'Assigned Territory',
    mobile_no: s.mobile_no || 'Contact on file',
    address: s.primary_address || s.address || s.territory || 'Address on file',
    status: s.status || (s.disabled ? 'Disabled' : 'Active'),
    credit_limit: s.credit_limits?.[0]?.credit_limit || s.proposed_credit_limit || 0,
    outstanding: s.outstanding_amount || 0,
    photo: s.image || vmsService.getShopPhoto(s.customer_name || s.name),
  }));

  const filteredShops = allShops.filter((s) => {
    const matchesSearch =
      s.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTerritory = selectedTerritory === 'All' || s.territory.includes(selectedTerritory);
    return matchesSearch && matchesTerritory;
  });

  // Handle Photo Capture / Selection
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setShopPhotoData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Shop Onboarding
  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !mobileNo.trim()) {
      alert('Shop Name and Mobile Number are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await vmsService.submitOnboardingRequest({
        customer_name: shopName.trim(),
        owner_name: ownerName.trim() || shopName.trim(),
        territory,
        mobile_no: mobileNo.trim(),
        gst_in: gstIn.trim() || undefined,
        address: address.trim() || undefined,
        proposed_credit_limit: creditLimit,
        remarks: remarks.trim() || undefined,
        shop_photo_url: shopPhotoData || undefined,
      });

      showToast(`Shop "${shopName}" onboarded! Storefront photo linked for Delivery Drivers.`);
      setShowOnboardModal(false);
      // Reset form
      setShopName('');
      setOwnerName('');
      setMobileNo('');
      setGstIn('');
      setAddress('');
      setRemarks('');
      setShopPhotoData('');
      loadData();
    } catch (err: any) {
      alert('Failed to submit onboarding request: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Shop Visit & Order
  const handleSubmitVisitAndOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopForAction) {
      alert('Please select a customer shop.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Log the visit
      await vmsService.createShopVisit({
        customer: selectedShopForAction,
        purpose: visitPurpose,
        notes: visitNotes,
        follow_up_date: followUpDate || undefined,
        items: [
          {
            item_code: orderItemCode,
            order_qty: orderQty,
            customer_interest: 'High',
          },
        ],
      });

      // 2. If order qty > 0, generate Sales Order (server calculates authoritative price list rate)
      if (orderQty > 0) {
        await vmsService.createSalesOrder(selectedShopForAction, [
          { item_code: orderItemCode, qty: orderQty },
        ]);
      }

      showToast(`Visit & Order recorded for ${selectedShopForAction}!`);
      setShowVisitModal(false);
      setVisitNotes('');
      loadData();
    } catch (err: any) {
      alert('Error recording visit: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Payment Collection
  const handleSubmitCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopForAction || collectAmount <= 0) {
      alert('Valid shop and amount are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await vmsService.createPaymentCollection({
        customer: selectedShopForAction,
        amount: collectAmount,
        mode_of_payment: collectMode,
        transaction_reference: collectRef.trim() || undefined,
      });

      showToast(`Payment of ₹${collectAmount.toLocaleString('en-IN')} recorded for ${selectedShopForAction}!`);
      setShowCollectionModal(false);
      setCollectRef('');
      loadData();
    } catch (err: any) {
      alert('Error recording collection: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCollectedToday = collections.reduce((acc, c) => acc + (c.amount || 0), 0);

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#0B4025] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-[#20D52E]/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#20D52E] shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Top Banner & Sales Agent Status */}
      <div className="bg-[#090B0A] text-white rounded-2xl p-5 md:p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-[#20D52E]/10 to-transparent pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#20D52E]/20 text-[#20D52E] border border-[#20D52E]/30">
                <Store className="w-3.5 h-3.5" /> Field Sales Agent Portal
              </span>
              <span className="text-slate-400 text-xs">VMS Field Ops</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Hardware Field Sales & Shop Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Onboard retail shops, record storefront photos, capture demand, and collect payments on-site.
            </p>
          </div>

          {/* Quick Action Button to Register Shop */}
          <button
            onClick={() => setShowOnboardModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#20D52E] text-[#090B0A] font-bold text-sm hover:bg-[#1db829] active:scale-95 transition-all shadow-md shadow-[#20D52E]/20 shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>+ Onboard New Shop</span>
          </button>
        </div>

        {/* Real-time KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">Total Active Shops</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg sm:text-xl font-bold text-white">{allShops.length}</span>
              <span className="text-[10px] text-[#20D52E]">Registered</span>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">Today's Visits</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg sm:text-xl font-bold text-white">{visits.length}</span>
              <span className="text-[10px] text-amber-400">Logged</span>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">Orders Captured</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg sm:text-xl font-bold text-white">{orders.length}</span>
              <span className="text-[10px] text-emerald-400">Booked</span>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 block">Collections Captured</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg sm:text-xl font-bold text-[#20D52E]">
                ₹{totalCollectedToday.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Subtabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-[#090B0A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Visits & Quick Actions</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'bg-[#090B0A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4 text-[#20D52E]" />
          <span>Visit Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('shops')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'shops'
              ? 'bg-[#090B0A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Shops Directory ({allShops.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-[#090B0A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Captured Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('collections')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'collections'
              ? 'bg-[#090B0A] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <IndianRupee className="w-4 h-4" />
          <span>Payment Collections ({collections.length})</span>
        </button>
      </div>

      {/* TAB: VISIT TIMELINE VISUALIZATION (SHOP LIFECYCLE) */}
      {activeTab === 'timeline' && (
        <VisitTimelineView
          initialShopName={timelineShopName || (allShops[0]?.customer_name ?? '')}
          onOpenOnboardShop={() => setShowOnboardModal(true)}
          onOpenOrderModal={(shop) => {
            setSelectedShopForAction(shop);
            setShowVisitModal(true);
          }}
          onOpenCollectionModal={(shop) => {
            setSelectedShopForAction(shop);
            setShowCollectionModal(true);
          }}
          onOpenVisitModal={(shop) => {
            setSelectedShopForAction(shop);
            setShowVisitModal(true);
          }}
        />
      )}

      {/* TAB 1: VISITS & QUICK ACTIONS */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Quick Action Trigger Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => {
                setSelectedShopForAction(allShops[0]?.customer_name || '');
                setShowVisitModal(true);
              }}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-[#20D52E] hover:shadow-sm text-left transition-all group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block group-hover:text-emerald-700">
                  Log Shop Visit
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Check stock levels, customer interest, and capture orders.
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setSelectedShopForAction(allShops[0]?.customer_name || '');
                setShowCollectionModal(true);
              }}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-[#20D52E] hover:shadow-sm text-left transition-all group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-green-50 text-green-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block group-hover:text-green-700">
                  Collect Payment
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Record lump sum or invoice-linked cash/UPI payments.
                </span>
              </div>
            </button>

            <button
              onClick={() => setShowOnboardModal(true)}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-[#20D52E] hover:shadow-sm text-left transition-all group flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-lime-50 text-lime-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 block group-hover:text-lime-800">
                  Onboard Shop + Photo
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Take storefront picture so drivers can recognize shop.
                </span>
              </div>
            </button>
          </div>

          {/* Today's Logged Visits Feed */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>Today's Logged Shop Visits</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">{visits.length} recorded</span>
            </div>

            {visits.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Store className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">No shop visits logged yet today</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Start your field rounds by visiting assigned hardware stores and recording notes.
                </p>
                <button
                  onClick={() => {
                    setSelectedShopForAction(allShops[0]?.customer_name || '');
                    setShowVisitModal(true);
                  }}
                  className="mt-3 px-4 py-2 bg-[#090B0A] text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  Log First Visit
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {visits.map((v, i) => (
                  <div
                    key={v.name || i}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        #{i + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{v.customer}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span>{v.purpose}</span>
                          <span>•</span>
                          <span>{new Date(v.visit_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {v.notes && <p className="text-xs text-slate-600 mt-1 italic">"{v.notes}"</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {v.status || 'Completed'}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedShopForAction(v.customer);
                          setShowCollectionModal(true);
                        }}
                        className="text-xs font-semibold px-2.5 py-1 bg-[#20D52E] text-slate-900 rounded-md hover:bg-[#1db829]"
                      >
                        Collect ₹
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SHOPS DIRECTORY */}
      {activeTab === 'shops' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search shop name, proprietor, or locality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#20D52E]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedTerritory}
                onChange={(e) => setSelectedTerritory(e.target.value)}
                className="text-xs sm:text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#20D52E]"
              >
                <option value="All">All Territories</option>
                <option value="Edappally">Edappally</option>
                <option value="Kalamassery">Kalamassery</option>
                <option value="Aluva">Aluva Hub</option>
                <option value="Ernakulam">Ernakulam</option>
              </select>

              <button
                onClick={() => setShowOnboardModal(true)}
                className="px-3.5 py-2 bg-[#20D52E] text-slate-900 font-bold text-xs rounded-lg hover:bg-[#1db829] whitespace-nowrap flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Shop
              </button>
            </div>
          </div>

          {/* Shops Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredShops.map((shop, idx) => (
              <div
                key={shop.customer_name + idx}
                className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-start gap-3">
                    {/* Storefront Photo Thumbnail with Click-to-Zoom */}
                    <div className="relative group shrink-0">
                      <div
                        onClick={() => shop.photo && setPreviewPhotoUrl(shop.photo)}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shadow-xs"
                      >
                        {shop.photo ? (
                          <img
                            src={shop.photo}
                            alt={shop.customer_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                            <Store className="w-6 h-6" />
                            <span className="text-[9px] mt-0.5">No Photo</span>
                          </div>
                        )}
                      </div>
                      {shop.photo && (
                        <span className="absolute -bottom-1 -right-1 bg-[#090B0A] text-white p-1 rounded-full text-[9px] shadow-xs">
                          <Camera className="w-2.5 h-2.5 text-[#20D52E]" />
                        </span>
                      )}
                    </div>

                    {/* Shop Meta Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{shop.customer_name}</h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                          {shop.status}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-600 mt-0.5">
                        Proprietor: <span className="text-slate-800">{shop.owner_name}</span>
                      </p>

                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{shop.address || shop.territory}</span>
                      </p>

                      <div className="flex items-center gap-2 mt-1.5">
                        <a
                          href={`tel:${shop.mobile_no}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{shop.mobile_no}</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Balance Details */}
                  <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Credit Limit</span>
                      <span className="font-semibold text-slate-700">
                        ₹{(shop.credit_limit || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">Ledger Outstanding</span>
                      <span className={`font-bold ${shop.outstanding > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        ₹{(shop.outstanding || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons on Shop Card */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setTimelineShopName(shop.customer_name);
                      setActiveTab('timeline');
                    }}
                    className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1 shrink-0"
                    title="View Lifecycle Timeline"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#20D52E]" />
                    <span>Timeline</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedShopForAction(shop.customer_name);
                      setShowVisitModal(true);
                    }}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold text-center transition-colors"
                  >
                    Visit / Order
                  </button>

                  <button
                    onClick={() => {
                      setSelectedShopForAction(shop.customer_name);
                      setShowCollectionModal(true);
                    }}
                    className="flex-1 py-1.5 px-2 bg-[#20D52E] hover:bg-[#1db829] text-slate-900 rounded-lg text-xs font-bold text-center transition-colors"
                  >
                    Collect ₹
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CAPTURED ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>Sales Orders Captured by Field Agents</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">{orders.length} orders</span>
          </div>

          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                No sales orders captured yet. Visit a shop and take an order.
              </p>
            ) : (
              orders.map((ord, idx) => (
                <div
                  key={ord.name || idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-900">{ord.name}</span>
                    <h4 className="text-sm font-bold text-slate-800">{ord.customer}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Delivery Date: {ord.delivery_date} • {ord.items?.length || 1} line item(s)
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    {ord.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENT COLLECTIONS */}
      {activeTab === 'collections' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              <span>Field Payment Collections Log</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">{collections.length} collections</span>
          </div>

          <div className="space-y-3">
            {collections.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                No payment collections recorded yet today.
              </p>
            ) : (
              collections.map((col, idx) => (
                <div
                  key={col.name || idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900">{col.name}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        {col.mode_of_payment}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{col.customer}</h4>
                    {col.transaction_reference && (
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        Ref: {col.transaction_reference}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-bold text-emerald-700">
                      ₹{col.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">{col.collection_date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ONBOARD NEW SHOP (WITH STOREFRONT PHOTO) */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#20D52E]/20 text-[#0B4025] flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Onboard New Hardware Shop</h3>
              </div>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOnboarding} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Shop Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Venkateswara Hardware & Electricals"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Proprietor / Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98470 12345"
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Territory</label>
                  <select
                    value={territory}
                    onChange={(e) => setTerritory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                  >
                    <option value="Ernakulam North">Ernakulam North</option>
                    <option value="Edappally">Edappally</option>
                    <option value="Kalamassery">Kalamassery</option>
                    <option value="Aluva Hub">Aluva Hub</option>
                    <option value="Perumbavoor">Perumbavoor</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Proposed Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Shop Address & Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Shop 4, Near Bridge Junction, Aluva Road"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="32AAAAA0000A1Z5"
                  value={gstIn}
                  onChange={(e) => setGstIn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-mono uppercase"
                />
              </div>

              {/* STOREFRONT PHOTO CAPTURE (CRITICAL USER REQUIREMENT) */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <span>Storefront Picture of Shop</span>
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded shadow-2xs">
                    Visible to Drivers
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Snap or upload a clear photo of the shop facade and signboard. The delivery driver will use this exact picture to locate and verify the shop during drops!
                </p>

                {shopPhotoData ? (
                  <div className="relative mt-2 rounded-lg overflow-hidden border border-emerald-300 max-h-48">
                    <img src={shopPhotoData} alt="Preview" className="w-full h-44 object-cover" />
                    <button
                      type="button"
                      onClick={() => setShopPhotoData('')}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full text-xs"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl cursor-pointer bg-white transition-colors">
                    <UploadCloud className="w-7 h-7 text-emerald-600 mb-1" />
                    <span className="text-xs font-semibold text-emerald-900">
                      Tap to Take Photo or Select File
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WebP supported</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Agent Remarks / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Visited owner Rajesh. Interested in ACC cement dealership and supreme PVC pipes."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#20D52E] text-slate-900 font-bold rounded-lg hover:bg-[#1db829] shadow-md shadow-[#20D52E]/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Register Shop & Save Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG SHOP VISIT & ORDER */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Record Shop Visit & Demand</h3>
              </div>
              <button
                onClick={() => setShowVisitModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVisitAndOrder} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Customer Shop</label>
                <select
                  value={selectedShopForAction}
                  onChange={(e) => setSelectedShopForAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-semibold text-slate-900"
                >
                  {allShops.map((s) => (
                    <option key={s.customer_name} value={s.customer_name}>
                      {s.customer_name} ({s.territory})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Visit Purpose</label>
                <select
                  value={visitPurpose}
                  onChange={(e) => setVisitPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                >
                  <option value="Sales Pitch">Sales Pitch</option>
                  <option value="Stock Check">Stock Check</option>
                  <option value="Payment Follow-up">Payment Follow-up</option>
                  <option value="Routine Relationship">Routine Relationship</option>
                  <option value="Dispute Resolution">Dispute Resolution</option>
                </select>
              </div>

              {/* Order Capture Section */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-700" />
                  <span>On-Site Sales Order Demand</span>
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Item Catalog</label>
                    <select
                      value={orderItemCode}
                      onChange={(e) => setOrderItemCode(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      {realItems.length > 0 ? (
                        realItems.map((it) => (
                          <option key={it.name || it.item_code} value={it.item_code || it.name}>
                            {it.item_name || it.item_code} ({it.stock_uom || 'Nos'})
                          </option>
                        ))
                      ) : (
                        <option value="">No items available in ERP catalog</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Quantity</label>
                    <input
                      type="number"
                      min={0}
                      value={orderQty}
                      onChange={(e) => setOrderQty(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic">
                  Note: Selling rates are automatically calculated on ERPNext server using the customer's authoritative price list.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Visit Discussion Notes</label>
                <textarea
                  rows={2}
                  placeholder="Record discussions, competitor pricing, feedback..."
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Next Follow-Up Date (Optional)</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#090B0A] text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Record Visit & Book Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD PAYMENT COLLECTION */}
      {showCollectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Record Payment Collection</h3>
              </div>
              <button
                onClick={() => setShowCollectionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCollection} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Shop</label>
                <select
                  value={selectedShopForAction}
                  onChange={(e) => setSelectedShopForAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-semibold text-slate-900"
                >
                  {allShops.map((s) => (
                    <option key={s.customer_name} value={s.customer_name}>
                      {s.customer_name} (Due: ₹{(s.outstanding || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Collected Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none text-base font-bold text-slate-900"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Supports lump-sum payments without exact invoice breakdown.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mode of Payment</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['UPI', 'Cash', 'Cheque', 'Bank Transfer'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCollectMode(mode)}
                      className={`py-2 px-2 text-center rounded-lg text-xs font-semibold border transition-all ${
                        collectMode === mode
                          ? 'bg-[#090B0A] text-white border-[#090B0A]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Transaction Ref / UPI UTR / Cheque No
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI-1984210984 or Cheque #091244"
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCollectionModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#20D52E] text-slate-900 font-bold rounded-lg hover:bg-[#1db829] shadow-md shadow-[#20D52E]/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Record Payment Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL-SCREEN SHOP PHOTO PREVIEW MODAL */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-2xl w-full bg-[#090B0A] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl p-2">
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 z-10 bg-black/70 hover:bg-black text-white p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewPhotoUrl}
              alt="Shop Storefront Preview"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
            <div className="p-3 text-center">
              <span className="text-xs text-slate-300 font-medium">
                Storefront Photo uploaded by Field Sales Agent • Accessible to Delivery Drivers
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
