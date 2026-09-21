import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { LoginView } from "./views/LoginView.tsx";
import { Header } from "./components/Header.tsx";
import { Sidebar } from "./components/Sidebar.tsx";

// Guru Views
import { GuruDashboard } from "./views/guru/GuruDashboard.tsx";
import { GuruAbsenMasukView } from "./views/guru/GuruAbsenMasukView.tsx";
import { GuruAbsenPulangView } from "./views/guru/GuruAbsenPulangView.tsx";
import { GuruHistoryView } from "./views/guru/GuruHistoryView.tsx";
import { GuruProfileView } from "./views/guru/GuruProfileView.tsx";
import { GuruJadwalView } from "./views/guru/GuruJadwalView.tsx";

// Admin Views
import { AdminDashboard } from "./views/admin/AdminDashboard.tsx";
import { AdminTodayView } from "./views/admin/AdminTodayView.tsx";
import { AdminGuruView } from "./views/admin/AdminGuruView.tsx";
import { AdminRekapView } from "./views/admin/AdminRekapView.tsx";
import { AdminMonthlyView } from "./views/admin/AdminMonthlyView.tsx";
import { AdminReportView } from "./views/admin/AdminReportView.tsx";
import { AdminSettingsView } from "./views/admin/AdminSettingsView.tsx";
import { AdminJadwalView } from "./views/admin/AdminJadwalView.tsx";
import { AdminBackupView } from "./views/admin/AdminBackupView.tsx";

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<string>("dashboard");

  // Report navigation state (e.g. from monthly to report)
  const [reportBulan, setReportBulan] = useState<string>("");
  const [reportTahun, setReportTahun] = useState<string>("");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">
            Memuat Sistem Absensi Madrasah Diniyah Miftahul Huda...
          </p>
          <p className="text-xs text-slate-400 mt-1">Pondok Pesantren Al Is'af</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginView />;
  }

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavigateToReport = (bulan: string, tahun: string) => {
    setReportBulan(bulan);
    setReportTahun(tahun);
    setCurrentView("report");
    setSidebarOpen(false);
  };

  // Render view depending on role and currentView
  const renderContent = () => {
    if (user.role === "Guru") {
      switch (currentView) {
        case "guru_jadwal":
          return <GuruJadwalView />;
        case "guru_masuk":
          return <GuruAbsenMasukView />;
        case "guru_pulang":
          return <GuruAbsenPulangView />;
        case "guru_history":
          return <GuruHistoryView />;
        case "guru_profile":
          return <GuruProfileView />;
        case "dashboard":
        case "guru_dashboard":
        default:
          return <GuruDashboard onNavigate={handleNavigate} />;
      }
    }

    // Role: admin
    switch (currentView) {
      case "jadwal":
        return <AdminJadwalView />;
      case "today":
        return <AdminTodayView />;
      case "guru":
        return <AdminGuruView />;
      case "rekap":
        return <AdminRekapView />;
      case "monthly":
        return <AdminMonthlyView onNavigateToReport={handleNavigateToReport} />;
      case "report":
        return (
          <AdminReportView
            initialBulan={reportBulan || undefined}
            initialTahun={reportTahun || undefined}
          />
        );
      case "settings":
        return <AdminSettingsView />;
      case "backup":
        return <AdminBackupView />;
      case "dashboard":
      case "admin_dashboard":
      default:
        return <AdminDashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 antialiased selection:bg-sky-200">
      {/* Top Navbar Header */}
      <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      {/* Main Container with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Sidebar Navigation */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentView={currentView}
          onNavigate={handleNavigate}
        />

        {/* Content Area */}
        <main className="flex-1 min-w-0">{renderContent()}</main>
      </div>

      {/* Footer */}
      <footer className="print:hidden border-t border-slate-200 bg-white/70 backdrop-blur-md py-4 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">
          Sistem Absensi Guru Madrasah Diniyah Miftahul Huda
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Pondok Pesantren Al Is'af • Berbasis Geolocation GPS & Jam Resmi Pondok
        </p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
