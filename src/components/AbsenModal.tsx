import React from "react";
import {
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
} from "lucide-react";
import { LocationData } from "./GPSDetector.tsx";

interface AbsenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  type: "MASUK" | "PULANG";
  locationData: LocationData | null;
  serverTime: string;
  serverDate: string;
  serverDay: string;
  teacherName: string;
  keterangan?: string;
  jenisKehadiran?: string;
  statusPreview?: string;
}

export const AbsenModal: React.FC<AbsenModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  type,
  locationData,
  serverTime,
  serverDate,
  serverDay,
  teacherName,
  keterangan,
  jenisKehadiran,
  statusPreview,
}) => {
  if (!isOpen) return null;

  const isMasuk = type === "MASUK";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-sky-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div
          className={`px-6 py-4.5 border-b flex items-center justify-between ${
            isMasuk
              ? "bg-gradient-to-r from-sky-600 to-blue-700 text-white"
              : "bg-gradient-to-r from-indigo-600 to-blue-800 text-white"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Konfirmasi Absen {isMasuk ? "Masuk" : "Pulang"}
              </h3>
              <p className="text-xs text-sky-100">Madrasah Diniyah Miftahul Huda</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-4 text-sm text-slate-600">
          <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Nama Guru:</span>
              <span className="font-bold text-slate-800">{teacherName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Hari & Tanggal:</span>
              <span className="font-semibold text-slate-800">
                {serverDay}, {serverDate}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Waktu Server:</span>
              <span className="font-mono font-bold text-sky-800 text-sm">
                {serverTime} WIB
              </span>
            </div>
          </div>

          {/* Status Preview */}
          {isMasuk && statusPreview && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Estimasi Status:</span>
              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  statusPreview === "MASUK"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : statusPreview === "TERLAMBAT"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-blue-100 text-blue-800 border border-blue-300"
                }`}
              >
                {statusPreview}
              </span>
            </div>
          )}

          {/* Location details */}
          <div className="rounded-xl border border-slate-200 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <MapPin className="w-4 h-4 text-sky-600" />
              <span>Verifikasi Posisi Geolocation</span>
            </div>

            {locationData ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Titik:</span>
                  <span
                    className={`font-bold ${
                      locationData.isInside ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {locationData.statusText}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jarak ke Pondok:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {locationData.distance} meter
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Koordinat:</span>
                  <span>
                    {locationData.latitude}, {locationData.longitude}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800 text-xs">
                Perhatian: Koordinat GPS belum terdeteksi. Pastikan GPS aktif.
              </div>
            )}
          </div>

          {/* Reason or special note */}
          {(keterangan || jenisKehadiran) && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Keterangan Tambahan:</span>
              </div>
              <p className="text-slate-600 italic">
                {jenisKehadiran ? `[${jenisKehadiran}] ` : ""}
                {keterangan || "Tidak ada catatan"}
              </p>
            </div>
          )}

          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            Data absensi akan disimpan secara permanen di database relasional dan dicatat oleh administrator.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all ${
              isMasuk
                ? "bg-sky-600 hover:bg-sky-700 shadow-sky-600/25"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25"
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{isLoading ? "Menyimpan Data..." : "Ya, Simpan Absensi"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
