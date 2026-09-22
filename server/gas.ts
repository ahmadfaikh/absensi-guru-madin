import { queryOne, queryAll, run } from "./db.ts";

export interface GasConfig {
  url: string;
  autoSync: boolean;
  sheetName: string;
}

export const DEFAULT_GAS_SHEET_NAME = "Absensi_Guru";

// Ready-to-use Google Apps Script Code template for administrators to copy into Google Sheets
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * ==============================================================================
 * SISTEM ABSENSI GURU MADRASAH DINIYAH MIFTAHUL HUDA
 * PONDOK PESANTREN AL IS'AF KALABAAN
 * Google Apps Script Web App Endpoint untuk Sinkronisasi Cloud Spreadsheet
 * ==============================================================================
 * 
 * PANDUAN DEPLOY:
 * 1. Buka Google Spreadsheet baru di akun Google Pesantren/Madrasah.
 * 2. Beri nama file Spreadsheet, misalnya: "Rekap Absensi Guru MD Miftahul Huda".
 * 3. Buka menu: Ekstensi > Apps Script.
 * 4. Hapus semua kode bawaan, lalu Tempel (Paste) seluruh kode di bawah ini.
 * 5. Klik tombol "Simpan" (ikon disket).
 * 6. Klik tombol biru "Terapkan" (Deploy) di kanan atas > "Deployment baru" (New deployment).
 * 7. Pilih jenis deployment: "Aplikasi web" (Web App).
 * 8. Konfigurasi:
 *    - Deskripsi: Absensi Guru Al Isaf
 *    - Jalankan sebagai (Execute as): "Saya" (akun email Anda)
 *    - Yang memiliki akses (Who has access): "Siapa saja" (Anyone)
 * 9. Klik "Terapkan", berikan izin akses ke Google Spreadsheet Anda.
 * 10. Salin URL Aplikasi Web (berakhiran /exec) dan tempel di Pengaturan Aplikasi Absensi.
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, error: 'Data POST kosong.' });
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || 'sync_attendance';
    var sheetName = payload.sheetName || '${DEFAULT_GAS_SHEET_NAME}';

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      setupHeaders(sheet);
    } else if (sheet.getLastRow() === 0) {
      setupHeaders(sheet);
    }

    // Ping / Test Action
    if (action === 'ping') {
      return responseJSON({
        success: true,
        message: 'Koneksi ke Google Apps Script berhasil terhubung!',
        sheetName: sheetName,
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        totalRows: Math.max(0, sheet.getLastRow() - 1),
        serverTime: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      });
    }

    // Batch Sync Action
    if (action === 'batch_sync') {
      var records = payload.records || [];
      var insertedCount = 0;
      var updatedCount = 0;

      for (var i = 0; i < records.length; i++) {
        var rec = records[i];
        var res = processAttendanceRecord(sheet, rec);
        if (res.updated) {
          updatedCount++;
        } else {
          insertedCount++;
        }
      }

      return responseJSON({
        success: true,
        message: 'Sinkronisasi berhasil: ' + (insertedCount + updatedCount) + ' data diproses (' + insertedCount + ' baru, ' + updatedCount + ' diperbarui).',
        inserted: insertedCount,
        updated: updatedCount,
        totalRows: Math.max(0, sheet.getLastRow() - 1),
        spreadsheetUrl: ss.getUrl()
      });
    }

    // Single Attendance Record Sync
    var recData = payload.record || payload;
    var result = processAttendanceRecord(sheet, recData);

    return responseJSON({
      success: true,
      message: result.updated ? 'Data absensi berhasil diperbarui di spreadsheet.' : 'Data absensi baru berhasil dicatat di spreadsheet.',
      action: result.updated ? 'updated' : 'inserted',
      row: result.row,
      spreadsheetUrl: ss.getUrl()
    });

  } catch (err) {
    return responseJSON({
      success: false,
      error: err.toString()
    });
  }
}

function doGet(e) {
  return responseJSON({
    status: 'online',
    app: 'Sistem Absensi Guru Madrasah Diniyah Miftahul Huda - PP Al Is\\'af',
    message: 'Web App Apps Script aktif. Gunakan metode POST dari aplikasi untuk mengirim data absensi.',
    timestamp: new Date().toISOString()
  });
}

function setupHeaders(sheet) {
  var headers = [
    'Timestamp Catat',
    'Tanggal',
    'Hari',
    'NIP Guru',
    'Nama Lengkap Guru',
    'Mata Pelajaran',
    'Jam Masuk',
    'Status Kehadiran',
    'Lokasi Masuk',
    'Jarak Masuk (m)',
    'Jam Pulang',
    'Lokasi Pulang',
    'Jarak Pulang (m)',
    'Keterangan'
  ];

  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#0284c7'); // Sky-600
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  headerRange.setVerticalAlignment('middle');
  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);
}

