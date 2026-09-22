import type { Database } from "sql.js";
// @ts-ignore
import initSqlJs from "sql.js/dist/sql-asm.js";
import { createClient, Client } from "@libsql/client";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

let sqlJsDb: Database | null = null;
let tursoClient: Client | null = null;

const dataDir = process.env.VERCEL ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "absensi.sqlite");
export const dbFilePath = dbFile;

export interface SettingRecord {
  id: number;
  nama_pondok: string;
  nama_madrasah: string;
  latitude_pondok: number;
  longitude_pondok: number;
  radius_absensi: number;
  jam_masuk: string;
  batas_terlambat: string;
  jam_pulang: string;
  hari_aktif?: string;
  logo_url?: string;
  gas_url?: string;
  gas_auto_sync?: number;
  gas_sheet_name?: string;
}

export function isUsingTurso(): boolean {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.trim().length > 0);
}

export async function initDatabase() {
  if (isUsingTurso()) {
    console.log("Connecting to Turso Cloud SQLite database...");
    const url = process.env.TURSO_DATABASE_URL!.trim();
    const authToken = process.env.TURSO_AUTH_TOKEN ? process.env.TURSO_AUTH_TOKEN.trim() : undefined;
    tursoClient = createClient({
      url,
      authToken,
    });
    console.log("Turso Cloud Client initialized successfully.");
  } else {
    console.log("Initializing local SQLite database (sql.js)...");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const SQL = await initSqlJs();

    if (fs.existsSync(dbFile)) {
      try {
        const fileBuffer = fs.readFileSync(dbFile);
        sqlJsDb = new SQL.Database(fileBuffer);
      } catch (e) {
        console.error("Failed to load existing db file, creating fresh DB:", e);
        sqlJsDb = new SQL.Database();
      }
    } else {
      sqlJsDb = new SQL.Database();
    }
  }

  // Create tables according to schema
  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS pengaturan (
      id INTEGER PRIMARY KEY,
      nama_pondok TEXT NOT NULL,
      nama_madrasah TEXT NOT NULL,
      latitude_pondok REAL NOT NULL,
      longitude_pondok REAL NOT NULL,
      radius_absensi REAL NOT NULL,
      jam_masuk TEXT NOT NULL,
      batas_terlambat TEXT NOT NULL,
      jam_pulang TEXT NOT NULL,
      hari_aktif TEXT,
      logo_url TEXT,
      gas_url TEXT,
      gas_auto_sync INTEGER DEFAULT 1,
      gas_sheet_name TEXT DEFAULT 'Absensi_Guru'
    );`,

    `CREATE TABLE IF NOT EXISTS guru (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      nip TEXT,
      no_hp TEXT,
      mata_pelajaran TEXT,
      status TEXT DEFAULT 'Aktif'
    );`,

    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      guru_id INTEGER,
      FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS absensi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guru_id INTEGER NOT NULL,
      tanggal TEXT NOT NULL,
      hari TEXT NOT NULL,
      jam_masuk TEXT,
      status TEXT NOT NULL,
      latitude_masuk REAL,
      longitude_masuk REAL,
      lokasi_masuk TEXT,
      keterangan_masuk TEXT,
      jam_pulang TEXT,
      latitude_pulang REAL,
      longitude_pulang REAL,
      lokasi_pulang TEXT,
      keterangan_pulang TEXT,
      keterangan TEXT,
      sync_status TEXT DEFAULT 'pending',
      synced_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS jadwal_pelajaran (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guru_id INTEGER NOT NULL,
      mata_pelajaran TEXT NOT NULL,
      kitab TEXT,
      kelas TEXT NOT NULL,
      hari TEXT NOT NULL,
      jam_mulai TEXT NOT NULL,
      jam_selesai TEXT NOT NULL,
      ruangan TEXT,
      keterangan TEXT,
      FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
    );`,
  ];

  for (const stmt of schemaStatements) {
    await execRaw(stmt);
  }

  // Ensure Google Apps Script columns exist in case of pre-existing database
  try { await execRaw("ALTER TABLE pengaturan ADD COLUMN gas_url TEXT;"); } catch {}
  try { await execRaw("ALTER TABLE pengaturan ADD COLUMN gas_auto_sync INTEGER DEFAULT 1;"); } catch {}
  try { await execRaw("ALTER TABLE pengaturan ADD COLUMN gas_sheet_name TEXT DEFAULT 'Absensi_Guru';"); } catch {}
  try { await execRaw("ALTER TABLE absensi ADD COLUMN sync_status TEXT DEFAULT 'pending';"); } catch {}
  try { await execRaw("ALTER TABLE absensi ADD COLUMN synced_at TEXT;"); } catch {}

  // Seed default settings if empty
  const settingsCount = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM pengaturan");
  if (!settingsCount || settingsCount.count === 0) {
    await run(
      `INSERT INTO pengaturan (id, nama_pondok, nama_madrasah, latitude_pondok, longitude_pondok, radius_absensi, jam_masuk, batas_terlambat, jam_pulang, hari_aktif, logo_url)
       VALUES (1, 'Pondok Pesantren Al Is''af', 'Madrasah Diniyah Miftahul Huda', -7.02558, 113.86542, 100, '20:00', '20:05', '21:30', 'Sabtu,Ahad,Senin,Selasa,Rabu,Kamis', '')`
    );
  }

  // Seed default admin if empty
  const adminUser = await queryOne<{ id: number }>("SELECT id FROM users WHERE username = 'admin'");
  if (!adminUser) {
    const adminPassHash = bcrypt.hashSync("admin123", 10);
    await run(`INSERT INTO users (username, password, role, guru_id) VALUES ('admin', '${adminPassHash}', 'Administrator', NULL)`);
  }

  // Seed default teachers and accounts if none exist
  const guruCount = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM guru");
  if (!guruCount || guruCount.count === 0) {
    const defaultGuruList = [
      {
        nama: "Ust. H. Ahmad Fauzi, S.Pd.I",
        nip: "19850412201001",
        no_hp: "081234567891",
        mapel: "Fiqih (Fathul Qorib)",
        username: "fauzi",
      },
      {
        nama: "Ust. M. Ridwan, M.Pd",
        nip: "19880721201202",
        no_hp: "081234567892",
        mapel: "Nahwu & Shorof (Al-Jurumiyah)",
        username: "ridwan",
      },
      {
        nama: "Ust. Hasan Basri, Lc",
        nip: "19910215201503",
        no_hp: "081234567893",
        mapel: "Hadits (Bulughul Maram)",
        username: "hasan",
      },
      {
        nama: "Usth. Siti Fatimah, S.Ag",
        nip: "19931109201704",
        no_hp: "081234567894",
        mapel: "Tarikh Islam (Khulashoh)",
        username: "fatimah",
      },
      {
        nama: "Ust. Zainal Abidin, S.Sy",
        nip: "19890528201405",
        no_hp: "081234567895",
        mapel: "Akhlaq (Taisirul Khollaq)",
        username: "zainal",
      },
      {
        nama: "Ust. Muhsin Al-Attas",
        nip: "19940301201906",
        no_hp: "081234567896",
        mapel: "Tajwid & Tahsin Al-Qur'an",
        username: "muhsin",
      },
    ];

    const passHash = bcrypt.hashSync("guru123", 10);

    for (const g of defaultGuruList) {
      await run(
        `INSERT INTO guru (nama, nip, no_hp, mata_pelajaran, status) VALUES (?, ?, ?, ?, 'Aktif')`,
        [g.nama, g.nip, g.no_hp, g.mapel]
      );
      const inserted = await queryOne<{ id: number }>("SELECT last_insert_rowid() as id");
      if (inserted) {
        await run(
          `INSERT INTO users (username, password, role, guru_id) VALUES (?, ?, 'Guru', ?)`,
          [g.username, passHash, inserted.id]
        );
      }
    }

    // Seed realistic attendance records for past 7 days so reports, statistics, charts are populated
    await seedInitialAttendance();
  }

  // Seed teaching schedules if empty
  await seedJadwalPelajaran();

  saveDb();
  console.log(`Database initialized successfully (${isUsingTurso() ? "Turso Cloud" : "Local SQLite"}).`);
}

