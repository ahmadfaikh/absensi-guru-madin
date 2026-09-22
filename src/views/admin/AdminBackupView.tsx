import React, { useState, useEffect, useRef } from "react";
import { api } from "../../services/api.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileJson,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  Info,
  Calendar,
  Users,
  BookOpen,
  ClipboardList,
  FileSpreadsheet,
  X,
  Check,
} from "lucide-react";

interface BackupStats {
  guruCount: number;
  usersCount: number;
  jadwalCount: number;
  absensiCount: number;
  sqliteSize: number;
  databaseFile: string;
  isTurso?: boolean;
  databaseType?: string;
  lastBackupRecommendation: string;
}

export const AdminBackupView: React.FC = () => {
  const { refreshServerInfo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingSqlite, setDownloadingSqlite] = useState(false);

  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.getBackupStats();
      setStats(res);
    } catch (err: any) {
      console.error("Failed to fetch backup stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Download JSON Backup
  const handleDownloadJson = async () => {
    try {
      setDownloadingJson(true);
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/backup/export-json", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Gagal mengunduh file cadangan JSON.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `backup-absensi-alisaf-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setFeedback({
        type: "success",
        text: "Cadangan data lengkap (.json) berhasil diunduh. Simpan file ini di Google Drive atau perangkat Anda!",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Gagal mengunduh file cadangan JSON.",
      });
    } finally {
      setDownloadingJson(false);
    }
  };

  // Download raw SQLite Database file
  const handleDownloadSqlite = async () => {
    try {
      setDownloadingSqlite(true);
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/backup/download-sqlite", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Gagal mengunduh file database SQLite.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `absensi-alisaf-${dateStr}.sqlite`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setFeedback({
        type: "success",
        text: "File database mentah SQLite (.sqlite) berhasil diunduh.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Gagal mengunduh file SQLite.",
      });
    } finally {
      setDownloadingSqlite(false);
    }
  };

  // Process selected file for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParsingError(null);
    setParsedData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        const data = json.data || json;

        if (!data || (!data.guru && !data.absensi && !data.pengaturan && !data.users)) {
          throw new Error("Format cadangan tidak dikenali atau tidak memiliki data.");
        }

        setParsedData(json);
      } catch (err: any) {
        setParsingError(err.message || "File bukan berkas JSON cadangan yang sah.");
        setSelectedFile(null);
        setParsedData(null);
      }
    };
    reader.onerror = () => {
      setParsingError("Gagal membaca file dari komputer.");
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!parsedData) return;

    try {
      setRestoring(true);
      setFeedback(null);
      const res = await api.restoreBackupJson(parsedData);
      setFeedback({
        type: "success",
        text: `${res.message} (Data dipulihkan: ${res.restored.guru} Guru, ${res.restored.absensi} Data Absensi, ${res.restored.jadwal} Jadwal Pelajaran).`,
      });
      setShowConfirmModal(false);
      setSelectedFile(null);
      setParsedData(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchStats();
      await refreshServerInfo();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Gagal memulihkan database dari cadangan.",
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex flex-wrap items-center gap-2">
                <span>Cadangan & Pemulihan Data</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700">
                  Backup & Restore
                </span>
                {stats?.isTurso ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    Turso Cloud Aktif (Permanen)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                    SQLite Lokal
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {stats?.isTurso 
                  ? "Database terhubung ke Turso Cloud SQLite. Data aman dan tidak akan hilang saat redeploy/cold-start Vercel."
                  : "Database menggunakan file SQLite lokal. Untuk penyimpanan permanen di Vercel, konfigurasikan Turso Cloud."}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          <span>Segarkan Status</span>
        </button>
      </div>

      {/* Global Feedback Alert */}
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

      {/* Database Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Guru Terdaftar</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800">
              {stats ? stats.guruCount : "..."}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Ustadz/ah</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Data Absensi</span>
            <ClipboardList className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800">
              {stats ? stats.absensiCount : "..."}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Kehadiran</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Jadwal Pelajaran</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800">
              {stats ? stats.jadwalCount : "..."}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Kelas</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Akun Pengguna</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800">
              {stats ? stats.usersCount : "..."}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Akun</span>
          </div>
        </div>
      </div>

      {/* Section 1: Unduh Cadangan (Export) */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Download className="w-4 h-4 text-sky-700" />
          <h3 className="font-bold text-sm text-slate-800">
            Langkah 1: Unduh File Cadangan (Backup Data)
          </h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Sebelum melakukan pembaruan kode, deploy ulang, atau tutup semester, unduh salinan lengkap database ke komputer atau HP pengurus. Anda dapat memilih salah satu atau kedua format berikut:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Card Option A: JSON Backup */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-sky-50/40 border-2 border-indigo-200/80 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <FileJson className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    Cadangan Lengkap JSON (.json)
                  </h4>
                  <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wide">
                    Format Rekomendasi
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Berisi seluruh tabel data terstruktur (data guru, login, absensi lengkap, koordinat GPS, jadwal, dan logo pondok). Format ini paling aman dan dapat dipulihkan otomatis ke webapp versi baru kapan saja.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadJson}
              disabled={downloadingJson}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingJson ? "Menyiapkan File JSON..." : "Unduh Cadangan Lengkap (.json)"}</span>
            </button>
          </div>

          {/* Card Option B: Raw SQLite File */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-700 text-white shadow-xs">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    Database SQLite Mentah (.sqlite)
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500">
                    {stats?.sqliteSize ? `${(stats.sqliteSize / 1024).toFixed(1)} KB` : "Ukuran database"}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Salinan fisik file database SQLite asli (<code>data/absensi.sqlite</code>). Cocok untuk arsip teknis atau jika Anda memindahkan file secara langsung antar server hosting.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadSqlite}
              disabled={downloadingSqlite}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md shadow-slate-900/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingSqlite ? "Mengunduh SQLite..." : "Unduh Database SQLite (.sqlite)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Pulihkan Cadangan (Restore) */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Upload className="w-4 h-4 text-emerald-700" />
          <h3 className="font-bold text-sm text-slate-800">
            Langkah 2: Pulihkan Data dari Cadangan (Restore)
          </h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Jika webapp baru selesai di-update atau baru di-deploy ulang dan datanya masih kosong, upload file cadangan JSON yang telah Anda unduh sebelumnya untuk mengembalikan seluruh data dalam 1 klik.
        </p>

        {/* Upload Dropzone */}
        <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center transition-all bg-slate-50/50">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            id="backup-file-input"
          />
          <label htmlFor="backup-file-input" className="cursor-pointer block space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto shadow-xs">
              <FileJson className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-700 hover:underline">
                Klik untuk memilih file cadangan (.json)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pilih file bernama <code>backup-absensi-alisaf-*.json</code>
              </p>
            </div>
          </label>
        </div>

        {/* Parsing Error */}
        {parsingError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{parsingError}</span>
          </div>
        )}

        {/* File Preview Card before Restore */}
        {parsedData && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-emerald-900">
                  File Cadangan Terverifikasi & Siap Dipulihkan
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setParsedData(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                <span className="text-slate-400 block text-[10px]">Guru</span>
                <span className="font-bold text-slate-800">
                  {parsedData.data?.guru?.length ?? parsedData.guru?.length ?? 0} Guru
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                <span className="text-slate-400 block text-[10px]">Riwayat Absensi</span>
                <span className="font-bold text-slate-800">
                  {parsedData.data?.absensi?.length ?? parsedData.absensi?.length ?? 0} Absensi
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                <span className="text-slate-400 block text-[10px]">Jadwal Pelajaran</span>
                <span className="font-bold text-slate-800">
                  {parsedData.data?.jadwal_pelajaran?.length ?? parsedData.jadwal_pelajaran?.length ?? 0} Jadwal
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                <span className="text-slate-400 block text-[10px]">Waktu Cadangan</span>
                <span className="font-bold text-slate-800 truncate block">
                  {parsedData.exported_at ? new Date(parsedData.exported_at).toLocaleDateString("id-ID") : "Tersedia"}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Pulihkan Data Sekarang</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Panduan & Prosedur Aman Update */}
      <div className="bg-gradient-to-br from-sky-50 to-white rounded-3xl p-6 border border-sky-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-sky-100">
          <ShieldCheck className="w-5 h-5 text-sky-700" />
          <h3 className="font-bold text-sm text-slate-900">
            Panduan & Tanya Jawab: Prosedur Aman Saat Update Webapp
          </h3>
        </div>

        <div className="space-y-3.5 text-xs text-slate-700">
          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-2xs space-y-1.5">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-sky-600 shrink-0" />
              <span>1. Kapan saya harus melakukan backup data?</span>
            </span>
            <p className="text-slate-600 pl-5 leading-relaxed text-[11.5px]">
              Sangat disarankan untuk mengunduh cadangan:
              <br />• Tepat <strong>sebelum melakukan update kode atau deployment baru</strong> webapp.
              <br />• Setiap <strong>akhir pekan atau akhir bulan</strong> sebagai arsip rutin pondok pesantren.
              <br />• Saat pergantian semester atau tutup tahun ajaran madrasah diniyah.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-2xs space-y-1.5">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>2. Langkah-langkah aman saat akan update webapp:</span>
            </span>
            <ol className="list-decimal pl-9 space-y-1 text-slate-600 text-[11.5px]">
              <li>Buka menu <strong>Cadangan & Backup</strong> ini.</li>
              <li>Klik tombol <strong>&quot;Unduh Cadangan Lengkap (.json)&quot;</strong>. File langsung tersimpan di folder Download komputer/HP Anda.</li>
              <li>Lakukan update kode webapp / deployment sistem baru.</li>
              <li>Setelah versi baru aktif, buka kembali menu ini, upload file JSON tadi pada bagian <strong>&quot;Langkah 2: Pulihkan Data&quot;</strong>. Seluruh data langsung kembali tanpa ada yang hilang!</li>
            </ol>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-2xs space-y-1.5">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>3. Apakah Google Spreadsheet juga berfungsi sebagai cadangan otomatis?</span>
            </span>
            <p className="text-slate-600 pl-5 leading-relaxed text-[11.5px]">
              <strong>Ya, sangat benar!</strong> Jika Anda telah mengaktifkan integrasi Google Spreadsheet (menu Pengaturan &gt; Google Spreadsheet), setiap ada guru yang absen masuk atau pulang, datanya <strong>langsung terkirim dan tersimpan permanen di Google Drive pondok secara real-time</strong>. Sehingga data di Google Sheets 100% aman dan tidak akan pernah terpengaruh pembaruan webapp.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-base text-slate-900">
                Konfirmasi Pemulihan Database
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin memulihkan data dari file cadangan ini? Data guru, absensi, dan jadwal saat ini akan diperbarui sesuai isi file cadangan.
              </p>
            </div>

            <div className="bg-amber-50 rounded-2xl p-3 text-[11px] text-amber-800 border border-amber-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Pastikan Anda telah memeriksa rincian data cadangan sebelum melanjutkan proses ini.
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={restoring}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={restoring}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-colors cursor-pointer"
              >
                {restoring ? "Memulihkan..." : "Ya, Pulihkan Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
