import React, { useState, useEffect } from "react";
import { api } from "../../services/api.ts";
import { DashboardStats, JadwalPelajaran } from "../../types.ts";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  MapPin,
  Compass,
  ArrowRight,
  TrendingUp,
  CalendarCheck,
  FileSpreadsheet,
  Settings,
  Sparkles,
  BookOpen,
  Bell,
  CheckCircle2,
} from "lucide-react";

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todaySchedules, setTodaySchedules] = useState<JadwalPelajaran[]>([]);
  const [todayDay, setTodayDay] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [data, schedRes] = await Promise.all([
        api.getDashboardStats(),
        api.getTodayJadwal(),
      ]);
      setStats(data);
      setTodaySchedules(schedRes.data);
      setTodayDay(schedRes.day);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-sky-900/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-sky-200 border border-white/15 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Panel Pengelola Absensi Madrasah</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Dashboard Absensi Guru
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 mt-1">
            Madrasah Diniyah Miftahul Huda – Pondok Pesantren Al Is'af
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate("today")}
            className="px-4 py-2 rounded-xl bg-white text-sky-900 text-xs font-bold shadow-md hover:bg-sky-50 transition-colors"
          >
            Absensi Hari Ini
          </button>
          <button
            type="button"
            onClick={() => onNavigate("report")}
            className="px-4 py-2 rounded-xl bg-sky-600/60 hover:bg-sky-600 border border-sky-400/40 text-white text-xs font-bold transition-colors"
          >
            Cetak / Export Laporan
          </button>
        </div>
      </div>

      {/* 8 Metric Cards specified in Requirement 8 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Jumlah Guru */}
        <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Guru</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl font-black text-slate-800 mt-2">{stats?.totalGuru ?? 0}</p>
          <span className="text-[10px] text-slate-400 font-medium">Aktif Mengajar</span>
        </div>

        {/* Sudah Absen */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Sudah Absen</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 mt-2">{stats?.sudahAbsen ?? 0}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Hari ini</span>
        </div>

        {/* Belum Absen */}
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs">
          <div className="flex items-center justify-between text-rose-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Belum Absen</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-black text-rose-600 mt-2">{stats?.belumAbsen ?? 0}</p>
          <span className="text-[10px] text-rose-500 font-medium">Menunggu</span>
        </div>

        {/* Tepat Waktu */}
        <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-xs">
          <div className="flex items-center justify-between text-teal-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tepat Waktu</span>
            <Clock className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-xl font-black text-teal-700 mt-2">{stats?.tepatWaktu ?? 0}</p>
          <span className="text-[10px] text-teal-600 font-medium">&le; Batas Jam</span>
        </div>

        {/* Terlambat */}
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Terlambat</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-600 mt-2">{stats?.terlambat ?? 0}</p>
          <span className="text-[10px] text-amber-500 font-medium">&gt; Batas Jam</span>
        </div>

        {/* Tidak Masuk / Izin */}
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs">
          <div className="flex items-center justify-between text-indigo-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Izin / Sakit</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl font-black text-indigo-700 mt-2">{stats?.tidakMasuk ?? 0}</p>
          <span className="text-[10px] text-indigo-500 font-medium">Kondisi Khusus</span>
        </div>

        {/* Di Dalam Pondok */}
        <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs">
          <div className="flex items-center justify-between text-sky-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Dalam Pondok</span>
            <MapPin className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-xl font-black text-sky-800 mt-2">{stats?.diDalamPondok ?? 0}</p>
          <span className="text-[10px] text-sky-600 font-medium">&le; Radius</span>
        </div>

        {/* Di Luar Pondok */}
        <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-xs">
          <div className="flex items-center justify-between text-orange-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Luar Pondok</span>
            <Compass className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-xl font-black text-orange-700 mt-2">{stats?.diLuarPondok ?? 0}</p>
          <span className="text-[10px] text-orange-500 font-medium">&gt; Radius</span>
        </div>
      </div>

      {/* PENGINGAT JADWAL MENGAJAR HARI INI (ADMIN OVERSIGHT) */}
      <div className="bg-white rounded-3xl border border-sky-100 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-800">
                  Pengingat Jadwal Mengajar Hari Ini
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold">
                  {todayDay || "Hari Ini"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring kesiapan guru pengampu dan status absensi mengajar di madrasah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate("jadwal")}
              className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Kelola Semua Jadwal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {todaySchedules.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-sky-50/40 border border-sky-100/60">
            <p className="text-xs font-semibold text-slate-600">
              Tidak ada jadwal pelajaran yang tercatat untuk hari <span className="font-bold text-sky-800">{todayDay}</span>.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Jadwal mengajar dapat ditambahkan melalui menu Jadwal Pelajaran.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-slate-600">Ringkasan Sesi Hari Ini:</span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-extrabold">
                Total: {todaySchedules.length} Kelas
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {todaySchedules.filter((s) => s.sudah_absen).length} Guru Sudah Absen
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-extrabold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {todaySchedules.filter((s) => !s.sudah_absen).length} Guru Belum Absen
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {todaySchedules.map((item) => {
                const isOngoing = item.timingStatus === "active";
                const isCompleted = item.timingStatus === "completed";

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.sudah_absen
                        ? "bg-white border-emerald-200 shadow-xs"
                        : "bg-amber-50/30 border-amber-200 shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono font-bold text-xs text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-600" />
                        {item.jam_mulai} - {item.jam_selesai}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isOngoing
                            ? "bg-emerald-600 text-white animate-pulse"
                            : isCompleted
                            ? "bg-slate-200 text-slate-600"
                            : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {isOngoing ? "Aktif" : isCompleted ? "Selesai" : "Akan Datang"}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm">{item.mata_pelajaran}</h4>
                    {item.kitab && (
                      <p className="text-xs text-sky-700 font-medium">Kitab: {item.kitab}</p>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-400">Guru:</span>
                        <span className="font-extrabold text-slate-800">{item.nama_guru}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-400">Kelas / Ruang:</span>
                        <span className="font-medium text-slate-700">
                          {item.kelas} • {item.ruangan || "R. Pondok"}
                        </span>
                      </div>
                    </div>

                    {/* Guru Attendance Reminder Status */}
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      {item.sudah_absen ? (
                        <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-lg">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Guru Hadir</span>
                          </span>
                          <span className="font-mono text-[10px]">
                            {item.attendance?.jam_masuk} ({item.attendance?.status})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded-lg">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Belum Absen Masuk</span>
                          </span>
                          <span className="text-[10px] text-amber-600 font-medium">
                            Perlu Konfirmasi
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Visual Chart Section: Weekly / Daily attendance trend */}
      <div className="bg-white rounded-3xl border border-sky-100 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-700" />
              <h3 className="font-bold text-base text-slate-800">
                Grafik Kehadiran Guru (7 Hari Terakhir)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Perbandingan kehadiran tepat waktu, keterlambatan, dan izin/sakit
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-teal-500" />
              <span className="text-slate-600">Tepat Waktu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-slate-600">Terlambat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-slate-600">Izin/Sakit</span>
            </div>
          </div>
        </div>

        {/* Responsive Bar Chart */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-56 pt-8 pb-4">
            {stats?.chartData?.map((item) => {
              const maxVal = Math.max(stats.totalGuru || 6, ...stats.chartData.map((d) => d.total));
              const tepatPct = maxVal > 0 ? (item.tepatWaktu / maxVal) * 100 : 0;
              const lambatPct = maxVal > 0 ? (item.terlambat / maxVal) * 100 : 0;
              const izinPct = maxVal > 0 ? (item.izin / maxVal) * 100 : 0;

              return (
                <div key={item.date} className="flex flex-col items-center h-full justify-end group">
                  {/* Tooltip bar on hover */}
                  <div className="w-full flex items-end justify-center gap-1 h-44 pb-2">
                    {/* Tepat Waktu Bar */}
                    <div
                      style={{ height: `${Math.max(4, tepatPct)}%` }}
                      className="w-1/3 bg-teal-500 rounded-t-md transition-all group-hover:brightness-110"
                      title={`Tepat Waktu: ${item.tepatWaktu}`}
                    />
                    {/* Terlambat Bar */}
                    <div
                      style={{ height: `${Math.max(4, lambatPct)}%` }}
                      className="w-1/3 bg-amber-500 rounded-t-md transition-all group-hover:brightness-110"
                      title={`Terlambat: ${item.terlambat}`}
                    />
                    {/* Izin/Sakit Bar */}
                    <div
                      style={{ height: `${Math.max(4, izinPct)}%` }}
                      className="w-1/3 bg-indigo-500 rounded-t-md transition-all group-hover:brightness-110"
                      title={`Izin/Sakit: ${item.izin}`}
                    />
                  </div>

                  <span className="text-[10px] font-bold text-slate-700 text-center truncate max-w-full">
                    {item.label.split(",")[0]}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {item.label.split(",")[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate("today")}
          className="p-5 bg-white rounded-3xl border border-sky-100 shadow-xs hover:border-sky-300 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-3 group-hover:bg-sky-600 group-hover:text-white transition-colors">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-800">Absensi Hari Ini</h4>
          <p className="text-xs text-slate-500 mt-1">
            Pantau status kehadiran seluruh ustadz/guru secara real-time
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-sky-700">
            <span>Buka Pantauan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("jadwal")}
          className="p-5 bg-white rounded-3xl border border-sky-100 shadow-xs hover:border-sky-300 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <BookOpen className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-800">Jadwal Pelajaran</h4>
          <p className="text-xs text-slate-500 mt-1">
            Atur dan pantau jadwal kitab, kelas santri & ustadz pengampu
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-amber-700">
            <span>Kelola Jadwal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("rekap")}
          className="p-5 bg-white rounded-3xl border border-sky-100 shadow-xs hover:border-sky-300 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-800">Rekap Data & Pencarian</h4>
          <p className="text-xs text-slate-500 mt-1">
            Filter tanggal, bulan, status kehadiran, dan lokasi GPS guru
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-700">
            <span>Lihat Rekap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("settings")}
          className="p-5 bg-white rounded-3xl border border-sky-100 shadow-xs hover:border-sky-300 text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-800">Pengaturan Waktu & GPS</h4>
          <p className="text-xs text-slate-500 mt-1">
            Atur jam masuk, batas keterlambatan, koordinat GPS & radius pondok
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-indigo-700">
            <span>Konfigurasi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
    </div>
  );
};
