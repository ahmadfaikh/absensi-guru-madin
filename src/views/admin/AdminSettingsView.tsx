import React, { useState, useEffect, useRef } from "react";
import { api } from "../../services/api.ts";
import { Pengaturan } from "../../types.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import {
  Settings,
  Building,
  MapPin,
  Clock,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  LocateFixed,
  Shield,
  HelpCircle,
  FileSpreadsheet,
  Cloud,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Code2,
  X,
  Upload,
  Trash2,
  Image as ImageIcon,
  Database,
  Download,
  FileJson,
  FolderArchive,
  HardDrive,
  FileUp,
} from "lucide-react";
import { AdminBackupView } from "./AdminBackupView.tsx";

interface AdminSettingsViewProps {
  initialTab?: "umum" | "backup" | "gas";
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ initialTab = "umum" }) => {
  const { refreshServerInfo } = useAuth();
  const [activeTab, setActiveTab] = useState<"umum" | "backup" | "gas">(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form fields
  const [namaPondok, setNamaPondok] = useState("");
  const [namaMadrasah, setNamaMadrasah] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoFeedback, setLogoFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [latitude, setLatitude] = useState<string | number>(-7.1509);
  const [longitude, setLongitude] = useState<string | number>(112.6555);
  const [radiusMeter, setRadiusMeter] = useState<string | number>(100);
  const [jamMasuk, setJamMasuk] = useState("20:00");
  const [batasTerlambat, setBatasTerlambat] = useState("20:05");
  const [jamPulang, setJamPulang] = useState("21:30");
  const [hariAktif, setHariAktif] = useState<string[]>([
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Sabtu",
    "Ahad",
  ]);

  // Google Apps Script / Cloud Spreadsheet fields
  const [gasUrl, setGasUrl] = useState("");
  const [gasSheetName, setGasSheetName] = useState("Absensi_Guru");
  const [gasAutoSync, setGasAutoSync] = useState(true);

  // Google Apps Script status & actions
  const [gasStats, setGasStats] = useState<{
    totalRecords: number;
    syncedRecords: number;
    pendingRecords: number;
  } | null>(null);
  const [testingGas, setTestingGas] = useState(false);
  const [gasTestResult, setGasTestResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [scriptCode, setScriptCode] = useState("");
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const allDays = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      const s = res.data;
      setNamaPondok(s.nama_pondok || "PONDOK PESANTREN AL IS'AF");
      setNamaMadrasah(s.nama_madrasah || "MADRASAH DINIYAH MIFTAHUL HUDA");
      setLogoUrl(s.logo_url || "");
      setLatitude(s.latitude_pondok !== undefined && s.latitude_pondok !== null && !Number.isNaN(Number(s.latitude_pondok)) ? s.latitude_pondok : -7.02558);
      setLongitude(s.longitude_pondok !== undefined && s.longitude_pondok !== null && !Number.isNaN(Number(s.longitude_pondok)) ? s.longitude_pondok : 113.86542);
      setRadiusMeter(s.radius_absensi !== undefined && s.radius_absensi !== null && !Number.isNaN(Number(s.radius_absensi)) ? s.radius_absensi : 100);
      setJamMasuk(s.jam_masuk || "20:00");
      setBatasTerlambat(s.batas_terlambat || "20:05");
      setJamPulang(s.jam_pulang || "21:30");

      setGasUrl(s.gas_url || "");
      setGasSheetName(s.gas_sheet_name || "Absensi_Guru");
      setGasAutoSync(s.gas_auto_sync !== undefined ? Boolean(s.gas_auto_sync) : true);

      if (s.hari_aktif) {
        try {
          const parsed = JSON.parse(s.hari_aktif);
          if (Array.isArray(parsed)) setHariAktif(parsed);
        } catch {
          // ignore
        }
      }

      // Load GAS Info and script template
      try {
        const gasInfo = await api.getGasInfo();
        setGasStats(gasInfo.stats);
        setScriptCode(gasInfo.scriptCode);
      } catch (err) {
        console.error("Error loading gas info:", err);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleToggleDay = (day: string) => {
    if (hariAktif.includes(day)) {
      setHariAktif(hariAktif.filter((d) => d !== day));
    } else {
      setHariAktif([...hariAktif, day]);
    }
  };

  const handleUseCurrentGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setFeedback({
            type: "success",
            text: `Koordinat GPS berhasil diambil dari posisi Anda saat ini: ${pos.coords.latitude.toFixed(
              6
            )}, ${pos.coords.longitude.toFixed(6)}`,
          });
        },
        (err) => {
          setFeedback({
            type: "error",
            text: `Gagal membaca GPS: ${err.message}. Pastikan izin lokasi aktif.`,
          });
        },
        { enableHighAccuracy: true }
      );
    } else {
      setFeedback({ type: "error", text: "Browser tidak mendukung Geolocation." });
    }
  };

  const handleTestGas = async () => {
    if (!gasUrl.trim()) {
      setGasTestResult({
        success: false,
        message: "Silakan masukkan URL Web App Google Apps Script terlebih dahulu.",
      });
      return;
    }

    setTestingGas(true);
    setGasTestResult(null);

    try {
      const res = await api.testGasConnection({
        url: gasUrl.trim(),
        sheetName: gasSheetName.trim() || "Absensi_Guru",
      });
      setGasTestResult(res);
    } catch (err: any) {
      setGasTestResult({
        success: false,
        message: err.message || "Gagal menguji koneksi Google Apps Script.",
      });
    } finally {
      setTestingGas(false);
    }
  };

  const handleSyncAllGas = async () => {
    if (!gasUrl.trim()) {
      alert("Silakan isi URL Web App Google Apps Script terlebih dahulu lalu klik Simpan.");
      return;
    }

    setSyncingAll(true);
    try {
      const res = await api.syncToGoogleSheets();
      if (res.success) {
        alert(res.message || "Semua data berhasil disinkronkan ke Google Spreadsheet.");
        // Refresh stats
        const info = await api.getGasInfo();
        setGasStats(info.stats);
      } else {
        alert(res.message || "Gagal menyinkronkan data.");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat menyinkronkan data ke spreadsheet.");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleCopyScriptCode = () => {
    if (!scriptCode) return;
    navigator.clipboard.writeText(scriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const optimizeImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const isPng = file.type === "image/png" || file.type === "image/svg+xml";
          const dataUrl = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.92);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("Gagal membaca file gambar."));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
      reader.readAsDataURL(file);
    });
  };

  const handleLogoFileChange = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setLogoFeedback({
        type: "error",
        text: "File harus berupa format gambar (PNG, JPG, JPEG, WEBP, atau SVG).",
      });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setLogoFeedback({
        type: "error",
        text: "Ukuran file terlalu besar. Maksimal 8MB.",
      });
      return;
    }

    setUploadingLogo(true);
    setLogoFeedback(null);
    try {
      const dataUrl = await optimizeImageFile(file);
      setLogoUrl(dataUrl);

      // Simpan langsung ke database agar langsung berubah seketika di seluruh aplikasi
      await api.updateLogo(dataUrl);
      await refreshServerInfo();
      setLogoFeedback({
        type: "success",
        text: "Logo pondok berhasil diunggah dan langsung aktif di seluruh aplikasi!",
      });
    } catch (err: any) {
      setLogoFeedback({
        type: "error",
        text: err.message || "Gagal mengunggah logo.",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus logo dan kembali ke ikon bawaan?")) return;
    setUploadingLogo(true);
    setLogoFeedback(null);
    try {
      await api.updateLogo("");
      setLogoUrl("");
      await refreshServerInfo();
      setLogoFeedback({
        type: "success",
        text: "Logo berhasil dihapus. Sistem kini memakai lambang bawaan.",
      });
    } catch (err: any) {
      setLogoFeedback({
        type: "error",
        text: err.message || "Gagal menghapus logo.",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleApplyUrlLogo = async () => {
    if (!logoUrl.trim()) return;
    setUploadingLogo(true);
    setLogoFeedback(null);
    try {
      await api.updateLogo(logoUrl.trim());
      await refreshServerInfo();
      setLogoFeedback({
        type: "success",
        text: "Logo dari tautan web berhasil disimpan dan diterapkan!",
      });
    } catch (err: any) {
      setLogoFeedback({
        type: "error",
        text: err.message || "Gagal menyimpan tautan logo.",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      await api.updateSettings({
        nama_pondok: namaPondok,
        nama_madrasah: namaMadrasah,
        logo_url: logoUrl,
        latitude_pondok: Number(latitude),
        longitude_pondok: Number(longitude),
        radius_absensi: Number(radiusMeter),
        jam_masuk: jamMasuk,
        batas_terlambat: batasTerlambat,
        jam_pulang: jamPulang,
        hari_aktif: JSON.stringify(hariAktif),
        gas_url: gasUrl.trim(),
        gas_auto_sync: gasAutoSync ? 1 : 0,
        gas_sheet_name: gasSheetName.trim() || "Absensi_Guru",
      });

      setFeedback({
        type: "success",
        text: "Pengaturan sistem absensi dan integrasi Google Apps Script berhasil disimpan!",
      });
      await refreshServerInfo();
      // Reload GAS info
      const info = await api.getGasInfo();
      setGasStats(info.stats);
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Gagal menyimpan pengaturan.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-800">
              Pengaturan Sistem & Cloud Integrasi
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi identitas lembaga, jam kerja mengajar, titik GPS, dan integrasi Google Spreadsheet
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("umum")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "umum"
              ? "bg-white text-sky-800 shadow-xs border border-sky-100"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Building className="w-4 h-4 text-sky-600" />
          <span>Pengaturan Lembaga & GPS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("backup")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "backup"
              ? "bg-white text-indigo-900 shadow-xs border border-indigo-100"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Database className="w-4 h-4 text-indigo-600" />
          <span>Cadangan & Pemulihan (Backup)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700">
            Penting
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gas")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "gas"
              ? "bg-white text-emerald-900 shadow-xs border border-emerald-100"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Google Spreadsheet Sync</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border shadow-xs animate-in fade-in duration-300 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-semibold">{feedback.text}</span>
        </div>
      )}

      {activeTab === "backup" ? (
        <AdminBackupView />
      ) : loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Memuat pengaturan...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section: Integrasi Google Apps Script (Cloud Spreadsheet) */}
          {activeTab === "gas" && (
          <div className="bg-gradient-to-br from-white to-sky-50/40 rounded-3xl p-6 border-2 border-sky-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-sky-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>Integrasi Google Spreadsheet (Apps Script)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Cloud Sync
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Otomatis simpan seluruh data kehadiran guru ke lembar kerja Google Sheets di akun Google Anda
                  </p>
                </div>
              </div>

              {/* Guide Button */}
              <button
                type="button"
                onClick={() => setShowCodeModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Salin Script & Panduan</span>
              </button>
            </div>

            {/* Sync Statistics if available */}
            {gasStats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-2xl border border-sky-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Catatan Absensi</span>
                  <span className="text-lg font-extrabold text-slate-800">{gasStats.totalRecords}</span>
                  <span className="text-[10px] text-slate-500 block">data tersimpan di database</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-emerald-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">Tersinkron ke Spreadsheet</span>
                  <span className="text-lg font-extrabold text-emerald-700">{gasStats.syncedRecords}</span>
                  <span className="text-[10px] text-emerald-600 block">sudah tercatat di Cloud</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-amber-100 shadow-2xs">
                  <span className="text-[10px] font-bold text-amber-600 uppercase block">Menunggu Sinkronisasi</span>
                  <span className="text-lg font-extrabold text-amber-700">{gasStats.pendingRecords}</span>
                  <span className="text-[10px] text-amber-600 block">data belum disinkronkan</span>
                </div>
              </div>
            )}

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  URL Web App Google Apps Script
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Dapatkan URL ini setelah menerapkan (deploy) script di Google Sheets dengan hak akses &quot;Siapa saja / Anyone&quot;.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Tab Lembar Kerja (Sheet Name)
                  </label>
                  <input
                    type="text"
                    required
                    value={gasSheetName}
                    onChange={(e) => setGasSheetName(e.target.value)}
                    placeholder="Absensi_Guru"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Nama sheet di Google Spreadsheet (Default: Absensi_Guru)
                  </span>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mode Sinkronisasi Otomatis
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      checked={gasAutoSync}
                      onChange={(e) => setGasAutoSync(e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Sinkronkan Otomatis Real-time Saat Guru Absen
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Test Connection & Batch Sync Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestGas}
                disabled={testingGas || !gasUrl}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingGas ? "animate-spin" : ""}`} />
                <span>{testingGas ? "Menguji Koneksi..." : "Uji Koneksi (Test Ping)"}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncAllGas}
                disabled={syncingAll || !gasUrl}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Cloud className={`w-3.5 h-3.5 ${syncingAll ? "animate-spin" : ""}`} />
                <span>{syncingAll ? "Menyinkronkan..." : "Sinkronkan Semua Catatan Sekarang"}</span>
              </button>
            </div>

            {/* Test Result Box */}
            {gasTestResult && (
              <div
                className={`p-4 rounded-2xl text-xs border ${
                  gasTestResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {gasTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{gasTestResult.message}</span>
                </div>
                {gasTestResult.data && (
                  <div className="text-[11px] opacity-80 mt-1 space-y-0.5 font-mono">
                    {gasTestResult.data.spreadsheetName && (
                      <div>File Spreadsheet: {gasTestResult.data.spreadsheetName}</div>
                    )}
                    {gasTestResult.data.sheetName && (
                      <div>Tab Sheet: {gasTestResult.data.sheetName}</div>
                    )}
                    {gasTestResult.data.serverTime && (
                      <div>Waktu Server Google: {gasTestResult.data.serverTime}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {activeTab === "umum" && (
            <>
          {/* Section 1: Identitas Lembaga */}
          <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building className="w-4 h-4 text-sky-700" />
              <span>Identitas Lembaga & Pesantren</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Pondok Pesantren
              </label>
              <input
                type="text"
                required
                value={namaPondok}
                onChange={(e) => setNamaPondok(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Madrasah Diniyah
              </label>
              <input
                type="text"
                required
                value={namaMadrasah}
                onChange={(e) => setNamaMadrasah(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            {/* Section: Upload & Ubah Logo Pondok */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Logo / Lambang Pondok Pesantren & Madrasah
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Upload gambar logo resmi. Gambar langsung dioptimalkan dan seketika berubah di seluruh tampilan aplikasi.
                  </p>
                </div>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer w-fit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Logo (Gunakan Ikon Bawaan)</span>
                  </button>
                )}
              </div>

              {/* Upload Dropzone & Live Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Current / New Logo Preview Box */}
                <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                  <div className="w-24 h-24 rounded-2xl bg-white p-2 shadow-md shadow-sky-600/10 border border-sky-200 flex items-center justify-center overflow-hidden mb-2 relative">
                    {uploadingLogo ? (
                      <div className="flex flex-col items-center justify-center">
                        <RefreshCw className="w-6 h-6 text-sky-600 animate-spin" />
                        <span className="text-[9px] text-sky-700 font-bold mt-1">Menerapkan...</span>
                      </div>
                    ) : logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo Pondok"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gradient-to-br from-sky-600 via-sky-700 to-blue-900 flex items-center justify-center text-white">
                        <Building className="w-10 h-10 text-sky-100" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">
                    {logoUrl ? "Logo Aktif" : "Emblem Bawaan"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {logoUrl ? "Terpasang di Header & Login" : "Belum diunggah"}
                  </span>
                </div>

                {/* Dropzone Area */}
                <div className="sm:col-span-8 space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoFileChange(file);
                      if (e.target) e.target.value = "";
                    }}
                    className="hidden"
                  />

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingLogo(true);
                    }}
                    onDragLeave={() => setIsDraggingLogo(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingLogo(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleLogoFileChange(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${
                      isDraggingLogo
                        ? "border-sky-500 bg-sky-50"
                        : "border-sky-200 bg-sky-50/40 hover:bg-sky-50 hover:border-sky-400"
                    }`}
                  >
                    <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-sky-100 text-sky-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      {uploadingLogo ? (
                        <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
                      ) : (
                        <Upload className="w-5 h-5 text-sky-600" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      {uploadingLogo
                        ? "Sedang mengunggah & menerapkan logo..."
                        : "Klik untuk Pilih Gambar Logo atau Tarik File ke Sini"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Mendukung PNG, JPG, JPEG, WEBP, SVG (Maksimal 8MB)
                    </p>
                  </div>

                  {/* Logo Feedback status */}
                  {logoFeedback && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        logoFeedback.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {logoFeedback.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{logoFeedback.text}</span>
                    </div>
                  )}

                  {/* Optional URL Toggle */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="text-[11px] text-sky-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showUrlInput ? "Sembunyikan Input URL" : "Atau masukkan URL gambar jika sudah memiliki link"}</span>
                    </button>
                    {showUrlInput && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="url"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://contoh.com/logo.png"
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleApplyUrlLogo}
                          disabled={uploadingLogo || !logoUrl}
                          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          Terapkan URL
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Titik Koordinat GPS & Radius */}
          <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-700" />
                <span>Titik Koordinat GPS & Radius Geofence</span>
              </h3>

              <button
                type="button"
                onClick={handleUseCurrentGPS}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 text-xs font-bold hover:bg-teal-100 transition-colors"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>Ambil GPS Saat Ini</span>
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Guru yang melakukan absensi dalam radius yang ditentukan akan otomatis tercatat
              sebagai <strong>"DI DALAM PONDOK"</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Latitude Pondok
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={latitude !== undefined && latitude !== null && !Number.isNaN(latitude) ? latitude : ""}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Longitude Pondok
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={longitude !== undefined && longitude !== null && !Number.isNaN(longitude) ? longitude : ""}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Radius Toleransi (Meter)
                </label>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  required
                  value={radiusMeter !== undefined && radiusMeter !== null && !Number.isNaN(radiusMeter) ? radiusMeter : ""}
                  onChange={(e) => setRadiusMeter(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Waktu Jam Masuk & Pulang */}
          <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Clock className="w-4 h-4 text-sky-700" />
              <span>Jam Operasional Absensi (WIB)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jam Masuk (Target)
                </label>
                <input
                  type="time"
                  required
                  value={jamMasuk}
                  onChange={(e) => setJamMasuk(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default: 20:00 WIB</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Batas Keterlambatan
                </label>
                <input
                  type="time"
                  required
                  value={batasTerlambat}
                  onChange={(e) => setBatasTerlambat(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Lewat jam ini = Status TERLAMBAT (Default: 20:05 WIB)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jam Pulang
                </label>
                <input
                  type="time"
                  required
                  value={jamPulang}
                  onChange={(e) => setJamPulang(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default: 21:30 WIB</span>
              </div>
            </div>
          </div>

          {/* Section 4: Hari Aktif Absensi */}
          <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-sky-700" />
              <span>Hari Aktif Absensi Mengajar Diniyah</span>
            </h3>

            <p className="text-xs text-slate-500">
              Pilih hari-hari kegiatan belajar mengajar madrasah aktif:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {allDays.map((day) => {
                const isSelected = hariAktif.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleToggleDay(day)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          </>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-lg shadow-sky-600/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>
                {saving
                  ? "Menyimpan Konfigurasi..."
                  : activeTab === "gas"
                  ? "Simpan Konfigurasi Spreadsheet"
                  : "Simpan Seluruh Pengaturan"}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Code Modal for Google Apps Script */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    Panduan & Kode Google Apps Script (Code.gs)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Langkah mudah menghubungkan Google Sheets dengan sistem absensi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCodeModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Instructions steps */}
              <div className="bg-sky-50 rounded-2xl p-4 border border-sky-200 text-slate-700 space-y-2">
                <span className="font-bold text-sky-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-sky-600" />
                  <span>5 Langkah Praktis Menghubungkan ke Spreadsheet:</span>
                </span>
                <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-700">
                  <li>
                    Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-sky-700 font-bold underline inline-flex items-center gap-0.5">Google Spreadsheet Baru <ExternalLink className="w-3 h-3" /></a> di akun Google Anda.
                  </li>
                  <li>
                    Beri nama file Spreadsheet, misalnya <strong>&quot;Rekap Absensi Guru MD Miftahul Huda&quot;</strong>.
                  </li>
                  <li>
                    Klik menu atas: <strong>Ekstensi (Extensions) &gt; Apps Script</strong>.
                  </li>
                  <li>
                    Hapus kode bawaan di editor, lalu <strong>Tempel (Paste)</strong> kode di bawah ini, lalu klik ikon <strong>Simpan (Save)</strong>.
                  </li>
                  <li>
                    Klik tombol biru <strong>Terapkan (Deploy) &gt; Deployment baru (New deployment)</strong>:
                    <ul className="list-disc pl-4 mt-1 text-[11px] text-slate-600">
                      <li>Pilih jenis (roda gigi): <strong>Aplikasi web (Web App)</strong></li>
                      <li>Jalankan sebagai: <strong>Saya (email Anda)</strong></li>
                      <li>Yang memiliki akses: <strong>Siapa saja (Anyone)</strong></li>
                    </ul>
                  </li>
                  <li>
                    Salin <strong>URL Aplikasi Web (Web App URL)</strong> yang berakhiran <code>/exec</code> dan tempel di kolom Pengaturan aplikasi ini.
                  </li>
                </ol>
              </div>

              {/* Code Box */}
              <div>
                <div className="flex items-center justify-between pb-1.5">
                  <span className="font-bold text-slate-700 text-xs">Kode Apps Script (Code.gs):</span>
                  <button
                    type="button"
                    onClick={handleCopyScriptCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tersalin ke Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Seluruh Kode</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed select-all">
                  {scriptCode}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCodeModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
