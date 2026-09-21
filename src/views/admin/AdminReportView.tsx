import React, { useState, useEffect } from "react";
import { api } from "../../services/api.ts";
import { AbsensiRecord, Guru, SettingPengaturan } from "../../types.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Printer,
  FileSpreadsheet,
  FileDown,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  Sparkles,
} from "lucide-react";

interface AdminReportViewProps {
  initialBulan?: string;
  initialTahun?: string;
}

export const AdminReportView: React.FC<AdminReportViewProps> = ({
  initialBulan,
  initialTahun,
}) => {
  const { serverInfo } = useAuth();
  const [data, setData] = useState<AbsensiRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [bulan, setBulan] = useState<string>(
    initialBulan || String(new Date().getMonth() + 1)
  );
  const [tahun, setTahun] = useState<string>(
    initialTahun || String(new Date().getFullYear())
  );
  const [guruId, setGuruId] = useState<string>("");
  const [guruList, setGuruList] = useState<Guru[]>([]);

  const settings = serverInfo?.settings;
  const namaPondok = settings?.nama_pondok || "PONDOK PESANTREN AL IS'AF";
  const namaMadrasah = settings?.nama_madrasah || "MADRASAH DINIYAH MIFTAHUL HUDA";

  const months = [
    { value: "1", label: "Januari" },
    { value: "2", label: "Februari" },
    { value: "3", label: "Maret" },
    { value: "4", label: "April" },
    { value: "5", label: "Mei" },
    { value: "6", label: "Juni" },
    { value: "7", label: "Juli" },
    { value: "8", label: "Agustus" },
    { value: "9", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  const fetchGuru = async () => {
    try {
      const res = await api.getGuruList();
      setGuruList(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.getRekap({
        bulan: bulan || undefined,
        tahun: tahun || undefined,
        limit: 1000,
        sort: "asc",
      });

      let filtered = res.data;
      if (guruId) {
        filtered = filtered.filter((r) => String(r.guru_id) === guruId);
      }
      setData(filtered);
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuru();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [bulan, tahun, guruId]);

  const selectedMonthName = months.find((m) => m.value === bulan)?.label || "Bulan";
  const selectedGuru = guruList.find((g) => String(g.id) === guruId);

  // 1. Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  // 2. Export Excel (.xlsx)
  const handleExportExcel = () => {
    if (data.length === 0) {
      alert("Tidak ada data untuk diexport.");
      return;
    }

    const excelData = data.map((r, index) => ({
      No: index + 1,
      "Nama Guru": r.nama_guru,
      "Mata Pelajaran": r.mata_pelajaran || "-",
      Tanggal: r.tanggal,
      Hari: r.hari,
      "Jam Masuk": r.jam_masuk || "-",
      Status: r.status,
      "Lokasi Masuk": r.lokasi_masuk || "-",
      "Jam Pulang": r.jam_pulang || "-",
      "Lokasi Pulang": r.lokasi_pulang || "-",
      Keterangan: r.keterangan || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Absensi");

    const filename = `Rekap_Absensi_${namaMadrasah.replace(/\s+/g, "_")}_${selectedMonthName}_${tahun}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // 3. Export PDF (.pdf)
  const handleExportPDF = () => {
    if (data.length === 0) {
      alert("Tidak ada data untuk diexport.");
      return;
    }

    const doc = new jsPDF("landscape", "mm", "a4");

    // Kop Surat Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(namaPondok.toUpperCase(), 148.5, 16, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(3, 105, 161); // Sky 700
    doc.text(namaMadrasah.toUpperCase(), 148.5, 22, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(
      "Alamat: Kompleks Pesantren Al Is'af • Sistem Informasi & Presensi Guru",
      148.5,
      27,
      { align: "center" }
    );

    // Decorative Line
    doc.setDrawColor(3, 105, 161);
    doc.setLineWidth(0.8);
    doc.line(14, 30, 283, 30);
    doc.setLineWidth(0.3);
    doc.line(14, 31.5, 283, 31.5);

    // Title & Period
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text("REKAPITULASI ABSENSI GURU", 148.5, 38, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Periode: Bulan ${selectedMonthName} Tahun ${tahun} ${
        selectedGuru ? `• Guru: ${selectedGuru.nama}` : ""
      }`,
      148.5,
      43,
      { align: "center" }
    );

    // Table
    const tableColumns = [
      "No",
      "Nama Guru",
      "Mata Pelajaran",
      "Hari / Tanggal",
      "Jam Masuk",
      "Status",
      "Lokasi",
      "Jam Pulang",
      "Keterangan",
    ];

    const tableRows = data.map((r, i) => [
      String(i + 1),
      r.nama_guru || "-",
      r.mata_pelajaran || "-",
      `${r.hari || ""}, ${r.tanggal || ""}`,
      r.jam_masuk || "-",
      r.status || "-",
      r.lokasi_masuk || "-",
      r.jam_pulang || "-",
      r.keterangan || "-",
    ]);

    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 48,
      theme: "grid",
      headStyles: {
        fillColor: [3, 105, 161],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 40,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 42, fontStyle: "bold" },
        2: { cellWidth: 38 },
        3: { cellWidth: 32 },
        4: { halign: "center", cellWidth: 20 },
        5: { halign: "center", cellWidth: 24 },
        6: { halign: "center", cellWidth: 32 },
        7: { halign: "center", cellWidth: 20 },
        8: { cellWidth: 45 },
      },
    });

    // Signature Block (Tanda tangan Kepala Madrasah / Pengasuh Pondok)
    const finalY = (doc as any).lastAutoTable?.finalY || 160;
    const signY = finalY + 12 > 175 ? 160 : finalY + 12;

    const todayStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    if (signY + 35 < 200) {
      doc.setFontSize(9);
      doc.text(`Dicetak pada: ${todayStr}`, 20, signY);
      doc.text("Mengetahui,", 220, signY);
      doc.setFont("helvetica", "bold");
      doc.text("Kepala Madrasah Diniyah / Pengasuh", 220, signY + 5);

      // Signature line
      doc.line(210, signY + 28, 275, signY + 28);
      doc.setFont("helvetica", "normal");
      doc.text("( .................................................... )", 220, signY + 32);
    }

    const filename = `Rekap_Absensi_${selectedMonthName}_${tahun}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Control Panel (Hidden when printing) */}
      <div className="print:hidden bg-white rounded-3xl p-6 border border-sky-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-800">Export & Cetak Rekap Absensi</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Format resmi madrasah & pondok pesantren siap cetak dan diunduh (Excel / PDF)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all"
          >
            <FileDown className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Selector (Hidden when printing) */}
      <div className="print:hidden bg-white rounded-2xl p-4 border border-sky-100 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <label className="font-bold text-slate-700 uppercase text-[10px]">Bulan:</label>
          <select
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:bg-white"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-bold text-slate-700 uppercase text-[10px]">Tahun:</label>
          <select
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:bg-white"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="font-bold text-slate-700 uppercase text-[10px]">Pilih Guru:</label>
          <select
            value={guruId}
            onChange={(e) => setGuruId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:bg-white"
          >
            <option value="">Semua Guru</option>
            {guruList.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL SHEET (Designed for A4 portrait/landscape preview) */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-sky-100 shadow-lg print:shadow-none print:border-none print:p-0 print:m-0">
        {/* KOP SURAT RESMI */}
        <div className="border-b-4 border-double border-slate-800 pb-4 mb-6 text-center">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
            {namaPondok}
          </h2>
          <h1 className="text-lg sm:text-xl font-black text-sky-800 tracking-wide uppercase mt-0.5">
            {namaMadrasah}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Alamat: Kompleks Pondok Pesantren Al Is'af • Telp / WhatsApp Sekretariat
          </p>
        </div>

        {/* JUDUL REKAP & PERIODE */}
        <div className="text-center mb-6">
          <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase underline decoration-2 underline-offset-4">
            REKAP ABSENSI GURU
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
            Periode: Bulan {selectedMonthName} Tahun {tahun}
          </p>
          {selectedGuru && (
            <p className="text-xs text-sky-800 font-bold mt-0.5">
              Guru: {selectedGuru.nama} ({selectedGuru.mata_pelajaran})
            </p>
          )}
        </div>

        {/* TABEL DATA RESMI */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Memuat data rekap...</div>
        ) : data.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Tidak ada transaksi absensi pada periode yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] border-b border-slate-300">
                  <th className="py-2.5 px-2 border-r border-slate-300 text-center w-8">No</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Nama Guru</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Mata Pelajaran</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-center">
                    Hari / Tanggal
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-300 text-center">Masuk</th>
                  <th className="py-2.5 px-2 border-r border-slate-300 text-center">Status</th>
                  <th className="py-2.5 px-2 border-r border-slate-300 text-center">Lokasi</th>
                  <th className="py-2.5 px-2 border-r border-slate-300 text-center">Pulang</th>
                  <th className="py-2.5 px-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2 border-r border-slate-300 text-center text-slate-500 font-mono">
                      {i + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-800">
                      {r.nama_guru}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-300 text-slate-600">
                      {r.mata_pelajaran || "-"}
                    </td>
                    <td className="py-2 px-2.5 border-r border-slate-300 text-center text-slate-700">
                      {r.hari}, {r.tanggal}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-300 text-center font-mono font-medium">
                      {r.jam_masuk || "-"}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-300 text-center font-bold">
                      <span
                        className={
                          r.status === "MASUK"
                            ? "text-emerald-700"
                            : r.status === "TERLAMBAT"
                            ? "text-amber-700"
                            : "text-blue-700"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 px-2 border-r border-slate-300 text-center text-[10px] font-semibold">
                      {r.lokasi_masuk || "-"}
                    </td>
                    <td className="py-2 px-2 border-r border-slate-300 text-center font-mono">
                      {r.jam_pulang || "-"}
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-[11px]">{r.keterangan || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TANDA TANGAN RESMI KEPALA MADRASAH / PENGASUH PONDOK */}
        <div className="mt-12 grid grid-cols-2 gap-8 text-xs text-slate-800 pt-6">
          <div className="text-left">
            <p className="text-slate-500">
              Dicetak otomatis melalui Sistem Absensi Digital Madrasah
            </p>
            <p className="text-slate-500 font-mono mt-0.5">
              Waktu Cetak: {new Date().toLocaleString("id-ID")}
            </p>
          </div>

          <div className="text-right pr-6">
            <p>
              Ditetapkan di: Kalitidu,{" "}
              {new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="font-bold mt-1">Kepala Madrasah Diniyah / Pengasuh Pondok,</p>
            <div className="h-20" />
            <p className="font-bold underline text-sm">
              ( KH. / Ustadz Pengasuh Al Is'af )
            </p>
            <p className="text-[11px] text-slate-500">Pondok Pesantren Al Is'af</p>
          </div>
        </div>
      </div>
    </div>
  );
};
