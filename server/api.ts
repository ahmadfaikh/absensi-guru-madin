import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "absensi_fallback_secret_key_change_me_in_production";
import { queryAll, queryOne, run, SettingRecord, dbFilePath, saveDb } from "./db.ts";
import { getWIBDate, calculateDistanceMeters } from "./utils.ts";
import {
  syncSingleAttendanceToGas,
  syncBatchAttendanceToGas,
  testGasConnection,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  getGasConfig,
} from "./gas.ts";

export const apiRouter = express.Router();

// In-memory token store for sessions (token -> user payload)
interface SessionUser {
  id: number;
  username: string;
  role: "Administrator" | "Guru";
  guru_id: number | null;
  nama?: string;
  nip?: string;
  no_hp?: string;
  mata_pelajaran?: string;
}

// Authentication Middleware
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Sesi tidak valid atau telah berakhir. Silakan login kembali." });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { user: SessionUser };
    (req as any).user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Sesi telah kedaluwarsa atau tidak valid. Silakan login kembali." });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as SessionUser;
  if (!user || user.role !== "Administrator") {
    res.status(403).json({ error: "Akses ditolak. Fitur ini hanya untuk Administrator." });
    return;
  }
  next();
}

// ----------------------------------------------------
// Public & Auth Routes
// ----------------------------------------------------

// Server info & current time in WIB
apiRouter.get("/server-info", (req: Request, res: Response) => {
  const settings = queryOne<SettingRecord>("SELECT * FROM pengaturan WHERE id = 1");
  const wib = getWIBDate();
  res.json({
    currentTime: wib.timeStr,
    currentDate: wib.dateStr,
    currentDay: wib.dayName,
    timestamp: wib.timestamp,
    settings: settings || {
      nama_pondok: "Pondok Pesantren Al Is'af",
      nama_madrasah: "Madrasah Diniyah Miftahul Huda",
      latitude_pondok: -7.02558,
      longitude_pondok: 113.86542,
      radius_absensi: 100,
      jam_masuk: "20:00",
      batas_terlambat: "20:05",
      jam_pulang: "21:30",
      hari_aktif: "Sabtu,Ahad,Senin,Selasa,Rabu,Kamis",
    },
  });
});

// Login
apiRouter.post("/auth/login", (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username dan password wajib diisi." });
    return;
  }

  const user = queryOne<{
    id: number;
    username: string;
    password: string;
    role: "Administrator" | "Guru";
    guru_id: number | null;
  }>("SELECT * FROM users WHERE username = ?", [username.trim()]);

  if (!user) {
    res.status(401).json({ error: "Username atau password salah." });
    return;
  }

  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) {
    res.status(401).json({ error: "Username atau password salah." });
    return;
  }

  let teacherDetails: any = null;
  if (user.guru_id) {
    teacherDetails = queryOne<{
      id: number;
      nama: string;
      nip: string;
      no_hp: string;
      mata_pelajaran: string;
      status: string;
    }>("SELECT * FROM guru WHERE id = ?", [user.guru_id]);

    if (teacherDetails && teacherDetails.status === "Nonaktif") {
      res.status(403).json({ error: "Akun guru ini berstatus Nonaktif. Hubungi Administrator." });
      return;
    }
  }

  const sessionUser: SessionUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    guru_id: user.guru_id,
    nama: teacherDetails ? teacherDetails.nama : user.username,
    nip: teacherDetails?.nip,
    no_hp: teacherDetails?.no_hp,
    mata_pelajaran: teacherDetails?.mata_pelajaran,
  };

  const token = jwt.sign({ user: sessionUser }, JWT_SECRET, { expiresIn: "24h" });

  res.json({
    message: "Login berhasil",
    token,
    user: sessionUser,
  });
});

export function formatTeacherDbName(nama: string): string {
  const trimmed = nama.trim().replace(/\s+/g, " ");
  if (/^(ust\b|ust\.|usth\b|usth\.|ustadz\b|ustadzah\b|kyai\b|kh\b|kh\.|habib\b)/i.test(trimmed)) {
    if (/^ust\s+/i.test(trimmed)) return trimmed.replace(/^ust\s+/i, "Ust. ");
    if (/^usth\s+/i.test(trimmed)) return trimmed.replace(/^usth\s+/i, "Usth. ");
    return trimmed;
  }
  const capitalized = trimmed
    .split(" ")
    .map((w) => (w.includes(".") || w.length <= 1 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
  return `Ust. ${capitalized}`;
}

// Get current profile
apiRouter.get("/auth/me", authenticate, (req: Request, res: Response) => {
  const sessionUser = (req as any).user as SessionUser;
  if (sessionUser && sessionUser.guru_id) {
    const teacherDetails = queryOne<{
      id: number;
      nama: string;
      nip: string;
      no_hp: string;
      mata_pelajaran: string;
      status: string;
    }>("SELECT * FROM guru WHERE id = ?", [sessionUser.guru_id]);
    if (teacherDetails) {
      sessionUser.nama = teacherDetails.nama;
      sessionUser.nip = teacherDetails.nip;
      sessionUser.no_hp = teacherDetails.no_hp;
      sessionUser.mata_pelajaran = teacherDetails.mata_pelajaran;
    }
  }
  res.json({ user: sessionUser });
});

// Logout
apiRouter.post("/auth/logout", authenticate, (req: Request, res: Response) => {
  res.json({ message: "Logout berhasil" });
});

// Change Password
apiRouter.post("/auth/change-password", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as SessionUser;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    res.status(400).json({ error: "Password lama dan baru wajib diisi." });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password baru minimal 6 karakter." });
    return;
  }

  const dbUser = queryOne<{ password: string }>("SELECT password FROM users WHERE id = ?", [user.id]);
  if (!dbUser || !bcrypt.compareSync(oldPassword, dbUser.password)) {
    res.status(400).json({ error: "Password lama tidak sesuai." });
    return;
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  run("UPDATE users SET password = ? WHERE id = ?", [newHash, user.id]);

  res.json({ message: "Password berhasil diperbarui." });
});

// ----------------------------------------------------
// Guru Attendance Endpoints
// ----------------------------------------------------

// Check today's status for the logged-in guru
apiRouter.get("/absensi/today-status", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as SessionUser;
  if (!user.guru_id) {
    res.json({ isTeacher: false, record: null });
    return;
  }

  const { dateStr, timeStr, dayName } = getWIBDate();
  const record = queryOne(
    "SELECT * FROM absensi WHERE guru_id = ? AND tanggal = ?",
    [user.guru_id, dateStr]
  );

  const settings = queryOne<SettingRecord>("SELECT * FROM pengaturan WHERE id = 1");

  res.json({
    isTeacher: true,
    serverDate: dateStr,
    serverTime: timeStr,
    serverDay: dayName,
    record: record || null,
    settings,
  });
});

