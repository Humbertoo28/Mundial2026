'use client';

import { useState, useTransition, useMemo } from 'react';
import { Layers, Minus, Check, X, AlertCircle, RefreshCw, Plus, ArrowRight, User } from 'lucide-react';
import { executeTrade } from '@/app/actions/stickers';
import { getSectionDisplayName, getFlagEmoji } from '@/lib/flags';

type RepeatedSticker = {
  sticker_id: string;
  name: string;
  quantity: number;
  section: string;
};

export default function TradeManager({ 
  repeatedStickers,
  allStickers,
  onUpdate 
}: { 
  repeatedStickers: RepeatedSticker[];
  allStickers: { id: string, name: string, section: string }[];
  onUpdate?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [receivedIds, setReceivedIds] = useState<string[]>([]);
  const [receivedInput, setReceivedInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const stickerMap = useMemo(() => {
    const map: Record<string, { name: string, section: string }> = {};
    allStickers.forEach(s => {
      map[s.id] = { name: s.name, section: s.section };
    });
    return map;
  }, [allStickers]);

  const currentLookupName = receivedInput.length >= 3 ? stickerMap[receivedInput]?.name : null;

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === repeatedStickers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(repeatedStickers.map(s => s.sticker_id)));
    }
  };

  const addReceived = (e?: React.FormEvent) => {
    e?.preventDefault();
    const id = receivedInput.trim().toUpperCase();
    if (!id) return;
    
    if (!stickerMap[id]) {
      setError("El código no existe en el catálogo");
      return;
    }

    if (receivedIds.includes(id)) {
      setError("Ya agregaste esta figurita");
      return;
    }
    setReceivedIds([...receivedIds, id]);
    setReceivedInput('');
    setError(null);
  };

  const removeReceived = (id: string) => {
    setReceivedIds(receivedIds.filter(rid => rid !== id));
  };

  const handleExecuteTrade = async () => {
    if (selectedIds.size === 0 && receivedIds.length === 0) return;

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const result = await executeTrade(Array.from(selectedIds), receivedIds);
        if (result.success) {
          setSuccess(true);
          setSelectedIds(new Set());
          setReceivedIds([]);
          setTimeout(() => setSuccess(false), 3000);
          if (onUpdate) onUpdate();
        }
      } catch (err: any) {
        setError(err.message || "Error al procesar el intercambio");
      }
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#2A398D] text-white hover:bg-[#3CAC3B] transition-all shadow-md active:scale-95"
      >
        <RefreshCw className="h-4 w-4" />
        Gestionar Masivamente
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10">
        {/* Header */}
        <div className="p-6 border-b border-[#474A4A]/10 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-[#2A398D] to-[#1e2a6d] text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <RefreshCw className={`h-6 w-6 ${isPending ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic">Gestor de Intercambio</h2>
              <p className="text-xs text-white/70 font-bold uppercase tracking-widest">Registra lo que das y lo que recibes</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna Izquierda: Lo que doy */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-[#2A398D] uppercase italic flex items-center gap-2">
                <Minus className="h-4 w-4 text-[#E61D25]" />
                Lo que entrego
              </h3>
              <button 
                onClick={selectAll}
                className="text-[10px] font-black uppercase text-[#2A398D]/60 hover:text-[#2A398D] underline transition-colors"
              >
                {selectedIds.size === repeatedStickers.length ? 'Ninguna' : 'Todas'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {repeatedStickers.map(s => {
                const isSelected = selectedIds.has(s.sticker_id);
                return (
                  <button
                    key={s.sticker_id}
                    onClick={() => toggleSelect(s.sticker_id)}
                    className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-start gap-1 text-left ${
                      isSelected 
                        ? 'border-[#E61D25] bg-[#E61D25]/5' 
                        : 'border-[#474A4A]/10 hover:border-[#E61D25]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[9px] font-bold text-[#474A4A]/40 uppercase truncate">
                        {getSectionDisplayName(s.section)}
                      </span>
                      <span className="text-[10px] font-black text-[#2A398D]">{s.sticker_id}</span>
                    </div>
                    <span className="text-xs font-black text-[#474A4A] dark:text-white/90 line-clamp-1">{s.name}</span>
                    <span className="text-[9px] font-bold text-[#3CAC3B] bg-[#3CAC3B]/10 px-2 py-0.5 rounded-full mt-1">
                      Tienes x{s.quantity}
                    </span>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 bg-[#E61D25] text-white rounded-full p-1 shadow-sm">
                        <Check className="h-2 w-2" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Lo que recibo */}
          <div className="flex flex-col">
            <h3 className="font-black text-[#2A398D] uppercase italic mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#3CAC3B]" />
              Lo que recibo
            </h3>

            <div className="relative">
              <form onSubmit={addReceived} className="flex gap-2 mb-2">
                <input 
                  type="text"
                  placeholder="Código (Ej: ARG01)"
                  value={receivedInput}
                  onChange={(e) => {
                    setReceivedInput(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  className="flex-1 bg-[#D1D4D1]/20 border border-[#474A4A]/20 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#3CAC3B] transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!currentLookupName}
                  className="bg-[#3CAC3B] text-white px-4 rounded-xl hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:grayscale"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </form>
              
              {/* Preview del nombre mientras escribe */}
              <div className="min-h-[24px] mb-4">
                {currentLookupName ? (
                  <div className="flex items-center gap-2 text-[10px] font-black text-[#3CAC3B] animate-in slide-in-from-left-2">
                    <User className="h-3 w-3" />
                    <span>{currentLookupName}</span>
                    <span className="text-[#474A4A]/40 uppercase">({stickerMap[receivedInput]?.section})</span>
                  </div>
                ) : receivedInput.length >= 3 && (
                  <div className="text-[10px] font-bold text-[#E61D25]/60 italic animate-in fade-in">
                    Código no encontrado...
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 bg-[#D1D4D1]/10 rounded-2xl p-4 border-2 border-dashed border-[#474A4A]/10 min-h-[200px]">
              {receivedIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-8">
                  <User className="h-12 w-12 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest leading-tight">
                    Escribe el código y presiona Enter para añadir el jugador
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {receivedIds.map(id => (
                    <div 
                      key={id}
                      className="bg-white border-2 border-[#3CAC3B] p-2 rounded-xl flex items-center justify-between gap-2 shadow-sm animate-in zoom-in duration-200"
                    >
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[8px] font-black text-[#3CAC3B] uppercase">{id}</span>
                        <span className="text-[10px] font-bold text-[#474A4A] truncate">{stickerMap[id]?.name}</span>
                      </div>
                      <button 
                        onClick={() => removeReceived(id)}
                        className="p-1 hover:bg-red-50 text-[#474A4A]/30 hover:text-[#E61D25] rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-2 text-[10px] font-bold animate-in shake duration-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-xl flex items-center gap-2 text-[10px] font-bold animate-in slide-in-from-top-1">
                <Check className="h-4 w-4 shrink-0" />
                ¡Intercambio registrado con éxito!
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#474A4A]/10 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-[#474A4A]/40 uppercase">Entrego</span>
              <span className="text-2xl font-black text-[#E61D25]">{selectedIds.size}</span>
            </div>
            <ArrowRight className="h-6 w-6 text-[#474A4A]/20" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-[#474A4A]/40 uppercase">Recibo</span>
              <span className="text-2xl font-black text-[#3CAC3B]">{receivedIds.length}</span>
            </div>
          </div>
          
          <button
            onClick={handleExecuteTrade}
            disabled={(selectedIds.size === 0 && receivedIds.length === 0) || isPending}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm bg-[#2A398D] text-white hover:bg-[#3CAC3B] disabled:opacity-50 disabled:grayscale transition-all shadow-xl active:scale-95"
          >
            {isPending ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
            Confirmar Intercambio
          </button>
        </div>
      </div>
    </div>
  );
}
