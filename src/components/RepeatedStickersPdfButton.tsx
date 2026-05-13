'use client';

import { Download } from 'lucide-react';

type RepeatedSticker = {
  id: string;
  quantity: number;
  section: string;
};

export default function RepeatedStickersPdfButton({ 
  repeatedStickers,
  username
}: { 
  repeatedStickers: RepeatedSticker[],
  username: string
}) {
  const handleDownloadPdf = async () => {
    if (repeatedStickers.length === 0) return;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Group by section
    const bySection: Record<string, string[]> = {};
    repeatedStickers.forEach(s => {
      if (!bySection[s.section]) bySection[s.section] = [];
      const text = s.quantity > 1 ? `${s.id} (x${s.quantity})` : s.id;
      bySection[s.section].push(text);
    });

    const lines: string[] = [`MIS FIGURITAS REPETIDAS - @${username.toUpperCase()}`, 'MUNDIAL 2026', ''];
    
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
      if (!line.trim()) { y += 5; return; }
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

    doc.save('figuritas_repetidas.pdf');
  };

  return (
    <button
      onClick={handleDownloadPdf}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider bg-white dark:bg-white/5 text-[#2A398D] border border-[#2A398D]/20 hover:bg-[#2A398D] hover:text-white transition-all shadow-sm active:scale-95"
    >
      <Download className="h-3 w-3" />
      PDF Repetidas
    </button>
  );
}
