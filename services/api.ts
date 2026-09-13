import { ReportData, ULPData } from '../types';
import { BACKUP_FOLDER_ID } from '../constants';

/**
 * Get current Google Script URL dynamically from localStorage
 */
const getScriptUrl = (): string => {
  let url = (localStorage.getItem('scriptUrl') || '').trim(); 
  
  if (!url) {
    const savedConfig = localStorage.getItem('appConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        if (config && config.gasUrl) {
          url = config.gasUrl.trim();
          localStorage.setItem('scriptUrl', url);
        }
      } catch (e) {
        console.error("Failed to recover GAS URL from appConfig:", e);
      }
    }
  }
  return url;
};

export const setScriptUrl = (url: string) => {
  localStorage.setItem('scriptUrl', url);
};

export const api = {
  getAllData: async () => {
    try {
      const GOOGLE_SCRIPT_URL = getScriptUrl();
      if (!GOOGLE_SCRIPT_URL) {
        throw new Error("Konfigurasi Database (GAS URL) belum diatur. Silakan lakukan inisiasi ulang.");
      }
      
      // Robust URL construction
      let finalUrl = GOOGLE_SCRIPT_URL;
      const separator = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${separator}action=getAll&_=${Date.now()}`;
      
      console.log("Fetching all data from:", finalUrl);
      
      const response = await fetch(finalUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache',
        redirect: 'follow'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Database Tidak Ditemukan (404).\n\nURL yang dipanggil: ${finalUrl}\n\nHal ini biasanya terjadi karena:\n1. URL di Master Inisiasi salah/mati\n2. Skrip Apps Script telah dihapus\n3. Skrip belum di-deploy sebagai 'Web App'`);
        }
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      console.log("Raw response length:", text.length);
      
      // Check if URL is a spreadsheet URL
      if (GOOGLE_SCRIPT_URL.includes('docs.google.com/spreadsheets')) {
        throw new Error("URL Database (GAS) yang dimasukkan salah. Ini adalah link Spreadsheet, bukan link Script (GAS). Silakan hubungi admin untuk memperbaiki Master Inisiasi.");
      }
      
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html') || text.trim().startsWith('<meta')) {
        console.error("Received HTML instead of JSON from URL:", GOOGLE_SCRIPT_URL);
        console.error("Response snippet:", text.substring(0, 500));
        throw new Error(`Database mengembalikan format HTML (Bukan JSON).\n\nURL yang dipanggil: ${GOOGLE_SCRIPT_URL}\n\nHal ini biasanya terjadi karena:\n1. Skrip belum dideploy sebagai 'Web App'\n2. Akses skrip tidak disetel ke 'Anyone'\n3. URL di Master Inisiasi salah (Pastikan link /exec, bukan /edit).`);
      }

      if (text.trim() === "Method GET OK" || (!text.trim().startsWith('{') && !text.trim().startsWith('['))) {
        throw new Error("Google Apps Script mengembalikan 'Method GET OK'. Pastikan handler 'getAll' pada skrip Apps Script Anda sudah diimplementasikan dan di-deploy sebagai 'Anyone'.");
      }

      try {
        const data = JSON.parse(text);
        return data;
      } catch (e) {
        console.error("JSON Parse Error. Raw text:", text.substring(0, 500));
        throw new Error("Gagal mengurai data JSON dari server.");
      }
    } catch (error: any) {
      console.error("Detailed API Error (GetAll):", error);
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error("Gagal terhubung ke server (CORS/Network Error). Ini biasanya terjadi jika skrip Apps Script error atau belum di-deploy sebagai 'Anyone'.");
      }
      throw error;
    }
  },

  getBackupFiles: async () => {
    try {
      const GOOGLE_SCRIPT_URL = getScriptUrl();
      if (!GOOGLE_SCRIPT_URL) {
        throw new Error("Konfigurasi Database (GAS URL) belum diatur.");
      }
      // Robust URL construction
      const separator = GOOGLE_SCRIPT_URL.includes('?') ? '&' : '?';
      const finalUrl = `${GOOGLE_SCRIPT_URL}${separator}action=getBackupFiles&folderId=${BACKUP_FOLDER_ID}&_=${Date.now()}`;
      
      const response = await fetch(finalUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        redirect: 'follow'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Database Tidak Ditemukan (404). Silakan cek link GAS di Master Inisiasi.");
        }
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const text = await response.text();
      
      // Cek apakah response berupa HTML (biasanya tanda error GAS)
      if (text.trim().startsWith('<')) {
        throw new Error("Server mengembalikan format HTML. Pastikan skrip sudah di-deploy sebagai 'Anyone'.");
      }

      // Jika response adalah Method GET OK (belum di-deploy fitur backup di GAS)
      if (text.trim() === "Method GET OK" || !text.trim().startsWith("[")) {
        return { error: "Fitur file backup belum ditambahkan/aktif di Google Apps Script Anda. Silakan hubungi Administrator untuk memperbarui Apps Script." };
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Gagal mengurai JSON: " + text.substring(0, 100));
      }
      
      // Jika server mengembalikan objek dengan properti error
      if (data && typeof data === 'object' && !Array.isArray(data) && data.error) {
        throw new Error(data.error);
      }
      
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error("API Error (GetBackupFiles):", error);
      
      if (error.message.includes('parameter')) {
        throw new Error("Server Error: Parameter 'e' tidak terbaca. Pastikan fungsi doGet meneruskan 'e' ke getBackupFiles(e).");
      }
      
      throw error;
    }
  },

  saveReport: async (report: ReportData, isEdit: boolean = false) => {
    try {
      const GOOGLE_SCRIPT_URL = getScriptUrl();
      if (!GOOGLE_SCRIPT_URL) {
        throw new Error("Konfigurasi Database (GAS URL) belum diatur.");
      }
      const action = isEdit ? 'updateReport' : 'saveReport';
      
      const payload = JSON.stringify({
        action: action,
        data: report
      });

      const separator = GOOGLE_SCRIPT_URL.includes('?') ? '&' : '?';
      const urlWithAction = `${GOOGLE_SCRIPT_URL}${separator}action=${action}`;

      // Menggunakan mode: 'cors' dengan 'text/plain' agar bisa mendeteksi status sukses/gagal
      // tanpa memicu preflight OPTIONS request yang tidak didukung GAS.
      const response = await fetch(urlWithAction, {
        method: 'POST',
        mode: 'cors',
        headers: { 
          'Content-Type': 'text/plain' 
        },
        body: payload,
        redirect: 'follow'
      });

      if (!response.ok && response.status !== 0) {
        if (response.status === 404) {
          throw new Error("Gagal menyimpan: Database Tidak Ditemukan (404).");
        }
        throw new Error(`Gagal menyimpan data (HTTP ${response.status})`);
      }

      // Periksa isi respons untuk mendeteksi pesan error dari Google Apps Script
      try {
        const text = await response.text();
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed && parsed.status === 'error') {
            throw new Error(parsed.message || "Terjadi kesalahan di server Google Apps Script.");
          }
        }
      } catch (jsonErr: any) {
        if (jsonErr.message && (jsonErr.message.includes("DriveApp") || jsonErr.message.includes("Akses ditolak") || jsonErr.message.includes("Access denied"))) {
          throw jsonErr;
        }
      }

      return true;
    } catch (error) {
      console.error("API Error (Save/Update):", error);
      throw error;
    }
  },

  updateMasterData: async (masterData: Record<string, ULPData>) => {
    try {
      const GOOGLE_SCRIPT_URL = getScriptUrl();
      if (!GOOGLE_SCRIPT_URL) return true;
      const payload = JSON.stringify({
        action: 'updateMaster',
        data: masterData
      });

      const separator = GOOGLE_SCRIPT_URL.includes('?') ? '&' : '?';
      const urlWithAction = `${GOOGLE_SCRIPT_URL}${separator}action=updateMaster`;

      await fetch(urlWithAction, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: payload,
        redirect: 'follow'
      });
      return true;
    } catch (error) {
      console.error("API Error (UpdateMaster):", error);
      return true;
    }
  }
};