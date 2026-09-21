import React, { useState, useEffect } from "react";
import { api } from "../../services/api.ts";
import { JadwalPelajaran, Guru } from "../../types.ts";
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  BookOpen,
  Clock,
  MapPin,
  Users,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export const AdminJadwalView: React.FC = () => {
  const [schedules, setSchedules] = useState<JadwalPelajaran[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDay, setSelectedDay] = useState<string>("Semua");
  const [selectedGuru, setSelectedGuru] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalPelajaran | null>(null);
  const [formData, setFormData] = useState({
    guru_id: "",
    mata_pelajaran: "",
    kitab: "",
    kelas: "",
    hari: "Sabtu",
    jam_mulai: "20:00",
    jam_selesai: "21:30",
    ruangan: "",
    keterangan: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const daysList = ["Semua", "Sabtu", "Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
  const formDays = ["Sabtu", "Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resJadwal, resGuru] = await Promise.all([
        api.getJadwal({
          hari: selectedDay !== "Semua" ? selectedDay : undefined,
          guru_id: selectedGuru || undefined,
          search: searchQuery || undefined,
        }),
        api.getGuruList(),
      ]);
      setSchedules(resJadwal.data);
      setGuruList(resGuru.data);
    } catch (err) {
      console.error("Error fetching jadwal:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDay, selectedGuru]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      guru_id: guruList[0]?.id ? String(guruList[0].id) : "",
      mata_pelajaran: "",
      kitab: "",
      kelas: "Kelas Ula A",
      hari: "Sabtu",
      jam_mulai: "20:00",
      jam_selesai: "21:30",
      ruangan: "Gedung A - R. 01",
      keterangan: "",
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: JadwalPelajaran) => {
    setEditingItem(item);
    setFormData({
      guru_id: String(item.guru_id),
      mata_pelajaran: item.mata_pelajaran,
      kitab: item.kitab || "",
      kelas: item.kelas,
      hari: item.hari,
      jam_mulai: item.jam_mulai,
      jam_selesai: item.jam_selesai,
      ruangan: item.ruangan || "",
      keterangan: item.keterangan || "",
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, mapel: string) => {
    if (!window.confirm(`Yakin ingin menghapus jadwal pelajaran "${mapel}"?`)) return;
    try {
      await api.deleteJadwal(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus jadwal");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guru_id || !formData.mata_pelajaran || !formData.kelas || !formData.hari) {
      setFeedback({ type: "error", text: "Mohon lengkapi guru, mata pelajaran, kelas, dan hari." });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const payload = {
        guru_id: Number(formData.guru_id),
        mata_pelajaran: formData.mata_pelajaran,
        kitab: formData.kitab,
        kelas: formData.kelas,
        hari: formData.hari,
        jam_mulai: formData.jam_mulai,
        jam_selesai: formData.jam_selesai,
        ruangan: formData.ruangan,
        keterangan: formData.keterangan,
      };

      if (editingItem) {
        await api.updateJadwal(editingItem.id, payload);
      } else {
        await api.createJadwal(payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Gagal menyimpan jadwal." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-700">
            <CalendarDays className="w-5 h-5" />
            <h2 className="text-lg font-bold text-slate-800">
              Kelola Jadwal Pelajaran Madrasah Diniyah
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur mata pelajaran, kitab rujukan, guru pengampu, kelas, dan jam pelajaran pondok
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jadwal Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Day Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-600 mr-1 text-[11px] uppercase">Hari:</span>
            {daysList.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDay === day
                    ? "bg-sky-600 text-white shadow-xs"
                    : "bg-slate-50 hover:bg-sky-50 text-slate-600"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Teacher Selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 text-[11px] uppercase">Guru:</span>
            <select
              value={selectedGuru}
              onChange={(e) => setSelectedGuru(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-sky-600 font-medium"
            >
              <option value="">Semua Guru</option>
              {guruList.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Keyword Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            placeholder="Cari mata pelajaran, kitab, nama ustadz, atau ruangan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-sky-600"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 bg-sky-600 text-white rounded-lg text-xs font-bold hover:bg-sky-700"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Schedules Table */}
      <div className="bg-white rounded-3xl border border-sky-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-semibold">Memuat data jadwal...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">Belum Ada Jadwal Pelajaran</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Tidak ditemukan jadwal untuk kriteria pencarian ini. Tambahkan jadwal baru untuk memulai.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50/70 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Hari & Jam</th>
                  <th className="py-3 px-4">Mata Pelajaran & Kitab</th>
                  <th className="py-3 px-4">Guru Pengampu</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Ruangan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((item) => (
                  <tr key={item.id} className="hover:bg-sky-50/20 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-extrabold text-sky-900 bg-sky-100/70 px-2.5 py-0.5 rounded-lg inline-block text-[11px]">
                        {item.hari}
                      </div>
                      <div className="font-mono text-slate-600 text-[11px] mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.jam_mulai} - {item.jam_selesai}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800 text-sm">{item.mata_pelajaran}</div>
                      {item.kitab && (
                        <div className="text-[11px] text-sky-700 font-medium flex items-center gap-1 mt-0.5">
                          <BookOpen className="w-3 h-3 text-sky-600" />
                          Kitab: {item.kitab}
                        </div>
                      )}
                      {item.keterangan && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                          {item.keterangan}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{item.nama_guru}</div>
                      <div className="text-[10px] text-slate-400">NIP: {item.nip_guru || "-"}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {item.kelas}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-600 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-sky-600" />
                        <span>{item.ruangan || "Ruang Kelas Pondok"}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                          title="Edit Jadwal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.mata_pelajaran)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                          title="Hapus Jadwal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sky-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-600" />
                <span>{editingItem ? "Edit Jadwal Pelajaran" : "Tambah Jadwal Pelajaran Baru"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Guru Pengampu */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Guru Pengampu <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.guru_id}
                  onChange={(e) => setFormData({ ...formData, guru_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-sky-600 text-slate-800 font-medium"
                  required
                >
                  <option value="">-- Pilih Ustadz / Guru Pengampu --</option>
                  {guruList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nama} ({g.mata_pelajaran || "Guru Diniyah"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mata Pelajaran & Kitab */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Fiqih, Nahwu"
                    value={formData.mata_pelajaran}
                    onChange={(e) => setFormData({ ...formData, mata_pelajaran: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-sky-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Kitab Rujukan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Fathul Qorib, Jurumiyah"
                    value={formData.kitab}
                    onChange={(e) => setFormData({ ...formData, kitab: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-sky-600"
                  />
                </div>
              </div>

              {/* Kelas & Hari */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kelas Santri <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kelas Ula A, Wustho"
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-sky-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Hari Mengajar <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.hari}
                    onChange={(e) => setFormData({ ...formData, hari: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-sky-600 font-semibold"
                    required
                  >
                    {formDays.map((d) => (
                      <option key={d} value={d}>
                        Hari {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Jam Pelajaran */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jam Mulai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.jam_mulai}
                    onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-sky-600 font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jam Selesai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.jam_selesai}
                    onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-sky-600 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Ruangan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ruangan / Lokasi Belajar
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Gedung A - R. 01, Musholla Utama"
                  value={formData.ruangan}
                  onChange={(e) => setFormData({ ...formData, ruangan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-sky-600"
                />
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Keterangan Tambahan / Topik
                </label>
                <textarea
                  placeholder="Catatan bab, kelompok santri, atau arahan khusus..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-sky-600"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-600/20 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Tambahkan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