// ABSEN MASUK
apiRouter.post("/absensi/check-in", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as SessionUser;
  if (!user.guru_id) {
    res.status(403).json({ error: "Hanya akun Guru yang dapat melakukan absensi." });
    return;
  }

  const { latitude, longitude, keterangan, jenisKehadiran } = req.body;

  // Validation: Coordinates or permission check
  const latNum = parseFloat(latitude) || 0;
  const lngNum = parseFloat(longitude) || 0;

  const { dateStr, timeStr, dayName, timestamp } = getWIBDate();

  // Rule 13: "Guru tidak dapat melakukan absensi masuk dua kali pada tanggal/jadwal yang sama."
  const existing = queryOne(
    "SELECT id, status, jam_masuk FROM absensi WHERE guru_id = ? AND tanggal = ?",
    [user.guru_id, dateStr]
  );

  if (existing) {
    res.status(400).json({
      error: `Anda sudah melakukan absensi masuk hari ini (${dateStr}) pada pukul ${existing.jam_masuk}.`,
    });
    return;
  }

  // Load school settings
  const settings = queryOne<SettingRecord>("SELECT * FROM pengaturan WHERE id = 1") || {
    id: 1,
    nama_pondok: "Pondok Pesantren Al Is'af",
    nama_madrasah: "Madrasah Diniyah Miftahul Huda",
    latitude_pondok: -7.02558,
    longitude_pondok: 113.86542,
    radius_absensi: 100,
    jam_masuk: "20:00",
    batas_terlambat: "20:05",
    jam_pulang: "21:30",
  };

  // Determine Distance & Location status
  let distance = 0;
  let lokasiKeterangan = "DI LUAR PONDOK";

  if (latNum !== 0 && lngNum !== 0) {
    distance = calculateDistanceMeters(
      latNum,
      lngNum,
      settings.latitude_pondok,
      settings.longitude_pondok
    );

    if (distance <= settings.radius_absensi) {
      lokasiKeterangan = "DI DALAM PONDOK";
    } else {
      lokasiKeterangan = "DI LUAR PONDOK";
    }
  } else {
    lokasiKeterangan = "LOKASI TIDAK TERDETEKSI";
  }

  // Determine attendance status: MASUK / TERLAMBAT / or specific permission (Izin, Sakit, Dinas, etc.)
  let finalStatus = "MASUK";

  if (jenisKehadiran && ["IZIN", "SAKIT", "DINAS", "TUGAS PONDOK"].includes(jenisKehadiran.toUpperCase())) {
    finalStatus = jenisKehadiran.toUpperCase();
  } else {
    // Compare timeStr with batas_terlambat (e.g. 20:05)
    // Both are in "HH:mm" or "HH:mm:ss" string format
    const currentTimeClean = timeStr.substring(0, 5); // "HH:mm"
    const batasClean = settings.batas_terlambat.substring(0, 5);

    if (currentTimeClean <= batasClean) {
      finalStatus = "MASUK";
    } else {
      finalStatus = "TERLAMBAT";
    }
  }

  const finalKeterangan = keterangan
    ? `${keterangan.trim()} (Jarak: ${distance} m)`
    : `Jarak: ${distance} m dari titik pondok`;

  // Insert to relational table
  run(
    `INSERT INTO absensi (
      guru_id, tanggal, hari, jam_masuk, status,
      latitude_masuk, longitude_masuk, lokasi_masuk, keterangan_masuk,
      jam_pulang, latitude_pulang, longitude_pulang, lokasi_pulang, keterangan_pulang,
      keterangan, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?, ?)`,
    [
      user.guru_id,
      dateStr,
      dayName,
      timeStr,
      finalStatus,
      latNum,
      lngNum,
      lokasiKeterangan,
      lokasiKeterangan,
      finalKeterangan,
      timestamp,
      timestamp,
    ]
  );

  const inserted = queryOne<any>("SELECT * FROM absensi WHERE guru_id = ? AND tanggal = ?", [
    user.guru_id,
    dateStr,
  ]);

  if (inserted && inserted.id) {
    syncSingleAttendanceToGas(inserted.id).catch((err) => {
      console.error("Auto-sync to Google Apps Script failed:", err);
    });
  }

  res.json({
    message: "Absensi masuk berhasil dicatat.",
    record: inserted,
    status: finalStatus,
    lokasi: lokasiKeterangan,
    jarak: distance,
    jamMasuk: timeStr,
  });
});

