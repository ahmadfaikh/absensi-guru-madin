// ============================================================================
// BACKEND GOOGLE APPS SCRIPT - SISTEM ABSENSI GURU
// ============================================================================

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Sheet Pengaturan
  let sheetPengaturan = ss.getSheetByName("Pengaturan");
  if (!sheetPengaturan) {
    sheetPengaturan = ss.insertSheet("Pengaturan");
    sheetPengaturan.appendRow(["Kunci", "Nilai"]);
    sheetPengaturan.appendRow(["nama_pondok", "Pondok Pesantren Al Is'af"]);
    sheetPengaturan.appendRow(["nama_madrasah", "Madrasah Diniyah Miftahul Huda"]);
    sheetPengaturan.appendRow(["latitude_pondok", "-7.02558"]);
    sheetPengaturan.appendRow(["longitude_pondok", "113.86542"]);
    sheetPengaturan.appendRow(["radius_absensi", "100"]);
    sheetPengaturan.appendRow(["jam_masuk", "20:00"]);
    sheetPengaturan.appendRow(["batas_terlambat", "20:05"]);
    sheetPengaturan.appendRow(["jam_pulang", "21:00"]);
    sheetPengaturan.appendRow(["hari_aktif", "Sabtu,Ahad,Senin,Selasa,Rabu,Jum'at"]);
    sheetPengaturan.appendRow(["logo_url", ""]);
  }

  // 2. Sheet Guru
  let sheetGuru = ss.getSheetByName("Guru");
  if (!sheetGuru) {
    sheetGuru = ss.insertSheet("Guru");
    sheetGuru.appendRow(["ID", "Nama", "No HP", "Mata Pelajaran", "Status"]);
  }

  // 3. Sheet Users
  let sheetUsers = ss.getSheetByName("Users");
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet("Users");
    sheetUsers.appendRow(["ID", "Username", "Password", "Role", "Guru_ID"]);
    // Seed admin (password "admin123" encrypted/hashed -> we'll use plain text for simplicity in GAS or a basic hash)
    // To make it simple for GAS, we'll store passwords as plain text or base64. It's a compromise.
    sheetUsers.appendRow(["1", "admin", "admin123", "Administrator", ""]);
  }

  // 4. Sheet Absensi
  let sheetAbsensi = ss.getSheetByName("Absensi");
  if (!sheetAbsensi) {
    sheetAbsensi = ss.insertSheet("Absensi");
    sheetAbsensi.appendRow([
      "ID", "Guru_ID", "Tanggal", "Hari", "Jam Masuk", "Status", 
      "Lokasi Masuk", "Latitude Masuk", "Longitude Masuk",
      "Jam Pulang", "Lokasi Pulang", "Latitude Pulang", "Longitude Pulang",
      "Keterangan", "Created_At"
    ]);
  }

  // 5. Sheet Jadwal
  let sheetJadwal = ss.getSheetByName("Jadwal");
  if (!sheetJadwal) {
    sheetJadwal = ss.insertSheet("Jadwal");
    sheetJadwal.appendRow([
      "ID", "Guru_ID", "Mata Pelajaran", "Kitab", "Kelas", "Hari",
      "Jam Mulai", "Jam Selesai", "Ruangan", "Keterangan"
    ]);
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ error: "No data provided" });
    }
    
    // We allow CORS preflight natively by GAS
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    setupDatabase(); // Ensure DB is setup

    if (action === "login") return handleLogin(payload);
    if (action === "checkIn") return handleCheckIn(payload);
    if (action === "checkOut") return handleCheckOut(payload);
    if (action === "getSettings") return getSettings();
    if (action === "updateSettings") return updateSettings(payload);
    if (action === "getGuruList") return getGuruList();
    if (action === "getTodayStatus") return getTodayStatus(payload);
    
    // Fallback
    return responseJSON({ success: true, message: "Action not found" });
    
  } catch (err) {
    return responseJSON({ error: err.toString() });
  }
}

