import React, { useState, useEffect } from 'react';
import {
  Store,
  Calendar,
  ShoppingBag,
  Truck,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  UserCheck,
  ChevronRight,
  FileText,
  Camera,
  RefreshCw,
  X,
  CreditCard,
  Phone,
  MapPin,
  Tag,
  ArrowDownCircle,
  ExternalLink,
} from 'lucide-react';
import {
  vmsService,
  ShopTimelineEvent,
  TimelineStage,
} from '../../services/vmsService';
import { documentService } from '../../services/documentService';
import { authService } from '../../services/authService';

interface VisitTimelineViewProps {
  initialShopName?: string;
  onOpenOnboardShop?: () => void;
  onOpenOrderModal?: (shopName: string) => void;
  onOpenCollectionModal?: (shopName: string) => void;
  onOpenVisitModal?: (shopName: string) => void;
}

export function VisitTimelineView({
  initialShopName,
  onOpenOnboardShop,
  onOpenOrderModal,
  onOpenCollectionModal,
  onOpenVisitModal,
}: VisitTimelineViewProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>(initialShopName || '');
  const [timelineEvents, setTimelineEvents] = useState<ShopTimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [customerDetails, setCustomerDetails] = useState<any>(null);

  // Quick Activity Logging Modal
  const [showLogActivityModal, setShowLogActivityModal] = useState<boolean>(false);
  const [activityStage, setActivityStage] = useState<TimelineStage>('visit');
  const [activityTitle, setActivityTitle] = useState<string>('In-Person Store Review & Check');
  const [activityNotes, setActivityNotes] = useState<string>('');
  const [activityAmount, setActivityAmount] = useState<number>(0);
  const [activityDate, setActivityDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmittingActivity, setIsSubmittingActivity] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load real customer list from ERPNext
  const loadCustomers = async () => {
    try {
      const list = await vmsService.getRealCustomers();
      setCustomers(list);
      if (list.length > 0 && !selectedShop) {
        setSelectedShop(list[0].customer_name || list[0].name);
      }
    } catch (err) {
      console.warn('Failed to load customers for timeline:', err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Update selected shop if initialShopName changes
  useEffect(() => {
    if (initialShopName) {
      setSelectedShop(initialShopName);
    }
  }, [initialShopName]);

  // Load timeline for selected shop
  const fetchTimeline = async (shopName: string) => {
    if (!shopName) return;
    setIsLoading(true);
    try {
      const events = await vmsService.getShopLifecycleTimeline(shopName);
      setTimelineEvents(events);

      // Find customer info
      const found = customers.find(
        (c) => c.name === shopName || c.customer_name === shopName
      );
      setCustomerDetails(found || null);
    } catch (err) {
      console.warn('Error fetching timeline:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedShop) {
      fetchTimeline(selectedShop);
    }
  }, [selectedShop, customers]);

  // Handle Quick Activity Logging
  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShop) return;

    setIsSubmittingActivity(true);
    try {
      const newEvent = vmsService.logSequentialActivity({
        customer: selectedShop,
        stage: activityStage,
        title: activityTitle,
        description: activityNotes,
        timestamp: activityDate ? new Date(activityDate).toISOString() : new Date().toISOString(),
        badgeText:
          activityStage === 'visit'
            ? 'Shop Visit'
            : activityStage === 'order'
            ? 'Order Placement'
            : activityStage === 'collection'
            ? 'Payment Collection'
            : activityStage === 'followup'
            ? 'Follow-Up'
            : 'Activity',
        badgeColor:
          activityStage === 'visit'
            ? 'amber'
            : activityStage === 'order'
            ? 'blue'
            : activityStage === 'collection'
            ? 'green'
            : 'purple',
        metadata: {
          notes: activityNotes,
          amount: activityAmount > 0 ? activityAmount : undefined,
          nextFollowupDate: activityStage === 'followup' ? activityDate : undefined,
          agentName: authService.getUser()?.fullName || 'Field Sales Agent',
        },
      });

      showToast(`Logged activity: "${activityTitle}" for ${selectedShop}!`);
      setShowLogActivityModal(false);
      setActivityNotes('');
      setActivityAmount(0);

      // Reload timeline
      await fetchTimeline(selectedShop);
    } catch (err: any) {
      alert('Error logging activity: ' + err.message);
    } finally {
      setIsSubmittingActivity(false);
    }
  };

  // Milestone Progress Check
  const hasOnboarding = timelineEvents.some((e) => e.stage === 'onboarding');
  const hasVisits = timelineEvents.some((e) => e.stage === 'visit');
  const hasOrders = timelineEvents.some((e) => e.stage === 'order');
  const hasDeliveries = timelineEvents.some((e) => e.stage === 'delivery');
  const hasCollections = timelineEvents.some((e) => e.stage === 'collection');

  const milestones = [
    { label: 'Onboarding', done: hasOnboarding, stage: 'onboarding' },
    { label: 'Field Visit', done: hasVisits, stage: 'visit' },
    { label: 'Sales Order', done: hasOrders, stage: 'order' },
    { label: 'Delivery', done: hasDeliveries, stage: 'delivery' },
    { label: 'Payment', done: hasCollections, stage: 'collection' },
  ];

  const completedMilestonesCount = milestones.filter((m) => m.done).length;

  // Selected shop image (No mock or stock fallbacks)
  const shopPhoto =
    customerDetails?.image ||
    vmsService.getShopPhoto(selectedShop) ||
    null;

  const handleUploadStorefrontPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedShop) {
      const reader = new FileReader();
      reader.onload = () => {
        const photoData = reader.result as string;
        vmsService.saveShopPhoto(selectedShop, photoData, {
          territory: customerDetails?.territory,
          phone: customerDetails?.mobile_no,
        });
        // Log timeline event for photo upload
        vmsService.logSequentialActivity({
          customer: selectedShop,
          stage: 'visit',
          title: 'Storefront Photo Captured & Verified',
          description: 'Storefront exterior and signage photographed by field agent.',
          badgeText: 'Photo Verified',
          badgeColor: 'emerald',
          metadata: {
            photoUrl: photoData,
            notes: 'Exterior photo saved for driver delivery navigation and proofing.',
          },
        });
        showToast(`Storefront photo attached to ${selectedShop}!`);
        fetchTimeline(selectedShop);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#0B4025] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-[#20D52E]/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#20D52E] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Shop Selector & Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Selected Retail Shop
          </label>
          <div className="relative">
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="w-full text-base font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#20D52E] outline-none"
            >
              {customers.length === 0 ? (
                <option value="">No shops found on ERPNext</option>
              ) : (
                customers.map((c) => (
                  <option key={c.name} value={c.customer_name || c.name}>
                    {c.customer_name || c.name} {c.territory ? `(${c.territory})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Quick Activity Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchTimeline(selectedShop);
            }}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"
            title="Refresh Timeline"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            onClick={() => {
              setActivityStage('visit');
              setActivityTitle('On-Site Store Meeting & Stock Audit');
              setShowLogActivityModal(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold active:scale-95 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#20D52E]" />
            <span>Log Activity</span>
          </button>

          {onOpenOrderModal && (
            <button
              onClick={() => onOpenOrderModal(selectedShop)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#20D52E] hover:bg-[#1db829] text-slate-900 text-xs font-bold active:scale-95 transition-all shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Book Order</span>
            </button>
          )}

          {onOpenCollectionModal && (
            <button
              onClick={() => onOpenCollectionModal(selectedShop)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold active:scale-95 transition-all"
            >
              <IndianRupee className="w-4 h-4" />
              <span>Collect ₹</span>
            </button>
          )}
        </div>
      </div>

      {/* Shop Profile Banner & Lifecycle Progress Bar */}
      {selectedShop && (
        <div className="bg-[#090B0A] text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Storefront Picture */}
              {shopPhoto ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 shadow-sm relative group">
                  <img
                    src={shopPhoto}
                    alt={selectedShop}
                    className="w-full h-full object-cover"
                  />
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[9px] font-bold">
                    <Camera className="w-4 h-4 mb-0.5 text-[#20D52E]" />
                    <span>Change</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleUploadStorefrontPhoto}
                      className="hidden"
                    />
                  </label>
                  <span className="absolute bottom-1 right-1 bg-black/80 text-[#20D52E] p-1 rounded-full text-[9px]">
                    <Camera className="w-2.5 h-2.5" />
                  </span>
                </div>
              ) : (
                <label className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-900 border border-dashed border-slate-700 hover:border-[#20D52E] flex flex-col items-center justify-center text-slate-400 hover:text-white shrink-0 p-1 text-center cursor-pointer transition-colors group">
                  <Camera className="w-5 h-5 text-slate-500 group-hover:text-[#20D52E] transition-colors mb-0.5" />
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-200 leading-none">
                    Add Photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleUploadStorefrontPhoto}
                    className="hidden"
                  />
                </label>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    {selectedShop}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#20D52E]/20 text-[#20D52E] border border-[#20D52E]/30">
                    {customerDetails?.territory || 'Active Customer'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                  {customerDetails?.mobile_no && (
                    <a
                      href={`tel:${customerDetails.mobile_no}`}
                      className="inline-flex items-center gap-1 text-slate-300 hover:text-white"
                    >
                      <Phone className="w-3 h-3 text-[#20D52E]" />
                      <span>{customerDetails.mobile_no}</span>
                    </a>
                  )}
                  {customerDetails?.tax_id && (
                    <span className="font-mono text-slate-400">
                      GSTIN: {customerDetails.tax_id}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-1">
                  Customer Master: <span className="text-slate-200">{customerDetails?.name || selectedShop}</span>
                </p>
              </div>
            </div>

            {/* Lifecycle Completion Badge */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-right self-stretch sm:self-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Lifecycle Progression
              </span>
              <div className="text-base font-bold text-[#20D52E] mt-0.5">
                {completedMilestonesCount} of {milestones.length} Stages Completed
              </div>
            </div>
          </div>

          {/* Sequential 5-Stage Milestone Tracker */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <div className="grid grid-cols-5 gap-2">
              {milestones.map((m, idx) => (
                <div key={m.stage} className="text-center">
                  <div className="flex items-center justify-center mb-1.5">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        m.done
                          ? 'bg-[#20D52E] text-slate-900 shadow-md shadow-[#20D52E]/20'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {m.done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold block truncate ${
                      m.done ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Visual Timeline Section */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-700" />
              <span>Shop Visit & Relationship Timeline</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological audit log of all onboarding records, meetings, sales orders, deliveries, and collections.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {timelineEvents.length} Events
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-xs font-medium">Loading lifecycle events from ERPNext...</p>
          </div>
        ) : timelineEvents.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Store className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No lifecycle events recorded for this shop</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Start by logging an in-person meeting or recording the first sales order.
            </p>
            <button
              onClick={() => {
                setActivityStage('visit');
                setShowLogActivityModal(true);
              }}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
            >
              + Log Initial Activity
            </button>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timelineEvents.map((evt, idx) => {
              // Icon & styling depending on stage
              let Icon = Store;
              let dotClass = 'bg-slate-400 text-white ring-slate-100';
              let badgeBg = 'bg-slate-100 text-slate-700';

              if (evt.stage === 'onboarding') {
                Icon = Store;
                dotClass = 'bg-emerald-600 text-white ring-emerald-100';
                badgeBg = 'bg-emerald-100 text-emerald-800';
              } else if (evt.stage === 'visit') {
                Icon = Calendar;
                dotClass = 'bg-amber-500 text-white ring-amber-100';
                badgeBg = 'bg-amber-100 text-amber-800';
              } else if (evt.stage === 'order') {
                Icon = ShoppingBag;
                dotClass = 'bg-blue-600 text-white ring-blue-100';
                badgeBg = 'bg-blue-100 text-blue-800';
              } else if (evt.stage === 'delivery') {
                Icon = Truck;
                dotClass = 'bg-purple-600 text-white ring-purple-100';
                badgeBg = 'bg-purple-100 text-purple-800';
              } else if (evt.stage === 'collection') {
                Icon = IndianRupee;
                dotClass = 'bg-[#20D52E] text-slate-900 ring-emerald-100';
                badgeBg = 'bg-emerald-100 text-emerald-900 font-bold';
              } else if (evt.stage === 'followup') {
                Icon = Clock;
                dotClass = 'bg-slate-600 text-white ring-slate-100';
                badgeBg = 'bg-slate-100 text-slate-700';
              }

              const formattedDate = new Date(evt.timestamp).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div key={evt.id || idx} className="relative group">
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ring-4 shadow-xs ${dotClass}`}
                  >
                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>

                  {/* Event Card */}
                  <div className="bg-slate-50/80 hover:bg-slate-50 rounded-xl p-4 border border-slate-200/80 transition-all">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeBg}`}>
                          {evt.badgeText || evt.stage.toUpperCase()}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{evt.title}</h4>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    {evt.description && (
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {evt.description}
                      </p>
                    )}

                    {/* Metadata Extras: Amount, Document Ref, Photo */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-2.5 border-t border-slate-200/60 text-xs">
                      {evt.metadata?.docName && (
                        <div className="flex items-center gap-1 font-mono text-slate-700">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold">{evt.metadata.docName}</span>
                        </div>
                      )}

                      {evt.metadata?.amount !== undefined && (
                        <div className="flex items-center gap-1 font-bold text-emerald-700">
                          <IndianRupee className="w-3.5 h-3.5" />
                          <span>₹{evt.metadata.amount.toLocaleString('en-IN')}</span>
                        </div>
                      )}

                      {evt.metadata?.modeOfPayment && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-medium">
                          Mode: {evt.metadata.modeOfPayment}
                        </span>
                      )}

                      {evt.metadata?.transactionReference && (
                        <span className="text-[11px] font-mono text-slate-500">
                          Ref: {evt.metadata.transactionReference}
                        </span>
                      )}

                      {evt.metadata?.nextFollowupDate && (
                        <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                          Follow-up: {evt.metadata.nextFollowupDate}
                        </span>
                      )}

                      {evt.metadata?.photoUrl && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-semibold">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Storefront Photo Attached</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK ACTIVITY LOGGING MODAL */}
      {showLogActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#20D52E]/20 text-[#0B4025] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Log Sequential Shop Activity</h3>
              </div>
              <button
                onClick={() => setShowLogActivityModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogActivity} className="space-y-4 mt-4 text-xs sm:text-sm">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Shop</label>
                <input
                  type="text"
                  disabled
                  value={selectedShop}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lifecycle Stage</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'visit', label: 'Field Visit' },
                    { key: 'order', label: 'Order Demand' },
                    { key: 'collection', label: 'Payment' },
                    { key: 'followup', label: 'Follow-Up' },
                  ].map((stg) => (
                    <button
                      key={stg.key}
                      type="button"
                      onClick={() => {
                        setActivityStage(stg.key as any);
                        if (stg.key === 'visit') setActivityTitle('On-Site Store Meeting & Stock Audit');
                        else if (stg.key === 'order') setActivityTitle('Sales Order Demand Captured');
                        else if (stg.key === 'collection') setActivityTitle('Payment Collection Recorded');
                        else if (stg.key === 'followup') setActivityTitle('Scheduled Next Review');
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                        activityStage === stg.key
                          ? 'bg-[#090B0A] text-white border-[#090B0A]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {stg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Activity Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="e.g. Discussed bulk cement order with proprietor"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Value / Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={activityAmount}
                    onChange={(e) => setActivityAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Remarks / Meeting Outcome
                </label>
                <textarea
                  rows={3}
                  placeholder="Record customer interest, stock levels, competitor pricing, or promised payment date..."
                  value={activityNotes}
                  onChange={(e) => setActivityNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogActivityModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingActivity}
                  className="px-5 py-2.5 bg-[#20D52E] text-slate-900 font-bold rounded-lg hover:bg-[#1db829] shadow-md shadow-[#20D52E]/20 disabled:opacity-50"
                >
                  {isSubmittingActivity ? 'Saving...' : 'Add to Visit Timeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