// ABSEN PULANG
apiRouter.post("/absensi/check-out", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as SessionUser;
  if (!user.guru_id) {
    res.status(403).json({ error: "Hanya akun Guru yang dapat melakukan absensi." });
    return;
  }

  const { latitude, longitude, keterangan } = req.body;
  const latNum = parseFloat(latitude) || 0;
  const lngNum = parseFloat(longitude) || 0;

  const { dateStr, timeStr, timestamp } = getWIBDate();

  // Rule 13: "Guru tidak dapat melakukan absensi pulang sebelum melakukan absensi masuk."
  const existing = queryOne<{
    id: number;
    jam_masuk: string;
    jam_pulang: string | null;
  }>("SELECT id, jam_masuk, jam_pulang FROM absensi WHERE guru_id = ? AND tanggal = ?", [
    user.guru_id,
    dateStr,
  ]);

  if (!existing || !existing.jam_masuk) {
    res.status(400).json({
      error: "Anda belum melakukan absensi masuk hari ini. Silakan absen masuk terlebih dahulu.",
    });
    return;
  }

  // Rule 13: "Guru tidak dapat melakukan absensi pulang dua kali."
  if (existing.jam_pulang) {
    res.status(400).json({
      error: `Anda sudah melakukan absensi pulang hari ini pada pukul ${existing.jam_pulang}.`,
    });
    return;
  }

  const settings = queryOne<SettingRecord>("SELECT * FROM pengaturan WHERE id = 1") || {
    id: 1,
    nama_pondok: "Pondok Pesantren Al Is'af",
    nama_madrasah: "Madrasah Diniyah Miftahul Huda",
    latitude_pondok: -7.02558,
    longitude_pondok: 113.86542,
    radius_absensi: 100,
    jam_masuk: "20:00",
    batas_terlambat: "20:05",
    jam_pulang: "21:30",
  };

  let distance = 0;
  let lokasiKeterangan = "DI LUAR PONDOK";

  if (latNum !== 0 && lngNum !== 0) {
    distance = calculateDistanceMeters(
      latNum,
      lngNum,
      settings.latitude_pondok,
      settings.longitude_pondok
    );
    if (distance <= settings.radius_absensi) {
      lokasiKeterangan = "DI DALAM PONDOK";
    } else {
      lokasiKeterangan = "DI LUAR PONDOK";
    }
  } else {
    lokasiKeterangan = "LOKASI TIDAK TERDETEKSI";
  }

  const pulangKet = keterangan
    ? `${keterangan.trim()} (Jarak pulang: ${distance} m)`
    : `Jarak: ${distance} m dari titik pondok`;

  run(
    `UPDATE absensi SET
      jam_pulang = ?,
      latitude_pulang = ?,
      longitude_pulang = ?,
      lokasi_pulang = ?,
      keterangan_pulang = ?,
      updated_at = ?
     WHERE id = ?`,
    [timeStr, latNum, lngNum, lokasiKeterangan, pulangKet, timestamp, existing.id]
  );

  const updated = queryOne("SELECT * FROM absensi WHERE id = ?", [existing.id]);

  // Sync to Google Apps Script in background
  syncSingleAttendanceToGas(existing.id).catch((err) => {
    console.error("Auto-sync to Google Apps Script failed:", err);
  });

  res.json({
    message: "Absensi pulang berhasil dicatat.",
    record: updated,
    jamPulang: timeStr,
    lokasi: lokasiKeterangan,
    jarak: distance,
  });
});

// Guru's personal attendance history
apiRouter.get("/absensi/my-history", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as SessionUser;
  if (!user.guru_id) {
    res.status(403).json({ error: "Fitur ini hanya untuk akun Guru." });
    return;
  }

  const { month, year } = req.query;
  let sql = `SELECT a.*, g.nama as nama_guru, g.mata_pelajaran 
             FROM absensi a 
             JOIN guru g ON a.guru_id = g.id 
             WHERE a.guru_id = ?`;
  const params: any[] = [user.guru_id];

  if (month && year) {
    const monthFormatted = String(month).padStart(2, "0");
    const prefix = `${year}-${monthFormatted}`;
    sql += ` AND a.tanggal LIKE ?`;
    params.push(`${prefix}%`);
  }

  sql += ` ORDER BY a.tanggal DESC, a.jam_masuk DESC`;

  const rows = queryAll(sql, params);
  res.json({ records: rows });
});

// ----------------------------------------------------
// Administrator Endpoints
// ----------------------------------------------------

