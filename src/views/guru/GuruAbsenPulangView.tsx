import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { api } from "../../services/api.ts";
import { GPSDetector, LocationData } from "../../components/GPSDetector.tsx";
import { AbsenModal } from "../../components/AbsenModal.tsx";
import { formatTeacherNameWithTitle } from "../../utils/formatTeacher.ts";
import {
  LogOut,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";

export const GuruAbsenPulangView: React.FC = () => {
  const { user, serverInfo } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [keterangan, setKeterangan] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<{ message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const settings = serverInfo?.settings;

  const handleOpenModal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResult(null);

    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.checkOut({
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
        keterangan: keterangan,
      });

      setResult({
        message: `${res.message} Jam Pulang: ${res.jamPulang} WIB (${res.lokasi})`,
      });
      setIsModalOpen(false);
      setKeterangan("");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal melakukan absen pulang.");
      setIsModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <LogOut className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Form Absensi Pulang Guru</h2>
            <p className="text-xs text-slate-500">
              Mencatat kepulangan setelah kegiatan belajar mengajar selesai
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
          <GPSDetector
            settings={settings}
            onLocationResolved={(data) => setLocation(data)}
            autoDetect={true}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan Kepulangan (Opsional)
            </label>
            <textarea
              rows={3}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Selesai pengajian kitab, santri tertib..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-800 hover:from-indigo-700 hover:to-blue-900 text-white font-extrabold text-base tracking-wide shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transform active:scale-98 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>KIRIM ABSEN PULANG</span>
          </button>
        </form>
      </div>

      <AbsenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        isLoading={submitting}
        type="PULANG"
        locationData={location}
        serverTime={new Date().toLocaleTimeString("id-ID")}
        serverDate={new Date().toLocaleDateString("id-ID")}
        serverDay="Hari Ini"
        teacherName={formatTeacherNameWithTitle(user?.nama, user?.username)}
        keterangan={keterangan}
      />
    </div>
  );
};
