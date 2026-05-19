'use client';

import { useState, useMemo } from 'react';
import { MessageSquare, Check, Copy, RefreshCw, Download, Trash2, AlertCircle } from 'lucide-react';
import { getFlagEmoji } from '@/lib/flags';
import TradeManager from './TradeManager';
import CompareExternalListButton from './CompareExternalListButton';
import { clearRepeatedStickers } from '@/app/actions/stickers';
import { useTransition } from 'react';
import { getGroupForSticker } from '@/lib/groups';
import { getSectionDisplayName } from '@/lib/flags';

type RepeatedSticker = {
  sticker_id: string;
  name: string;
  quantity: number;
  section: string;
};

export default function TradeListButton({ 
  repeatedStickers,
  allStickers,
  allProfiles = [],
  username = '',
  missingStickers = []
}: { 
  repeatedStickers: RepeatedSticker[];
  allStickers: { id: string, name: string, section: string }[];
  allProfiles?: string[];
  username?: string;
  missingStickers?: { id: string, name: string, section: string }[];
}) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const getGroupHeaderForSticker = (id: string): string => {
    const group = getGroupForSticker(id);
    if (group) return `GRUPO ${group}`;
    if (id === '00') return '🏆 LOGO Y ESTADIOS';
    if (id.startsWith('FWC')) return '✨ ESPECIALES FWC';
    if (id.startsWith('CC')) return '🥤 ESPECIALES COCA-COLA';
    return 'OTROS';
  };

  const GROUP_HEADER_ORDER = [
    '🏆 LOGO Y ESTADIOS',
    '✨ ESPECIALES FWC',
    'GRUPO A',
    'GRUPO B',
    'GRUPO C',
    'GRUPO D',
    'GRUPO E',
    'GRUPO F',
    'GRUPO G',
    'GRUPO H',
    'GRUPO I',
    'GRUPO J',
    'GRUPO K',
    'GRUPO L',
    '🥤 ESPECIALES COCA-COLA',
    'OTROS'
  ];

  const compareGroupHeaders = (a: string, b: string) => {
    const idxA = GROUP_HEADER_ORDER.indexOf(a);
    const idxB = GROUP_HEADER_ORDER.indexOf(b);
    const valA = idxA !== -1 ? idxA : 999;
    const valB = idxB !== -1 ? idxB : 999;
    return valA - valB;
  };

  const groupedRepeated = useMemo(() => {
    const groups: Record<string, RepeatedSticker[]> = {};
    repeatedStickers.forEach(s => {
      const header = getGroupHeaderForSticker(s.sticker_id);
      if (!groups[header]) groups[header] = [];
      groups[header].push(s);
    });

    const parseIdNum = (id: string): number => {
      const m = id.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    };

    Object.keys(groups).forEach(header => {
      groups[header].sort((a, b) => {
        const prefixA = a.sticker_id.replace(/\d+$/, '');
        const prefixB = b.sticker_id.replace(/\d+$/, '');
        if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
        return parseIdNum(a.sticker_id) - parseIdNum(b.sticker_id);
      });
    });

    return groups;
  }, [repeatedStickers]);

  const sortedGroupHeaders = useMemo(() => {
    return Object.keys(groupedRepeated).sort(compareGroupHeaders);
  }, [groupedRepeated]);

  const getStickerType = (id: string): string => {
    if (id === '00') return 'PANINI LOGO';
    if (id.startsWith('FWC')) return 'ESPECIAL';
    if (id.startsWith('CC')) return 'COCA-COLA';
    if (id.replace(/\D/g, '') === '1') return 'ESCUDO';
    return 'NORMAL';
  };

  const generateTradeText = () => {
    if (repeatedStickers.length === 0) return null;

    // Group by section
    const bySection: Record<string, { id: string; qty: number }[]> = {};
    repeatedStickers.forEach(s => {
      if (!bySection[s.section]) bySection[s.section] = [];
      bySection[s.section].push({ id: s.sticker_id, qty: s.quantity });
    });

    const lines: string[] = ['⚽ MIS REPETIDAS - MUNDIAL 2026 ⚽', ''];
    
    Object.entries(bySection).forEach(([section, items]) => {
      const stickerList = items
        .map(s => {
          const extras = s.qty - 1; // cuántas copias tengo de sobra
          return `${s.id} (x${extras})`; // SIEMPRE mostrar la cantidad para evitar confusión
        })
        .join(', ');
      lines.push(`${getFlagEmoji(section)} ${section}: ${stickerList}`);
    });

    lines.push('');
    lines.push('¿Tienes alguna de las que me faltan? 🤝');

    return lines.join('\n');
  };

  const tradeText = generateTradeText();

  const handleCopy = async () => {
    if (!tradeText) return;
    
    // Intento 1: API Moderna
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(tradeText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      } catch (err) {
        console.error('API de portapapeles falló:', err);
      }
    }

    // Intento 2: Fallback tradicional (mejorado para móviles)
    try {
      const textArea = document.createElement("textarea");
      textArea.value = tradeText;
      
      // Asegurar que no sea visible pero esté en el DOM
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.error('Fallback de copia falló:', err);
    }
  };

  const handleShare = async () => {
    if (!tradeText) return;
    
    // Abrir WhatsApp directamente
    const encodedText = encodeURIComponent(tradeText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handleClearAll = () => {
    startTransition(async () => {
      try {
        const res = await clearRepeatedStickers();
        if (res?.error) throw new Error(res.error);
        setShowConfirm(false);
      } catch (err) {
        console.error(err);
        alert("Error al borrar las repetidas");
      }
    });
  };

  if (repeatedStickers.length === 0) {
    return (
      <div className="bg-white border border-[#474A4A]/20 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-[#D1D4D1] p-2 rounded-lg">
            <MessageSquare className="h-5 w-5 text-[#474A4A]" />
          </div>
          <h3 className="font-bold text-[#2A398D] text-lg">Lista de Intercambio</h3>
        </div>
        <p className="text-sm text-[#474A4A]/70 ml-11">
          Aún no tienes figuritas repetidas. ¡Sigue coleccionando!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#474A4A]/20 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-[#D1D4D1] p-2 rounded-lg">
            <MessageSquare className="h-5 w-5 text-[#474A4A]" />
          </div>
          <div>
            <h3 className="font-bold text-[#2A398D] text-lg leading-tight">Lista de Intercambio</h3>
            <p className="text-xs text-[#474A4A]/70">
              Tienes <span className="font-bold text-[#3CAC3B]">
                {repeatedStickers.reduce((acc, s) => acc + (s.quantity - 1), 0)}
              </span> figuritas para intercambiar
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TradeManager 
            repeatedStickers={repeatedStickers} 
            allStickers={allStickers} 
            allProfiles={allProfiles}
          />
          
          <CompareExternalListButton 
            missingStickers={missingStickers}
          />
          
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs font-bold text-[#474A4A] bg-[#D1D4D1]/80 hover:bg-[#D1D4D1] px-3 py-2 rounded-lg border border-[#474A4A]/20 transition-colors"
          >
            {showPreview ? 'Ocultar' : 'Ver lista'}
          </button>
          
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 shadow-sm active:scale-95 border ${
              copied
                ? 'bg-[#3CAC3B] text-white border-[#3CAC3B]'
                : 'bg-white text-[#474A4A] border-[#474A4A]/20 hover:bg-[#D1D4D1]/30'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                ¡Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar Lista
              </>
            )}
          </button>
          
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#25D366] text-white hover:bg-[#128C7E] transition-all shadow-md active:scale-95"
          >
            <MessageSquare className="h-4 w-4" />
            WhatsApp Directo
          </button>

          {/* PDF Download */}
          <button
            onClick={async () => {
              if (!tradeText) return;
              const { jsPDF } = await import('jspdf');
              const doc = new jsPDF();
              
              // Clean emojis for PDF (jsPDF doesn't support them well)
              const cleanText = tradeText
                .replace(/⚽/g, '')
                .replace(/🤝/g, '')
                .replace(/🇵🇦/g, '')
                .replace(/[^\x00-\x7F]/g, ''); // Generic emoji removal

              const header = `MIS FIGURITAS REPETIDAS - @${username.toUpperCase()}`;
              doc.setFontSize(14);
              doc.text(header, 10, 15);
              doc.setFontSize(10);
              
              const lines = cleanText.split('\n');
              let y = 25;
              lines.forEach(line => {
                if (!line.trim()) { y += 5; return; }
                const splitLines = doc.splitTextToSize(line, 180);
                splitLines.forEach((sl: string) => {
                  doc.text(sl, 10, y);
                  y += 7;
                  if (y > 280) {
                    doc.addPage();
                    y = 10;
                  }
                });
              });
              doc.save('lista_intercambio.pdf');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#3CAC3B] text-white hover:bg-[#2d8a2c] transition-all shadow-md active:scale-95"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </button>

          {/* Botón Borrar Repetidas */}
          <div className="relative">
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#E61D25]/10 text-[#E61D25] hover:bg-[#E61D25] hover:text-white transition-all border border-[#E61D25]/20 active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
              Borrar Repetidas
            </button>

            {/* Modal de Confirmación Grande */}
            {showConfirm && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-[#0D0D0D] w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl border border-[#E61D25]/20 text-center animate-in zoom-in duration-300">
                  <div className="bg-[#E61D25]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 className="h-10 w-10 text-[#E61D25]" />
                  </div>
                  <h3 className="text-2xl font-black text-[#2A398D] dark:text-white uppercase italic tracking-tighter mb-2">
                    ¿Borrar Todo?
                  </h3>
                  <p className="text-sm text-[#474A4A]/60 dark:text-white/40 font-bold mb-8 uppercase tracking-widest leading-relaxed">
                    Esta acción eliminará TODAS tus figuritas repetidas. Tu álbum no se verá afectado.
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    <button
                      disabled={isPending}
                      onClick={handleClearAll}
                      className="w-full bg-[#E61D25] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-[#E61D25]/20 hover:bg-[#c4191f] transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isPending ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                      {isPending ? 'Borrando...' : 'Sí, borrar repetidas'}
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => setShowConfirm(false)}
                      className="w-full bg-[#474A4A]/10 text-[#474A4A] dark:text-white/60 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-[#474A4A]/20 transition-all"
                    >
                      No, cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview de la lista */}
      {showPreview && tradeText && (
        <div className="relative bg-[#D1D4D1]/40 border border-[#474A4A]/15 rounded-xl p-4 font-mono text-sm text-[#474A4A] whitespace-pre-wrap leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Decoración tipo burbuja WhatsApp */}
          <div className="absolute top-3 right-3">
            <div className="bg-[#3CAC3B] rounded-full w-3 h-3 opacity-70"></div>
          </div>
          {tradeText}
        </div>
      )}

      {/* Repeated Stickers Grouped by World Cup Groups (Exactly like the photo) */}
      {!showPreview && (
        <div className="flex flex-col gap-6 mt-6">
          {sortedGroupHeaders.map(header => {
            const stickersInGroup = groupedRepeated[header];
            if (!stickersInGroup || stickersInGroup.length === 0) return null;

            return (
              <div key={header} className="flex flex-col gap-3">
                {/* Group Section Header */}
                <div className="flex items-center justify-between border-b border-[#474A4A]/10 dark:border-white/10 pb-1.5 mb-1">
                  <span className="font-black text-[#2A398D] dark:text-[#4C5DBB] uppercase tracking-wider text-xs flex items-center gap-1.5">
                    {header}
                  </span>
                  <span className="text-[10px] font-black bg-[#2A398D]/10 dark:bg-white/10 text-[#2A398D] dark:text-white px-2.5 py-0.5 rounded-full">
                    {stickersInGroup.reduce((acc, s) => acc + (s.quantity - 1), 0)} extra{stickersInGroup.reduce((acc, s) => acc + (s.quantity - 1), 0) !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Stickers Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {stickersInGroup.map(s => {
                    const extras = s.quantity - 1;
                    const stickerType = getStickerType(s.sticker_id);
                    return (
                      <div 
                        key={s.sticker_id}
                        className="bg-white dark:bg-[#0D0D0D] border-2 border-[#2A398D]/30 dark:border-[#4C5DBB]/30 rounded-2xl p-3 flex flex-col justify-between gap-1 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] duration-200"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px]">{getFlagEmoji(s.section)}</span>
                            <span className="text-[10px] font-black text-[#2A398D] dark:text-[#4C5DBB] uppercase tracking-wider">{s.sticker_id}</span>
                          </div>
                          <span className="bg-[#2A398D] dark:bg-[#4C5DBB] text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-black">
                            x{extras}
                          </span>
                        </div>
                        
                        <div className="mt-1">
                          <h4 className="text-[10px] font-black text-gray-800 dark:text-white/90 line-clamp-1 uppercase leading-tight">
                            {s.name}
                          </h4>
                          <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-0.5 block">
                            {stickerType}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}


        {/* 
        <div className="flex flex-wrap gap-2">
          {(() => {
            const bySection: Record<string, number> = {};
            repeatedStickers.forEach(s => {
              bySection[s.section] = (bySection[s.section] || 0) + (s.quantity - 1);
            });
            return Object.entries(bySection).map(([section, count]) => (
              <span key={section} className="text-xs font-bold bg-[#3CAC3B]/10 text-[#3CAC3B] border border-[#3CAC3B]/20 px-3 py-1 rounded-full flex items-center gap-1">
                <span>{getFlagEmoji(section)}</span>
                <span>{section}: {count} extra{count !== 1 ? 's' : ''}</span>
              </span>
            ));
          })()}
        </div>
      )}
      */}
    </div>
  );
}