function processAttendanceRecord(sheet, rec) {
  var data = sheet.getDataRange().getValues();
  var targetRow = -1;

  var recTanggal = String(rec.tanggal || '');
  var recNip = String(rec.nip || '');
  var recNama = String(rec.nama_guru || rec.nama || '');

  // Search existing row for the same date & teacher
  for (var r = 1; r < data.length; r++) {
    var rowTanggal = formatDateString(data[r][1]);
    var rowNip = String(data[r][3] || '');
    var rowNama = String(data[r][4] || '');

    var matchNip = recNip && rowNip && (recNip === rowNip);
    var matchNama = recNama && rowNama && (recNama.toLowerCase() === rowNama.toLowerCase());

    if (rowTanggal === recTanggal && (matchNip || matchNama)) {
      targetRow = r + 1; // 1-indexed
      break;
    }
  }

  var rowValues = [
    rec.timestamp || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    rec.tanggal || '',
    rec.hari || '',
    rec.nip || '-',
    rec.nama_guru || rec.nama || '',
    rec.mata_pelajaran || rec.mapel || '-',
    rec.jam_masuk || '-',
    rec.status || 'MASUK',
    rec.lokasi_masuk || 'DI DALAM PONDOK',
    rec.jarak_masuk !== undefined && rec.jarak_masuk !== null ? rec.jarak_masuk : (rec.jarak || 0),
    rec.jam_pulang || '-',
    rec.lokasi_pulang || '-',
    rec.jarak_pulang !== undefined && rec.jarak_pulang !== null ? rec.jarak_pulang : 0,
    rec.keterangan || '-'
  ];

  if (targetRow > 0) {
    // Preserve existing jam_masuk / lokasi_masuk if updating only check-out
    var existingRow = data[targetRow - 1];
    if ((!rec.jam_masuk || rec.jam_masuk === '-') && existingRow[6]) {
      rowValues[6] = existingRow[6];
    }
    if ((!rec.lokasi_masuk || rec.lokasi_masuk === '-') && existingRow[8]) {
      rowValues[8] = existingRow[8];
    }
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
    return { updated: true, row: targetRow };
  } else {
    sheet.appendRow(rowValues);
    return { updated: false, row: sheet.getLastRow() };
  }
}

function formatDateString(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  return String(val).substring(0, 10);
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export async function getGasConfig(): Promise<GasConfig> {
  const settings = await queryOne<{
    gas_url?: string;
    gas_auto_sync?: number;
    gas_sheet_name?: string;
  }>("SELECT gas_url, gas_auto_sync, gas_sheet_name FROM pengaturan WHERE id = 1");

  const envUrl = process.env.GOOGLE_APPS_SCRIPT_URL || "";
  const url = (settings?.gas_url || envUrl || "").trim();
  const autoSync = settings?.gas_auto_sync !== undefined ? Boolean(settings.gas_auto_sync) : true;
  const sheetName = (settings?.gas_sheet_name || DEFAULT_GAS_SHEET_NAME).trim();

  return { url, autoSync, sheetName };
}

export async function sendToGoogleAppsScript(url: string, payload: any): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  if (!url || !url.startsWith("http")) {
    return {
      success: false,
      message: "URL Google Apps Script belum dikonfigurasi.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      return {
        success: false,
        message: json?.error || `Google Apps Script mengembalikan status HTTP ${res.status}`,
        data: json,
      };
    }

    if (json && json.success === false) {
      return {
        success: false,
        message: json.error || "Gagal memproses data di Google Spreadsheet.",
        data: json,
      };
    }

    return {
      success: true,
      message: json?.message || "Data berhasil dikirim ke Google Spreadsheet.",
      data: json,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      success: false,
      message: err.name === "AbortError" 
        ? "Batas waktu koneksi ke Google Apps Script habis (timeout 15 detik)."
        : (err.message || "Gagal terhubung ke Google Apps Script."),
    };
  }
}

export async function testGasConnection(targetUrl?: string, sheetName?: string) {
  const config = await getGasConfig();
  const url = targetUrl || config.url;
  const sheet = sheetName || config.sheetName;

  if (!url) {
    return {
      success: false,
      message: "URL Web App Google Apps Script belum diisi.",
    };
  }

  return await sendToGoogleAppsScript(url, {
    action: "ping",
    sheetName: sheet,
    timestamp: new Date().toISOString(),
  });
}

