import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import {
  BookOpen,
  Lock,
  User as UserIcon,
  LogIn,
  CheckCircle,
  AlertCircle,
  Building,
  Sparkles,
} from "lucide-react";

export const LoginView: React.FC = () => {
  const { login, serverInfo } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "Gagal masuk ke sistem.");
    } finally {
      setLoading(false);
    }
  };

  const schoolName = serverInfo?.settings?.nama_madrasah || "Madrasah Diniyah Miftahul Huda";
  const pondokName = serverInfo?.settings?.nama_pondok || "Pondok Pesantren Al Is'af";
  const logoUrl = serverInfo?.settings?.logo_url;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-sky-100/60 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Decorative Islamic Arch Accents */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Logo & Emblem */}
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center p-2 shadow-xl shadow-sky-600/20 border-2 border-sky-200 transform transition hover:scale-105 duration-300 overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={pondokName}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-sky-600 via-sky-700 to-blue-900 flex items-center justify-center text-white">
                <BookOpen className="w-10 h-10 text-sky-100" />
              </div>
            )}
          </div>

          <span className="mt-4 inline-block text-xs font-bold tracking-widest text-sky-800 bg-sky-100/90 border border-sky-200/80 px-3 py-1 rounded-full uppercase">
            {pondokName}
          </span>

          <h2 className="mt-2 text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight">
            ABSENSI GURU
          </h2>
          <p className="text-sm font-semibold text-sky-700 uppercase tracking-wide">
            {schoolName}
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-sky-100 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Username
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4 text-sky-600" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-sky-600" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-sky-600/30 text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{loading ? "Memproses..." : "Masuk Sistem Absensi"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Sistem Absensi Guru Madrasah Diniyah &copy; {new Date().getFullYear()} {pondokName}
        </p>
      </div>
    </div>
  );
};
