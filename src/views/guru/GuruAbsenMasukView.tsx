import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { api } from "../../services/api.ts";
import { GPSDetector, LocationData } from "../../components/GPSDetector.tsx";
import { AbsenModal } from "../../components/AbsenModal.tsx";
import { formatTeacherNameWithTitle } from "../../utils/formatTeacher.ts";
import {
  LogIn,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
  Building,
} from "lucide-react";

export const GuruAbsenMasukView: React.FC = () => {
  const { user, serverInfo } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [jenisKehadiran, setJenisKehadiran] = useState<string>("NORMAL");
  const [keterangan, setKeterangan] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<{ status: string; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const settings = serverInfo?.settings;
  const batasTerlambat = settings?.batas_terlambat || "20:05";

  const handleOpenModal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResult(null);

    if (!location && jenisKehadiran === "NORMAL") {
      setErrorMsg("Titik GPS belum terdeteksi. Silakan aktifkan GPS atau tunggu sebentar.");
      return;
    }

    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.checkIn({
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
        keterangan: keterangan,
        jenisKehadiran: jenisKehadiran === "NORMAL" ? undefined : jenisKehadiran,
      });

      setResult({
        status: res.status,
        message: `${res.message} Status: ${res.status} pada ${res.jamMasuk} WIB (${res.lokasi})`,
      });
      setIsModalOpen(false);
      setKeterangan("");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal melakukan absen masuk.");
      setIsModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
            <LogIn className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Form Absensi Masuk Guru</h2>
            <p className="text-xs text-slate-500">
              Madrasah Diniyah Miftahul Huda • PP Al Is'af
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{result.message}</span>
          </div>
        )}

        <form onSubmit={handleOpenModal} className="mt-5 space-y-5">
          {/* GPS Detector */}
          <GPSDetector
            settings={settings}
            onLocationResolved={(data) => setLocation(data)}
            autoDetect={true}
          />

          {/* Jenis Kehadiran (Requirement 14: Keterangan/Alasan khusus: Dinas, Izin, Sakit, Tugas Pondok, Keperluan lainnya) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Jenis Kehadiran / Kondisi Khusus
            </label>
            <select
              value={jenisKehadiran}
              onChange={(e) => setJenisKehadiran(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              <option value="NORMAL">Hadir Mengajar Regular (Sesuai GPS & Waktu)</option>
              <option value="IZIN">Izin Tidak Hadir</option>
              <option value="SAKIT">Sakit (Kondisi Kesehatan)</option>
              <option value="DINAS">Dinas Luar</option>
              <option value="TUGAS PONDOK">Tugas Khusus Pondok Pesantren</option>
              <option value="KEPERLUAN LAINNYA">Keperluan Lainnya</option>
            </select>
          </div>

          {/* Keterangan Catatan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Keterangan / Alasan Tambahan (Opsional)
            </label>
            <textarea
              rows={3}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Mengajar Fiqih Kitab Fathul Qorib Bab Sholat, atau alasan keterlambatan/izin..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Large Submit Button */}
          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-extrabold text-base tracking-wide shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transform active:scale-98 transition-all"
          >
            <LogIn className="w-5 h-5" />
            <span>KIRIM ABSEN MASUK</span>
          </button>
        </form>
      </div>

      <AbsenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        isLoading={submitting}
        type="MASUK"
        locationData={location}
        serverTime={new Date().toLocaleTimeString("id-ID")}
        serverDate={new Date().toLocaleDateString("id-ID")}
        serverDay="Hari Ini"
        teacherName={formatTeacherNameWithTitle(user?.nama, user?.username)}
        keterangan={keterangan}
        jenisKehadiran={jenisKehadiran !== "NORMAL" ? jenisKehadiran : undefined}
      />
    </div>
  );
};
