import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Navigation,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { Pengaturan } from "../types.ts";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  distance: number;
  isInside: boolean;
  statusText: "DI DALAM PONDOK" | "DI LUAR PONDOK" | "LOKASI TIDAK TERDETEKSI";
  timeAcquired: string;
}

interface GPSDetectorProps {
  settings?: Pengaturan | null;
  onLocationResolved: (data: LocationData | null) => void;
  autoDetect?: boolean;
}

// Haversine formula in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  ) {
    return 999999;
  }
  if (lat1 === 0 && lon1 === 0) return 999999;
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const dist = Math.round(R * c);
  return Number.isNaN(dist) ? 999999 : dist;
}

export const GPSDetector: React.FC<GPSDetectorProps> = ({
  settings,
  onLocationResolved,
  autoDetect = true,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [showSimNotice, setShowSimNotice] = useState<boolean>(false);

  const targetLat = settings?.latitude_pondok ?? -7.02558;
  const targetLng = settings?.longitude_pondok ?? 113.86542;
  const radius = settings?.radius_absensi ?? 100;

  const computeLocationData = useCallback(
    (lat: number, lng: number, accuracy: number): LocationData => {
      const distance = getDistanceMeters(lat, lng, targetLat, targetLng);
      const isInside = distance <= radius;
      const statusText = isInside ? "DI DALAM PONDOK" : "DI LUAR PONDOK";

      const now = new Date();
      const timeAcquired = now.toLocaleTimeString("id-ID", { hour12: false });

      return {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        accuracy: Math.round(accuracy),
        distance,
        isInside,
        statusText,
        timeAcquired,
      };
    },
    [targetLat, targetLng, radius]
  );

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg("Perangkat atau peramban Anda tidak mendukung sensor Geolocation / GPS.");
      onLocationResolved(null);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy || 10;

        const data = computeLocationData(lat, lng, accuracy);
        setLocation(data);
        onLocationResolved(data);
      },
      (err) => {
        setLoading(false);
        let message = "Gagal mengambil titik GPS.";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message =
              "Izin lokasi GPS ditolak oleh browser/perangkat Anda. Mohon izinkan akses lokasi pada peramban/HP untuk melanjutkan absensi.";
            break;
          case err.POSITION_UNAVAILABLE:
            message =
              "Informasi lokasi tidak tersedia. Pastikan fitur Lokasi / GPS di HP Anda dalam kondisi AKTIF.";
            break;
          case err.TIMEOUT:
            message =
              "Waktu deteksi GPS habis. Silakan klik tombol 'Cek Ulang Lokasi' di area terbuka.";
            break;
          default:
            message = err.message || "Terjadi kesalahan sensor GPS.";
        }
        setErrorMsg(message);
        onLocationResolved(null);
      },
      options
    );
  }, [computeLocationData, onLocationResolved]);

  useEffect(() => {
    if (autoDetect) {
      detectLocation();
    }
  }, [autoDetect, detectLocation]);

  // Simulation helpers for testing desktop/environments where GPS is fixed
  const simulatePondok = () => {
    const lat = targetLat + (Math.random() - 0.5) * 0.0003;
    const lng = targetLng + (Math.random() - 0.5) * 0.0003;
    const data = computeLocationData(lat, lng, 5);
    setLocation(data);
    onLocationResolved(data);
    setErrorMsg(null);
  };

  const simulateOutside = () => {
    const lat = targetLat + 0.006;
    const lng = targetLng + 0.006;
    const data = computeLocationData(lat, lng, 12);
    setLocation(data);
    onLocationResolved(data);
    setErrorMsg(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-sky-100 p-5 shadow-xs transition-all">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
            <Navigation className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Deteksi Posisi & GPS Guru</h3>
            <p className="text-xs text-slate-500">Koordinat akurat terhadap titik Pondok Pesantren</p>
          </div>
        </div>

        <button
          type="button"
          onClick={detectLocation}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Mendeteksi..." : "Cek Ulang Lokasi"}</span>
        </button>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-rose-900">Perhatian GPS:</p>
              <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={detectLocation}
                  className="px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white rounded-md hover:bg-rose-700"
                >
                  Coba Lagi
                </button>
                <button
                  type="button"
                  onClick={simulatePondok}
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-rose-300 text-rose-800 rounded-md hover:bg-rose-100"
                >
                  Simulasi: Di Dalam Pondok (Mode Tes)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success location card */}
      {location && !errorMsg && (
        <div className="mt-4 space-y-3">
          {/* Status Badge */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              location.isInside
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                : "bg-amber-50/80 border-amber-200 text-amber-950"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  location.isInside ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                }`}
              >
                {location.isInside ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                  Status Lokasi Saat Ini
                </span>
                <h4 className="text-base font-extrabold tracking-tight">
                  {location.statusText}
                </h4>
                <p className="text-xs opacity-90">
                  {location.isInside
                    ? `Sesuai radius absensi (Jarak: ${location.distance} m / Max: ${radius} m)`
                    : `Di luar radius absensi (Jarak: ${location.distance} m / Max: ${radius} m)`}
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-500 block">Waktu Terdeteksi</span>
              <span className="text-xs font-mono font-bold text-slate-700">
                {location.timeAcquired} WIB
              </span>
            </div>
          </div>

          {/* Location details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Latitude</span>
              <span className="font-mono font-bold text-slate-800">{location.latitude}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Longitude</span>
              <span className="font-mono font-bold text-slate-800">{location.longitude}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Jarak ke Pondok</span>
              <span className="font-mono font-bold text-sky-800">{location.distance} meter</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Batas Radius</span>
              <span className="font-mono font-bold text-slate-800">{radius} meter</span>
            </div>
          </div>
        </div>
      )}

      {/* Simulator bar for testing preview environment */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-sky-600" />
          <span>Titik Pusat: {settings?.nama_pondok || "PP Al Is'af"} ({targetLat}, {targetLng})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={simulatePondok}
            className="text-sky-600 hover:text-sky-800 underline font-medium"
            title="Uji coba lokasi di dalam pondok"
          >
            Tes Dalam (≤{radius}m)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={simulateOutside}
            className="text-slate-500 hover:text-slate-700 underline font-medium"
            title="Uji coba lokasi di luar pondok"
          >
            Tes Luar (&gt;{radius}m)
          </button>
        </div>
      </div>
    </div>
  );
};
