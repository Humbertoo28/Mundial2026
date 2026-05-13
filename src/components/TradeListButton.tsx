'use client';

import { useState } from 'react';
import { MessageSquare, Check, Copy, RefreshCw } from 'lucide-react';
import { getFlagEmoji } from '@/lib/flags';
import TradeManager from './TradeManager';

type RepeatedSticker = {
  sticker_id: string;
  name: string;
  quantity: number;
  section: string;
};

export default function TradeListButton({ 
  repeatedStickers,
  allStickers
}: { 
  repeatedStickers: RepeatedSticker[];
  allStickers: { id: string, name: string, section: string }[];
}) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
    
    // 1. Intentar API de Compartir Nativa (iOS/Android)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mis Repetidas - Mundial 2026',
          text: tradeText,
        });
        return;
      } catch (err) {
        console.log('Compartir nativo cancelado o falló');
      }
    }
    
    // 2. Fallback: Abrir WhatsApp directamente
    const encodedText = encodeURIComponent(tradeText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
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
              Tienes <span className="font-bold text-[#3CAC3B]">{repeatedStickers.length}</span> figuritas para intercambiar
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TradeManager 
            repeatedStickers={repeatedStickers} 
            allStickers={allStickers} 
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

      {/* Mini pills de secciones */}
      {!showPreview && (
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
    </div>
  );
}
