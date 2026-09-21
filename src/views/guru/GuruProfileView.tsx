import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import { api } from "../../services/api.ts";
import {
  UserCheck,
  Lock,
  Phone,
  BookOpen,
  Building,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatTeacherNameWithTitle } from "../../utils/formatTeacher.ts";

export const GuruProfileView: React.FC = () => {
  const { user, serverInfo } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const pondokName = serverInfo?.settings?.nama_pondok || "Pondok Pesantren Al Is'af";
  const madrasahName = serverInfo?.settings?.nama_madrasah || "Madrasah Diniyah Miftahul Huda";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", text: "Konfirmasi password baru tidak cocok." });
      return;
    }

    if (newPassword.length < 5) {
      setStatus({ type: "error", text: "Password baru minimal 5 karakter." });
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setStatus({ type: "success", text: "Password akun Anda berhasil diperbarui." });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setStatus({ type: "error", text: err.message || "Gagal mengubah password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-extrabold text-2xl border-2 border-sky-300">
            {user?.nama ? user.nama.charAt(0) : "G"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {formatTeacherNameWithTitle(user?.nama, user?.username)}
            </h2>
            <p className="text-xs font-semibold text-sky-700">{user?.mata_pelajaran || "Guru Diniyah"}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {madrasahName} • {pondokName}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-semibold uppercase text-[10px]">NIP / ID Guru</span>
            <span className="font-bold text-slate-800 text-sm mt-0.5 block">{user?.nip || "-"}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-semibold uppercase text-[10px]">Nomor HP / WhatsApp</span>
            <span className="font-bold text-slate-800 text-sm mt-0.5 block">{user?.no_hp || "-"}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-semibold uppercase text-[10px]">Mata Pelajaran / Kitab</span>
            <span className="font-bold text-slate-800 text-sm mt-0.5 block">{user?.mata_pelajaran || "-"}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block font-semibold uppercase text-[10px]">Username Login</span>
            <span className="font-bold text-sky-800 text-sm mt-0.5 font-mono block">{user?.username}</span>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <KeyRound className="w-5 h-5 text-sky-700" />
          <h3 className="font-bold text-base text-slate-800">Ubah Password Akun</h3>
        </div>

        {status && (
          <div
            className={`p-3.5 mb-4 rounded-xl flex items-center gap-2 text-xs ${
              status.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{status.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password Saat Ini
            </label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password Baru
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ulangi Password Baru
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/25 transition-all disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