function doGet(e) {
  return responseJSON({ status: "online", message: "API Backend GAS Berjalan." });
}

// ==========================================
// API HANDLERS
// ==========================================

function handleLogin(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetUsers = ss.getSheetByName("Users");
  const data = sheetUsers.getDataRange().getValues();
  
  const username = payload.username;
  const password = payload.password; // For real apps, compare hash. Here we use plain for simplicity since it's GAS
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === username && data[i][2] === password) {
      const role = data[i][3];
      const guruId = data[i][4];
      
      let nama = username;
      let mapel = "";
      
      if (guruId) {
        const sheetGuru = ss.getSheetByName("Guru").getDataRange().getValues();
        for (let j = 1; j < sheetGuru.length; j++) {
          if (String(sheetGuru[j][0]) === String(guruId)) {
            nama = sheetGuru[j][1];
            mapel = sheetGuru[j][4];
            break;
          }
        }
      }
      
      return responseJSON({
        message: "Login berhasil",
        token: "gas_token_" + new Date().getTime(), // Dummy token
        user: {
          id: data[i][0],
          username: username,
          role: role,
          guru_id: guruId,
          nama: nama,
          mata_pelajaran: mapel
        }
      });
    }
  }
  
  return responseJSON({ error: "Username atau password salah." });
}

function getSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Pengaturan");
  const data = sheet.getDataRange().getValues();
  
  let settings = { id: 1 };
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  
  // Cast types
  settings.latitude_pondok = parseFloat(settings.latitude_pondok);
  settings.longitude_pondok = parseFloat(settings.longitude_pondok);
  settings.radius_absensi = parseFloat(settings.radius_absensi);
  
  return responseJSON({ data: settings });
}

function handleCheckIn(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Absensi");
  
  const guru_id = payload.guru_id;
  const lat = payload.latitude || 0;
  const lng = payload.longitude || 0;
  
  const now = new Date();
  const dateStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(now, "Asia/Jakarta", "HH:mm:ss");
  const days = ["Ahad", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dayName = days[now.getDay()];
  
  // Create unique ID
  const newId = sheet.getLastRow() > 1 ? parseInt(sheet.getRange(sheet.getLastRow(), 1).getValue()) + 1 : 1;
  
  sheet.appendRow([
    newId, guru_id, dateStr, dayName, timeStr, "MASUK",
    "Lokasi Terdeteksi", lat, lng,
    "-", "-", 0, 0,
    payload.keterangan || "Hadir", now.toISOString()
  ]);
  
  return responseJSON({
    message: "Absen masuk berhasil",
    record: { id: newId, jam_masuk: timeStr },
    status: "MASUK"
  });
}

function getTodayStatus(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Absensi");
  const data = sheet.getDataRange().getValues();
  
  const now = new Date();
  const dateStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
  
  let record = null;
  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = Utilities.formatDate(new Date(data[i][2]), "Asia/Jakarta", "yyyy-MM-dd");
    if (String(data[i][1]) === String(payload.guru_id) && rowDate === dateStr) {
      record = {
        id: data[i][0],
        guru_id: data[i][1],
        tanggal: rowDate,
        jam_masuk: data[i][4],
        status: data[i][5],
        jam_pulang: data[i][9] !== "-" ? data[i][9] : null
      };
      break;
    }
  }
  
  return responseJSON({
    isTeacher: true,
    serverDate: dateStr,
    record: record
  });
}

function getGuruList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Guru");
  const data = sheet.getDataRange().getValues();
  
  let list = [];
  for(let i=1; i<data.length; i++) {
    list.push({
      id: data[i][0],
      nama: data[i][1],
      nip: data[i][2],
      no_hp: data[i][3],
      mata_pelajaran: data[i][4],
      status: data[i][5]
    });
  }
  
  return responseJSON({ data: list });
}