// Admin Dashboard statistics
apiRouter.get("/admin/dashboard-stats", authenticate, requireAdmin, (req: Request, res: Response) => {
  const { dateStr } = getWIBDate();

  // Total active teachers
  const totalGuruRow = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM guru WHERE status = 'Aktif'");
  const totalGuru = totalGuruRow ? totalGuruRow.count : 0;

  // Today's attendance records
  const todayRecords = queryAll<any>(
    `SELECT a.*, g.nama, g.nip, g.mata_pelajaran
     FROM absensi a
     JOIN guru g ON a.guru_id = g.id
     WHERE a.tanggal = ?`,
    [dateStr]
  );

  const sudahAbsenCount = todayRecords.length;
  const belumAbsenCount = Math.max(0, totalGuru - sudahAbsenCount);

  let tepatWaktuCount = 0;
  let terlambatCount = 0;
  let tidakMasukCount = 0;
  let diDalamPondokCount = 0;
  let diLuarPondokCount = 0;

  todayRecords.forEach((r) => {
    if (r.status === "MASUK") tepatWaktuCount++;
    else if (r.status === "TERLAMBAT") terlambatCount++;
    else if (["IZIN", "SAKIT", "TIDAK MASUK"].includes(r.status)) tidakMasukCount++;

    if (r.lokasi_masuk === "DI DALAM PONDOK") diDalamPondokCount++;
    else diLuarPondokCount++;
  });

  // Recent 7 days chart data
  const chartData = [];
  const dayNames = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dStr = d.toISOString().split("T")[0];
    const dayLabel = `${dayNames[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;

    const stats = queryOne<{ tepat: number; lambat: number; izin: number }>(
      `SELECT 
        SUM(CASE WHEN status = 'MASUK' THEN 1 ELSE 0 END) as tepat,
        SUM(CASE WHEN status = 'TERLAMBAT' THEN 1 ELSE 0 END) as lambat,
        SUM(CASE WHEN status IN ('IZIN','SAKIT','TIDAK MASUK') THEN 1 ELSE 0 END) as izin
       FROM absensi WHERE tanggal = ?`,
      [dStr]
    ) || { tepat: 0, lambat: 0, izin: 0 };

    chartData.push({
      date: dStr,
      label: dayLabel,
      tepatWaktu: Number(stats.tepat) || 0,
      terlambat: Number(stats.lambat) || 0,
      izin: Number(stats.izin) || 0,
      total: (Number(stats.tepat) || 0) + (Number(stats.lambat) || 0) + (Number(stats.izin) || 0),
    });
  }

  res.json({
    date: dateStr,
    totalGuru,
    sudahAbsen: sudahAbsenCount,
    belumAbsen: belumAbsenCount,
    tepatWaktu: tepatWaktuCount,
    terlambat: terlambatCount,
    tidakMasuk: tidakMasukCount,
    diDalamPondok: diDalamPondokCount,
    diLuarPondok: diLuarPondokCount,
    chartData,
  });
});

// Admin Today's Attendance list (with missing teachers marked as Belum Absen)
apiRouter.get("/admin/today-attendance", authenticate, requireAdmin, (req: Request, res: Response) => {
  const { dateStr } = getWIBDate();

  const allTeachers = queryAll<any>("SELECT * FROM guru WHERE status = 'Aktif' ORDER BY nama ASC");
  const attendanceToday = queryAll<any>("SELECT * FROM absensi WHERE tanggal = ?", [dateStr]);

  const map = new Map<number, any>();
  attendanceToday.forEach((att) => map.set(att.guru_id, att));

  const list = allTeachers.map((guru, index) => {
    const att = map.get(guru.id);
    return {
      no: index + 1,
      guru_id: guru.id,
      nama: guru.nama,
      nip: guru.nip,
      mata_pelajaran: guru.mata_pelajaran,
      no_hp: guru.no_hp,
      sudah_absen: !!att,
      jam_masuk: att ? att.jam_masuk : "-",
      jam_pulang: att && att.jam_pulang ? att.jam_pulang : "-",
      status: att ? att.status : "BELUM ABSEN",
      lokasi_masuk: att ? att.lokasi_masuk : "-",
      lokasi_pulang: att && att.lokasi_pulang ? att.lokasi_pulang : "-",
      latitude: att ? att.latitude_masuk : null,
      longitude: att ? att.longitude_masuk : null,
      keterangan: att ? att.keterangan : "-",
      absensi_id: att ? att.id : null,
    };
  });

  res.json({ date: dateStr, list });
});

// Admin Recap Table with Search, Filter, Sort, Pagination
apiRouter.get("/admin/rekap", authenticate, requireAdmin, (req: Request, res: Response) => {
  const {
    search,
    tanggal,
    bulan,
    tahun,
    status,
    lokasi,
    guru_id,
    page = "1",
    limit = "15",
    sort = "desc",
  } = req.query;

  let whereClauses: string[] = ["1=1"];
  const params: any[] = [];

  if (search) {
    whereClauses.push("(g.nama LIKE ? OR g.nip LIKE ? OR g.mata_pelajaran LIKE ?)");
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (tanggal) {
    whereClauses.push("a.tanggal = ?");
    params.push(tanggal);
  }

  if (bulan && tahun) {
    const m = String(bulan).padStart(2, "0");
    whereClauses.push("a.tanggal LIKE ?");
    params.push(`${tahun}-${m}%`);
  } else if (tahun) {
    whereClauses.push("a.tanggal LIKE ?");
    params.push(`${tahun}-%`);
  }

  if (status && status !== "ALL") {
    whereClauses.push("a.status = ?");
    params.push(status);
  }

  if (lokasi && lokasi !== "ALL") {
    whereClauses.push("(a.lokasi_masuk = ? OR a.lokasi_pulang = ?)");
    params.push(lokasi, lokasi);
  }

  if (guru_id && guru_id !== "ALL") {
    whereClauses.push("a.guru_id = ?");
    params.push(guru_id);
  }

  const whereStr = whereClauses.join(" AND ");

  // Count total records
  const countRow = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count 
     FROM absensi a 
     JOIN guru g ON a.guru_id = g.id 
     WHERE ${whereStr}`,
    params
  );
  const total = countRow ? countRow.count : 0;

  // Pagination
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(5, parseInt(limit as string) || 15));
  const offset = (pageNum - 1) * limitNum;

  const sortOrder = sort === "asc" ? "ASC" : "DESC";

  const rows = queryAll<any>(
    `SELECT a.*, g.nama as nama_guru, g.nip, g.mata_pelajaran, g.no_hp
     FROM absensi a
     JOIN guru g ON a.guru_id = g.id
     WHERE ${whereStr}
     ORDER BY a.tanggal ${sortOrder}, a.jam_masuk ${sortOrder}
     LIMIT ${limitNum} OFFSET ${offset}`,
    params
  );

  res.json({
    data: rows,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  });
});

// Admin Monthly Recap Aggregation
apiRouter.get("/admin/monthly-rekap", authenticate, requireAdmin, (req: Request, res: Response) => {
  const { bulan, tahun, guru_id } = req.query;

  const now = new Date();
  const selectedYear = tahun ? String(tahun) : String(now.getFullYear());
  const selectedMonth = bulan ? String(bulan).padStart(2, "0") : String(now.getMonth() + 1).padStart(2, "0");
  const monthPrefix = `${selectedYear}-${selectedMonth}`;

  let guruQuery = "SELECT id, nama, nip, mata_pelajaran FROM guru WHERE status = 'Aktif'";
  const guruParams: any[] = [];
  if (guru_id && guru_id !== "ALL") {
    guruQuery += " AND id = ?";
    guruParams.push(guru_id);
  }
  guruQuery += " ORDER BY nama ASC";

  const teachers = queryAll<any>(guruQuery, guruParams);

  const report = teachers.map((t, idx) => {
    const stats = queryOne<{
      total_hadir: number;
      tepat_waktu: number;
      terlambat: number;
      tidak_masuk: number;
      di_dalam: number;
      di_luar: number;
    }>(
      `SELECT 
        COUNT(CASE WHEN status IN ('MASUK', 'TERLAMBAT') THEN 1 END) as total_hadir,
        COUNT(CASE WHEN status = 'MASUK' THEN 1 END) as tepat_waktu,
        COUNT(CASE WHEN status = 'TERLAMBAT' THEN 1 END) as terlambat,
        COUNT(CASE WHEN status IN ('IZIN', 'SAKIT', 'TIDAK MASUK') THEN 1 END) as tidak_masuk,
        COUNT(CASE WHEN lokasi_masuk = 'DI DALAM PONDOK' THEN 1 END) as di_dalam,
        COUNT(CASE WHEN lokasi_masuk = 'DI LUAR PONDOK' THEN 1 END) as di_luar
       FROM absensi 
       WHERE guru_id = ? AND tanggal LIKE ?`,
      [t.id, `${monthPrefix}%`]
    ) || {
      total_hadir: 0,
      tepat_waktu: 0,
      terlambat: 0,
      tidak_masuk: 0,
      di_dalam: 0,
      di_luar: 0,
    };

    return {
      no: idx + 1,
      guru_id: t.id,
      nama: t.nama,
      nip: t.nip || "-",
      mata_pelajaran: t.mata_pelajaran,
      jumlah_hadir: stats.total_hadir || 0,
      tepat_waktu: stats.tepat_waktu || 0,
      terlambat: stats.terlambat || 0,
      tidak_masuk: stats.tidak_masuk || 0,
      di_dalam_pondok: stats.di_dalam || 0,
      di_luar_pondok: stats.di_luar || 0,
    };
  });

  res.json({
    bulan: selectedMonth,
    tahun: selectedYear,
    data: report,
  });
});

