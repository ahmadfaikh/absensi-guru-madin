import React, { useState, useEffect } from "react";
import { api } from "../../services/api.ts";
import {
  CalendarCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  RefreshCw,
  PlusCircle,
  FileText,
  Phone,
  Edit3,
} from "lucide-react";

export const AdminTodayView: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [dateStr, setDateStr] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Manual entry modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuru, setSelectedGuru] = useState<any>(null);
  const [manualStatus, setManualStatus] = useState("MASUK");
  const [manualJamMasuk, setManualJamMasuk] = useState("20:00");
  const [manualJamPulang, setManualJamPulang] = useState("21:30");
  const [manualLokasi, setManualLokasi] = useState("DI DALAM PONDOK");
  const [manualKeterangan, setManualKeterangan] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  const fetchTodayList = async () => {
    try {
      setLoading(true);
      const res = await api.getTodayAttendanceList();
      setList(res.list);
      setDateStr(res.date);
    } catch (err) {
      console.error("Error loading today attendance list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayList();
  }, []);

  const openManualModal = (guru: any) => {
    setSelectedGuru(guru);
    setManualStatus(guru.status !== "BELUM ABSEN" ? guru.status : "MASUK");
    setManualJamMasuk(guru.jam_masuk !== "-" ? guru.jam_masuk.substring(0, 5) : "20:00");
    setManualJamPulang(guru.jam_pulang !== "-" ? guru.jam_pulang.substring(0, 5) : "21:30");
    setManualLokasi(guru.lokasi_masuk !== "-" ? guru.lokasi_masuk : "DI DALAM PONDOK");
    setManualKeterangan(guru.keterangan !== "-" ? guru.keterangan : "");
    setIsModalOpen(true);
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuru) return;

    setSavingManual(true);
    try {
      await api.submitManualAbsensi({
        guru_id: selectedGuru.guru_id,
        tanggal: dateStr,
        jam_masuk: `${manualJamMasuk}:00`,
        jam_pulang: manualJamPulang ? `${manualJamPulang}:00` : "-",
        status: manualStatus,
        lokasi_masuk: manualLokasi,
        keterangan: manualKeterangan,
      });
      setIsModalOpen(false);
      await fetchTodayList();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan absensi manual.");
    } finally {
      setSavingManual(false);
    }
  };

  const filteredList = list.filter((item) => {
    const matchesSearch =
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.nip && item.nip.includes(searchTerm)) ||
      (item.mata_pelajaran && item.mata_pelajaran.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "SUDAH" && item.sudah_absen) ||
      (statusFilter === "BELUM" && !item.sudah_absen) ||
      item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-800">
              Absensi Guru Hari Ini ({dateStr})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau kehadiran, jam kedatangan, dan lokasi GPS secara real-time
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTodayList}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-xs border border-sky-200 transition-colors w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama guru, NIP, atau mata pelajaran..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:outline-hidden"
          >
            <option value="ALL">Semua Status Kehadiran</option>
            <option value="SUDAH">Sudah Absen</option>
            <option value="BELUM">Belum Absen</option>
            <option value="MASUK">Tepat Waktu (MASUK)</option>
            <option value="TERLAMBAT">Terlambat</option>
            <option value="IZIN">Izin</option>
            <option value="SAKIT">Sakit</option>
          </select>
        </div>
      </div>

      {/* Today Table */}
      <div className="bg-white rounded-3xl border border-sky-100 p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Memuat data absensi...</div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Tidak ada data guru yang cocok dengan pencarian/filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50/70 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3 rounded-l-xl">No</th>
                  <th className="py-3 px-3">Nama Guru</th>
                  <th className="py-3 px-3">Mata Pelajaran</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Jam Masuk</th>
                  <th className="py-3 px-3">Lokasi Masuk</th>
                  <th className="py-3 px-3">Jam Pulang</th>
                  <th className="py-3 px-3">Keterangan</th>
                  <th className="py-3 px-3 rounded-r-xl text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item, idx) => (
                  <tr key={item.guru_id} className="hover:bg-sky-50/20">
                    <td className="py-3.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800">{item.nama}</div>
                      <div className="text-[11px] text-slate-400">NIP: {item.nip || "-"}</div>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-700">
                      {item.mata_pelajaran || "-"}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          item.status === "MASUK"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : item.status === "TERLAMBAT"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : item.status === "BELUM ABSEN"
                            ? "bg-slate-100 text-slate-500 border border-slate-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-700">
                      {item.jam_masuk}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`text-[11px] font-semibold ${
                          item.lokasi_masuk === "DI DALAM PONDOK"
                            ? "text-emerald-700"
                            : item.lokasi_masuk === "DI LUAR PONDOK"
                            ? "text-amber-700"
                            : "text-slate-400"
                        }`}
                      >
                        {item.lokasi_masuk}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-700">
                      {item.jam_pulang}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 max-w-xs truncate">
                      {item.keterangan}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => openManualModal(item)}
                        className="p-1.5 rounded-lg text-sky-700 hover:text-sky-900 hover:bg-sky-100 transition-colors"
                        title="Input / Koreksi Absensi Manual"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Absensi Modal */}
      {isModalOpen && selectedGuru && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sky-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Input / Koreksi Absensi Guru
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {selectedGuru.nama} ({selectedGuru.mata_pelajaran}) • {dateStr}
            </p>

            <form onSubmit={handleSaveManual} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Status Kehadiran
                </label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                >
                  <option value="MASUK">MASUK (Tepat Waktu)</option>
                  <option value="TERLAMBAT">TERLAMBAT</option>
                  <option value="IZIN">IZIN</option>
                  <option value="SAKIT">SAKIT</option>
                  <option value="DINAS">DINAS</option>
                  <option value="TUGAS PONDOK">TUGAS PONDOK</option>
                  <option value="TIDAK MASUK">TIDAK MASUK</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Jam Masuk
                  </label>
                  <input
                    type="time"
                    value={manualJamMasuk}
                    onChange={(e) => setManualJamMasuk(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Jam Pulang
                  </label>
                  <input
                    type="time"
                    value={manualJamPulang}
                    onChange={(e) => setManualJamPulang(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Keterangan Lokasi
                </label>
                <select
                  value={manualLokasi}
                  onChange={(e) => setManualLokasi(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                >
                  <option value="DI DALAM PONDOK">DI DALAM PONDOK</option>
                  <option value="DI LUAR PONDOK">DI LUAR PONDOK</option>
                  <option value="IZIN / TIDAK DITEMPAT">IZIN / TIDAK DITEMPAT</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Catatan / Alasan
                </label>
                <textarea
                  rows={2}
                  value={manualKeterangan}
                  onChange={(e) => setManualKeterangan(e.target.value)}
                  placeholder="Keterangan dinas luar / izin / penyesuaian oleh admin..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-600/25 disabled:opacity-50"
                >
                  {savingManual ? "Menyimpan..." : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
