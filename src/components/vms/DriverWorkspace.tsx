import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  Camera,
  Navigation,
  FileCheck2,
  AlertTriangle,
  X,
  Play,
  RotateCcw,
  Store,
  Eye,
  ShieldCheck,
  ChevronRight,
  Package,
  RefreshCw,
} from 'lucide-react';
import {
  vmsService,
  DeliveryTrip,
  DeliveryTripStop,
  PodSubmission,
} from '../../services/vmsService';
import { authService } from '../../services/authService';

export function DriverWorkspace() {
  const [trips, setTrips] = useState<DeliveryTrip[]>([]);
  const [activeTrip, setActiveTrip] = useState<DeliveryTrip | null>(null);
  const [selectedStop, setSelectedStop] = useState<DeliveryTripStop | null>(null);
  const [isLoadingTrips, setIsLoadingTrips] = useState<boolean>(true);

  // Modals
  const [showPodModal, setShowPodModal] = useState<boolean>(false);
  const [showFailModal, setShowFailModal] = useState<boolean>(false);
  const [showShopPhotoModal, setShowShopPhotoModal] = useState<string | null>(null);

  // POD Form States
  const [receiverName, setReceiverName] = useState<string>('');
  const [receiverPhone, setReceiverPhone] = useState<string>('');
  const [deliveryPhotoData, setDeliveryPhotoData] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [podResultSeal, setPodResultSeal] = useState<{ pod_name: string; audit_hash?: string } | null>(null);

  // Failure / Reschedule Form
  const [failReason, setFailReason] = useState<string>('Shop Closed / Locked');

  // Interactive Signature Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);

  const loadTrips = async () => {
    setIsLoadingTrips(true);
    try {
      const list = await vmsService.getDriverTrips();
      setTrips(list);
      if (list.length > 0 && !activeTrip) {
        setActiveTrip(list[0]);
      } else if (activeTrip) {
        const refreshed = list.find((t) => t.name === activeTrip.name);
        if (refreshed) setActiveTrip(refreshed);
      }
    } catch (e) {
      console.warn('Driver trips load error:', e);
    } finally {
      setIsLoadingTrips(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Start Trip
  const handleStartTrip = async (tripName: string) => {
    try {
      await vmsService.startTrip(tripName);
      showToast(`Trip ${tripName} is now In Transit! Drive safely.`);
      await loadTrips();
    } catch (err: any) {
      alert('Could not start trip: ' + err.message);
    }
  };

  // Record Arrival at Stop
  const handleRecordArrival = async (tripName: string, stopName: string) => {
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
            await vmsService.recordArrival(tripName, stopName, lat, lng);
            showToast(`Arrival confirmed at ${stopName}!`);
            await loadTrips();
          },
          async () => {
            await vmsService.recordArrival(tripName, stopName);
            showToast(`Arrival confirmed at ${stopName}!`);
            await loadTrips();
          }
        );
      } else {
        await vmsService.recordArrival(tripName, stopName);
        showToast(`Arrival confirmed at ${stopName}!`);
        await loadTrips();
      }
    } catch (err: any) {
      alert('Error recording arrival: ' + err.message);
    }
  };

  // Open POD modal for a stop
  const handleOpenPod = (stop: DeliveryTripStop) => {
    setSelectedStop(stop);
    setReceiverName(stop.customer_name);
    setReceiverPhone(stop.contact_phone || '+91 ');
    setDeliveryPhotoData('');
    setDeliveryNotes('');
    setHasSignature(false);
    setShowPodModal(true);

    // Setup canvas after modal renders
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#090B0A';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }, 150);
  };

  // Signature Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasSignature(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
      }
    }
  };

  // Handle Delivery Photo
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setDeliveryPhotoData(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Submit Proof of Delivery
  const handleSubmitPod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !selectedStop) return;
    if (!receiverName.trim() || !receiverPhone.trim()) {
      alert('Receiver name and phone number are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const signatureBase64 = canvasRef.current?.toDataURL('image/png');

      // Get items belonging to this stop/customer
      const stopItems = (activeTrip.items || []).filter(
        (it) => it.customer === selectedStop.customer || it.customer === selectedStop.customer_name
      );

      const podItems = stopItems.length > 0
        ? stopItems.map((it) => ({
            item_code: it.item_code,
            allocated_qty: it.allocated_qty,
            delivered_qty: it.allocated_qty, // Full delivery by default
            damaged_qty: 0,
            short_qty: 0,
            rejected_qty: 0,
          }))
        : [];

      const podSubmission: PodSubmission = {
        trip_name: activeTrip.name,
        stop_name: selectedStop.name,
        receiver_name: receiverName.trim(),
        receiver_phone: receiverPhone.trim(),
        items: podItems,
        signature_base64: signatureBase64,
        photos: deliveryPhotoData
          ? [{ category: 'Delivery Evidence', photo_url: deliveryPhotoData, remarks: 'Unloaded at storefront' }]
          : undefined,
        delivery_notes: deliveryNotes.trim() || undefined,
      };

      const res = await vmsService.submitPod(podSubmission);
      setPodResultSeal(res);
      showToast(`POD Submitted! Stop ${selectedStop.stop_sequence} marked Delivered.`);
      await loadTrips();
    } catch (err: any) {
      alert('Failed to submit POD: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Failed Delivery
  const handleFailDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !selectedStop) return;
    try {
      await vmsService.recordFailedDelivery(activeTrip.name, selectedStop.name, failReason);
      showToast(`Delivery attempt recorded as Failed: ${failReason}`);
      setShowFailModal(false);
      await loadTrips();
    } catch (err: any) {
      alert('Error updating stop: ' + err.message);
    }
  };

  const deliveredStopsCount = activeTrip?.stops.filter((s) => s.status === 'Delivered').length || 0;
  const totalStopsCount = activeTrip?.stops.length || 0;
  const progressPct = totalStopsCount > 0 ? Math.round((deliveredStopsCount / totalStopsCount) * 100) : 0;

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-4 z-50 bg-[#0B4025] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-[#20D52E]/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#20D52E] shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Driver Header & Active Vehicle Banner */}
      <div className="bg-[#090B0A] text-white rounded-2xl p-5 md:p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#20D52E]/20 text-[#20D52E] border border-[#20D52E]/30">
                <Truck className="w-3.5 h-3.5" /> Driver Delivery Portal
              </span>
              <span className="text-slate-400 text-xs">VMS Dispatch & Proof of Delivery</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {activeTrip?.route || (trips.length > 0 ? activeTrip?.name : 'Assigned Delivery Dispatch')}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
              <span>
                Vehicle: <strong className="text-white">{activeTrip?.vehicle || 'Assigned in ERPNext'}</strong>
              </span>
              <span>•</span>
              <span>
                Driver: <strong className="text-white">{activeTrip?.driver || authService.getUser()?.fullName || 'Assigned Driver'}</strong>
              </span>
            </div>

            {trips.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-400">Switch Trip:</span>
                <select
                  value={activeTrip?.name}
                  onChange={(e) => {
                    const found = trips.find((t) => t.name === e.target.value);
                    if (found) setActiveTrip(found);
                  }}
                  className="px-3 py-1 bg-slate-800 text-white border border-slate-700 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-[#20D52E]"
                >
                  {trips.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} • {t.route || 'Delivery Route'} ({t.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Start Transit Button */}
          {activeTrip && activeTrip.status === 'Dispatched' && (
            <button
              onClick={() => handleStartTrip(activeTrip.name)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#20D52E] text-[#090B0A] font-bold text-sm hover:bg-[#1db829] active:scale-95 transition-all shadow-md shadow-[#20D52E]/20 shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Trip / Begin Transit</span>
            </button>
          )}

          {activeTrip && activeTrip.status === 'In Transit' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>In Transit ({activeTrip.actual_departure || 'Active'})</span>
            </div>
          )}

          {activeTrip && activeTrip.status === 'Completed' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Trip Completed</span>
            </div>
          )}
        </div>

        {/* Delivery Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400">
              Trip Progress: <strong className="text-white">{deliveredStopsCount} of {totalStopsCount} Stops Completed</strong>
            </span>
            <span className="text-[#20D52E] font-bold">{progressPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#20D52E] transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Zero COD Security Badge */}
      <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-[#20D52E] shrink-0" />
          <span>
            <strong>Zero COD Security Protocol:</strong> Drivers do not collect payments or cash. Collections are handled exclusively by Field Sales Agents.
          </span>
        </div>
      </div>

      {/* Assigned Stops List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>Delivery Stops (Ordered Sequence)</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={loadTrips}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingTrips ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Follow route sequentially</span>
          </div>
        </div>

        {isLoadingTrips && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center shadow-xs">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-600 font-medium">Checking ERPNext for assigned driver trips...</p>
          </div>
        )}

        {!isLoadingTrips && (!activeTrip || activeTrip.stops.length === 0) && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">No Dispatched Trips Pending</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Delivery trips are generated and dispatched by internal logistics in ERPNext. Once an active trip is assigned to your driver account, its stops and shop storefront photos will appear here automatically.
              </p>
            </div>
            <button
              onClick={loadTrips}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#090B0A] hover:bg-slate-800 text-white text-xs font-bold active:scale-95 transition-all shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check for New Trips</span>
            </button>
          </div>
        )}

        {activeTrip?.stops.map((stop) => {
          const isDelivered = stop.status === 'Delivered';
          const isArrived = stop.status === 'Arrived';
          const isFailed = stop.status === 'Failed';
          const shopPhoto = stop.shop_photo_url || vmsService.getShopPhoto(stop.customer_name);

          return (
            <div
              key={stop.name}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                isDelivered
                  ? 'border-emerald-200 bg-emerald-50/20 opacity-90'
                  : isArrived
                  ? 'border-[#20D52E] ring-2 ring-[#20D52E]/20 shadow-md'
                  : 'border-slate-200/90'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Left Side: Sequence & Shop Info */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isDelivered
                        ? 'bg-emerald-600 text-white'
                        : isArrived
                        ? 'bg-[#20D52E] text-slate-900'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isDelivered ? <CheckCircle2 className="w-5 h-5" /> : `#${stop.stop_sequence}`}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{stop.customer_name}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDelivered
                            ? 'bg-emerald-100 text-emerald-800'
                            : isArrived
                            ? 'bg-amber-100 text-amber-800'
                            : isFailed
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {stop.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{stop.address || 'Address on file'}</span>
                    </p>

                    {stop.contact_phone && (
                      <p className="text-xs text-slate-600 mt-1">
                        Contact: <strong className="text-slate-800">{stop.contact_phone}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side: Navigation & Phone Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  {stop.address && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(stop.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
                    >
                      <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Directions</span>
                    </a>
                  )}

                  {stop.contact_phone && (
                    <a
                      href={`tel:${stop.contact_phone}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Shop</span>
                    </a>
                  )}
                </div>
              </div>

              {/* STOREFRONT IMAGE SECTION (CRITICAL FEATURE SPECIFIED BY USER) */}
              <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Shop Image Thumbnail */}
                  <div
                    onClick={() => shopPhoto && setShowShopPhotoModal(shopPhoto)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 cursor-pointer relative group shadow-xs"
                  >
                    {shopPhoto ? (
                      <>
                        <img
                          src={shopPhoto}
                          alt={stop.customer_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                        <Store className="w-5 h-5" />
                        <span className="text-[8px] mt-0.5">No Picture</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">Shop Storefront Photo</span>
                      <span className="text-[10px] font-semibold bg-[#20D52E]/20 text-[#0B4025] px-2 py-0.5 rounded">
                        Uploaded by Field Sales
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-md">
                      Verify storefront signage and facade before unloading. Tap image to inspect full photo.
                    </p>
                  </div>
                </div>

                {shopPhoto && (
                  <button
                    onClick={() => setShowShopPhotoModal(shopPhoto)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 self-end sm:self-center"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Full Photo</span>
                  </button>
                )}
              </div>

              {/* Items in this Stop */}
              {activeTrip.items && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">Items to Deliver:</span>
                  <div className="flex flex-wrap gap-2">
                    {activeTrip.items
                      .filter((i) => i.customer === stop.customer || i.customer === stop.customer_name)
                      .map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-medium"
                        >
                          <Package className="w-3 h-3 text-slate-500" />
                          <span>
                            {item.item_name || item.item_code}: <strong>{item.allocated_qty} {item.uom || 'Nos'}</strong>
                          </span>
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Action Buttons for Stop */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                {stop.status === 'Pending' && (
                  <button
                    onClick={() => handleRecordArrival(activeTrip.name, stop.name)}
                    className="flex-1 min-h-[44px] py-2.5 px-4 bg-[#090B0A] hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs"
                  >
                    <MapPin className="w-4 h-4 text-[#20D52E]" />
                    <span>I Have Arrived at Shop</span>
                  </button>
                )}

                {stop.status === 'Arrived' && (
                  <div className="flex-1 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleOpenPod(stop)}
                      className="flex-1 min-h-[44px] py-2.5 px-4 bg-[#20D52E] hover:bg-[#1db829] text-slate-900 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-[#20D52E]/20"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>Deliver & Capture POD</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedStop(stop);
                        setShowFailModal(true);
                      }}
                      className="min-h-[44px] py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Could Not Deliver</span>
                    </button>
                  </div>
                )}

                {stop.status === 'Delivered' && (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl w-full">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Proof of Delivery Captured (Ref: {stop.pod_reference || 'Confirmed'})</span>
                  </div>
                )}

                {stop.status === 'Failed' && (
                  <div className="text-xs text-rose-700 bg-rose-50 px-3 py-2 rounded-xl w-full">
                    Failed: <strong>{stop.failure_reason || 'Shop closed / unreachable'}</strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PROOF OF DELIVERY (POD) MODAL */}
      {showPodModal && selectedStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#20D52E]/20 text-[#0B4025] flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Proof of Delivery: Stop #{selectedStop.stop_sequence}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowPodModal(false);
                  setPodResultSeal(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {podResultSeal ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Delivery Confirmed!</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Proof of Delivery recorded and cryptographically sealed on ERPNext server.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono text-left space-y-1">
                  <div>POD Reference: <strong className="text-slate-900">{podResultSeal.pod_name}</strong></div>
                  <div>Cryptographic Seal: <span className="text-emerald-700 break-all">{podResultSeal.audit_hash}</span></div>
                </div>

                <button
                  onClick={() => {
                    setShowPodModal(false);
                    setPodResultSeal(null);
                  }}
                  className="px-6 py-2.5 bg-[#090B0A] text-white font-bold text-xs rounded-xl"
                >
                  Close & Proceed to Next Stop
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitPod} className="space-y-4 mt-4 text-xs sm:text-sm">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Customer Shop</label>
                  <input
                    type="text"
                    disabled
                    value={selectedStop.customer_name}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Receiver Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Murugan Swamy"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Receiver Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98471 23450"
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                    />
                  </div>
                </div>

                {/* Goods Delivery Photo Capture */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-emerald-700" />
                      <span>Photo of Unloaded Goods at Shop</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Camera / File</span>
                  </div>

                  {deliveryPhotoData ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-300 max-h-40">
                      <img src={deliveryPhotoData} alt="Delivery Evidence" className="w-full h-36 object-cover" />
                      <button
                        type="button"
                        onClick={() => setDeliveryPhotoData('')}
                        className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full text-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl cursor-pointer bg-white">
                      <Camera className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-700">Tap to Take Delivery Photo</span>
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

                {/* Digital Finger Signature Pad */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">
                      Receiver Digital Signature <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear
                    </button>
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={440}
                      height={130}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-32 touch-none cursor-crosshair bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Have the receiver sign inside the box above with their finger.
                  </span>
                </div>

                {/* Remarks */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Delivery Remarks (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Unloaded 40 bags cement inside godown"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#20D52E] outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPodModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !hasSignature}
                    className="px-5 py-2.5 bg-[#20D52E] text-slate-900 font-bold rounded-lg hover:bg-[#1db829] shadow-md shadow-[#20D52E]/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting POD...' : 'Confirm Delivery & Submit POD'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* COULD NOT DELIVER MODAL */}
      {showFailModal && selectedStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Record Delivery Exception</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select the reason why stop #{selectedStop.stop_sequence} ({selectedStop.customer_name}) could not be completed.
            </p>

            <form onSubmit={handleFailDelivery} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason for Failure</label>
                <select
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="Shop Closed / Locked">Shop Closed / Locked</option>
                  <option value="Proprietor Unavailable">Proprietor / Contact Person Unavailable</option>
                  <option value="Goods Refused by Customer">Goods Refused by Customer</option>
                  <option value="Incorrect Address / Location Not Found">Incorrect Address / Location Not Found</option>
                  <option value="Road Blocked / Vehicle Inaccessible">Road Blocked / Vehicle Inaccessible</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFailModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700"
                >
                  Record Failed Stop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL-SIZE SHOP PHOTO MODAL */}
      {showShopPhotoModal && (
        <div
          onClick={() => setShowShopPhotoModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-2xl w-full bg-[#090B0A] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl p-2">
            <button
              onClick={() => setShowShopPhotoModal(null)}
              className="absolute top-4 right-4 z-10 bg-black/70 hover:bg-black text-white p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={showShopPhotoModal}
              alt="Shop Storefront Verification"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
            <div className="p-3 text-center">
              <span className="text-xs text-white font-semibold flex items-center justify-center gap-1.5">
                <Store className="w-4 h-4 text-[#20D52E]" />
                Storefront Photo captured by Field Sales Agent during Shop Onboarding
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