// Admin Manual Attendance entry (for corrections/leaves)
apiRouter.post("/admin/absensi/manual", authenticate, requireAdmin, (req: Request, res: Response) => {
  const { guru_id, tanggal, jam_masuk, jam_pulang, status, lokasi_masuk, keterangan } = req.body;

  if (!guru_id || !tanggal || !status) {
    res.status(400).json({ error: "Guru, tanggal, dan status wajib diisi." });
    return;
  }

  const dayNames = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const d = new Date(tanggal);
  const hari = isNaN(d.getTime()) ? "Senin" : dayNames[d.getDay()];
  const timestamp = `${tanggal} ${jam_masuk || "20:00:00"}`;

  // Check if record exists for that date
  const existing = queryOne<{ id: number }>("SELECT id FROM absensi WHERE guru_id = ? AND tanggal = ?", [
    guru_id,
    tanggal,
  ]);

  if (existing) {
    run(
      `UPDATE absensi SET
        jam_masuk = ?,
        jam_pulang = ?,
        status = ?,
        lokasi_masuk = ?,
        keterangan = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        jam_masuk || "-",
        jam_pulang || "-",
        status,
        lokasi_masuk || "DI DALAM PONDOK",
        keterangan || "Diinput manual oleh Admin",
        timestamp,
        existing.id,
      ]
    );
    syncSingleAttendanceToGas(existing.id).catch(() => {});
    res.json({ message: "Data absensi berhasil diperbarui." });
  } else {
    run(
      `INSERT INTO absensi (
        guru_id, tanggal, hari, jam_masuk, status,
        lokasi_masuk, jam_pulang, lokasi_pulang, keterangan, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guru_id,
        tanggal,
        hari,
        jam_masuk || "-",
        status,
        lokasi_masuk || "DI DALAM PONDOK",
        jam_pulang || "-",
        lokasi_masuk || "DI DALAM PONDOK",
        keterangan || "Diinput manual oleh Admin",
        timestamp,
        timestamp,
      ]
    );
    const newRecord = queryOne<{ id: number }>("SELECT id FROM absensi WHERE guru_id = ? AND tanggal = ?", [guru_id, tanggal]);
    if (newRecord?.id) {
      syncSingleAttendanceToGas(newRecord.id).catch(() => {});
    }
    res.json({ message: "Data absensi manual berhasil ditambahkan." });
  }
});

// Admin Delete Attendance Record
apiRouter.delete("/admin/absensi/:id", authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  run("DELETE FROM absensi WHERE id = ?", [id]);
  res.json({ message: "Data absensi berhasil dihapus." });
});

// ----------------------------------------------------
// Guru Management Endpoints (Admin)
// ----------------------------------------------------

apiRouter.get("/admin/guru", authenticate, requireAdmin, (req: Request, res: Response) => {
  const teachers = queryAll<any>(
    `SELECT g.*, u.username, u.id as user_id
     FROM guru g
     LEFT JOIN users u ON u.guru_id = g.id
     ORDER BY g.id ASC`
  );
  res.json({ data: teachers });
});

apiRouter.post("/admin/guru", authenticate, requireAdmin, (req: Request, res: Response) => {
  const { nama, nip, no_hp, mata_pelajaran, username, password } = req.body;

  if (!nama || !username || !password) {
    res.status(400).json({ error: "Nama lengkap, username, dan password wajib diisi." });
    return;
  }

  // Check username unique
  const userExists = queryOne("SELECT id FROM users WHERE username = ?", [username.trim()]);
  if (userExists) {
    res.status(400).json({ error: `Username "${username}" sudah digunakan.` });
    return;
  }

  const formattedNama = formatTeacherDbName(nama);

  run(
    "INSERT INTO guru (nama, nip, no_hp, mata_pelajaran, status) VALUES (?, ?, ?, ?, 'Aktif')",
    [formattedNama, nip ? nip.trim() : "", no_hp ? no_hp.trim() : "", mata_pelajaran ? mata_pelajaran.trim() : ""]
  );

  const lastGuru = queryOne<{ id: number }>("SELECT last_insert_rowid() as id");
  if (lastGuru) {
    const hash = bcrypt.hashSync(password, 10);
    run(
      "INSERT INTO users (username, password, role, guru_id) VALUES (?, ?, 'Guru', ?)",
      [username.trim(), hash, lastGuru.id]
    );
  }

  res.json({ message: "Data guru dan akun berhasil ditambahkan." });
});

apiRouter.put("/admin/guru/:id", authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { nama, nip, no_hp, mata_pelajaran, status, username } = req.body;

  if (!nama) {
    res.status(400).json({ error: "Nama guru wajib diisi." });
    return;
  }

  const formattedNama = formatTeacherDbName(nama);

  run(
    "UPDATE guru SET nama = ?, nip = ?, no_hp = ?, mata_pelajaran = ?, status = ? WHERE id = ?",
    [formattedNama, nip || "", no_hp || "", mata_pelajaran || "", status || "Aktif", id]
  );

  if (username) {
    // Check if another user uses this username
    const exists = queryOne<{ id: number }>(
      "SELECT id FROM users WHERE username = ? AND guru_id != ?",
      [username.trim(), id]
    );
    if (!exists) {
      run("UPDATE users SET username = ? WHERE guru_id = ?", [username.trim(), id]);
    }
  }

  res.json({ message: "Data guru berhasil diperbarui." });
});

apiRouter.post("/admin/guru/:id/reset-password", authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 5) {
    res.status(400).json({ error: "Password baru minimal 5 karakter." });
    return;
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  run("UPDATE users SET password = ? WHERE guru_id = ?", [hash, id]);

  res.json({ message: "Password guru berhasil direset." });
});

