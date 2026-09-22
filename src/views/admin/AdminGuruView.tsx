import React, { useState, useEffect } from "react";
import { api } from "../../services/api.ts";
import { Guru } from "../../types.ts";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  XCircle,
  Search,
  BookOpen,
  Phone,
  Shield,
  AlertTriangle,
} from "lucide-react";

export const AdminGuruView: React.FC = () => {
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Create Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [nip, setNip] = useState("");
  const [noHp, setNoHp] = useState("");
  const [mataPelajaran, setMataPelajaran] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGuru, setEditingGuru] = useState<Guru | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editNip, setEditNip] = useState("");
  const [editNoHp, setEditNoHp] = useState("");
  const [editMapel, setEditMapel] = useState("");
  const [editStatus, setEditStatus] = useState<"Aktif" | "Nonaktif">("Aktif");
  const [editUsername, setEditUsername] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Reset Password Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetGuru, setResetGuru] = useState<Guru | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingReset, setSavingReset] = useState(false);

  const [isManualUsername, setIsManualUsername] = useState(false);

  const cleanNameToUsername = (val: string) => {
    return val
      .replace(/^(ust\b|ust\.|usth\b|usth\.|ustadz\b|ustadzah\b|kyai\b|kh\b|kh\.|habib\b)\s*/i, "")
      .replace(/,.*$/, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
  };

  const fetchGuru = async () => {
    try {
      setLoading(true);
      const res = await api.getGuruList();
      setGuruList(res.data);
    } catch (err) {
      console.error("Error fetching guru list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuru();
  }, []);

  const handleOpenAdd = () => {
    setNama("");
    setNip("");
    setNoHp("");
    setMataPelajaran("");
    setUsername("");
    setPassword("guru123");
    setIsManualUsername(false);
    setAddError(null);
    setIsAddModalOpen(true);
  };

  const handleNamaChange = (val: string) => {
    setNama(val);
    if (!isManualUsername) {
      setUsername(cleanNameToUsername(val));
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdd(true);
    setAddError(null);

    const finalUsername = username.trim() || cleanNameToUsername(nama);

    try {
      await api.createGuru({
        nama,
        nip,
        no_hp: noHp,
        mata_pelajaran: mataPelajaran,
        username: finalUsername,
        password: password || "guru123",
      });
      setIsAddModalOpen(false);
      await fetchGuru();
    } catch (err: any) {
      setAddError(err.message || "Gagal menambahkan guru.");
    } finally {
      setSavingAdd(false);
    }
  };

  const handleOpenEdit = (guru: Guru) => {
    setEditingGuru(guru);
    setEditNama(guru.nama);
    setEditNip(guru.nip || "");
    setEditNoHp(guru.no_hp || "");
    setEditMapel(guru.mata_pelajaran || "");
    setEditStatus(guru.status);
    setEditUsername(guru.username || cleanNameToUsername(guru.nama));
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuru) return;

    setSavingEdit(true);
    try {
      await api.updateGuru(editingGuru.id, {
        nama: editNama,
        nip: editNip,
        no_hp: editNoHp,
        mata_pelajaran: editMapel,
        status: editStatus,
        username: editUsername,
      });
      setIsEditModalOpen(false);
      await fetchGuru();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui data guru.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenReset = (guru: Guru) => {
    setResetGuru(guru);
    setNewPassword("guru123");
    setIsResetModalOpen(true);
  };

  const handleSaveReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetGuru) return;

    setSavingReset(true);
    try {
      await api.resetPasswordGuru(resetGuru.id, newPassword);
      alert(`Password untuk ${resetGuru.nama} berhasil direset.`);
      setIsResetModalOpen(false);
    } catch (err: any) {
      alert(err.message || "Gagal mereset password.");
    } finally {
      setSavingReset(false);
    }
  };

  const handleDeleteGuru = async (id: number, namaGuru: string) => {
    if (confirm(`Yakin ingin menghapus guru ${namaGuru}? Seluruh data absensi terkait juga akan dihapus.`)) {
      try {
        await api.deleteGuru(id);
        await fetchGuru();
      } catch (err: any) {
        alert(err.message || "Gagal menghapus guru.");
      }
    }
  };

  const filtered = guruList.filter((g) => {
    return (
      g.nama.toLowerCase().includes(search.toLowerCase()) ||
      (g.nip && g.nip.includes(search)) ||
      (g.mata_pelajaran && g.mata_pelajaran.toLowerCase().includes(search.toLowerCase())) ||
      (g.username && g.username.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-800">Database Guru Madrasah</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data dewan guru, mata pelajaran pengampu, dan akun login absensi
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all w-fit"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Guru Baru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari guru berdasarkan nama, NIP, mata pelajaran, atau username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Guru Table */}
      <div className="bg-white rounded-3xl border border-sky-100 p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Memuat data guru...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Tidak ada guru yang ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50/70 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3 rounded-l-xl">ID Guru</th>
                  <th className="py-3 px-3">Nama Lengkap & NIP</th>
                  <th className="py-3 px-3">Mata Pelajaran</th>
                  <th className="py-3 px-3">Nomor HP</th>
                  <th className="py-3 px-3">Username Login</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 rounded-r-xl text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-sky-50/20">
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-400">
                      #{g.id}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800 text-sm">{g.nama}</div>
                      <div className="text-[11px] text-slate-400">NIP: {g.nip || "-"}</div>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-700">
                      {g.mata_pelajaran || "-"}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-600">
                      {g.no_hp || "-"}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-sky-800">
                      {g.username ? (
                        <span className="inline-block bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md border border-sky-100">
                          {g.username}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(g)}
                          className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md font-sans font-semibold transition-colors"
                        >
                          + Buat Akun
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          g.status === "Aktif"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {g.status === "Aktif" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{g.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(g)}
                          title="Edit Data Guru"
                          className="p-1.5 rounded-lg text-sky-700 hover:text-sky-900 hover:bg-sky-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReset(g)}
                          title="Reset Password Akun"
                          className="p-1.5 rounded-lg text-amber-700 hover:text-amber-900 hover:bg-amber-100 transition-colors"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGuru(g.id, g.nama)}
                          title="Hapus Guru"
                          className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Guru Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sky-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">Tambah Guru Baru</h3>
            <p className="text-xs text-slate-500 mb-4">
              Menambahkan data guru dan membuat akun login absensi otomatis
            </p>

            {addError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap (dengan Gelar) *
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => handleNamaChange(e.target.value)}
                  placeholder="Contoh: Ust. H. Ahmad Fauzi, S.Pd.I"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    NIP / ID Guru (Opsional)
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="19850412..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Nomor HP / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mata Pelajaran / Kitab Diniyah
                </label>
                <input
                  type="text"
                  value={mataPelajaran}
                  onChange={(e) => setMataPelajaran(e.target.value)}
                  placeholder="Contoh: Fiqih (Kitab Fathul Qorib)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 bg-sky-50/50 p-3 rounded-2xl border border-sky-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sky-800 uppercase text-[11px]">
                    Akun Login Absensi Guru
                  </span>
                  <span className="text-[10px] text-sky-600 font-medium">
                    (Dibuat otomatis dari nama)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700 uppercase">
                        Username *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualUsername(false);
                          setUsername(cleanNameToUsername(nama));
                        }}
                        className="text-[10px] text-sky-600 hover:underline font-medium"
                      >
                        Reset Otomatis
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        setIsManualUsername(true);
                        setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""));
                      }}
                      placeholder="contoh: fauzi"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-sky-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Password *
                    </label>
                    <input
                      type="text"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 5 karakter"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-600/25 disabled:opacity-50"
                >
                  {savingAdd ? "Menyimpan..." : "Simpan Guru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Guru Modal */}
      {isEditModalOpen && editingGuru && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sky-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">Edit Data Guru</h3>
            <p className="text-xs text-slate-500 mb-4">ID Guru: #{editingGuru.id}</p>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    NIP / ID
                  </label>
                  <input
                    type="text"
                    value={editNip}
                    onChange={(e) => setEditNip(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Nomor HP
                  </label>
                  <input
                    type="text"
                    value={editNoHp}
                    onChange={(e) => setEditNoHp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={editMapel}
                  onChange={(e) => setEditMapel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Status Akun Guru
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "Aktif" | "Nonaktif")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Username Akun
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-600/25 disabled:opacity-50"
                >
                  {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && resetGuru && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-sky-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">Reset Password Guru</h3>
            <p className="text-xs text-slate-500 mb-4">{resetGuru.nama}</p>

            <form onSubmit={handleSaveReset} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Password Baru
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password baru"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingReset}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/25 disabled:opacity-50"
                >
                  {savingReset ? "Mereset..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
