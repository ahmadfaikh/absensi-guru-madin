import React from "react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Settings,
  ShieldCheck,
  LogOut,
  LogIn,
  Clock,
  History,
  UserCheck,
  Building,
  BookOpen,
  Database,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.tsx";
import { formatTeacherNameWithTitle } from "../utils/formatTeacher.ts";

interface SidebarProps {
  currentView: string;
  onSelectView?: (view: string) => void;
  onNavigate?: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const { user, logout, serverInfo } = useAuth();
  const isAdmin = user?.role === "Administrator";
  const handleNavigation = onNavigate || onSelectView || (() => {});
  const logoUrl = serverInfo?.settings?.logo_url;
  const pondokName = serverInfo?.settings?.nama_pondok || "PP Al Is'af";

  const adminNavItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "guru", label: "Data Guru", icon: Users },
    { id: "jadwal", label: "Jadwal Pelajaran", icon: BookOpen },
    { id: "today", label: "Absensi Hari Ini", icon: CalendarCheck },
    { id: "rekap", label: "Rekap Absensi", icon: ClipboardList },
    { id: "monthly", label: "Rekap Bulanan", icon: FileSpreadsheet },
    { id: "report", label: "Laporan & Cetak", icon: FileText },
    { id: "backup", label: "Cadangan & Backup", icon: Database },
    { id: "settings", label: "Pengaturan", icon: Settings },
    { id: "users", label: "Manajemen Akun", icon: ShieldCheck },
  ];

  const guruNavItems = [
    { id: "guru_dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "guru_jadwal", label: "Jadwal Mengajar", icon: BookOpen },
    { id: "guru_masuk", label: "Absen Masuk", icon: LogIn },
    { id: "guru_pulang", label: "Absen Pulang", icon: Clock },
    { id: "guru_history", label: "Riwayat Absensi", icon: History },
    { id: "guru_profile", label: "Profil Guru", icon: UserCheck },
  ];

  const navItems = isAdmin ? adminNavItems : guruNavItems;

  const handleItemClick = (id: string) => {
    handleNavigation(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 md:top-18 left-0 z-40 h-full md:h-[calc(100vh-4.5rem)] w-64 bg-white border-r border-sky-100 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Mobile Header in Drawer */}
        <div className="md:hidden p-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/50">
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <div className="w-7 h-7 rounded-lg bg-white p-0.5 border border-sky-200 flex items-center justify-center overflow-hidden">
                <img
                  src={logoUrl}
                  alt={pondokName}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <Building className="w-5 h-5 text-sky-700" />
            )}
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider line-clamp-1">
              {pondokName}
            </span>
          </div>
          <span className="text-[10px] font-semibold bg-sky-200/60 text-sky-800 px-2 py-0.5 rounded-full shrink-0">
            {isAdmin ? "Admin" : "Guru"}
          </span>
        </div>

        {/* Navigation list */}
        <div className="p-4 space-y-1.5 overflow-y-auto flex-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Menu Utama ({isAdmin ? "Admin" : "Guru"})
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                    : "text-slate-600 hover:text-sky-800 hover:bg-sky-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-sky-600"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Card & Logout in Footer */}
        <div className="p-4 border-t border-sky-100 bg-sky-50/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-sky-200 text-sky-800 flex items-center justify-center font-bold text-xs uppercase">
              {user?.nama ? user.nama.charAt(0) : "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">
                {user?.role === "Guru"
                  ? formatTeacherNameWithTitle(user?.nama, user?.username)
                  : user?.nama || user?.username}
              </p>
              <p className="text-[11px] text-sky-700 font-medium">
                {isAdmin ? "Administrator" : "Guru Diniyah"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