apiRouter.delete("/admin/guru/:id", authenticate, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  run("DELETE FROM users WHERE guru_id = ?", [id]);
  run("DELETE FROM absensi WHERE guru_id = ?", [id]);
  run("DELETE FROM guru WHERE id = ?", [id]);
  res.json({ message: "Data guru beserta riwayatnya berhasil dihapus." });
});

// ----------------------------------------------------
// User / Account Management (Admin)
// ----------------------------------------------------

apiRouter.get("/admin/users", authenticate, requireAdmin, (req: Request, res: Response) => {
  const users = queryAll<any>(
    `SELECT u.id, u.username, u.role, u.guru_id, g.nama as nama_guru 
     FROM users u 
     LEFT JOIN guru g ON u.guru_id = g.id 
     ORDER BY u.id ASC`
  );
  res.json({ data: users });
});

// ----------------------------------------------------
// Settings Endpoints
// ----------------------------------------------------

apiRouter.get("/settings", (req: Request, res: Response) => {
  const settings = queryOne<SettingRecord>("SELECT * FROM pengaturan WHERE id = 1");
  res.json({ data: settings });
});

apiRouter.put("/admin/settings", authenticate, requireAdmin, (req: Request, res: Response) => {
  const {
    nama_pondok,
    nama_madrasah,
    latitude_pondok,
    longitude_pondok,
    radius_absensi,
    jam_masuk,
    batas_terlambat,
    jam_pulang,
    hari_aktif,
    logo_url,
    gas_url,
    gas_auto_sync,
    gas_sheet_name,
  } = req.body;

  if (!nama_pondok || !nama_madrasah || !jam_masuk || !batas_terlambat) {
    res.status(400).json({ error: "Semua field pengaturan wajib diisi dengan benar." });
    return;
  }

  run(
    `UPDATE pengaturan SET
      nama_pondok = ?,
      nama_madrasah = ?,
      latitude_pondok = ?,
      longitude_pondok = ?,
      radius_absensi = ?,
      jam_masuk = ?,
      batas_terlambat = ?,
      jam_pulang = ?,
      hari_aktif = ?,
      logo_url = ?,
      gas_url = ?,
      gas_auto_sync = ?,
      gas_sheet_name = ?
     WHERE id = 1`,
    [
      nama_pondok.trim(),
      nama_madrasah.trim(),
      parseFloat(latitude_pondok) || -7.02558,
      parseFloat(longitude_pondok) || 113.86542,
      parseFloat(radius_absensi) || 100,
      jam_masuk.trim(),
      batas_terlambat.trim(),
      jam_pulang.trim(),
      hari_aktif || "Sabtu,Ahad,Senin,Selasa,Rabu,Kamis",
      logo_url || "",
      gas_url !== undefined ? String(gas_url).trim() : "",
      gas_auto_sync !== undefined ? (gas_auto_sync ? 1 : 0) : 1,
      gas_sheet_name ? String(gas_sheet_name).trim() : "Absensi_Guru",
    ]
  );

  const updated = queryOne("SELECT * FROM pengaturan WHERE id = 1");
  res.json({ message: "Pengaturan berhasil disimpan.", data: updated });
});

// Update Logo Pondok Only (Instant apply)
apiRouter.post("/admin/pengaturan/logo", authenticate, requireAdmin, (req: Request, res: Response) => {
  const { logo_url } = req.body;
  run("UPDATE pengaturan SET logo_url = ? WHERE id = 1", [logo_url ? String(logo_url) : ""]);
  const updated = queryOne("SELECT * FROM pengaturan WHERE id = 1");
  res.json({ message: "Logo pondok berhasil diperbarui.", data: updated });
});

// ==================== GOOGLE APPS SCRIPT / CLOUD SPREADSHEET ====================

// Test connection to Google Apps Script Web App
apiRouter.post("/admin/gas/test", authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { url, sheetName } = req.body;
  try {
    const result = await testGasConnection(url, sheetName);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Gagal menguji koneksi Google Apps Script." });
  }
});