async function execRaw(sql: string) {
  if (tursoClient) {
    await tursoClient.execute(sql);
  } else if (sqlJsDb) {
    sqlJsDb.run(sql);
  }
}

async function seedJadwalPelajaran() {
  const count = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM jadwal_pelajaran");
  if (count && count.count > 0) return;

  const teachers = await queryAll<{ id: number; nama: string; mata_pelajaran: string }>(
    "SELECT id, nama, mata_pelajaran FROM guru ORDER BY id ASC"
  );
  if (teachers.length === 0) return;

  const sampleSchedules = [
    // Ust. H. Ahmad Fauzi (Fiqih)
    { guruIdx: 0, mapel: "Fiqih Diniyah", kitab: "Fathul Qorib", kelas: "Kelas Ula A", hari: "Sabtu", mulai: "20:00", selesai: "21:30", ruangan: "Gedung A - R. 01", ket: "Bab Thoharoh & Sholat" },
    { guruIdx: 0, mapel: "Fiqih Diniyah", kitab: "Fathul Mu'in", kelas: "Kelas Ulya", hari: "Senin", mulai: "20:00", selesai: "21:30", ruangan: "Musholla Utama", ket: "Kajian Fiqih Muamalah" },
    { guruIdx: 0, mapel: "Ushul Fiqih", kitab: "Al-Waraqat", kelas: "Kelas Wustho", hari: "Jumat", mulai: "20:00", selesai: "21:30", ruangan: "Gedung B - R. 03", ket: "Kaidah Ushuliyyah" },

    // Ust. M. Ridwan (Nahwu & Shorof)
    { guruIdx: 1, mapel: "Nahwu", kitab: "Al-Jurumiyah", kelas: "Kelas Ula B", hari: "Ahad", mulai: "20:00", selesai: "21:30", ruangan: "Gedung A - R. 02", ket: "Bab Kalam & I'rab" },
    { guruIdx: 1, mapel: "Shorof", kitab: "Amtsilah At-Tashrifiyah", kelas: "Kelas Wustho", hari: "Selasa", mulai: "20:00", selesai: "21:30", ruangan: "Gedung B - R. 04", ket: "Tashrif Tsulatsi Mujarrad" },
    { guruIdx: 1, mapel: "Nahwu Lanjutan", kitab: "Alfiyah Ibnu Malik", kelas: "Kelas Ulya", hari: "Kamis", mulai: "20:00", selesai: "21:30", ruangan: "Aula Pesantren", ket: "Bait 1-50" },
    { guruIdx: 1, mapel: "Qowaidul I'rob", kitab: "Al-Qawa'id Al-Asasiyyah", kelas: "Kelas Wustho", hari: "Jumat", mulai: "20:00", selesai: "21:30", ruangan: "Gedung B - R. 04", ket: "Latihan I'rab Ayat Al-Qur'an" },

    // Ust. Hasan Basri (Hadits)
    { guruIdx: 2, mapel: "Hadits Ahkam", kitab: "Bulughul Maram", kelas: "Kelas Wustho", hari: "Sabtu", mulai: "20:00", selesai: "21:30", ruangan: "Gedung B - R. 03", ket: "Kitabus Sholah" },
    { guruIdx: 2, mapel: "Hadits Arbain", kitab: "Al-Arba'in An-Nawawiyyah", kelas: "Kelas Ula A", hari: "Rabu", mulai: "20:00", selesai: "21:30", ruangan: "Gedung A - R. 01", ket: "Hadits Niat & Rukun Iman" },
    { guruIdx: 2, mapel: "Mustholah Hadits", kitab: "Al-Baiquniyyah", kelas: "Kelas Ulya", hari: "Kamis", mulai: "20:00", selesai: "21:30", ruangan: "Perpustakaan Pondok", ket: "Sanad & Matan Hadits" },
    { guruIdx: 2, mapel: "Kajian Hadits Pilihan", kitab: "Riyadhus Shalihin", kelas: "Semua Santri", hari: "Jumat", mulai: "20:00", selesai: "21:30", ruangan: "Masjid Pesantren", ket: "Kajian Umum Malam Sabtu" },

    // Usth. Siti Fatimah (Tarikh Islam)
    { guruIdx: 3, mapel: "Tarikh Nabi", kitab: "Khulashoh Nurul Yaqin Juz 1", kelas: "Kelas Ula Putri", hari: "Ahad", mulai: "20:00", selesai: "21:30", ruangan: "Asrama Putri - Aula", ket: "Periode Makkah" },
    { guruIdx: 3, mapel: "Tarikh Sahabat", kitab: "Khulashoh Nurul Yaqin Juz 2", kelas: "Kelas Wustho Putri", hari: "Rabu", mulai: "20:00", selesai: "21:30", ruangan: "Asrama Putri - R. Belajar", ket: "Khulafaur Rasyidin" },
    { guruIdx: 3, mapel: "Tarikh Tasyri'", kitab: "Tarikhut Tasyri' Al-Islami", kelas: "Kelas Ulya Putri", hari: "Jumat", mulai: "20:00", selesai: "21:30", ruangan: "Asrama Putri - Aula", ket: "Sejarah Kodifikasi Fiqih" },

    // Ust. Zainal Abidin (Akhlaq)
    { guruIdx: 4, mapel: "Akhlaq Lil Banin", kitab: "Taisirul Khollaq", kelas: "Kelas Ula A", hari: "Senin", mulai: "20:00", selesai: "21:30", ruangan: "Gedung A - R. 01", ket: "Adab terhadap Orang Tua & Guru" },
    { guruIdx: 4, mapel: "Tasawuf / Akhlaq", kitab: "Bidayatul Hidayah", kelas: "Kelas Wustho", hari: "Selasa", mulai: "20:00", selesai: "21:30", ruangan: "Gedung B - R. 03", ket: "Adab Pergaulan & Qolbu" },
    { guruIdx: 4, mapel: "Ta'lim Muta'allim", kitab: "Ta'limul Muta'allim", kelas: "Kelas Santri Baru", hari: "Sabtu", mulai: "20:00", selesai: "21:30", ruangan: "Gedung A - R. 02", ket: "Niat dalam Menuntut Ilmu" },

    // Ust. Muhsin Al-Attas (Tajwid & Tahsin)
    { guruIdx: 5, mapel: "Ilmu Tajwid", kitab: "Tuhfatul Athfal", kelas: "Kelas Ula B", hari: "Ahad", mulai: "20:00", selesai: "21:30", ruangan: "Gedung Tahfidz", ket: "Hukum Nun Mati & Tanwin" },
    { guruIdx: 5, mapel: "Tajwid Mandhumah", kitab: "Al-Jazariyah", kelas: "Kelas Wustho", hari: "Selasa", mulai: "20:00", selesai: "21:30", ruangan: "Gedung Tahfidz", ket: "Makharijul Huruf & Sifat Huruf" },
    { guruIdx: 5, mapel: "Tahsin & Tilawah", kitab: "Tashih Tilawah", kelas: "Kelas Ulya", hari: "Kamis", mulai: "20:00", selesai: "21:30", ruangan: "Musholla Asrama", ket: "Praktek Bacaan Tartil Al-Qur'an" },
    { guruIdx: 5, mapel: "Tahfidz & Muraja'ah", kitab: "Musyafahah Al-Qur'an", kelas: "Halaqah Tahfidz", hari: "Jumat", mulai: "20:00", selesai: "21:30", ruangan: "Gedung Tahfidz", ket: "Setoran Hafalan Santri" },
  ];

  for (const s of sampleSchedules) {
    if (teachers[s.guruIdx]) {
      const guru = teachers[s.guruIdx];
      await run(
        `INSERT INTO jadwal_pelajaran (guru_id, mata_pelajaran, kitab, kelas, hari, jam_mulai, jam_selesai, ruangan, keterangan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [guru.id, s.mapel, s.kitab, s.kelas, s.hari, s.mulai, s.selesai, s.ruangan, s.ket]
      );
    }
  }
}

async function seedInitialAttendance() {
  const teachers = await queryAll<{ id: number; nama: string }>("SELECT id, nama FROM guru");
  if (teachers.length === 0) return;

  const dayNames = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const now = new Date();

  // Create attendance for previous 5 active days
  for (let i = 5; i >= 1; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = dayNames[d.getDay()];

    if (dayName === "Jumat") continue; // Day off in pesantren

    for (let idx = 0; idx < teachers.length; idx++) {
      const teacher = teachers[idx];
      let status = "MASUK";
      let jamMasuk = "19:55:20";
      let jamPulang = "21:32:10";
      let lokasiMasuk = "DI DALAM PONDOK";
      let lat = -7.02555 + (idx * 0.00003);
      let lng = 113.86540 + (idx * 0.00003);
      let ket = "Hadir mengajar";

      if ((idx + i) % 5 === 0) {
        status = "TERLAMBAT";
        jamMasuk = "20:08:45";
        ket = "Terlambat karena kendala jalan";
      } else if ((idx + i) % 7 === 0) {
        lokasiMasuk = "DI LUAR PONDOK";
        lat = -7.03100;
        lng = 113.87000;
        ket = "Absen dari gerbang luar";
      } else if (idx === 4 && i === 2) {
        status = "IZIN";
        jamMasuk = "";
        jamPulang = "";
        ket = "Izin ada acara keluarga";
        lokasiMasuk = "-";
        lat = 0;
        lng = 0;
      }

      await run(
        `INSERT INTO absensi (
          guru_id, tanggal, hari, jam_masuk, status,
          latitude_masuk, longitude_masuk, lokasi_masuk, keterangan_masuk,
          jam_pulang, latitude_pulang, longitude_pulang, lokasi_pulang, keterangan_pulang,
          keterangan, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          teacher.id,
          dateStr,
          dayName,
          jamMasuk,
          status,
          lat,
          lng,
          lokasiMasuk,
          lokasiMasuk,
          jamPulang,
          lat,
          lng,
          lokasiMasuk,
          lokasiMasuk,
          ket,
          `${dateStr} ${jamMasuk || "20:00:00"}`,
          `${dateStr} ${jamPulang || "21:30:00"}`,
        ]
      );
    }
  }
}

