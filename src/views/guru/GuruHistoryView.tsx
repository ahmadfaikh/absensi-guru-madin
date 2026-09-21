import React, { useState, useEffect } from "react";
import { api } from "../../services/api.ts";
import { AbsensiRecord } from "../../types.ts";
import {
  History,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  Search,
} from "lucide-react";

export const GuruHistoryView: React.FC = () => {
  const [records, setRecords] = useState<AbsensiRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));

  const months = [
    { value: "1", label: "Januari" },
    { value: "2", label: "Februari" },
    { value: "3", label: "Maret" },
    { value: "4", label: "April" },
    { value: "5", label: "Mei" },
    { value: "6", label: "Juni" },
    { value: "7", label: "Juli" },
    { value: "8", label: "Agustus" },
    { value: "9", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.getMyHistory(month, year);
      setRecords(res.records);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [month, year]);

  // Aggregate stats
  const totalDays = records.length;
  const tepatWaktu = records.filter((r) => r.status === "MASUK").length;
  const terlambat = records.filter((r) => r.status === "TERLAMBAT").length;
  const insidePondok = records.filter((r) => r.lokasi_masuk === "DI DALAM PONDOK").length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header & Filter Card */}
      <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-800">Riwayat Kehadiran Guru</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar absensi masuk dan pulang yang tersimpan di sistem
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-hidden"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mini Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-sky-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Kehadiran</span>
          <p className="text-xl font-extrabold text-slate-800 mt-1">{totalDays} Hari</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">Tepat Waktu</span>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{tepatWaktu} Hari</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-100">
          <span className="text-[11px] font-bold text-amber-600 uppercase">Terlambat</span>
          <p className="text-xl font-extrabold text-amber-700 mt-1">{terlambat} Hari</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-teal-100">
          <span className="text-[11px] font-bold text-teal-600 uppercase">Di Dalam Pondok</span>
          <p className="text-xl font-extrabold text-teal-700 mt-1">{insidePondok} Kali</p>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-3xl border border-sky-100 p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Memuat riwayat absensi...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Tidak ada catatan absensi pada periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50/70 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3.5 rounded-l-xl">No</th>
                  <th className="py-3 px-3.5">Hari / Tanggal</th>
                  <th className="py-3 px-3.5">Jam Masuk</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Lokasi Masuk</th>
                  <th className="py-3 px-3.5">Jam Pulang</th>
                  <th className="py-3 px-3.5">Lokasi Pulang</th>
                  <th className="py-3 px-3.5 rounded-r-xl">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-sky-50/20">
                    <td className="py-3.5 px-3.5 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3.5 px-3.5 font-semibold text-slate-800">
                      <div>{r.hari}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{r.tanggal}</div>
                    </td>
                    <td className="py-3.5 px-3.5 font-mono font-medium text-slate-700">
                      {r.jam_masuk || "-"}
                    </td>
                    <td className="py-3.5 px-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          r.status === "MASUK"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "TERLAMBAT"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5">
                      <span
                        className={`text-[11px] font-semibold ${
                          r.lokasi_masuk === "DI DALAM PONDOK"
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`}
                      >
                        {r.lokasi_masuk || "-"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 font-mono font-medium text-slate-700">
                      {r.jam_pulang || "-"}
                    </td>
                    <td className="py-3.5 px-3.5 text-[11px] text-slate-600">
                      {r.lokasi_pulang || "-"}
                    </td>
                    <td className="py-3.5 px-3.5 text-slate-500 max-w-xs truncate">
                      {r.keterangan || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