// Batch sync attendance to Google Spreadsheet
apiRouter.post("/admin/gas/sync", authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { tanggal, bulan, tahun, status, guru_id } = req.body;
  try {
    const result = await syncBatchAttendanceToGas({
      tanggal,
      bulan,
      tahun,
      status,
      guru_id: guru_id ? parseInt(guru_id, 10) : undefined,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Gagal menyinkronkan data ke Google Spreadsheet." });
  }
});

// Get Google Apps Script Code Template and sync info
apiRouter.get("/admin/gas/info", authenticate, requireAdmin, (req: Request, res: Response) => {
  const config = getGasConfig();
  const totalCount = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM absensi")?.count || 0;
  const syncedCount = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM absensi WHERE sync_status = 'synced'")?.count || 0;
  const pendingCount = totalCount - syncedCount;

  res.json({
    config,
    stats: {
      totalRecords: totalCount,
      syncedRecords: syncedCount,
      pendingRecords: pendingCount,
    },
    scriptCode: GOOGLE_APPS_SCRIPT_TEMPLATE,
  });
});

// ==================== JADWAL PELAJARAN (REMINDER & SCHEDULE) ====================

// Get all schedules with filters
apiRouter.get("/jadwal", authenticate, (req: Request, res: Response) => {
  const { hari, guru_id, kelas, search } = req.query;

  let query = `
    SELECT 
      j.*,
      g.nama as nama_guru,
      g.nip as nip_guru,
      g.no_hp as no_hp_guru
    FROM jadwal_pelajaran j
    JOIN guru g ON j.guru_id = g.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (hari) {
    query += " AND LOWER(j.hari) = LOWER(?)";
    params.push(hari);
  }

  if (guru_id) {
    query += " AND j.guru_id = ?";
    params.push(guru_id);
  }

  if (kelas) {
    query += " AND j.kelas LIKE ?";
    params.push(`%${kelas}%`);
  }

  if (search) {
    query += " AND (j.mata_pelajaran LIKE ? OR j.kitab LIKE ? OR g.nama LIKE ? OR j.ruangan LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ` ORDER BY 
    CASE j.hari
      WHEN 'Sabtu' THEN 1
      WHEN 'Ahad' THEN 2
      WHEN 'Senin' THEN 3
      WHEN 'Selasa' THEN 4
      WHEN 'Rabu' THEN 5
      WHEN 'Kamis' THEN 6
      WHEN 'Jumat' THEN 7
      ELSE 8
    END,
    j.jam_mulai ASC
  `;

  const rows = queryAll(query, params);
  res.json({ data: rows });
});

// Get today's schedule reminder
apiRouter.get("/jadwal/today", authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as SessionUser;
  const { dateStr, timeStr, dayName } = getWIBDate();

  let query = `
    SELECT 
      j.*,
      g.nama as nama_guru,
      g.nip as nip_guru,
      g.no_hp as no_hp_guru
    FROM jadwal_pelajaran j
    JOIN guru g ON j.guru_id = g.id
    WHERE LOWER(j.hari) = LOWER(?)
  `;
  const params: any[] = [dayName];

  // If role is Guru, show their schedule today
  if (user.role === "Guru" && user.guru_id) {
    query += " AND j.guru_id = ?";
    params.push(user.guru_id);
  }

  query += " ORDER BY j.jam_mulai ASC";

  const schedules = queryAll<any>(query, params);

  // Attach teacher's attendance status today as reminder
  const enriched = schedules.map((item) => {
    const attendance = queryOne<{
      id: number;
      jam_masuk: string;
      jam_pulang: string;
      status: string;
      lokasi_masuk: string;
    }>(
      "SELECT id, jam_masuk, jam_pulang, status, lokasi_masuk FROM absensi WHERE guru_id = ? AND tanggal = ?",
      [item.guru_id, dateStr]
    );

    let timingStatus: "upcoming" | "active" | "completed" = "upcoming";
    const nowHHMM = timeStr.substring(0, 5);
    const startHHMM = item.jam_mulai.substring(0, 5);
    const endHHMM = item.jam_selesai.substring(0, 5);

    if (nowHHMM >= startHHMM && nowHHMM <= endHHMM) {
      timingStatus = "active";
    } else if (nowHHMM > endHHMM) {
      timingStatus = "completed";
    } else {
      timingStatus = "upcoming";
    }

    return {
      ...item,
      attendance: attendance || null,
      sudah_absen: !!attendance,
      timingStatus,
    };
  });

  res.json({
    day: dayName,
    date: dateStr,
    currentTime: timeStr,
    data: enriched,
  });
});

// Admin Add Schedule
apiRouter.post("/admin/jadwal", authenticate, requireAdmin, (req: Request, res: Response) => {
  const {
    guru_id,
    mata_pelajaran,
    kitab,
    kelas,
    hari,
    jam_mulai,
    jam_selesai,
    ruangan,
    keterangan,
  } = req.body;

  if (!guru_id || !mata_pelajaran || !kelas || !hari || !jam_mulai || !jam_selesai) {
    res.status(400).json({ error: "Guru, Mata Pelajaran, Kelas, Hari, dan Jam Pelajaran wajib diisi." });
    return;
  }

  const result = run(
    `INSERT INTO jadwal_pelajaran (guru_id, mata_pelajaran, kitab, kelas, hari, jam_mulai, jam_selesai, ruangan, keterangan)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      guru_id,
      mata_pelajaran.trim(),
      kitab ? kitab.trim() : "",
      kelas.trim(),
      hari.trim(),
      jam_mulai.trim(),
      jam_selesai.trim(),
      ruangan ? ruangan.trim() : "",
      keterangan ? keterangan.trim() : "",
    ]
  );

  res.json({ message: "Jadwal pelajaran berhasil ditambahkan.", id: result.lastInsertRowid });
});

// Admin Update Schedule
apiRouter.put("/admin/jadwal/:id", authenticate, requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const {
    guru_id,
    mata_pelajaran,
    kitab,
    kelas,
    hari,
    jam_mulai,
    jam_selesai,
    ruangan,
    keterangan,
  } = req.body;

  if (!guru_id || !mata_pelajaran || !kelas || !hari || !jam_mulai || !jam_selesai) {
    res.status(400).json({ error: "Guru, Mata Pelajaran, Kelas, Hari, dan Jam Pelajaran wajib diisi." });
    return;
  }

  run(
    `UPDATE jadwal_pelajaran SET
      guru_id = ?,
      mata_pelajaran = ?,
      kitab = ?,
      kelas = ?,
      hari = ?,
      jam_mulai = ?,
      jam_selesai = ?,
      ruangan = ?,
      keterangan = ?
     WHERE id = ?`,
    [
      guru_id,
      mata_pelajaran.trim(),
      kitab ? kitab.trim() : "",
      kelas.trim(),
      hari.trim(),
      jam_mulai.trim(),
      jam_selesai.trim(),
      ruangan ? ruangan.trim() : "",
      keterangan ? keterangan.trim() : "",
      id,
    ]
  );

  res.json({ message: "Jadwal pelajaran berhasil diperbarui." });
});

// Admin Delete Schedule
apiRouter.delete("/admin/jadwal/:id", authenticate, requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  run("DELETE FROM jadwal_pelajaran WHERE id = ?", [id]);
  res.json({ message: "Jadwal pelajaran berhasil dihapus." });
});

// ==================== BACKUP & RESTORE DATA ====================

// Get overview stats of data for backup info
apiRouter.get("/admin/backup/stats", authenticate, requireAdmin, (req: Request, res: Response) => {
  const guruCount = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM guru")?.count || 0;
  const usersCount = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM users")?.count || 0;
  const jadwalCount = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM jadwal_pelajaran")?.count || 0;
  const absensiCount = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM absensi")?.count || 0;
  
  let sqliteSize = 0;
  try {
    if (fs.existsSync(dbFilePath)) {
      sqliteSize = fs.statSync(dbFilePath).size;
    }
  } catch {}

  res.json({
    guruCount,
    usersCount,
    jadwalCount,
    absensiCount,
    sqliteSize,
    databaseFile: "data/absensi.sqlite",
    lastBackupRecommendation: "Disarankan mengunduh backup secara berkala sebelum melakukan pembaruan atau tutup semester.",
  });
});

