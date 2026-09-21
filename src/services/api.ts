import {
  User,
  Guru,
  AbsensiRecord,
  Pengaturan,
  ServerInfo,
  DashboardStats,
  MonthlyTeacherSummary,
  JadwalPelajaran,
  GasInfoResponse,
  GasTestResponse,
  GasSyncResponse,
} from "../types.ts";

const TOKEN_KEY = "absensi_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const GAS_URL = import.meta.env.VITE_GAS_URL;

  // Jika menggunakan GAS, kita bungkus semua route Express menjadi format POST "action"
  if (GAS_URL) {
    let action = path.replace("/api/", "").replace(/\//g, "_");
    
    // Parse existing body if any
    let bodyData = {};
    if (options.body && typeof options.body === "string") {
      try {
        bodyData = JSON.parse(options.body);
      } catch (e) {}
    }

    const payload = {
      action: action,
      token: token,
      method: options.method || "GET",
      ...bodyData
    };

    try {
      const res = await fetch(GAS_URL, {
        method: "POST", // Selalu POST untuk GAS
        headers: {
          "Content-Type": "text/plain;charset=utf-8", // Cegah CORS preflight
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data as T;
    } catch (err: any) {
      throw new Error(err.message || "Gagal menghubungi Google Apps Script.");
    }
  }

  // Fallback ke server Node.js lokal jika GAS_URL tidak ada
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(path, { ...options, headers });
  } catch (netErr: any) {
    throw new Error(netErr.message || "Gagal terhubung ke server. Periksa koneksi internet Anda.");
  }

  const contentType = res.headers.get("content-type") || "";
  let data: any = null;

  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Server error (${res.status}): ${res.statusText || "Layanan tidak tersedia"}`);
    }
    throw new Error("Format data yang diterima dari server tidak valid.");
  }

  if (!res.ok) {
    const errorMsg = data?.error || `Terjadi kesalahan pada sistem (Kode: ${res.status}).`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Public & Server Info
  getServerInfo: () => request<ServerInfo>("/api/server-info"),

  // Auth
  login: (username: string, password: string) =>
    request<{ message: string; token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getCurrentUser: () => request<{ user: User }>("/api/auth/me"),

  logout: () =>
    request<{ message: string }>("/api/auth/logout", {
      method: "POST",
    }),

  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  // Guru Attendance
  getTodayStatus: () =>
    request<{
      isTeacher: boolean;
      serverDate: string;
      serverTime: string;
      serverDay: string;
      record: AbsensiRecord | null;
      settings: Pengaturan;
    }>("/api/absensi/today-status"),

  checkIn: (payload: {
    latitude: number;
    longitude: number;
    keterangan?: string;
    jenisKehadiran?: string;
  }) =>
    request<{
      message: string;
      record: AbsensiRecord;
      status: string;
      lokasi: string;
      jarak: number;
      jamMasuk: string;
    }>("/api/absensi/check-in", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  checkOut: (payload: {
    latitude: number;
    longitude: number;
    keterangan?: string;
  }) =>
    request<{
      message: string;
      record: AbsensiRecord;
      jamPulang: string;
      lokasi: string;
      jarak: number;
    }>("/api/absensi/check-out", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMyHistory: (month?: string, year?: string) => {
    const params = new URLSearchParams();
    if (month) params.append("month", month);
    if (year) params.append("year", year);
    return request<{ records: AbsensiRecord[] }>(`/api/absensi/my-history?${params.toString()}`);
  },

  // Admin
  getDashboardStats: () => request<DashboardStats>("/api/admin/dashboard-stats"),

  getTodayAttendanceList: () =>
    request<{
      date: string;
      list: Array<{
        no: number;
        guru_id: number;
        nama: string;
        nip: string;
        mata_pelajaran: string;
        no_hp: string;
        sudah_absen: boolean;
        jam_masuk: string;
        jam_pulang: string;
        status: string;
        lokasi_masuk: string;
        lokasi_pulang: string;
        latitude: number | null;
        longitude: number | null;
        keterangan: string;
        absensi_id: number | null;
      }>;
    }>("/api/admin/today-attendance"),

  getRekap: (query: {
    search?: string;
    tanggal?: string;
    bulan?: string;
    tahun?: string;
    status?: string;
    lokasi?: string;
    guru_id?: string;
    page?: number;
    limit?: number;
    sort?: "asc" | "desc";
  }) => {
    const params = new URLSearchParams();
    if (query.search) params.append("search", query.search);
    if (query.tanggal) params.append("tanggal", query.tanggal);
    if (query.bulan) params.append("bulan", query.bulan);
    if (query.tahun) params.append("tahun", query.tahun);
    if (query.status) params.append("status", query.status);
    if (query.lokasi) params.append("lokasi", query.lokasi);
    if (query.guru_id) params.append("guru_id", query.guru_id);
    if (query.page) params.append("page", String(query.page));
    if (query.limit) params.append("limit", String(query.limit));
    if (query.sort) params.append("sort", query.sort);
    return request<{
      data: AbsensiRecord[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/api/admin/rekap?${params.toString()}`);
  },

  getMonthlyRekap: (bulan: string, tahun: string, guru_id?: string) => {
    const params = new URLSearchParams({ bulan, tahun });
    if (guru_id) params.append("guru_id", guru_id);
    return request<{
      bulan: string;
      tahun: string;
      data: MonthlyTeacherSummary[];
    }>(`/api/admin/monthly-rekap?${params.toString()}`);
  },

  submitManualAbsensi: (payload: {
    guru_id: number;
    tanggal: string;
    jam_masuk?: string;
    jam_pulang?: string;
    status: string;
    lokasi_masuk?: string;
    keterangan?: string;
  }) =>
    request<{ message: string }>("/api/admin/absensi/manual", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteAbsensi: (id: number) =>
    request<{ message: string }>(`/api/admin/absensi/${id}`, {
      method: "DELETE",
    }),

  // Admin Guru Management
  getGuruList: () => request<{ data: Guru[] }>("/api/admin/guru"),

  createGuru: (payload: {
    nama: string;
    nip?: string;
    no_hp?: string;
    mata_pelajaran?: string;
    username: string;
    password: string;
  }) =>
    request<{ message: string }>("/api/admin/guru", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateGuru: (
    id: number,
    payload: {
      nama: string;
      nip?: string;
      no_hp?: string;
      mata_pelajaran?: string;
      status?: "Aktif" | "Nonaktif";
      username?: string;
    }
  ) =>
    request<{ message: string }>(`/api/admin/guru/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  resetPasswordGuru: (id: number, newPassword: string) =>
    request<{ message: string }>(`/api/admin/guru/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }),

  deleteGuru: (id: number) =>
    request<{ message: string }>(`/api/admin/guru/${id}`, {
      method: "DELETE",
    }),

  // Admin Users
  getUsersList: () => request<{ data: any[] }>("/api/admin/users"),

  // Settings
  getSettings: () => request<{ data: Pengaturan }>("/api/settings"),

  updateSettings: (payload: Partial<Pengaturan>) =>
    request<{ message: string; data: Pengaturan }>("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  updateLogo: (logo_url: string) =>
    request<{ message: string; data: Pengaturan }>("/api/admin/pengaturan/logo", {
      method: "POST",
      body: JSON.stringify({ logo_url }),
    }),

  // Google Apps Script / Cloud Spreadsheet Sync
  getGasInfo: () => request<GasInfoResponse>("/api/admin/gas/info"),

  testGasConnection: (payload: { url: string; sheetName?: string }) =>
    request<GasTestResponse>("/api/admin/gas/test", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  syncToGoogleSheets: (payload?: {
    tanggal?: string;
    bulan?: string;
    tahun?: string;
    status?: string;
    guru_id?: number;
  }) =>
    request<GasSyncResponse>("/api/admin/gas/sync", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    }),

  // Jadwal Pelajaran (Schedule & Reminders)
  getJadwal: (params?: {
    hari?: string;
    guru_id?: number | string;
    kelas?: string;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.hari) q.append("hari", params.hari);
    if (params?.guru_id) q.append("guru_id", String(params.guru_id));
    if (params?.kelas) q.append("kelas", params.kelas);
    if (params?.search) q.append("search", params.search);
    return request<{ data: JadwalPelajaran[] }>(`/api/jadwal?${q.toString()}`);
  },

  getTodayJadwal: () =>
    request<{
      day: string;
      date: string;
      currentTime: string;
      data: JadwalPelajaran[];
    }>("/api/jadwal/today"),

  createJadwal: (payload: {
    guru_id: number;
    mata_pelajaran: string;
    kitab?: string;
    kelas: string;
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
    ruangan?: string;
    keterangan?: string;
  }) =>
    request<{ message: string; id: number }>("/api/admin/jadwal", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateJadwal: (
    id: number,
    payload: {
      guru_id: number;
      mata_pelajaran: string;
      kitab?: string;
      kelas: string;
      hari: string;
      jam_mulai: string;
      jam_selesai: string;
      ruangan?: string;
      keterangan?: string;
    }
  ) =>
    request<{ message: string }>(`/api/admin/jadwal/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteJadwal: (id: number) =>
    request<{ message: string }>(`/api/admin/jadwal/${id}`, {
      method: "DELETE",
    }),

  // Backup & Restore Database
  getBackupStats: () =>
    request<{
      guruCount: number;
      usersCount: number;
      jadwalCount: number;
      absensiCount: number;
      sqliteSize: number;
      databaseFile: string;
      lastBackupRecommendation: string;
    }>("/api/admin/backup/stats"),

  restoreBackupJson: (backupData: any) =>
    request<{
      message: string;
      restored: {
        guru: number;
        users: number;
        jadwal: number;
        absensi: number;
        pengaturan: number;
      };
    }>("/api/admin/backup/restore-json", {
      method: "POST",
      body: JSON.stringify(backupData),
    }),
};
