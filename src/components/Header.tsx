import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import {
  Clock,
  Calendar,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Compass,
  Building2,
  BookOpen,
} from "lucide-react";
import { formatTeacherNameWithTitle } from "../utils/formatTeacher.ts";

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout, serverInfo } = useAuth();
  const [time, setTime] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [dayName, setDayName] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Indonesian WIB (UTC+7)
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const wib = new Date(utc + 7 * 3600000);

      const hours = String(wib.getHours()).padStart(2, "0");
      const minutes = String(wib.getMinutes()).padStart(2, "0");
      const seconds = String(wib.getSeconds()).padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds}`);

      const days = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const months = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ];

      setDayName(days[wib.getDay()]);
      setDateStr(`${wib.getDate()} ${months[wib.getMonth()]} ${wib.getFullYear()}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const schoolName = serverInfo?.settings?.nama_madrasah || "Madrasah Diniyah Miftahul Huda";
  const pondokName = serverInfo?.settings?.nama_pondok || "Pondok Pesantren Al Is'af";

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand & Mobile Menu */}
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-sky-50 focus:outline-hidden"
                aria-label="Toggle Menu"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center p-1 shadow-md shadow-sky-600/10 border border-sky-200 overflow-hidden shrink-0">
                {serverInfo?.settings?.logo_url ? (
                  <img
                    src={serverInfo.settings.logo_url}
                    alt={pondokName}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-lg bg-gradient-to-br from-sky-600 to-blue-800 flex items-center justify-center text-white">
                    <BookOpen className="w-6 h-6 text-sky-100" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-full">
                    {pondokName}
                  </span>
                </div>
                <h1 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight leading-tight line-clamp-1">
                  {schoolName}
                </h1>
              </div>
            </div>
          </div>

          {/* Center Clock (Desktop) */}
          <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 bg-sky-50/70 border border-sky-100 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>
                {dayName}, {dateStr}
              </span>
            </div>
            <div className="h-4 w-px bg-sky-200" />
            <div className="flex items-center gap-2 font-mono text-sm font-bold text-sky-900">
              <Clock className="w-4 h-4 text-sky-600 animate-pulse" />
              <span>{time || "00:00:00"} WIB</span>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {user.role === "Guru"
                      ? formatTeacherNameWithTitle(user.nama, user.username)
                      : user.nama || user.username}
                  </p>
                  <p className="text-[11px] font-medium text-sky-600">
                    {user.role === "Administrator" ? "Administrator" : user.mata_pelajaran || "Guru"}
                  </p>
                </div>

                <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center border border-sky-200 font-bold text-xs uppercase shadow-xs">
                  {user.nama ? user.nama.charAt(0) : user.username.charAt(0)}
                </div>

                <button
                  type="button"
                  onClick={logout}
                  title="Keluar dari Aplikasi"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