export function formatAttendanceForGas(row: any) {
  return {
    id: row.id,
    tanggal: row.tanggal,
    hari: row.hari,
    nip: row.nip || "-",
    nama_guru: row.nama_guru || row.nama || "",
    mata_pelajaran: row.mata_pelajaran || row.mapel || "-",
    jam_masuk: row.jam_masuk || "-",
    status: row.status || "MASUK",
    lokasi_masuk: row.lokasi_masuk || "DI DALAM PONDOK",
    jarak_masuk: row.latitude_masuk ? 0 : 0,
    jam_pulang: row.jam_pulang || "-",
    lokasi_pulang: row.lokasi_pulang || "-",
    jarak_pulang: 0,
    keterangan: row.keterangan || "-",
    timestamp: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

/**
 * Asynchronously synchronizes a single attendance record to Google Apps Script.
 * Runs in the background so that user check-in / check-out is never delayed.
 */
export async function syncSingleAttendanceToGas(absensiId: number): Promise<void> {
  const config = await getGasConfig();
  if (!config.url || !config.autoSync) {
    return;
  }

  // Fetch full joined record
  const record = await queryOne<any>(`
    SELECT 
      a.*,
      g.nama as nama_guru,
      g.nip,
      g.mata_pelajaran
    FROM absensi a
    JOIN guru g ON a.guru_id = g.id
    WHERE a.id = ?
  `, [absensiId]);

  if (!record) return;

  const payload = {
    action: "sync_attendance",
    sheetName: config.sheetName,
    record: formatAttendanceForGas(record),
  };

  try {
    const res = await sendToGoogleAppsScript(config.url, payload);
    const now = new Date().toISOString();
    if (res.success) {
      await run("UPDATE absensi SET sync_status = 'synced', synced_at = ? WHERE id = ?", [now, absensiId]);
    } else {
      await run("UPDATE absensi SET sync_status = 'failed' WHERE id = ?", [absensiId]);
    }
  } catch {
    await run("UPDATE absensi SET sync_status = 'failed' WHERE id = ?", [absensiId]);
  }
}

/**
 * Syncs multiple attendance records in batch to Google Apps Script
 */
export async function syncBatchAttendanceToGas(filter?: {
  tanggal?: string;
  bulan?: string;
  tahun?: string;
  status?: string;
  guru_id?: number;
}): Promise<{
  success: boolean;
  message: string;
  totalSynced: number;
  data?: any;
}> {
  const config = await getGasConfig();
  if (!config.url) {
    return {
      success: false,
      message: "URL Google Apps Script belum dikonfigurasi. Atur di menu Pengaturan.",
      totalSynced: 0,
    };
  }

  let query = `
    SELECT 
      a.*,
      g.nama as nama_guru,
      g.nip,
      g.mata_pelajaran
    FROM absensi a
    JOIN guru g ON a.guru_id = g.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filter?.tanggal) {
    query += " AND a.tanggal = ?";
    params.push(filter.tanggal);
  }
  if (filter?.bulan && filter?.tahun) {
    const monthStr = filter.bulan.padStart(2, "0");
    query += " AND a.tanggal LIKE ?";
    params.push(`${filter.tahun}-${monthStr}-%`);
  }
  if (filter?.status && filter.status !== "ALL") {
    query += " AND a.status = ?";
    params.push(filter.status);
  }
  if (filter?.guru_id) {
    query += " AND a.guru_id = ?";
    params.push(filter.guru_id);
  }

  query += " ORDER BY a.tanggal ASC, a.jam_masuk ASC";

  const rows = await queryAll<any>(query, params);

  if (rows.length === 0) {
    return {
      success: true,
      message: "Tidak ada data absensi yang sesuai filter untuk disinkronkan.",
      totalSynced: 0,
    };
  }

  const records = rows.map(formatAttendanceForGas);

  const payload = {
    action: "batch_sync",
    sheetName: config.sheetName,
    records,
  };

  const res = await sendToGoogleAppsScript(config.url, payload);

  if (res.success) {
    const now = new Date().toISOString();
    const ids = rows.map((r) => r.id);
    // Mark them all synced
    for (const id of ids) {
      await run("UPDATE absensi SET sync_status = 'synced', synced_at = ? WHERE id = ?", [now, id]);
    }
    return {
      success: true,
      message: res.message || `${records.length} data absensi berhasil disinkronkan ke Google Spreadsheet.`,
      totalSynced: records.length,
      data: res.data,
    };
  } else {
    return {
      success: false,
      message: res.message || "Gagal menyinkronkan data ke Google Spreadsheet.",
      totalSynced: 0,
      data: res.data,
    };
  }
}
