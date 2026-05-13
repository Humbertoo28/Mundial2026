'use client';

import { Download } from 'lucide-react';
import { getFlagEmoji } from '@/lib/flags';

type MissingSticker = {
  id: string;
  name: string;
  section: string;
};

export default function MissingStickersPdfButton({ 
  missingStickers,
  username
}: { 
  missingStickers: MissingSticker[],
  username: string
}) {
  const handleDownloadPdf = async () => {
    if (missingStickers.length === 0) return;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Group by section
    const bySection: Record<string, string[]> = {};
    missingStickers.forEach(s => {
      if (!bySection[s.section]) bySection[s.section] = [];
      bySection[s.section].push(s.id);
    });

    const lines: string[] = [`MIS FIGURITAS FALTANTES - @${username.toUpperCase()}`, 'MUNDIAL 2026', ''];
    
    Object.entries(bySection).forEach(([section, ids]) => {
      lines.push(`${section}: ${ids.join(', ')}`);
    });

    lines.push('');
    lines.push('Generado por Panini Tracker PTY - mundialhub.vercel.app');

    let y = 15;
    doc.setFontSize(14);
    doc.text(lines[0], 10, y);
    y += 10;
    doc.setFontSize(10);

    lines.slice(1).forEach(line => {
      const splitLines = doc.splitTextToSize(line, 180);
      splitLines.forEach((sl: string) => {
        doc.text(sl, 10, y);
        y += 6;
        if (y > 280) {
          doc.addPage();
          y = 10;
        }
      });
      y += 2; // Extra space between sections
    });

    doc.save('figuritas_faltantes.pdf');
  };

  return (
    <button
      onClick={handleDownloadPdf}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider bg-white dark:bg-white/5 text-[#E61D25] border border-[#E61D25]/20 hover:bg-[#E61D25] hover:text-white transition-all shadow-sm active:scale-95"
    >
      <Download className="h-3 w-3" />
      PDF Faltantes
    </button>
  );
}
