import React, { useState, useEffect } from "react";
import { api } from "../../services/api.ts";
import { AbsensiRecord } from "../../types.ts";
import {
  ClipboardList,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Trash2,
  MapPin,
  RefreshCw,
  FileSpreadsheet,
  Cloud,
} from "lucide-react";

export const AdminRekapView: React.FC = () => {
  const [data, setData] = useState<AbsensiRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingGas, setSyncingGas] = useState<boolean>(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [bulan, setBulan] = useState("");
  const [tahun, setTahun] = useState("");
  const [status, setStatus] = useState("ALL");
  const [lokasi, setLokasi] = useState("ALL");
  const [sort, setSort] = useState<"asc" | "desc">("desc");

  const months = [
    { value: "", label: "Semua Bulan" },
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

  const fetchRekap = async (pageToFetch = pagination.page) => {
    try {
      setLoading(true);
      const res = await api.getRekap({
        search,
        tanggal: tanggal || undefined,
        bulan: bulan || undefined,
        tahun: tahun || undefined,
        status,
        lokasi,
        page: pageToFetch,
        limit: pagination.limit,
        sort,
      });
      setData(res.data);
      setPagination(res.pagination);
    } catch (err) {
      console.error("Error fetching rekap:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRekap(1);
  }, [tanggal, bulan, tahun, status, lokasi, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRekap(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setTanggal("");
    setBulan("");
    setTahun("");
    setStatus("ALL");
    setLokasi("ALL");
    setSort("desc");
  };

  const handleDelete = async (id: number) => {
    if (confirm("Hapus baris absensi ini?")) {
      try {
        await api.deleteAbsensi(id);
        fetchRekap();
      } catch (err: any) {
        alert(err.message || "Gagal menghapus baris absensi.");
      }
    }
  };

  const handleSyncToGas = async () => {
    setSyncingGas(true);
    try {
      const res = await api.syncToGoogleSheets({
        tanggal: tanggal || undefined,
        bulan: bulan || undefined,
        tahun: tahun || undefined,
        status: status !== "ALL" ? status : undefined,
      });
      if (res.success) {
        alert(res.message || "Data absensi berhasil disinkronkan ke Google Spreadsheet.");
        fetchRekap();
      } else {
        alert(res.message || "Gagal sinkronisasi ke spreadsheet.");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat menyinkronkan data.");
    } finally {
      setSyncingGas(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-800">Rekap Data Absensi Guru</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap kehadiran guru dengan filter komprehensif, pencarian, dan pagination
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncToGas}
            disabled={syncingGas}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            title="Kirim catatan absensi sesuai filter ke Google Spreadsheet"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${syncingGas ? "animate-spin" : ""}`} />
            <span>{syncingGas ? "Menyinkronkan..." : "Sinkron ke Spreadsheet"}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchRekap()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-xs border border-sky-200 transition-colors w-fit cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama guru, NIP, atau mata pelajaran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20"
          >
            Cari
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Tanggal */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Tanggal Spesifik
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Bulan */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Bulan
            </label>
            <select
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tahun */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Tahun
            </label>
            <select
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
            >
              <option value="">Semua Tahun</option>
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Status Absensi
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
            >
              <option value="ALL">Semua Status</option>
              <option value="MASUK">MASUK (Tepat Waktu)</option>
              <option value="TERLAMBAT">TERLAMBAT</option>
              <option value="IZIN">IZIN</option>
              <option value="SAKIT">SAKIT</option>
              <option value="DINAS">DINAS</option>
            </select>
          </div>

          {/* Lokasi */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Lokasi GPS
            </label>
            <select
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
            >
              <option value="ALL">Semua Lokasi</option>
              <option value="DI DALAM PONDOK">DI DALAM PONDOK</option>
              <option value="DI LUAR PONDOK">DI LUAR PONDOK</option>
            </select>
          </div>

          {/* Sort & Reset */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Urutan Tanggal
            </label>
            <div className="flex gap-1">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "asc" | "desc")}
                className="w-full px-2 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
              >
                <option value="desc">Terbaru</option>
                <option value="asc">Terlama</option>
              </select>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
                title="Reset Semua Filter"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table as specified in Requirement 9 */}
      <div className="bg-white rounded-3xl border border-sky-100 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-700">
            Menampilkan {data.length} dari {pagination.total} catatan absensi
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Halaman {pagination.page} dari {pagination.totalPages}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Memuat data rekap...</div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Tidak ada transaksi absensi yang sesuai filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50/70 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3 rounded-l-xl">No</th>
                  <th className="py-3 px-3">Nama Guru</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Hari</th>
                  <th className="py-3 px-3">Jam Masuk</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Lokasi (GPS)</th>
                  <th className="py-3 px-3">Keterangan Lokasi</th>
                  <th className="py-3 px-3">Jam Pulang</th>
                  <th className="py-3 px-3">Keterangan</th>
                  <th className="py-3 px-3 text-center">Google Sheets</th>
                  <th className="py-3 px-3 rounded-r-xl text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-sky-50/20">
                    <td className="py-3.5 px-3 text-slate-400 font-mono">
                      {(pagination.page - 1) * pagination.limit + idx + 1}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800">{r.nama_guru}</div>
                      <div className="text-[11px] text-slate-400">{r.mata_pelajaran || "-"}</div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-700">{r.tanggal}</td>
                    <td className="py-3.5 px-3 font-semibold text-slate-800">{r.hari}</td>
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-700">
                      {r.jam_masuk || "-"}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          r.status === "MASUK"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : r.status === "TERLAMBAT"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                      {r.latitude_masuk && r.longitude_masuk
                        ? `${r.latitude_masuk.toFixed(4)}, ${r.longitude_masuk.toFixed(4)}`
                        : "-"}
                    </td>
                    <td className="py-3.5 px-3">
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
                    <td className="py-3.5 px-3 font-mono text-slate-700">{r.jam_pulang || "-"}</td>
                    <td className="py-3.5 px-3 text-slate-500 max-w-xs truncate">
                      {r.keterangan || "-"}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.sync_status === "synced"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : r.sync_status === "failed"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                        title={
                          r.sync_status === "synced"
                            ? `Tersinkron di Google Sheets (${r.synced_at || ""})`
                            : "Belum tersinkron ke Google Sheets"
                        }
                      >
                        <Cloud className="w-3 h-3" />
                        <span>{r.sync_status === "synced" ? "Tersinkron" : "Belum"}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        title="Hapus baris absensi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => fetchRekap(pagination.page - 1)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <span className="font-semibold text-slate-700">
              Halaman {pagination.page} dari {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchRekap(pagination.page + 1)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
