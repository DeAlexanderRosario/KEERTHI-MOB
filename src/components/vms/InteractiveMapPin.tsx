import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Crosshair, Check, AlertCircle, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

interface InteractiveMapPinProps {
  initialLat?: number;
  initialLng?: number;
  initialAccuracy?: number;
  onLocationChange: (loc: { lat: number; lng: number; accuracy?: number; addressHint?: string }) => void;
  readOnly?: boolean;
  geofenceRadiusMeters?: number;
  showGeofenceCircle?: boolean;
}

export function InteractiveMapPin({
  initialLat = 9.9816,
  initialLng = 76.2999,
  initialAccuracy,
  onLocationChange,
  readOnly = false,
  geofenceRadiusMeters,
  showGeofenceCircle = false,
}: InteractiveMapPinProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLng, setCurrentLng] = useState<number>(initialLng);
  const [accuracy, setAccuracy] = useState<number | undefined>(initialAccuracy);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [hasCapturedGps, setHasCapturedGps] = useState<boolean>(Boolean(initialLat && initialLng && initialAccuracy));

  // Custom high-visibility SVG pin icon for Keerthi ERP
  const createPinIcon = (isGps: boolean) => {
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position: relative; width: 36px; height: 42px; transform: translate(-50%, -100%);">
          <svg viewBox="0 0 24 24" width="36" height="42" fill="none" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.45));">
            <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8z" fill="${isGps ? '#0B4025' : '#090B0A'}" stroke="#20D52E" stroke-width="2"/>
            <circle cx="12" cy="8" r="3.5" fill="#20D52E" />
          </svg>
          <div style="position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 50%); width: 8px; height: 8px; border-radius: 50%; background: #20D52E; box-shadow: 0 0 8px #20D52E;"></div>
        </div>
      `,
      iconSize: [36, 42],
      iconAnchor: [18, 42],
    });
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Attribution small text at corner
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; OpenStreetMap')
        .addTo(map);

      // Marker
      const marker = L.marker([currentLat, currentLng], {
        draggable: !readOnly,
        icon: createPinIcon(hasCapturedGps),
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const roundedLat = parseFloat(pos.lat.toFixed(6));
        const roundedLng = parseFloat(pos.lng.toFixed(6));
        setCurrentLat(roundedLat);
        setCurrentLng(roundedLng);
        updateCircle(roundedLat, roundedLng, accuracy);
        onLocationChange({
          lat: roundedLat,
          lng: roundedLng,
          accuracy,
        });
      });

      // Click to pin on map
      if (!readOnly) {
        map.on('click', (e: L.LeafletMouseEvent) => {
          const roundedLat = parseFloat(e.latlng.lat.toFixed(6));
          const roundedLng = parseFloat(e.latlng.lng.toFixed(6));
          marker.setLatLng([roundedLat, roundedLng]);
          setCurrentLat(roundedLat);
          setCurrentLng(roundedLng);
          updateCircle(roundedLat, roundedLng, accuracy);
          onLocationChange({
            lat: roundedLat,
            lng: roundedLng,
            accuracy,
          });
        });
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Circle for geofence or accuracy
      if (accuracy || (showGeofenceCircle && geofenceRadiusMeters)) {
        updateCircle(currentLat, currentLng, geofenceRadiusMeters || accuracy);
      }
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []);

  const updateCircle = (lat: number, lng: number, radiusMeters?: number) => {
    if (!mapInstanceRef.current) return;
    const r = radiusMeters || 20;

    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(r);
    } else {
      circleRef.current = L.circle([lat, lng], {
        radius: r,
        color: showGeofenceCircle ? '#3B82F6' : '#20D52E',
        fillColor: showGeofenceCircle ? '#3B82F6' : '#20D52E',
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: showGeofenceCircle ? '4, 4' : undefined,
      }).addTo(mapInstanceRef.current);
    }
  };

  // Capture GPS using HTML5 Geolocation with high accuracy
  const handleCaptureGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy);

        setCurrentLat(lat);
        setCurrentLng(lng);
        setAccuracy(acc);
        setHasCapturedGps(true);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
          markerRef.current.setLatLng([lat, lng]);
          markerRef.current.setIcon(createPinIcon(true));
          updateCircle(lat, lng, geofenceRadiusMeters || acc);
        }

        onLocationChange({
          lat,
          lng,
          accuracy: acc,
        });
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Could not acquire GPS position.';
        if (err.code === 1) msg = 'Location permission denied. Please allow GPS access in your browser settings.';
        else if (err.code === 2) msg = 'Position unavailable. Make sure device GPS/Location is turned on.';
        else if (err.code === 3) msg = 'GPS acquisition timed out. Please try again.';
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleZoom = (delta: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + delta);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top GPS capture bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-white p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#20D52E]/20 text-[#20D52E] flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-2">
              <span>GPS Geolocation</span>
              {hasCapturedGps && (
                <span className="text-[10px] font-semibold bg-[#20D52E]/20 text-[#20D52E] px-2 py-0.5 rounded border border-[#20D52E]/30">
                  Live Locked
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
              {accuracy !== undefined && (
                <span className="text-[#20D52E] ml-1.5 font-sans font-semibold">
                  (±{accuracy}m precision)
                </span>
              )}
            </div>
          </div>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleCaptureGps}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#20D52E] hover:bg-[#1db829] text-slate-950 text-xs font-bold active:scale-95 transition-all shadow-sm disabled:opacity-50"
          >
            {isLocating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Acquiring GPS...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5" />
                <span>Capture Device GPS</span>
              </>
            )}
          </button>
        )}
      </div>

      {gpsError && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Interactive Map Box */}
      <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-sm bg-slate-100">
        <div
          ref={mapContainerRef}
          className="w-full h-56 sm:h-64 z-0"
          style={{ minHeight: '220px' }}
        />

        {/* Map overlay controls */}
        <div className="absolute top-2 right-2 z-[400] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => handleZoom(1)}
            aria-label="Zoom in"
            className="w-8 h-8 bg-white/95 hover:bg-white text-slate-800 rounded-lg shadow-md flex items-center justify-center font-bold text-sm border border-slate-200"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(-1)}
            aria-label="Zoom out"
            className="w-8 h-8 bg-white/95 hover:bg-white text-slate-800 rounded-lg shadow-md flex items-center justify-center font-bold text-sm border border-slate-200"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Helper Bar */}
        <div className="absolute bottom-2 left-2 right-2 z-[400] bg-slate-900/85 backdrop-blur-xs text-white px-3 py-1.5 rounded-lg text-[10px] sm:text-xs flex items-center justify-between pointer-events-none">
          <span className="flex items-center gap-1 font-medium truncate">
            <MapPin className="w-3.5 h-3.5 text-[#20D52E] shrink-0" />
            {!readOnly
              ? 'Drag pin or tap map to adjust exact storefront entrance'
              : 'Confirmed Storefront Location'}
          </span>
          <a
            href={`https://maps.google.com/?q=${currentLat},${currentLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#20D52E] hover:underline font-semibold pointer-events-auto ml-2 shrink-0"
          >
            Google Maps ↗
          </a>
        </div>
      </div>
    </div>
  );
}
