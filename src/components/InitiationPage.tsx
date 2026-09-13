import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Database, Search, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { AppConfig } from '@/types';

interface InitiationPageProps {
  onInitiate: (config: AppConfig) => void;
}

const INITIATION_SHEET_ID = '14tJtuPhLzks6lBoAZmQeyu2xtWIycWdjgHiPHl3wcOo';

export const InitiationPage: React.FC<InitiationPageProps> = ({ onInitiate }) => {
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInitiationData();
  }, []);

  const fetchInitiationData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Using CSV export targeting the 'inisiasi' sheet
      const url = `https://docs.google.com/spreadsheets/d/${INITIATION_SHEET_ID}/export?format=csv&sheet=inisiasi`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Gagal menghubungi Google Sheets (Status: ${response.status})`);
      }

      const csvText = await response.text();

      // More robust CSV parsing to handle commas inside quotes
      const parseCSV = (text: string) => {
        const rows = [];
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          if (!line.trim()) continue;
          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (matches) {
            rows.push(matches.map(val => val.replace(/^"|"$/g, '').trim()));
          } else {
            // Fallback to simple split if regex fails
            rows.push(line.split(',').map(c => c.replace(/^"|"$/g, '').trim()));
          }
        }
        return rows;
      };

      const parsedRows = parseCSV(csvText);
      if (parsedRows.length <= 1) {
        throw new Error("Spreadsheet kosong atau tidak dapat dibaca.");
      }

      // Skip header row
      const parsedConfigs: AppConfig[] = parsedRows.slice(1).map(cols => {
        const gasUrl = (cols[4] || '').trim();
        return {
          unitName: cols[2] || '', // Nama_UL is Column C
          spreadsheetId: cols[3] || '',
          gasUrl: gasUrl,
          photoFolderId: cols[5] || '',
          backupFolderId: cols[6] || '',
        };
      }).filter(c => {
        // Basic validation: must have unit name and a valid-looking GAS URL
        return c.unitName && c.gasUrl && c.gasUrl.includes('script.google.com');
      });

      if (parsedConfigs.length === 0) {
        throw new Error("Tidak ada data unit layanan dengan link GAS yang valid found di Spreadsheet (Kolom E harus link /exec).");
      }

      setConfigs(parsedConfigs);
    } catch (err: any) {
      console.error('Error fetching initiation data:', err);
      setError(err.message || 'Gagal memuat data inisiasi. Pastikan Spreadsheet dibagikan ke "Siapa saja yang memiliki link".');
    } finally {
      setLoading(false);
    }
  };

  const filteredConfigs = configs.filter(c => 
    c.unitName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-6 relative"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.8)), url('https://lh3.googleusercontent.com/d/14W8NDYPMq2u8rpB7B05sNap7RqVAi0PN')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl overflow-hidden border border-white/20"
      >
        <div className="bg-primary/90 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl" />
          
          <motion.div 
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-20 h-20 bg-white/20 rounded-[24px] flex items-center justify-center mx-auto mb-6 backdrop-blur-md relative z-10 border border-white/30"
          >
            <Database className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-black mb-3 uppercase tracking-tighter relative z-10 leading-none">Inisiasi Aplikasi</h1>
          <div className="h-1 w-16 bg-white/30 mx-auto mb-4 rounded-full" />
          <p className="text-white/80 text-sm font-bold relative z-10 tracking-wide">Silakan pilih Unit Layanan untuk sinkronisasi database aplikasi</p>
        </div>

        <div className="p-10">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-primary/20 rounded-full animate-ping" />
                </div>
              </div>
              <p className="text-slate-400 font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Menghubungkan ke Pusat Data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 p-8 rounded-3xl flex items-start space-x-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <p className="text-red-800 font-black mb-2 text-sm uppercase tracking-tight">Koneksi Terputus</p>
                <p className="text-red-600/80 text-sm font-medium leading-relaxed mb-6">{error}</p>
                <button 
                  onClick={fetchInitiationData}
                  className="px-8 py-3 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-200 active:scale-95"
                >
                  Segarkan Halaman
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/10 rounded-[24px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari Unit Layanan..."
                  className="w-full pl-16 pr-6 py-5 bg-slate-100/50 border-2 border-transparent focus:border-primary/20 rounded-[24px] focus:bg-white outline-none font-black text-slate-700 transition-all shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar px-1">
                {filteredConfigs.length > 0 ? filteredConfigs.map((config, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onInitiate(config)}
                    className="w-full group flex items-center justify-between p-6 bg-white hover:bg-primary border border-slate-100 hover:border-primary rounded-[28px] transition-all text-left shadow-sm hover:shadow-2xl hover:shadow-primary/20 active:scale-[0.98]"
                  >
                    <div className="flex items-center space-x-5">
                      <div className="w-14 h-14 bg-slate-50 group-hover:bg-white/20 rounded-2xl flex items-center justify-center transition-colors shadow-inner">
                        <span className="text-primary group-hover:text-white font-black text-base">{config.unitName.substring(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight group-hover:text-white transition-colors text-lg">{config.unitName}</h3>
                        <p className="text-slate-400 group-hover:text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mt-1 transition-colors">Unit Aktif • Ready</p>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-slate-50 group-hover:bg-white/20 rounded-full flex items-center justify-center transition-all group-hover:translate-x-1">
                      <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-white" />
                    </div>
                  </motion.button>
                )) : (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Data tidak ditemukan</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-slate-50/50 p-6 text-center border-t border-slate-100 backdrop-blur-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">PeXasus System Initialization • Secure Infrastructure</p>
        </div>
      </motion.div>
    </div>
  );
};
