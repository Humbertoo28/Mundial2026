'use client';

import { useState, useTransition } from 'react';
import { Layers, Minus, Check, X, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { bulkUpdateStickerQuantities } from '@/app/actions/stickers';
import { getSectionDisplayName, getFlagEmoji } from '@/lib/flags';

type RepeatedSticker = {
  sticker_id: string;
  quantity: number;
  section: string;
};

export default function TradeManager({ 
  repeatedStickers,
  onUpdate 
}: { 
  repeatedStickers: RepeatedSticker[];
  onUpdate?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const updates = repeatedStickers
          .filter(s => selectedIds.has(s.sticker_id))
          .map(s => ({
            stickerId: s.sticker_id,
            quantity: s.quantity - 1 // Restamos una unidad
          }));

        const result = await bulkUpdateStickerQuantities(updates);
        if (result.success) {
          setSuccess(true);
          setSelectedIds(new Set());
          setTimeout(() => setSuccess(false), 3000);
          if (onUpdate) onUpdate();
        }
      } catch (err: any) {
        setError(err.message || "Error al actualizar");
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
      <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10">
        {/* Header */}
        <div className="p-6 border-b border-[#474A4A]/10 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-[#2A398D] to-[#1e2a6d] text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <RefreshCw className={`h-6 w-6 ${isPending ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic">Gestor de Intercambio</h2>
              <p className="text-xs text-white/70 font-bold uppercase tracking-widest">Selecciona las figuritas que ya entregaste</p>
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
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-600 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-2">
              <Check className="h-5 w-5" />
              ¡Inventario actualizado correctamente!
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={selectAll}
              className="text-xs font-black uppercase text-[#2A398D] dark:text-[#4C5DBB] hover:underline"
            >
              {selectedIds.size === repeatedStickers.length ? 'Desseleccionar todo' : 'Seleccionar todo'}
            </button>
            <span className="text-xs font-bold text-[#474A4A]/50">
              {selectedIds.size} seleccionadas
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {repeatedStickers.map(s => {
              const isSelected = selectedIds.has(s.sticker_id);
              return (
                <button
                  key={s.sticker_id}
                  onClick={() => toggleSelect(s.sticker_id)}
                  className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 group ${
                    isSelected 
                      ? 'border-[#2A398D] bg-[#2A398D]/5 shadow-md' 
                      : 'border-[#474A4A]/10 hover:border-[#2A398D]/30'
                  }`}
                >
                  <div className="absolute top-2 right-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-[#2A398D] border-[#2A398D]' : 'border-[#474A4A]/20'
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-[#474A4A]/40 uppercase mb-1">
                    {getFlagEmoji(s.section)} {s.section}
                  </span>
                  <span className="text-lg font-black text-[#2A398D]">{s.sticker_id}</span>
                  <span className="text-[10px] font-bold text-[#3CAC3B] bg-[#3CAC3B]/10 px-2 py-0.5 rounded-full">
                    Tienes x{s.quantity}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#474A4A]/10 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm">
            <span className="font-bold text-[#474A4A]">Acción:</span>
            <span className="ml-2 text-[#474A4A]/70 italic">Se restará 1 unidad a cada seleccionada</span>
          </div>
          
          <button
            onClick={handleBulkUpdate}
            disabled={selectedIds.size === 0 || isPending}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm bg-[#E61D25] text-white hover:bg-[#2A398D] disabled:opacity-50 disabled:grayscale transition-all shadow-lg active:scale-95"
          >
            {isPending ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Minus className="h-5 w-5" />
            )}
            Confirmar Entrega ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}
