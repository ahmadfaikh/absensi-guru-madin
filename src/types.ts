export interface User {
  id: number;
  username: string;
  role: "Administrator" | "Guru";
  guru_id: number | null;
  nama?: string;
  nip?: string;
  no_hp?: string;
  mata_pelajaran?: string;
}

export interface Guru {
  id: number;
  nama: string;
  nip?: string;
  no_hp?: string;
  mata_pelajaran?: string;
  status: "Aktif" | "Nonaktif";
  username?: string;
  user_id?: number;
}

export interface AbsensiRecord {
  id: number;
  guru_id: number;
  nama_guru?: string;
  nip?: string;
  mata_pelajaran?: string;
  no_hp?: string;
  tanggal: string;
  hari: string;
  jam_masuk: string | null;
  status: "MASUK" | "TERLAMBAT" | "IZIN" | "SAKIT" | "DINAS" | "TUGAS PONDOK" | "TIDAK MASUK" | string;
  latitude_masuk: number | null;
  longitude_masuk: number | null;
  lokasi_masuk: string | null;
  keterangan_masuk: string | null;
  jam_pulang: string | null;
  latitude_pulang: number | null;
  longitude_pulang: number | null;
  lokasi_pulang: string | null;
  keterangan_pulang: string | null;
  keterangan: string | null;
  sync_status?: "synced" | "pending" | "failed" | string;
  synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pengaturan {
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
  gas_auto_sync?: number | boolean;
  gas_sheet_name?: string;
}

export interface GasInfoResponse {
  config: {
    url: string;
    autoSync: boolean;
    sheetName: string;
  };
  stats: {
    totalRecords: number;
    syncedRecords: number;
    pendingRecords: number;
  };
  scriptCode: string;
}

export interface GasTestResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface GasSyncResponse {
  success: boolean;
  message: string;
  totalSynced?: number;
  data?: any;
}

export interface ServerInfo {
  currentTime: string;
  currentDate: string;
  currentDay: string;
  timestamp: string;
  settings: Pengaturan;
}

export interface DashboardStats {
  date: string;
  totalGuru: number;
  sudahAbsen: number;
  belumAbsen: number;
  tepatWaktu: number;
  terlambat: number;
  tidakMasuk: number;
  diDalamPondok: number;
  diLuarPondok: number;
  chartData: Array<{
    date: string;
    label: string;
    tepatWaktu: number;
    terlambat: number;
    izin: number;
    total: number;
  }>;
}

export interface MonthlyTeacherSummary {
  no: number;
  guru_id: number;
  nama: string;
  nip: string;
  mata_pelajaran: string;
  jumlah_hadir: number;
  tepat_waktu: number;
  terlambat: number;
  tidak_masuk: number;
  di_dalam_pondok: number;
  di_luar_pondok: number;
}

export type SettingPengaturan = Pengaturan;
export type MonthlySummaryItem = MonthlyTeacherSummary;

export interface JadwalPelajaran {
  id: number;
  guru_id: number;
  nama_guru?: string;
  nip_guru?: string;
  no_hp_guru?: string;
  mata_pelajaran: string;
  kitab?: string;
  kelas: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  ruangan?: string;
  keterangan?: string;
  sudah_absen?: boolean;
  timingStatus?: "upcoming" | "active" | "completed";
  attendance?: {
    id: number;
    jam_masuk: string;
    jam_pulang: string | null;
    status: string;
    lokasi_masuk: string;
  } | null;
}
