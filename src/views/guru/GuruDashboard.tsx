import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { api } from "../../services/api.ts";
import { AbsensiRecord, JadwalPelajaran } from "../../types.ts";
import { GPSDetector, LocationData } from "../../components/GPSDetector.tsx";
import { AbsenModal } from "../../components/AbsenModal.tsx";
import { formatTeacherNameWithTitle } from "../../utils/formatTeacher.ts";
import {
  Clock,
  Calendar,
  LogIn,
  LogOut,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Bell,
} from "lucide-react";

interface GuruDashboardProps {
  onNavigate: (view: string) => void;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({ onNavigate }) => {
  const { user, serverInfo } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AbsensiRecord | null>(null);
  const [recentHistory, setRecentHistory] = useState<AbsensiRecord[]>([]);
  const [todaySchedules, setTodaySchedules] = useState<JadwalPelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<LocationData | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"MASUK" | "PULANG">("MASUK");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Time state
  const [liveTime, setLiveTime] = useState("");
  const [liveDate, setLiveDate] = useState("");
  const [liveDay, setLiveDay] = useState("");

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const [res, histRes, schedRes] = await Promise.all([
        api.getTodayStatus(),
        api.getMyHistory(),
        api.getTodayJadwal(),
      ]);
      setTodayRecord(res.record);
      setRecentHistory(histRes.records.slice(0, 5));
      setTodaySchedules(schedRes.data);
    } catch (err: any) {
      console.error("Error fetching guru status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    const updateClock = () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const wib = new Date(utc + 7 * 3600000);

      const days = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const months = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ];

      setLiveDay(days[wib.getDay()]);
      setLiveDate(`${wib.getDate()} ${months[wib.getMonth()]} ${wib.getFullYear()}`);
      setLiveTime(
        `${String(wib.getHours()).padStart(2, "0")}:${String(wib.getMinutes()).padStart(2, "0")}:${String(
          wib.getSeconds()
        ).padStart(2, "0")}`
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const openAbsenModal = (type: "MASUK" | "PULANG") => {
    setFeedback(null);
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleConfirmAbsen = async () => {
    setSubmitting(true);
    setFeedback(null);

    const lat = location?.latitude || 0;
    const lng = location?.longitude || 0;

    try {
      if (modalType === "MASUK") {
        const res = await api.checkIn({
          latitude: lat,
          longitude: lng,
          keterangan: location?.isInside ? "Hadir di Pondok" : "Absen luar pondok",
        });
        setFeedback({
          type: "success",
          text: `Absensi Masuk Berhasil! Status: ${res.status} (${res.jamMasuk} WIB) - ${res.lokasi}`,
        });
      } else {
        const res = await api.checkOut({
          latitude: lat,
          longitude: lng,
          keterangan: "Absen kepulangan guru",
        });
        setFeedback({
          type: "success",
          text: `Absensi Pulang Berhasil! Jam Pulang: ${res.jamPulang} WIB - ${res.lokasi}`,
        });
      }
      setIsModalOpen(false);
      await fetchStatus();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Gagal melakukan absensi." });
    } finally {
      setSubmitting(false);
    }
  };

  // Status checks for buttons
  const hasCheckedIn = !!todayRecord?.jam_masuk;
  const hasCheckedOut = !!todayRecord?.jam_pulang;

  const schoolSettings = serverInfo?.settings;
  const batasTerlambat = schoolSettings?.batas_terlambat || "20:05";
  const jamMasuk = schoolSettings?.jam_masuk || "20:00";
  const jamPulang = schoolSettings?.jam_pulang || "21:30";

  // Estimate status based on live clock
  const isCurrentlyLate = liveTime.substring(0, 5) > batasTerlambat.substring(0, 5);
  const statusPreview = isCurrentlyLate ? "TERLAMBAT" : "MASUK";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-700 via-sky-600 to-blue-800 text-white p-6 sm:p-8 shadow-xl shadow-sky-700/15">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-sky-100 mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Madrasah Diniyah Miftahul Huda • PP Al Is'af</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {formatTeacherNameWithTitle(user?.nama, user?.username)}
          </h2>

          <p className="mt-1 text-xs sm:text-sm text-sky-100 max-w-xl">
            {user?.mata_pelajaran ? `Pengampu: ${user.mata_pelajaran}` : "Guru Diniyah"}
            {user?.nip ? ` • NIP: ${user.nip}` : ""}
          </p>

          {/* Live Date and Time Pill */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/20 backdrop-blur-md text-xs font-medium border border-white/10">
              <Calendar className="w-4 h-4 text-sky-200" />
              <span>
                {liveDay}, {liveDate}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/20 backdrop-blur-md text-xs font-mono font-bold border border-white/10 text-sky-200">
              <Clock className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>{liveTime} WIB</span>
            </div>
          </div>
        </div>

        {/* Subtle decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border shadow-xs animate-in fade-in duration-300 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-semibold">{feedback.text}</span>
        </div>
      )}

      {/* Today's Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Absensi Hari Ini */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Status Hari Ini
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                todayRecord
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {todayRecord ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <h3
              className={`text-lg font-black tracking-tight ${
                todayRecord?.status === "MASUK"
                  ? "text-emerald-700"
                  : todayRecord?.status === "TERLAMBAT"
                  ? "text-amber-700"
                  : todayRecord
                  ? "text-blue-700"
                  : "text-slate-500"
              }`}
            >
              {todayRecord ? todayRecord.status : "BELUM ABSEN"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Jadwal Masuk: {jamMasuk} (Batas: {batasTerlambat})
            </p>
          </div>
        </div>

        {/* Jam Masuk */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Jam Masuk
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <LogIn className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-mono font-bold text-slate-800">
              {todayRecord?.jam_masuk ? `${todayRecord.jam_masuk} WIB` : "--:--:--"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {todayRecord?.lokasi_masuk || "Belum ada catatan"}
            </p>
          </div>
        </div>

        {/* Jam Pulang */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Jam Pulang
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-mono font-bold text-slate-800">
              {todayRecord?.jam_pulang ? `${todayRecord.jam_pulang} WIB` : "--:--:--"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {todayRecord?.lokasi_pulang || (hasCheckedIn ? "Menunggu absen pulang" : "-")}
            </p>
          </div>
        </div>

        {/* Status Lokasi */}
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Status Lokasi GPS
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3
              className={`text-sm font-extrabold tracking-tight ${
                location?.isInside ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {location?.statusText || "Mendeteksi..."}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {location ? `Jarak: ${location.distance} m` : "Aktifkan GPS perangkat"}
            </p>
          </div>
        </div>
      </div>

      {/* PENGINGAT JADWAL MENGAJAR HARI INI */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <span>Pengingat Jadwal Mengajar Hari Ini</span>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold">
                  {liveDay}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mata pelajaran, kitab kajian, dan kelas santri yang Anda ampu hari ini
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("guru_jadwal")}
            className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 transition-colors w-fit"
          >
            <BookOpen className="w-4 h-4" />
            <span>Jadwal Lengkap Mingguan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todaySchedules.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-sky-50/40 border border-sky-100/60">
            <p className="text-xs font-semibold text-slate-600">
              Alhamdulillah, tidak ada jadwal mengajar diniyah pada hari <span className="font-bold text-sky-800">{liveDay}</span> ini.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Gunakan waktu untuk muthala'ah kitab atau kegiatan pesantren lainnya.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todaySchedules.map((item) => {
              const isOngoing = item.timingStatus === "active";
              const isCompleted = item.timingStatus === "completed";

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isOngoing
                      ? "bg-gradient-to-r from-emerald-50 to-teal-50/50 border-emerald-300 shadow-xs ring-2 ring-emerald-400/20"
                      : isCompleted
                      ? "bg-slate-50 border-slate-200 opacity-80"
                      : "bg-sky-50/40 border-sky-200/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono font-bold text-xs text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      {item.jam_mulai} - {item.jam_selesai} WIB
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                        isOngoing
                          ? "bg-emerald-600 text-white animate-pulse"
                          : isCompleted
                          ? "bg-slate-200 text-slate-600"
                          : "bg-sky-200 text-sky-800"
                      }`}
                    >
                      {isOngoing ? "Sedang Berlangsung" : isCompleted ? "Selesai" : "Akan Datang"}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-sm leading-snug">
                    {item.mata_pelajaran}
                  </h4>

                  {item.kitab && (
                    <div className="text-xs text-sky-800 font-semibold mt-1 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                      <span>Kitab: {item.kitab}</span>
                    </div>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {item.kelas}
                    </span>

                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <MapPin className="w-3 h-3 text-sky-600" />
                      {item.ruangan || "Ruang Kelas Pondok"}
                    </span>
                  </div>

                  {item.keterangan && (
                    <div className="mt-2 text-[11px] text-slate-500 italic">
                      "{item.keterangan}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GPS Detector Card */}
      <GPSDetector
        settings={schoolSettings}
        onLocationResolved={(loc) => setLocation(loc)}
        autoDetect={true}
      />

      {/* ACTION BUTTONS (Large & Touch-Friendly as required) */}
      <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-600" />
          <span>Aksi Absensi Hari Ini</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ABSEN MASUK BUTTON */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-50 to-white border border-sky-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-sky-800 uppercase">Absen Masuk Guru</span>
              <span className="text-[11px] font-mono text-slate-500">Jadwal: {jamMasuk} WIB</span>
            </div>

            <button
              type="button"
              onClick={() => openAbsenModal("MASUK")}
              disabled={hasCheckedIn}
              className={`w-full py-4 px-6 rounded-2xl font-black text-base tracking-wide flex items-center justify-center gap-3 transition-all shadow-lg ${
                hasCheckedIn
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white shadow-sky-600/30 transform active:scale-98"
              }`}
            >
              <LogIn className="w-6 h-6" />
              <span>{hasCheckedIn ? "SUDAH ABSEN MASUK" : "ABSEN MASUK"}</span>
            </button>

            <p className="mt-2.5 text-center text-xs text-slate-500">
              {hasCheckedIn
                ? `Tercatat masuk pukul ${todayRecord?.jam_masuk} WIB (${todayRecord?.status})`
                : isCurrentlyLate
                ? `Waktu saat ini melebihi ${batasTerlambat} WIB (Status: Terlambat)`
                : `Masuk sebelum ${batasTerlambat} WIB (Status: Tepat Waktu)`}
            </p>
          </div>

          {/* ABSEN PULANG BUTTON */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-50 to-white border border-indigo-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-indigo-900 uppercase">Absen Pulang Guru</span>
              <span className="text-[11px] font-mono text-slate-500">Jadwal: {jamPulang} WIB</span>
            </div>

            <button
              type="button"
              onClick={() => openAbsenModal("PULANG")}
              disabled={!hasCheckedIn || hasCheckedOut}
              className={`w-full py-4 px-6 rounded-2xl font-black text-base tracking-wide flex items-center justify-center gap-3 transition-all shadow-lg ${
                !hasCheckedIn || hasCheckedOut
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-indigo-600 to-blue-800 hover:from-indigo-700 hover:to-blue-900 text-white shadow-indigo-600/30 transform active:scale-98"
              }`}
            >
              <LogOut className="w-6 h-6" />
              <span>
                {hasCheckedOut
                  ? "SUDAH ABSEN PULANG"
                  : !hasCheckedIn
                  ? "BELUM ABSEN MASUK"
                  : "ABSEN PULANG"}
              </span>
            </button>

            <p className="mt-2.5 text-center text-xs text-slate-500">
              {hasCheckedOut
                ? `Tercatat pulang pukul ${todayRecord?.jam_pulang} WIB`
                : !hasCheckedIn
                ? "Wajib melakukan absen masuk terlebih dahulu"
                : "Klik tombol di atas saat jam mengajar selesai"}
            </p>
          </div>
        </div>
      </div>

      {/* Recent History Table Card */}
      <div className="bg-white rounded-3xl border border-sky-100 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-sky-700" />
            <h3 className="font-bold text-base text-slate-800">Riwayat Absensi Terakhir</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("guru_history")}
            className="flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Belum ada riwayat absensi tercatat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50/60 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Tanggal & Hari</th>
                  <th className="py-2.5 px-3">Jam Masuk</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Lokasi</th>
                  <th className="py-2.5 px-3 rounded-r-lg">Jam Pulang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-sky-50/30">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {item.hari}, {item.tanggal}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-700">
                      {item.jam_masuk || "-"}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          item.status === "MASUK"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "TERLAMBAT"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[11px] font-semibold ${
                          item.lokasi_masuk === "DI DALAM PONDOK"
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`}
                      >
                        {item.lokasi_masuk || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {item.jam_pulang || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AbsenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmAbsen}
        isLoading={submitting}
        type={modalType}
        locationData={location}
        serverTime={liveTime}
        serverDate={liveDate}
        serverDay={liveDay}
        teacherName={formatTeacherNameWithTitle(user?.nama, user?.username)}
        statusPreview={statusPreview}
      />
    </div>
  );
};