// Export complete JSON backup
apiRouter.get("/admin/backup/export-json", authenticate, requireAdmin, (req: Request, res: Response) => {
  const pengaturan = queryAll("SELECT * FROM pengaturan");
  const guru = queryAll("SELECT * FROM guru");
  const users = queryAll("SELECT id, username, password, role, guru_id FROM users");
  const jadwal_pelajaran = queryAll("SELECT * FROM jadwal_pelajaran");
  const absensi = queryAll("SELECT * FROM absensi");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPayload = {
    app: "Absensi Guru Madrasah Diniyah Miftahul Huda - PP Al Is'af",
    format: "AL_ISAF_BACKUP_V1",
    exported_at: new Date().toISOString(),
    stats: {
      total_guru: guru.length,
      total_users: users.length,
      total_jadwal: jadwal_pelajaran.length,
      total_absensi: absensi.length,
    },
    data: {
      pengaturan,
      guru,
      users,
      jadwal_pelajaran,
      absensi,
    },
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="backup-absensi-alisaf-${timestamp}.json"`);
  res.send(JSON.stringify(backupPayload, null, 2));
});

// Download raw SQLite database
apiRouter.get("/admin/backup/download-sqlite", authenticate, requireAdmin, (req: Request, res: Response) => {
  saveDb();
  if (!fs.existsSync(dbFilePath)) {
    res.status(404).json({ error: "File database SQLite tidak ditemukan." });
    return;
  }
  const timestamp = new Date().toISOString().slice(0, 10);
  res.download(dbFilePath, `absensi-alisaf-${timestamp}.sqlite`);
});

// Restore database from JSON backup
apiRouter.post("/admin/backup/restore-json", authenticate, requireAdmin, (req: Request, res: Response) => {
  const payload = req.body;
  const backupData = payload?.data || payload;

  if (!backupData || (!backupData.guru && !backupData.absensi && !backupData.pengaturan)) {
    res.status(400).json({ error: "Format file cadangan tidak valid atau data kosong." });
    return;
  }

  try {
    // 1. Restore Pengaturan if provided
    if (Array.isArray(backupData.pengaturan) && backupData.pengaturan.length > 0) {
      run("DELETE FROM pengaturan;");
      for (const p of backupData.pengaturan) {
        run(
          `INSERT INTO pengaturan (id, nama_pondok, nama_madrasah, latitude_pondok, longitude_pondok, radius_absensi, jam_masuk, batas_terlambat, jam_pulang, hari_aktif, logo_url, gas_url, gas_auto_sync, gas_sheet_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id || 1,
            p.nama_pondok || "Pondok Pesantren Al Is'af",
            p.nama_madrasah || "Madrasah Diniyah Miftahul Huda",
            p.latitude_pondok ?? -7.02558,
            p.longitude_pondok ?? 113.86542,
            p.radius_absensi ?? 100,
            p.jam_masuk || "20:00",
            p.batas_terlambat || "20:05",
            p.jam_pulang || "21:30",
            p.hari_aktif || "Sabtu,Ahad,Senin,Selasa,Rabu,Kamis",
            p.logo_url || "",
            p.gas_url || "",
            p.gas_auto_sync !== undefined ? p.gas_auto_sync : 1,
            p.gas_sheet_name || "Absensi_Guru",
          ]
        );
      }
    }

    // 2. Restore Guru
    if (Array.isArray(backupData.guru) && backupData.guru.length > 0) {
      run("DELETE FROM guru;");
      for (const g of backupData.guru) {
        run(
          `INSERT INTO guru (id, nama, nip, no_hp, mata_pelajaran, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [g.id, g.nama, g.nip || "", g.no_hp || "", g.mata_pelajaran || "", g.status || "Aktif"]
        );
      }
    }

    // 3. Restore Users
    if (Array.isArray(backupData.users) && backupData.users.length > 0) {
      run("DELETE FROM users;");
      for (const u of backupData.users) {
        run(
          `INSERT INTO users (id, username, password, role, guru_id)
           VALUES (?, ?, ?, ?, ?)`,
          [u.id, u.username, u.password, u.role, u.guru_id || null]
        );
      }
    }

    // 4. Restore Jadwal Pelajaran
    if (Array.isArray(backupData.jadwal_pelajaran)) {
      run("DELETE FROM jadwal_pelajaran;");
      for (const j of backupData.jadwal_pelajaran) {
        run(
          `INSERT INTO jadwal_pelajaran (id, guru_id, mata_pelajaran, kitab, kelas, hari, jam_mulai, jam_selesai, ruangan, keterangan)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [j.id, j.guru_id, j.mata_pelajaran, j.kitab || "", j.kelas, j.hari, j.jam_mulai, j.jam_selesai, j.ruangan || "", j.keterangan || ""]
        );
      }
    }

    // 5. Restore Absensi
    if (Array.isArray(backupData.absensi)) {
      run("DELETE FROM absensi;");
      for (const a of backupData.absensi) {
        run(
          `INSERT INTO absensi (id, guru_id, tanggal, hari, jam_masuk, status, latitude_masuk, longitude_masuk, lokasi_masuk, keterangan_masuk, jam_pulang, latitude_pulang, longitude_pulang, lokasi_pulang, keterangan_pulang, keterangan, sync_status, synced_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            a.id,
            a.guru_id,
            a.tanggal,
            a.hari,
            a.jam_masuk,
            a.status,
            a.latitude_masuk,
            a.longitude_masuk,
            a.lokasi_masuk || "",
            a.keterangan_masuk || "",
            a.jam_pulang || null,
            a.latitude_pulang || null,
            a.longitude_pulang || null,
            a.lokasi_pulang || "",
            a.keterangan_pulang || "",
            a.keterangan || "",
            a.sync_status || "synced",
            a.synced_at || null,
            a.created_at || a.tanggal,
            a.updated_at || a.tanggal,
          ]
        );
      }
    }

    saveDb();

    res.json({
      message: "Pemulihan data berhasil! Seluruh data telah diperbarui dari file cadangan.",
      restored: {
        guru: backupData.guru?.length || 0,
        users: backupData.users?.length || 0,
        jadwal: backupData.jadwal_pelajaran?.length || 0,
        absensi: backupData.absensi?.length || 0,
        pengaturan: backupData.pengaturan?.length || 0,
      },
    });
  } catch (err: any) {
    console.error("Error restoring backup:", err);
    res.status(500).json({ error: `Gagal memulihkan cadangan: ${err.message || String(err)}` });
  }
});