export function saveDb() {
  if (isUsingTurso()) {
    // Turso executes and persists mutations directly to cloud. No local disk save needed.
    return;
  }
  if (!sqlJsDb) return;
  try {
    const data = sqlJsDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFile, buffer);
  } catch (err) {
    console.error("Failed to save database file:", err);
  }
}

export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    if (tursoClient) {
      const rs = await tursoClient.execute({ sql, args: params });
      return rs.rows as unknown as T[];
    } else if (sqlJsDb) {
      const stmt = sqlJsDb.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as T);
      }
      stmt.free();
      return results;
    }
    return [];
  } catch (err) {
    console.error("SQL Error in queryAll:", sql, params, err);
    return [];
  }
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function run(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
  try {
    if (tursoClient) {
      const rs = await tursoClient.execute({ sql, args: params });
      const lastInsertId = rs.lastInsertRowid !== undefined ? Number(rs.lastInsertRowid) : 0;
      return {
        lastInsertRowid: lastInsertId,
        changes: rs.rowsAffected || 1,
      };
    } else if (sqlJsDb) {
      sqlJsDb.run(sql, params);
      saveDb();
      const row = await queryOne<{ id: number }>("SELECT last_insert_rowid() as id");
      const changesRow = await queryOne<{ count: number }>("SELECT changes() as count");
      return {
        lastInsertRowid: row ? row.id : 0,
        changes: changesRow ? changesRow.count : 1,
      };
    }
    return { lastInsertRowid: 0, changes: 0 };
  } catch (err) {
    console.error("SQL Error in run:", sql, params, err);
    throw err;
  }
}

export function getDatabase(): Database | null {
  return sqlJsDb;
}
