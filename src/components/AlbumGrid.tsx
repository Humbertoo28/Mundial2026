'use client';

import { useState, useRef } from 'react';
import { Search, Filter, Minus, Plus, Layers } from 'lucide-react';
import { updateStickerQuantity } from '@/app/actions/stickers';
import { getFlagUrl, getFlagEmoji, sortSectionsWithPanamaFirst, PREFIX_TO_FLAG } from '@/lib/flags';
import { GROUPS, GroupCode, getGroupForSticker } from '@/lib/groups';

type Sticker = {
  id: string;
  section: string;
  type: string;
  name: string;
};

type UserSticker = {
  sticker_id: string;
  quantity: number;
};

export default function AlbumGrid({
  initialStickers,
  initialUserStickers,
}: {
  initialStickers: Sticker[];
  initialUserStickers: UserSticker[];
}) {
  const getSectionDisplayName = (section: string) => {
    const normalized = section.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized === 'SECCION 1') return '🏟️ Estadios y Sedes';
    if (normalized === 'SECCION 2') return '🏛️ Museo FIFA';
    if (normalized === 'SECCION 3') return '✨ Especiales Coca-Cola';
    if (normalized === 'SECCION 4') return '🌟 Figuritas de Leyenda';
    return section;
  };

  const [stickers] = useState<Sticker[]>(initialStickers);
  const [inventory, setInventory] = useState<Record<string, number>>(() => {
    const acc: Record<string, number> = {};
    initialUserStickers.forEach(us => {
      acc[us.sticker_id] = us.quantity;
    });
    return acc;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('Todas');
  const [selectedGroup, setSelectedGroup] = useState<GroupCode | 'TODOS'>('TODOS');
  const [showOnlyRepeated, setShowOnlyRepeated] = useState(false);

  const sections = [
    'Todas',
    ...Array.from(new Set(stickers.map(s => s.section))).sort(sortSectionsWithPanamaFirst),
  ];

  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  const updateQuantity = (stickerId: string, delta: number) => {
    setInventory(prev => {
      const currentQ = prev[stickerId] || 0;
      const newQ = Math.max(0, currentQ + delta);

      if (timeoutRefs.current[stickerId]) {
        clearTimeout(timeoutRefs.current[stickerId]);
      }

      timeoutRefs.current[stickerId] = setTimeout(async () => {
        try {
          await updateStickerQuantity(stickerId, newQ);
        } catch (error) {
          console.error('Error updating sticker:', error);
        }
      }, 500);

      return { ...prev, [stickerId]: newQ };
    });
  };

  const filteredStickers = stickers.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const stickerGroup = getGroupForSticker(s.id);
    const matchesGroup = selectedGroup === 'TODOS' || stickerGroup === selectedGroup;
    
    const matchesSection = selectedSection === 'Todas' || s.section === selectedSection;
    
    const isRepeated = (inventory[s.id] || 0) > 1;
    const matchesRepeated = !showOnlyRepeated || isRepeated;
    
    return matchesSearch && matchesGroup && matchesSection && matchesRepeated;
  });

  // Group by section
  const groupedStickers = filteredStickers.reduce((acc, sticker) => {
    if (!acc[sticker.section]) acc[sticker.section] = [];
    acc[sticker.section].push(sticker);
    return acc;
  }, {} as Record<string, Sticker[]>);

  // Sort sections with Panama first
  const sortedSections = Object.keys(groupedStickers).sort(sortSectionsWithPanamaFirst);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Filtros */}
      <div className="bg-white dark:bg-[#262626] border border-[#474A4A]/20 dark:border-white/10 p-4 rounded-2xl mb-8 flex flex-col md:flex-row gap-4 items-center sticky top-20 z-40 shadow-md">
        {/* Buscador */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#474A4A]/50 dark:text-white/30 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar por nombre o número (ej. ARG01)"
            className="w-full bg-[#D1D4D1]/30 dark:bg-white/5 border border-[#474A4A]/20 dark:border-white/10 text-[#474A4A] dark:text-white rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-[#2A398D] dark:focus:border-[#4C5DBB] transition-colors placeholder:text-[#474A4A]/50 dark:placeholder:text-white/30"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:flex-1">
          <Filter className="text-[#474A4A]/50 dark:text-white/30 h-5 w-5 flex-shrink-0" />
          <select
            className="w-full bg-[#D1D4D1]/30 dark:bg-white/5 border border-[#474A4A]/20 dark:border-white/10 text-[#474A4A] dark:text-white rounded-xl px-4 py-2 focus:outline-none focus:border-[#2A398D] dark:focus:border-[#4C5DBB] transition-colors"
            value={selectedSection}
            onChange={e => {
              setSelectedSection(e.target.value);
              if (e.target.value !== 'Todas') setSelectedGroup('TODOS');
            }}
          >
            {sections.map(sec => (
              <option key={sec} value={sec} className="dark:bg-[#262626]">
                {sec === 'Todas' ? '🌍 Todas las Selecciones' : getSectionDisplayName(sec)}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowOnlyRepeated(!showOnlyRepeated)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all border whitespace-nowrap ${
            showOnlyRepeated
              ? 'bg-[#E61D25] text-white border-[#E61D25] shadow-md'
              : 'bg-[#D1D4D1]/30 dark:bg-white/5 text-[#474A4A] dark:text-white border-[#474A4A]/20 dark:border-white/10 hover:border-[#E61D25]'
          }`}
        >
          <Layers className={`h-4 w-4 ${showOnlyRepeated ? 'animate-pulse' : ''}`} />
          Solo Repetidas
        </button>
      </div>

      {/* Selector de Grupos */}
      <div className="mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-4 hide-scrollbar">
          <button
            onClick={() => setSelectedGroup('TODOS')}
            className={`px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap border ${
              selectedGroup === 'TODOS'
                ? 'bg-[#2A398D] text-white border-[#2A398D] shadow-md'
                : 'bg-white dark:bg-[#262626] text-[#474A4A] dark:text-white/80 border-[#474A4A]/20 dark:border-white/10 hover:border-[#2A398D]'
            }`}
          >
            TODOS LOS GRUPOS
          </button>
          {Object.keys(GROUPS).map(group => (
            <button
              key={group}
              onClick={() => {
                setSelectedGroup(group as GroupCode);
                setSelectedSection('Todas');
              }}
              className={`px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap border ${
                selectedGroup === group
                  ? 'bg-[#2A398D] text-white border-[#2A398D] shadow-md'
                  : 'bg-white dark:bg-[#262626] text-[#474A4A] dark:text-white/80 border-[#474A4A]/20 dark:border-white/10 hover:border-[#2A398D]'
              }`}
            >
              GRUPO {group}
            </button>
          ))}
        </div>
      </div>

      {/* Vista de Grupo / Info */}
      {selectedGroup !== 'TODOS' && (
        <div className="bg-[#2A398D] text-white p-6 rounded-2xl mb-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="relative z-10">
            <h2 className="text-3xl font-black italic mb-4">GRUPO {selectedGroup}</h2>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                {GROUPS[selectedGroup as GroupCode].map(prefix => {
                  const flagCode = PREFIX_TO_FLAG[prefix];
                  const isPanama = prefix === 'PAN';
                  return (
                    <div key={prefix} className="flex flex-col items-center gap-1">
                      <img 
                        src={flagCode ? `https://flagcdn.com/w80/${flagCode}.png` : 'https://flagcdn.com/w80/un.png'}
                        alt={prefix}
                        className={`w-10 h-7 object-cover rounded shadow-md border ${isPanama ? 'border-[#E61D25] ring-2 ring-[#E61D25]/50' : 'border-white/20'}`}
                      />
                      <span className={`text-[10px] font-black ${isPanama ? 'text-[#E61D25]' : 'text-white'}`}>{prefix}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex-1 min-w-[200px]">
                {(() => {
                  const groupStickers = stickers.filter(s => getGroupForSticker(s.id) === selectedGroup);
                  const total = groupStickers.length;
                  const owned = groupStickers.filter(s => inventory[s.id] > 0).length;
                  const percentage = Math.round((owned / total) * 100) || 0;
                  
                  return (
                    <>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-80">Progreso del Grupo</span>
                        <span className="text-2xl font-black">{percentage}%</span>
                      </div>
                      <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#3CAC3B] transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-bold mt-2 opacity-70">
                        Has coleccionado {owned} de {total} figuritas de este grupo
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Agrupado por Sección */}
      <div className="flex flex-col gap-10">
        {sortedSections.map(sectionName => {
          const sectionStickers = groupedStickers[sectionName];
          const isPanama = sectionName.toUpperCase() === 'PANAMA';
          const flagUrl = getFlagUrl(sectionName, sectionStickers[0]?.id);

          return (
            <div key={sectionName} className="animate-in fade-in duration-300">
              {/* Título de la Sección */}
              <div className={`flex items-center gap-3 mb-4 pb-2 border-b-2 ${isPanama ? 'border-[#E61D25]/30' : 'border-[#2A398D]/10'}`}>
                {flagUrl ? (
                  <img
                    src={flagUrl}
                    alt={sectionName}
                    loading="lazy"
                    className={`w-10 h-10 object-cover rounded-full shadow-sm border-2 flex-shrink-0 ${
                      isPanama ? 'border-[#E61D25] ring-2 ring-[#E61D25]/20' : 'border-[#474A4A]/20'
                    }`}
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center bg-[#D1D4D1] rounded-full text-xl shadow-sm border border-[#474A4A]/20 flex-shrink-0">
                    🏆
                  </div>
                )}
                <h2 className={`text-xl md:text-2xl font-black uppercase tracking-wider ${isPanama ? 'text-[#E61D25]' : 'text-[#2A398D] dark:text-white'}`}>
                  {getSectionDisplayName(sectionName)}
                </h2>
                <div className="flex-1 h-px bg-[#474A4A]/20" />
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-[#474A4A]/60 dark:text-white/60 bg-white dark:bg-[#262626] border border-[#474A4A]/10 dark:border-white/10 px-3 py-1 rounded-full whitespace-nowrap">
                    {sectionStickers.length} {sectionStickers.length === 1 ? 'figurita' : 'figuritas'}
                  </span>
                  {showOnlyRepeated && (
                    <span className="text-[10px] font-black text-[#E61D25] uppercase mt-1">
                      {sectionStickers.reduce((acc, s) => acc + (inventory[s.id] - 1), 0)} Repetidas
                    </span>
                  )}
                </div>
              </div>

              {/* Grid de Láminas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {sectionStickers.map(sticker => {
                  const qty = inventory[sticker.id] || 0;
                  const isMissing = qty === 0;
                  const isRepeated = qty > 1;
                  const cardFlagUrl = getFlagUrl(sticker.section, sticker.id);

                  return (
                    <div
                      key={sticker.id}
                      className={`relative bg-white dark:bg-[#262626] border rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-sm ${
                        isMissing
                          ? 'border-[#474A4A]/30 dark:border-white/10 opacity-80 grayscale-[0.5]'
                          : isRepeated
                          ? 'border-[#2A398D] dark:border-[#4C5DBB] shadow-[0_0_15px_rgba(42,57,141,0.3)] ring-2 ring-[#2A398D]'
                          : 'border-[#3CAC3B] shadow-[0_0_10px_rgba(60,172,59,0.3)]'
                      }`}
                    >
                      {/* Header de la tarjeta */}
                      <div
                        className={`p-2 border-b flex justify-between items-center ${
                          isRepeated ? 'border-[#2A398D]/20 bg-[#2A398D]/10 dark:bg-[#2A398D]/20' : 'border-[#474A4A]/10 dark:border-white/5 bg-[#D1D4D1]/20 dark:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {cardFlagUrl && (
                            <img
                              src={cardFlagUrl}
                              alt=""
                              loading="lazy"
                              className="w-5 h-5 object-cover rounded-full shadow-sm border border-[#474A4A]/20 flex-shrink-0"
                            />
                          )}
                          <span className="font-bold text-[#2A398D] dark:text-[#4C5DBB] text-sm">{sticker.id}</span>
                        </div>
                        {qty > 0 ? (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${
                              isRepeated ? 'bg-[#2A398D] animate-pulse' : 'bg-[#3CAC3B]'
                            }`}
                          >
                            x{qty}
                          </span>
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#E61D25] shadow-[0_0_5px_rgba(230,29,37,0.5)]" />
                        )}
                      </div>

                      {/* Body de la tarjeta */}
                      <div className="p-3 flex flex-col items-center text-center">
                        <span className="font-medium text-xs text-[#474A4A] dark:text-white/90 line-clamp-2 min-h-[32px] flex items-center">
                          {sticker.name}
                        </span>
                        <span className="text-[10px] text-[#474A4A]/50 dark:text-white/40 mt-1 uppercase tracking-wider font-bold">
                          {sticker.type}
                        </span>
                      </div>

                      {/* Controles */}
                      <div className="p-2 bg-[#D1D4D1]/30 dark:bg-white/5 flex items-center gap-2 border-t border-[#474A4A]/10 dark:border-white/10">
                        <button
                          onClick={() => updateQuantity(sticker.id, -1)}
                          disabled={qty === 0}
                          className="flex-1 p-1.5 flex justify-center items-center rounded-lg bg-white dark:bg-[#262626] border border-[#474A4A]/20 dark:border-white/10 text-[#474A4A] dark:text-white hover:text-white hover:bg-[#E61D25] hover:border-[#E61D25] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateQuantity(sticker.id, 1)}
                          className="flex-1 p-1.5 flex justify-center items-center rounded-lg bg-[#2A398D] text-white hover:bg-[#3CAC3B] transition-colors shadow-sm"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vacío */}
      {filteredStickers.length === 0 && (
        <div className="text-center py-20 text-[#474A4A]/60">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-lg font-medium">No se encontraron figuritas que coincidan con tu búsqueda.</p>
        </div>
      )}
    </div>
  );
}
