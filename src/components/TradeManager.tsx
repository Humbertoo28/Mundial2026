'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Minus, Check, X, AlertCircle, RefreshCw, Plus, ArrowRight, User, Search, Trash2 } from 'lucide-react';
import { executeTrade } from '@/app/actions/stickers';
import { getSectionDisplayName, getFlagEmoji } from '@/lib/flags';

type RepeatedSticker = {
  sticker_id: string;
  name: string;
  quantity: number;
  section: string;
};

export default function TradeManager({ 
  repeatedStickers = [],
  allStickers = [],
  allProfiles = [],
  onUpdate 
}: { 
  repeatedStickers?: RepeatedSticker[];
  allStickers?: { id: string, name: string, section: string }[];
  allProfiles?: string[];
  onUpdate?: () => void;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'give' | 'receive'>('give');
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [receivedIds, setReceivedIds] = useState<string[]>([]);
  const [traderName, setTraderName] = useState('');
  const [lastTrader, setLastTrader] = useState('');
  const [receivedInput, setReceivedInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const totalSelectedCount = useMemo(() => 
    Object.values(selectedQuantities).reduce((a, b) => a + b, 0),
  [selectedQuantities]);

  const stickerMap = useMemo(() => {
    const map: Record<string, { name: string, section: string }> = {};
    allStickers.forEach(s => {
      if (s?.id) map[s.id] = { name: s.name || '', section: s.section || '' };
    });
    return map;
  }, [allStickers]);

  const toggleSelect = (id: string, maxQuantity: number) => {
    const newQuants = { ...selectedQuantities };
    const current = newQuants[id] || 0;
    
    // El límite real es la cantidad total menos 1 (la del álbum)
    const realMax = maxQuantity - 1;
    
    if (current < realMax) {
      newQuants[id] = current + 1;
    } else {
      delete newQuants[id];
    }
    setSelectedQuantities(newQuants);
  };

  const selectAll = () => {
    if (Object.keys(selectedQuantities).length === repeatedStickers.length) {
      setSelectedQuantities({});
    } else {
      const all: Record<string, number> = {};
      repeatedStickers.forEach(s => {
        // Seleccionamos todas las repetidas de golpe (total - 1)
        all[s.sticker_id] = s.quantity - 1;
      });
      setSelectedQuantities(all);
    }
  };

  const addReceived = (e?: React.FormEvent) => {
    e?.preventDefault();
    let input = receivedInput.trim().toUpperCase();
    if (!input) return;
    
    // Si viene del datalist con formato "ID - NOMBRE", extraemos el ID
    if (input.includes(' - ')) {
      input = input.split(' - ')[0].trim();
    }
    
    // Búsqueda jerárquica para mejor precisión
    const foundSticker = allStickers.find(s => 
      s?.id?.replace(/\s/g, '').toUpperCase() === input.replace(/\s/g, '') || // ID exacto
      (s?.name && s.name.toUpperCase() === input) // Nombre exacto
    ) || allStickers.find(s => 
      s?.name && s.name.toUpperCase().startsWith(input) // Empieza por...
    ) || allStickers.find(s => 
      s?.name && s.name.toUpperCase().includes(input) // Contiene...
    );

    if (!foundSticker || !foundSticker.id) {
      setError("No se encontró ninguna figurita con ese nombre o código");
      return;
    }

    const id = foundSticker.id;
    if (receivedIds.includes(id)) {
      setError("Ya agregaste a este jugador");
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
    if (totalSelectedCount === 0 && receivedIds.length === 0) return;

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const givenArray: string[] = [];
        Object.entries(selectedQuantities).forEach(([id, qty]) => {
          for (let i = 0; i < qty; i++) {
            givenArray.push(id);
          }
        });

        const result = await executeTrade(givenArray, receivedIds, traderName);
        if (result.success) {
          setSuccess(true);
          const trader = traderName.trim() || 'otro usuario';
          setLastTrader(trader);
          setSelectedQuantities({});
          setReceivedIds([]);
          setTraderName('');
          router.refresh();
          setTimeout(() => {
            setSuccess(false);
            setIsOpen(false);
          }, 3000);
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
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#000000] w-full max-w-5xl h-full sm:h-auto sm:max-h-[90vh] rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in slide-in-from-bottom-8 duration-500">
        
        {/* Header Compacto */}
        <div className="px-6 py-4 border-b border-[#474A4A]/10 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-[#2A398D] to-[#1e2a6d] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <RefreshCw className={`h-5 w-5 ${isPending ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase italic tracking-tight">Intercambio</h2>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Dashboard de Gestión</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs para móvil */}
        <div className="flex sm:hidden border-b border-[#474A4A]/10 shrink-0">
          <button 
            onClick={() => setActiveTab('give')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'give' ? 'text-[#E61D25] border-b-2 border-[#E61D25] bg-[#E61D25]/5' : 'text-[#474A4A]/40'
            }`}
          >
            Doy ({totalSelectedCount})
          </button>
          <button 
            onClick={() => setActiveTab('receive')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'receive' ? 'text-[#3CAC3B] border-b-2 border-[#3CAC3B] bg-[#3CAC3B]/5' : 'text-[#474A4A]/40'
            }`}
          >
            Recibo ({receivedIds.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            
            {/* Información del Intercambio */}
            <div className="col-span-full bg-[#2A398D]/5 border border-[#2A398D]/10 rounded-2xl p-4 mb-2">
              <div className="flex items-center gap-3">
                <div className="bg-[#2A398D] p-2 rounded-lg text-white">
                  <Search className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <input 
                      type="text"
                      list="user-list"
                      placeholder="Escribe el nombre del usuario..."
                      value={traderName}
                      onChange={(e) => setTraderName(e.target.value)}
                      className="w-full bg-white/50 dark:bg-black/20 border border-[#2A398D]/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#2A398D]/20 text-sm font-bold text-[#2A398D] placeholder:text-[#2A398D]/30 pr-10 transition-all"
                    />
                    <datalist id="user-list">
                      <option value="Otro (Persona fuera del sistema)" />
                      {allProfiles.map(username => (
                        <option key={username} value={`@${username}`} />
                      ))}
                    </datalist>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#2A398D]">
                      <Search className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Campo manual si elige "Otro" */}
              {traderName === 'Otro (Fuera del sistema)' && (
                <div className="mt-3 ml-11 animate-in slide-in-from-top-2 duration-200">
                  <input 
                    type="text" 
                    placeholder="Escribe el nombre de la persona..." 
                    autoFocus
                    onChange={(e) => {
                      // Al escribir, mantenemos una marca interna o simplemente actualizamos el valor final
                      // Pero para que no se cierre el select, lo manejaremos con cuidado
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        setTraderName(e.target.value.trim());
                      }
                    }}
                    className="w-full bg-white/50 border border-[#2A398D]/20 rounded-xl px-4 py-2 text-sm font-bold text-[#2A398D] focus:outline-none focus:border-[#2A398D] transition-all"
                  />
                  <p className="text-[9px] font-bold text-[#2A398D]/40 uppercase mt-1 ml-1">Escribe el nombre y presiona fuera para confirmar</p>
                </div>
              )}
            </div>

            {/* Columna Izquierda: Lo que doy */}
            <div className={`${activeTab === 'give' ? 'block' : 'hidden'} lg:block h-full flex flex-col`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-[#2A398D] text-sm uppercase italic flex items-center gap-2">
                  <Minus className="h-4 w-4 text-[#E61D25]" />
                  Mis Repetidas para entregar
                </h3>
                <button 
                  onClick={selectAll}
                  className="text-[10px] font-black uppercase text-[#2A398D]/60 hover:text-[#2A398D] underline transition-colors"
                >
                  {Object.keys(selectedQuantities).length === repeatedStickers.length ? 'Ninguna' : 'Todas'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 max-h-full overflow-y-auto pr-1 custom-scrollbar">
                {repeatedStickers.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-[#474A4A]/30 italic font-bold uppercase text-xs">
                    No tienes figuritas repetidas registradas
                  </div>
                ) : repeatedStickers.map(s => {
                  const qtySelected = selectedQuantities[s.sticker_id] || 0;
                  const isSelected = qtySelected > 0;
                  return (
                    <button
                      key={s.sticker_id}
                      onClick={() => toggleSelect(s.sticker_id, s.quantity)}
                      className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col items-start gap-1 text-left group active:scale-95 ${
                        isSelected 
                          ? 'border-[#E61D25] bg-[#E61D25]/5 shadow-sm' 
                          : 'border-[#474A4A]/10 hover:border-[#2A398D]/20 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[8px] font-bold text-[#474A4A]/40 uppercase truncate">
                          {getSectionDisplayName(s.section)}
                        </span>
                        <span className="text-[10px] font-black text-[#2A398D]">{s.sticker_id}</span>
                      </div>
                      <span className="text-xs font-black text-[#474A4A] dark:text-white/90 line-clamp-1">{s.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-[#3CAC3B] bg-[#3CAC3B]/10 px-2 py-0.5 rounded-full">
                          Tienes x{s.quantity}
                        </span>
                        {isSelected && (
                          <div className="flex items-center bg-[#2A398D] rounded-full overflow-hidden ml-auto animate-in zoom-in duration-200">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const newQuants = { ...selectedQuantities };
                                if (qtySelected > 1) {
                                  newQuants[s.sticker_id] = qtySelected - 1;
                                } else {
                                  delete newQuants[s.sticker_id];
                                }
                                setSelectedQuantities(newQuants);
                              }}
                              className="px-2 py-1 hover:bg-black/20 text-white transition-colors border-r border-white/10"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2 py-1 text-[10px] font-black text-white min-w-[40px] text-center">
                              Das x{qtySelected}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (qtySelected < s.quantity - 1) {
                                  setSelectedQuantities({
                                    ...selectedQuantities,
                                    [s.sticker_id]: qtySelected + 1
                                  });
                                }
                              }}
                              className="px-2 py-1 hover:bg-black/20 text-white transition-colors border-l border-white/10"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-[#E61D25] text-white rounded-full p-1 shadow-sm ring-2 ring-white">
                          <Check className="h-2 w-2" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Columna Derecha: Lo que recibo */}
            <div className={`${activeTab === 'receive' ? 'block' : 'hidden'} lg:block h-full flex flex-col`}>
              <h3 className="font-black text-[#2A398D] text-sm uppercase italic mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4 text-[#3CAC3B]" />
                Lo que recibo a cambio
              </h3>

              <div className="relative mb-6">
                <form onSubmit={addReceived} className="relative group">
                  <input 
                    type="text"
                    list="sticker-list-premium"
                    placeholder="Escribe el nombre o código..."
                    value={receivedInput}
                    onChange={(e) => {
                      setReceivedInput(e.target.value);
                      setError(null);
                    }}
                    className="w-full bg-[#D1D4D1]/20 border-2 border-[#474A4A]/10 rounded-2xl pl-12 pr-14 py-4 text-lg font-bold focus:outline-none focus:border-[#3CAC3B] focus:bg-white transition-all shadow-inner touch-manipulation"
                    style={{ fontSize: '18px', WebkitTextSizeAdjust: '100%' }}
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#474A4A]/40 group-focus-within:text-[#3CAC3B] transition-colors" />
                  <button 
                    type="submit"
                    disabled={!receivedInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#3CAC3B] text-white p-2.5 rounded-xl hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:grayscale"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  <datalist id="sticker-list-premium">
                    {allStickers.map(s => (
                      <option key={s.id} value={`${s.id} - ${s.name}`} />
                    ))}
                  </datalist>
                </form>
                
                {/* Preview dinámico */}
                <div className="min-h-[20px] mt-2 ml-4">
                  {(() => {
                    let input = receivedInput.trim().toUpperCase();
                    if (!input || input.length < 2) return null;

                    // Si viene del datalist con formato "ID - NOMBRE", extraemos el ID
                    if (input.includes(' - ')) {
                      input = input.split(' - ')[0].trim();
                    }

                    const match = allStickers.find(s => 
                      s?.id?.replace(/\s/g, '').toUpperCase() === input.replace(/\s/g, '') || 
                      (s?.name && s.name.toUpperCase() === input)
                    ) || allStickers.find(s => 
                      s?.name && s.name.toUpperCase().startsWith(input)
                    ) || allStickers.find(s => 
                      s?.name && s.name.toUpperCase().includes(input)
                    );

                    if (match) {
                      return (
                        <div className="flex items-center gap-2 text-[10px] font-black text-[#3CAC3B] animate-in fade-in">
                          <Check className="h-3 w-3" />
                          <span>{match.name}</span>
                          <span className="text-[#474A4A]/40">({match.section})</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Lista de recibidas con scroll propio */}
              <div className="flex-1 bg-gray-50 dark:bg-black/20 rounded-[2rem] p-4 border-2 border-dashed border-[#474A4A]/10 overflow-y-auto">
                {receivedIds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 text-center px-8 py-12">
                    <div className="bg-[#474A4A]/20 p-4 rounded-full mb-4">
                      <User className="h-10 w-10" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest leading-tight">
                      Busca los jugadores que te están entregando
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {receivedIds.map(id => (
                      <div 
                        key={id}
                        className="bg-white dark:bg-[#0D0D0D] border border-[#474A4A]/10 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-sm group animate-in slide-in-from-right-2 duration-300"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-[#3CAC3B]/10 p-2 rounded-xl text-[#3CAC3B]">
                            <Plus className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-[8px] font-black text-[#3CAC3B] uppercase tracking-tighter">{id}</span>
                            <span className="text-xs font-black text-[#474A4A] dark:text-white/90 truncate">{stickerMap[id]?.name}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeReceived(id)}
                          className="p-2 hover:bg-red-50 text-[#474A4A]/20 hover:text-[#E61D25] rounded-xl transition-all active:scale-90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Persistente/Sticky */}
        <div className="px-6 py-6 border-t border-[#474A4A]/10 dark:border-white/10 bg-white dark:bg-[#000000] flex flex-col gap-4 shrink-0">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-2 text-[10px] font-black animate-in shake duration-500">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-100 text-green-600 rounded-xl flex items-center gap-2 text-[10px] font-black animate-in slide-in-from-top-1">
              <Check className="h-4 w-4 shrink-0" />
              ¡Intercambio con <span className="underline">{lastTrader}</span> registrado con éxito!
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-10 w-full sm:w-auto justify-around sm:justify-start">
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-[10px] font-black text-[#474A4A]/30 uppercase tracking-widest">Doy</span>
                <span className="text-2xl font-black text-[#E61D25] tabular-nums">{totalSelectedCount}</span>
              </div>
              <ArrowRight className="h-6 w-6 text-[#474A4A]/10" />
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-[10px] font-black text-[#474A4A]/30 uppercase tracking-widest">Recibo</span>
                <span className="text-2xl font-black text-[#3CAC3B] tabular-nums">{receivedIds.length}</span>
              </div>
            </div>
            
            <button
              onClick={handleExecuteTrade}
              disabled={(totalSelectedCount === 0 && receivedIds.length === 0) || isPending}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-12 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm bg-[#2A398D] text-white hover:bg-[#3CAC3B] disabled:opacity-30 disabled:grayscale transition-all shadow-xl active:scale-95"
            >
              {isPending ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              {isPending ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
