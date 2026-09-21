import React, { useState, useEffect } from "react";
import { api } from "../../services/api.ts";
import { MonthlySummaryItem, Guru } from "../../types.ts";
import {
  CalendarDays,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  FileSpreadsheet,
  Download,
  Printer,
} from "lucide-react";

interface AdminMonthlyViewProps {
  onNavigateToReport?: (bulan: string, tahun: string) => void;
}

export const AdminMonthlyView: React.FC<AdminMonthlyViewProps> = ({ onNavigateToReport }) => {
  const [data, setData] = useState<MonthlySummaryItem[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [bulan, setBulan] = useState<string>(String(new Date().getMonth() + 1));
  const [tahun, setTahun] = useState<string>(String(new Date().getFullYear()));
  const [guruId, setGuruId] = useState<string>("");

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

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.getMonthlyRekap(bulan, tahun, guruId || undefined);
      setData(res.data);
    } catch (err) {
      console.error("Error loading monthly summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const gRes = await api.getGuruList();
        setGuruList(gRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [bulan, tahun, guruId]);

  // Aggregate totals
  const totalKehadiranAll = data.reduce((acc, curr) => acc + curr.jumlah_hadir, 0);
  const totalTepatWaktuAll = data.reduce((acc, curr) => acc + curr.tepat_waktu, 0);
  const totalTerlambatAll = data.reduce((acc, curr) => acc + curr.terlambat, 0);
  const totalIzinAll = data.reduce((acc, curr) => acc + curr.tidak_masuk, 0);
  const totalDalamPondokAll = data.reduce((acc, curr) => acc + curr.di_dalam_pondok, 0);
  const totalLuarPondokAll = data.reduce((acc, curr) => acc + curr.di_luar_pondok, 0);

  const selectedMonthName = months.find((m) => m.value === bulan)?.label || "Bulan";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-800">
              Rekap Absensi Bulanan Guru ({selectedMonthName} {tahun})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Ringkasan kehadiran kumulatif, keterlambatan, dan verifikasi GPS per guru
          </p>
        </div>

        {onNavigateToReport && (
          <button
            type="button"
            onClick={() => onNavigateToReport(bulan, tahun)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all w-fit"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Export Rekap Ini</span>
          </button>
        )}
      </div>

      {/* Filter Selector */}
      <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <label className="font-bold text-slate-700 uppercase text-[10px]">Pilih Bulan:</label>
          <select
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:bg-white"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-bold text-slate-700 uppercase text-[10px]">Pilih Tahun:</label>
          <select
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:bg-white"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-bold text-slate-700 uppercase text-[10px]">Pilih Guru:</label>
          <select
            value={guruId}
            onChange={(e) => setGuruId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:bg-white"
          >
            <option value="">Semua Guru</option>
            {guruList.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stat Cards as required in Requirement 10 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Kehadiran</span>
          <p className="text-xl font-black text-slate-800 mt-1">{totalKehadiranAll} Kali</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase">Tepat Waktu</span>
          <p className="text-xl font-black text-emerald-700 mt-1">{totalTepatWaktuAll} Hari</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase">Jumlah Terlambat</span>
          <p className="text-xl font-black text-amber-700 mt-1">{totalTerlambatAll} Kali</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs">
          <span className="text-[10px] font-bold text-indigo-600 uppercase">Tidak Masuk / Izin</span>
          <p className="text-xl font-black text-indigo-700 mt-1">{totalIzinAll} Hari</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-xs">
          <span className="text-[10px] font-bold text-teal-600 uppercase">Di Dalam Pondok</span>
          <p className="text-xl font-black text-teal-700 mt-1">{totalDalamPondokAll} Kali</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-xs">
          <span className="text-[10px] font-bold text-orange-600 uppercase">Di Luar Pondok</span>
          <p className="text-xl font-black text-orange-700 mt-1">{totalLuarPondokAll} Kali</p>
        </div>
      </div>

      {/* Monthly Summary Table */}
      <div className="bg-white rounded-3xl border border-sky-100 p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Menghitung rekap bulanan...</div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Tidak ada catatan absensi untuk periode yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50/70 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3 rounded-l-xl">No</th>
                  <th className="py-3 px-3">Nama Guru</th>
                  <th className="py-3 px-3">Mata Pelajaran</th>
                  <th className="py-3 px-3 text-center">Tepat Waktu</th>
                  <th className="py-3 px-3 text-center">Terlambat</th>
                  <th className="py-3 px-3 text-center">Izin / Sakit</th>
                  <th className="py-3 px-3 text-center">Di Dalam Pondok</th>
                  <th className="py-3 px-3 text-center">Di Luar Pondok</th>
                  <th className="py-3 px-3 text-center rounded-r-xl font-black text-sky-900">
                    Total Kehadiran
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item, idx) => (
                  <tr key={item.guru_id} className="hover:bg-sky-50/20">
                    <td className="py-3.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800">{item.nama}</div>
                      <div className="text-[11px] text-slate-400">NIP: {item.nip || "-"}</div>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-700">
                      {item.mata_pelajaran || "-"}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-emerald-700">
                      {item.tepat_waktu}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-amber-700">
                      {item.terlambat}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-indigo-700">
                      {item.tidak_masuk}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-teal-700">
                      {item.di_dalam_pondok}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-orange-700">
                      {item.di_luar_pondok}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-block px-3 py-1 rounded-xl bg-sky-100 text-sky-900 font-extrabold text-xs">
                        {item.jumlah_hadir} Hari
                      </span>
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
