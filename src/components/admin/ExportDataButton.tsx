'use client';

import { useState } from 'react';
import { FileSpreadsheet, ChevronDown, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface UserStat {
  username: string | null;
  email: string | null;
  uniqueStickers: number;
  repeatedStickers: number;
  percentage: number;
  created_at: string;
}

export default function ExportDataButton({ data }: { data: UserStat[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const prepareData = () => {
    return data.map(user => ({
      'Usuario': user.username || 'Sin nombre',
      'Email': user.email || 'N/A',
      'Figuritas Unicas': user.uniqueStickers,
      'Repetidas': user.repeatedStickers,
      'Progreso %': `${user.percentage}%`,
      'Fecha Registro': new Date(user.created_at).toLocaleDateString()
    }));
  };

  const exportToCSV = () => {
    const prepared = prepareData();
    const headers = Object.keys(prepared[0]);
    const rows = prepared.map(obj => Object.values(obj));

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_figuritas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setIsOpen(false);
  };

  const exportToXLSX = () => {
    const prepared = prepareData();
    const worksheet = XLSX.utils.json_to_sheet(prepared);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
    
    // Generar buffer y descargar
    XLSX.writeFile(workbook, `reporte_figuritas_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#3CAC3B] hover:bg-[#2A398D] text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 border-b-4 border-black/20"
      >
        <Download className="h-4 w-4" />
        Exportar Data
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-[#2A398D]/10 dark:border-white/5 z-20 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={exportToXLSX}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#3CAC3B]/10 dark:hover:bg-white/5 transition-colors group"
            >
              <FileSpreadsheet className="h-5 w-5 text-[#3CAC3B]" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-[#2A398D] dark:text-white uppercase italic">Excel (.xlsx)</span>
                <span className="text-[8px] text-[#474A4A]/60 dark:text-white/40 font-bold">RECOMENDADO</span>
              </div>
            </button>
            <div className="h-px bg-[#2A398D]/5 dark:bg-white/5 mx-2" />
            <button
              onClick={exportToCSV}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#2A398D]/10 dark:hover:bg-white/5 transition-colors group"
            >
              <FileText className="h-5 w-5 text-[#474A4A] dark:text-white/60" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-[#474A4A] dark:text-white/80 uppercase italic">Texto (.csv)</span>
                <span className="text-[8px] text-[#474A4A]/40 dark:text-white/20 font-bold">FORMATO SIMPLE</span>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
