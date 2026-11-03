import React, { useState, useEffect } from 'react';
import {
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  X,
  FileText,
  ShoppingBag,
  Plus,
  Trash2,
  Navigation,
} from 'lucide-react';
import { vmsService, ShopVisitData, ShopVisitItem, CustomerGpsLocation } from '../../services/vmsService';
import { authService } from '../../services/authService';
import { InteractiveMapPin } from './InteractiveMapPin';

interface GeofencedVisitModalProps {
  customerName: string;
  visitPurposes: string[];
  interestLevels: string[];
  onClose: () => void;
  onSuccess: (visitRef: string, geofenceStatus: string) => void;
}

export function GeofencedVisitModal({
  customerName,
  visitPurposes,
  interestLevels,
  onClose,
  onSuccess,
}: GeofencedVisitModalProps) {
  const [purpose, setPurpose] = useState<string>(visitPurposes[0] || '');
  const [notes, setNotes] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [exceptionReason, setExceptionReason] = useState<string>('');

  // Agent live location
  const [agentLat, setAgentLat] = useState<number | null>(null);
  const [agentLng, setAgentLng] = useState<number | null>(null);
  const [agentAccuracy, setAgentAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Shop registered location
  const [shopGps, setShopGps] = useState<CustomerGpsLocation | null>(null);
  const geofenceRadiusMeters = 200; // Standard 200m field sales radius

  // Items demand during visit
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [visitItems, setVisitItems] = useState<ShopVisitItem[]>([]);
  const [selectedItemCode, setSelectedItemCode] = useState<string>('');
  const [itemOrderQty, setItemOrderQty] = useState<number>(1);
  const [itemInterest, setItemInterest] = useState<string>(interestLevels[0] || '');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load shop GPS and catalog
  useEffect(() => {
    const gps = vmsService.getShopGps(customerName);
    setShopGps(gps);

    vmsService.getRealItems().then((items) => {
      setCatalogItems(items);
      if (items.length > 0) {
        setSelectedItemCode(items[0].item_code || items[0].name);
      }
    });

    // Acquire current GPS position
    captureAgentLocation();
  }, [customerName]);

  useEffect(() => {
    if (!visitPurposes.includes(purpose)) setPurpose(visitPurposes[0] || '');
  }, [visitPurposes, purpose]);

  useEffect(() => {
    if (!interestLevels.includes(itemInterest)) setItemInterest(interestLevels[0] || '');
  }, [interestLevels, itemInterest]);

  const captureAgentLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation not supported on this browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAgentLat(parseFloat(pos.coords.latitude.toFixed(6)));
        setAgentLng(parseFloat(pos.coords.longitude.toFixed(6)));
        setAgentAccuracy(Math.round(pos.coords.accuracy));
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setLocationError(`Location error (${err.code}): ${err.message}. Ensure location is enabled.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Calculate geofence check
  const geofenceCheck = React.useMemo(() => {
    if (!agentLat || !agentLng) return null;
    if (!shopGps?.latitude || !shopGps?.longitude) {
      return {
        isWithin: true,
        distanceMeters: null,
        status: 'No Shop Coordinates' as const,
        note: 'Shop has no prior pinned GPS. Visit coordinates will be recorded.',
      };
    }

    const dist = vmsService.calculateDistanceMeters(agentLat, agentLng, shopGps.latitude, shopGps.longitude);
    const isWithin = dist <= geofenceRadiusMeters;

    return {
      isWithin,
      distanceMeters: dist,
      status: isWithin ? ('Verified On-Site' as const) : ('Outside Geofence' as const),
      note: isWithin
        ? `Within geofence: ${dist}m from shop entrance (Radius: ${geofenceRadiusMeters}m).`
        : `Outside geofence: ${dist}m from shop entrance. Manager exception review required.`,
    };
  }, [agentLat, agentLng, shopGps]);

  // Add Item to discussion
  const handleAddItem = () => {
    if (!selectedItemCode) return;
    const it = catalogItems.find((c) => (c.item_code || c.name) === selectedItemCode);
    setVisitItems([
      ...visitItems,
      {
        item_code: selectedItemCode,
        item_name: it?.item_name || selectedItemCode,
        order_qty: itemOrderQty,
        customer_interest: itemInterest,
      },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setVisitItems(visitItems.filter((_, i) => i !== idx));
  };

  // Submit Visit
  const handleSubmitVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentLat || !agentLng) {
      alert('Valid GPS location is required to log a geofenced field visit.');
      return;
    }

    const isOutside = geofenceCheck?.status === 'Outside Geofence';
    if (isOutside && !exceptionReason.trim()) {
      alert('Please provide an exception reason explaining why check-in is outside the shop geofence.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullNotes = [
        notes.trim(),
        isOutside ? `[GEOFENCE EXCEPTION]: Outside by ${geofenceCheck?.distanceMeters}m. Reason: ${exceptionReason.trim()}` : null,
        agentAccuracy ? `GPS Accuracy: ±${agentAccuracy}m` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const visitData: ShopVisitData = {
        customer: customerName,
        purpose,
        notes: fullNotes,
        lat: agentLat,
        lng: agentLng,
        gps_accuracy: agentAccuracy || undefined,
        distance_from_shop_meters: geofenceCheck?.distanceMeters || undefined,
        is_within_geofence: geofenceCheck?.isWithin,
        geofence_status: geofenceCheck?.status,
        follow_up_date: followUpDate || undefined,
        items: visitItems,
      };

      const res = await vmsService.createShopVisit(visitData);

      // Log sequential timeline event
      vmsService.logSequentialActivity({
        customer: customerName,
        stage: 'visit',
        title: `Shop Visit: ${purpose}`,
        description: `${geofenceCheck?.status || 'Visit Logged'}. ${fullNotes}`,
        badgeText: geofenceCheck?.status || 'Field Visit',
        badgeColor: geofenceCheck?.isWithin ? 'emerald' : 'amber',
        metadata: {
          docType: 'Shop Visit',
          docName: res.visit_name,
          agentName: authService.getUser()?.fullName || 'Field Sales Agent',
          notes: fullNotes,
          nextFollowupDate: followUpDate || undefined,
          items: visitItems.map((vi) => ({ item_code: vi.item_code, item_name: vi.item_name, qty: vi.order_qty || 1 })),
        },
      });

      onSuccess(res.visit_name, geofenceCheck?.status || 'Completed');
    } catch (err: any) {
      alert('Error recording shop visit: ' + (err.message || 'Server error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Geofenced Shop Visit Check-In</h3>
              <p className="text-xs text-slate-500">
                Customer: <strong className="text-slate-800">{customerName}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitVisit} className="flex-1 overflow-y-auto space-y-4 pt-3 pr-1 text-xs sm:text-sm">
          {/* Live Geofence Status Card */}
          <div className="p-3.5 rounded-xl border bg-slate-900 text-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#20D52E]" />
                <span className="font-bold text-xs">GPS Geofence Verification</span>
              </div>
              <button
                type="button"
                onClick={captureAgentLocation}
                disabled={isLocating}
                className="text-[11px] font-semibold text-[#20D52E] hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                <span>Re-check GPS</span>
              </button>
            </div>

            {isLocating ? (
              <div className="text-xs text-slate-300 flex items-center gap-2 py-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#20D52E]" />
                <span>Acquiring high-accuracy mobile GPS lock...</span>
              </div>
            ) : locationError ? (
              <div className="text-xs text-rose-400 flex items-center gap-1.5 py-1">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{locationError}</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-300">
                  <span>
                    Your Coordinates: {agentLat?.toFixed(6)}, {agentLng?.toFixed(6)}
                  </span>
                  {agentAccuracy && <span className="text-[#20D52E] font-sans font-semibold">±{agentAccuracy}m</span>}
                </div>

                {geofenceCheck && (
                  <div
                    className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      geofenceCheck.isWithin
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {geofenceCheck.isWithin ? (
                      <CheckCircle2 className="w-4 h-4 text-[#20D52E] shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>{geofenceCheck.note}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Exception reason if outside geofence */}
          {geofenceCheck?.status === 'Outside Geofence' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1.5 animate-in fade-in">
              <label className="font-bold text-amber-900 block flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                <span>Manager Geofence Exception Justification *</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="Explain why visit is logged away from shop (e.g., meeting shop owner at project site / warehouse)..."
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}

          {/* Visit Purpose & Discussion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Visit Purpose</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#20D52E] font-semibold text-slate-900"
              >
                {visitPurposes.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Next Follow-Up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#20D52E]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Visit Notes & Discussion</label>
            <textarea
              rows={3}
              placeholder="Record proprietor feedback, stock inventory status at shop, competitor movements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#20D52E]"
            />
          </div>

          {/* Items Demand Discussion */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-800" />
              <span>Products Discussed / Customer Interest</span>
            </span>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6 sm:col-span-7">
                <select
                  value={selectedItemCode}
                  onChange={(e) => setSelectedItemCode(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  {catalogItems.map((it) => (
                    <option key={it.item_code || it.name} value={it.item_code || it.name}>
                      {it.item_name || it.item_code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3 sm:col-span-2">
                <input
                  type="number"
                  min={1}
                  value={itemOrderQty}
                  onChange={(e) => setItemOrderQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-center"
                />
              </div>

              <div className="col-span-3 sm:col-span-3 flex items-center gap-1">
                <select
                  value={itemInterest}
                  onChange={(e) => setItemInterest(e.target.value as any)}
                  className="w-full px-1.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                >
                  {interestLevels.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                </select>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-[#20D52E]" />
                </button>
              </div>
            </div>

            {/* List of items added */}
            {visitItems.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {visitItems.map((vi, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{vi.item_name}</span>
                      <span className="text-[10px] text-slate-500 ml-2">Qty: {vi.order_qty} ({vi.customer_interest} Interest)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !agentLat}
              className="px-5 py-2.5 bg-[#20D52E] hover:bg-[#1db829] text-slate-950 font-bold rounded-xl text-xs sm:text-sm active:scale-95 transition-all shadow-md shadow-[#20D52E]/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Recording Geofenced Visit...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Save Visit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
