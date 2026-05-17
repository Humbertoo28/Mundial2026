'use client';

import { useState } from 'react';
import { Smartphone, Check, X, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { getFlagEmoji } from '@/lib/flags';

type Sticker = { id: string; name: string; section: string };

export default function CompareExternalListButton({
  missingStickers,
}: {
  missingStickers: Sticker[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [matchingStickers, setMatchingStickers] = useState<Sticker[]>([]);
  const [hasCompared, setHasCompared] = useState(false);

  const handleCompare = () => {
    if (!inputText.trim()) return;

    // Crear un Set con los IDs de las figuritas que me faltan (normalizados sin espacios)
    const missingIds = new Set(missingStickers.map(s => s.id.replace(/\s/g, '').toUpperCase()));

    const lines = inputText.split('\n');
    const foundMatches: Sticker[] = [];

    // Formato esperado: "FWC 🏆: 00, 2, 4" o "MEX 🇲🇽: 3"
    lines.forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const leftPart = parts[0];
        
        // Match primera palabra (usualmente 3 letras, ej: FWC, MEX, BRA)
        const prefixMatch = leftPart.match(/([A-Za-z]+)/);
        
        if (prefixMatch) {
          const sectionPrefix = prefixMatch[1].toUpperCase();
          
          const rightPart = parts.slice(1).join(':'); 
          const numbers = rightPart.split(',').map(n => n.trim()).filter(n => n);
          
          numbers.forEach(num => {
            let stickerId = '';

            // Si es '00' (ej: FWC 00 o simplemente 00)
            if (num === '00') {
              stickerId = '00';
            } else if (sectionPrefix === 'FWC' || sectionPrefix === 'CC') {
              // FWC y CC no llevan ceros a la izquierda (ej: FWC2, CC1)
              const parsedNum = parseInt(num, 10);
              stickerId = `${sectionPrefix}${isNaN(parsedNum) ? num : parsedNum}`.toUpperCase();
            } else {
              // Países sí llevan ceros a la izquierda de forma obligatoria para números < 10 (ej: MEX03)
              const parsedNum = parseInt(num, 10);
              if (!isNaN(parsedNum)) {
                const paddedNum = String(parsedNum).padStart(2, '0');
                stickerId = `${sectionPrefix}${paddedNum}`.toUpperCase();
              } else {
                stickerId = `${sectionPrefix}${num}`.toUpperCase();
              }
            }
            
            if (missingIds.has(stickerId)) {
               const original = missingStickers.find(s => s.id.replace(/\s/g, '').toUpperCase() === stickerId);
               if (original && !foundMatches.some(m => m.id === original.id)) {
                 foundMatches.push(original);
               }
            }
          });
        }
      }
    });

    setMatchingStickers(foundMatches);
    setHasCompared(true);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#2A398D]/10 text-[#2A398D] hover:bg-[#2A398D]/20 transition-all border border-[#2A398D]/20 active:scale-95"
      >
        <Smartphone className="h-4 w-4" />
        Comparar con Figuritas App
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0D0D0D] w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in duration-300">
            
            <div className="px-6 py-5 border-b border-[#474A4A]/10 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-[#2A398D] to-[#1e2a6d] text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase italic tracking-tight">Comparar con Figuritas App</h2>
                  <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Encuentra coincidencias externas</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-black/20">
              
              {!hasCompared ? (
                <div className="flex flex-col h-full animate-in fade-in">
                  <label className="text-sm font-bold text-[#2A398D] dark:text-[#4C5DBB] mb-2 flex items-center gap-2 uppercase tracking-widest">
                    Pega aquí la lista de repetidas:
                  </label>
                  <p className="text-xs text-[#474A4A]/60 dark:text-white/50 mb-4 font-medium">
                    Copia el mensaje generado por <span className="font-bold">Figuritas App</span> (el que incluye las banderas y los números separados por coma) y pégalo abajo.
                  </p>
                  
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Ejemplo:\nRepetidas\nFWC 🏆: 00, 2, 4\nMEX 🇲🇽: 3\nRSA 🇿🇦: 4, 6`}
                    className="w-full flex-1 min-h-[250px] p-4 rounded-xl border-2 border-[#D1D4D1] dark:border-white/10 bg-white dark:bg-[#1A1A1A] text-sm focus:outline-none focus:border-[#3CAC3B] transition-colors resize-none shadow-inner"
                  />
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleCompare}
                      disabled={!inputText.trim()}
                      className="flex items-center justify-center gap-2 px-8 py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-sm bg-[#3CAC3B] text-white hover:bg-[#2d8a2c] disabled:opacity-50 disabled:grayscale transition-all shadow-md active:scale-95"
                    >
                      <Search className="h-4 w-4" />
                      Analizar Lista
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full animate-in slide-in-from-right-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-[#2A398D] dark:text-white uppercase italic tracking-tighter">
                      Resultados
                    </h3>
                    <button
                      onClick={() => setHasCompared(false)}
                      className="text-xs font-bold text-[#474A4A] bg-[#D1D4D1]/50 hover:bg-[#D1D4D1] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Probar otra
                    </button>
                  </div>

                  {matchingStickers.length > 0 ? (
                    <>
                      <div className="bg-[#3CAC3B]/10 border border-[#3CAC3B]/30 p-4 rounded-xl mb-6">
                        <div className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-[#3CAC3B] mt-0.5" />
                          <div>
                            <p className="text-sm font-black text-[#2A398D] dark:text-white uppercase tracking-tight">
                              Encontramos {matchingStickers.length} figuritas que te sirven.
                            </p>
                            <p className="text-xs text-[#474A4A]/80 dark:text-white/70 mt-1 font-medium">
                              La otra persona tiene estas figuritas repetidas y a ti te faltan en tu álbum.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-2 custom-scrollbar">
                        {matchingStickers.map(s => (
                          <div key={s.id} className="bg-white dark:bg-[#1A1A1A] border border-[#474A4A]/10 dark:border-white/10 p-3 rounded-2xl flex items-center gap-3 shadow-sm transition-colors">
                            <span className="text-2xl">{getFlagEmoji(s.section)}</span>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-xs font-black text-[#2A398D] dark:text-[#4C5DBB] uppercase tracking-tighter">{s.id}</span>
                              <span className="text-[10px] font-bold text-[#474A4A]/70 dark:text-gray-400 truncate">{s.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8 bg-[#474A4A]/5 rounded-[2rem] h-full border-2 border-dashed border-[#474A4A]/20">
                      <div className="bg-[#474A4A]/10 p-4 rounded-full mb-4">
                        <AlertCircle className="h-10 w-10 text-[#474A4A]/60" />
                      </div>
                      <h4 className="text-lg font-black text-[#2A398D] dark:text-white uppercase tracking-tight mb-2">
                        No hay coincidencias
                      </h4>
                      <p className="text-sm text-[#474A4A]/70 dark:text-white/60 max-w-md font-medium">
                        Lamentablemente, la otra persona no tiene ninguna figurita repetida que a ti te falte en este momento.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
