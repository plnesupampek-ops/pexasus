import React, { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { ULPData } from '../types';

interface AssetListProps {
  masterData: Record<string, ULPData>;
  unitName?: string;
}

export const AssetList: React.FC<AssetListProps> = ({ masterData, unitName }) => {
  const [activeTab, setActiveTab] = useState<'Petugas' | 'Penyulang' | 'Keypoint'>('Petugas');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUlp, setFilterUlp] = useState<string>('');
  const [filterPenyulang, setFilterPenyulang] = useState<string>('');

  const assets = React.useMemo(() => {
    const list: { type: 'Petugas' | 'Penyulang' | 'Keypoint'; name: string; ulp: string; parent?: string }[] = [];

    Object.values(masterData).forEach((ulpData: ULPData) => {
      // Filter by ULP if selected
      if (filterUlp && ulpData.name !== filterUlp) return;

      // Add Petugas
      if (activeTab === 'Petugas') {
        ulpData.petugas.forEach(p => {
          list.push({ type: 'Petugas', name: p, ulp: ulpData.name });
        });
      }

      // Add Penyulang
      if (activeTab === 'Penyulang') {
        ulpData.penyulang.forEach(p => {
          list.push({ type: 'Penyulang', name: p, ulp: ulpData.name });
        });
      }

      // Add Keypoints
      if (activeTab === 'Keypoint') {
        ulpData.penyulang.forEach(p => {
          // Filter by Penyulang if selected
          if (filterPenyulang && p !== filterPenyulang) return;

          const kps = ulpData.keypoints?.[p] || [];
          kps.forEach(kp => {
            list.push({ type: 'Keypoint', name: kp, ulp: ulpData.name, parent: p });
          });
        });
      }
    });

    return list.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ulp.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.parent && item.parent.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
      // Sort by ULP first, then by name/parent
      if (a.ulp !== b.ulp) return a.ulp.localeCompare(b.ulp);
      if (a.parent && b.parent && a.parent !== b.parent) return a.parent.localeCompare(b.parent);
      return a.name.localeCompare(b.name);
    });
  }, [masterData, searchTerm, filterUlp, activeTab, filterPenyulang]);

  // Get available penyulang for filtering (only for current ULP or all)
  const availablePenyulangs = React.useMemo(() => {
    const set = new Set<string>();
    Object.values(masterData).forEach((ulp: ULPData) => {
      if (filterUlp && ulp.name !== filterUlp) return;
      ulp.penyulang.forEach(p => set.add(p));
    });
    return Array.from(set).sort();
  }, [masterData, filterUlp]);

  const handleDownloadExcel = async () => {
    const ExcelJS = (window as any).ExcelJS;
    if (!ExcelJS) return alert("Library ExcelJS tidak tersedia.");

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Daftar ${activeTab}`);

      const baseColumns = [
        { header: 'No', key: 'no', width: 10 },
        { header: `Unit Kerja (${unitName || 'ULP'})`, key: 'ulp', width: 25 },
        { header: 'Nama Asset', key: 'name', width: 35 },
      ];

      if (activeTab === 'Keypoint') {
        baseColumns.push({ header: 'Penyulang (Induk)', key: 'parent', width: 30 });
      }

      worksheet.columns = baseColumns;

      // Styling header
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      assets.forEach((item, index) => {
        const rowData: any = {
          no: index + 1,
          ulp: item.ulp,
          name: item.name,
        };
        if (activeTab === 'Keypoint') rowData.parent = item.parent;
        worksheet.addRow(rowData);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Daftar_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal export excel:", err);
      alert("Terjadi kesalahan saat mengunduh Excel.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Daftar Asset</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Data Master {activeTab} Terorganisir
          </p>
        </div>
        <button
          onClick={handleDownloadExcel}
          className="bg-green-600 text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-green-700 transition-all active:scale-95"
        >
          <Download className="w-4 h-4" />
          Export {activeTab}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
        {(['Petugas', 'Penyulang', 'Keypoint'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setFilterPenyulang('');
            }}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-1">
          <input
            type="text"
            placeholder={`Cari ${activeTab.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-12 py-4 text-sm font-bold text-slate-700 focus:border-primary focus:outline-none transition-all shadow-sm"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        </div>
        <select
          value={filterUlp}
          onChange={(e) => {
            setFilterUlp(e.target.value);
            setFilterPenyulang('');
          }}
          className="bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:border-primary focus:outline-none transition-all shadow-sm"
        >
          <option value="">Semua {unitName || 'ULP'}</option>
          {Object.keys(masterData).map(ulp => (
            <option key={ulp} value={ulp}>{ulp}</option>
          ))}
        </select>
        
        {activeTab === 'Keypoint' && (
          <select
            value={filterPenyulang}
            onChange={(e) => setFilterPenyulang(e.target.value)}
            className="bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 focus:border-primary focus:outline-none transition-all shadow-sm animate-fade-in"
          >
            <option value="">Semua Penyulang</option>
            {availablePenyulangs.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">No</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit ({unitName || 'ULP'})</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama {activeTab}</th>
                {activeTab === 'Keypoint' && (
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Penyulang</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {assets.length > 0 ? (
                assets.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 rounded-full text-[9px] font-black bg-slate-100 text-slate-600 uppercase tracking-widest">
                        {item.ulp}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-slate-800 uppercase tracking-tight">{item.name}</td>
                    {activeTab === 'Keypoint' && (
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                          {item.parent}
                        </span>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeTab === 'Keypoint' ? 4 : 3} className="px-8 py-20 text-center text-slate-400 uppercase text-[10px] font-black tracking-[0.2em]">
                    Tidak ada data {activeTab.toLowerCase()} ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
