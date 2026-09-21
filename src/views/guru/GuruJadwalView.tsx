import React, { useState, useEffect } from "react";
import { api } from "../../services/api.ts";
import { JadwalPelajaran } from "../../types.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import {
  CalendarDays,
  BookOpen,
  Clock,
  MapPin,
  Sparkles,
  Info,
  CheckCircle2,
  Calendar,
  Layers,
  Filter,
} from "lucide-react";

export const GuruJadwalView: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<JadwalPelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>("Semua");

  const daysList = ["Semua", "Sabtu", "Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.getJadwal({
        guru_id: user?.guru_id || undefined,
        hari: selectedDay !== "Semua" ? selectedDay : undefined,
      });
      setSchedules(res.data);
    } catch (err) {
      console.error("Error fetching schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [selectedDay, user]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-800 via-sky-700 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-sky-900/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-sky-200 border border-white/15 mb-3">
            <BookOpen className="w-3.5 h-3.5 text-amber-300" />
            <span>Jadwal Pelajaran Madrasah Diniyah</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Jadwal Mengajar Saya
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 mt-1">
            Pengingat jadwal taklim, kitab rujukan, dan kelas santri yang diampu
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-xs text-sky-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-sky-950 flex items-center justify-center font-black text-base shadow-sm">
            {schedules.length}
          </div>
          <div>
            <div className="font-bold text-white">Total Sesi Mengajar</div>
            <div className="text-[11px] text-sky-200">Terdaftar di Sistem</div>
          </div>
        </div>
      </div>

      {/* Filter by Day */}
      <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-sky-700" />
          <span className="text-xs font-bold text-slate-700">Filter Hari:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {daysList.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedDay === day
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                  : "bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-800"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Content */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-sky-100">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-semibold">Memuat jadwal mengajar...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-sky-100">
          <CalendarDays className="w-12 h-12 text-sky-200 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">Tidak Ada Jadwal Mengajar</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {selectedDay !== "Semua"
              ? `Belum ada jadwal mengajar pada hari ${selectedDay}. Pilih hari lain atau hubungi pengurus madrasah.`
              : "Belum ada jadwal mengajar yang diatur untuk akun Anda. Hubungi administrator madrasah."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-sky-100 shadow-xs hover:shadow-md hover:border-sky-300 transition-all p-5 flex flex-col justify-between"
            >
              <div>
                {/* Day Badge and Time */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-3 py-1 rounded-xl bg-sky-50 text-sky-800 font-extrabold text-xs flex items-center gap-1.5 border border-sky-100">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>Hari {item.hari}</span>
                  </span>

                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-mono font-bold text-xs flex items-center gap-1 border border-amber-100">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {item.jam_mulai} - {item.jam_selesai}
                    </span>
                  </span>
                </div>

                {/* Subject & Kitab */}
                <h3 className="text-base font-extrabold text-slate-800 leading-snug">
                  {item.mata_pelajaran}
                </h3>

                {item.kitab && (
                  <div className="flex items-center gap-1.5 text-xs text-sky-700 font-semibold mt-1">
                    <BookOpen className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>Kitab: {item.kitab}</span>
                  </div>
                )}

                {/* Class and Room */}
                <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Kelas Santri:</span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                      {item.kelas}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400">Ruangan / Tempat:</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-600" />
                      {item.ruangan || "Ruang Kelas Pondok"}
                    </span>
                  </div>
                </div>

                {/* Note/Keterangan */}
                {item.keterangan && (
                  <div className="mt-3 bg-sky-50/50 p-2.5 rounded-xl border border-sky-100 text-[11px] text-slate-600 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                    <span>{item.keterangan}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Pengingat Diniyah</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Jadwal Resmi
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
