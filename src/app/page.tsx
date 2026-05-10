import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { LogIn, Layers, CheckCircle, PackageOpen, ArrowRight, Filter } from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import TradeListButton from "@/components/TradeListButton";
import SearchFriends from "@/components/SearchFriends";
import { getFlagUrl, getSectionDisplayName, sortSectionsWithPanamaFirst } from "@/lib/flags";
import { GROUPS, GroupCode, getGroupForSticker } from "@/lib/groups";
import UsernameSettings from "@/components/UsernameSettings";
import AvatarSelector from "@/components/AvatarSelector";
import { getProfile } from "@/app/actions/profile";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Si no hay sesión, mostrar landing page
  if (!session?.user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="bg-[#2A398D]/10 p-4 rounded-full mb-6">
          <Layers className="h-16 w-16 text-[#2A398D]" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-[#2A398D]">
          Panini Tracker Pty
        </h1>
        <p className="text-lg text-[#474A4A]/80 max-w-2xl mb-8">
          Lleva el control absoluto de tu colección. Marca tus figuritas faltantes, organiza tus repetidas y comparte tu lista para intercambios con un solo clic.
        </p>
        <a 
          href="/api/auth/signin"
          className="flex items-center gap-2 text-lg font-semibold bg-[#2A398D] hover:bg-[#3CAC3B] text-white px-8 py-4 rounded-full transition-all hover:scale-105 shadow-md"
        >
          <LogIn className="h-5 w-5" />
          Comenzar ahora
        </a>
      </div>
    );
  }

  // Si hay sesión, cargar Dashboard con datos reales
  const userId = session.user.id;
  
  // Fetch all stickers to calculate section stats
  const { data: allStickers } = await supabase
    .from('stickers')
    .select('id, section');

  // Fetch user inventory
  const { data: userStickers } = await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', userId);

  // Fetch user profile for custom username
  const profile = await getProfile();
  const displayName = profile?.username || session.user.name || "Coleccionista";

  const totalStickers = 994;
  let tengo = 0;
  let repetidas = 0;
  
  // Create inventory map for quick lookup
  const inventoryMap: Record<string, number> = {};

  if (userStickers) {
    userStickers.forEach(s => {
      inventoryMap[s.sticker_id] = s.quantity;
      if (s.quantity > 0) tengo++;
      if (s.quantity > 1) repetidas += (s.quantity - 1);
    });
  }

  // Calculate missing per section and group
  const sectionStats: Record<string, { total: number, missing: number }> = {};
  const groupStats: Record<string, { total: number, owned: number }> = {};
  
  // Initialize group stats
  Object.keys(GROUPS).forEach(group => {
    groupStats[group] = { total: 0, owned: 0 };
  });

  if (allStickers) {
    allStickers.forEach(sticker => {
      if (!sectionStats[sticker.section]) {
        sectionStats[sticker.section] = { total: 0, missing: 0 };
      }
      sectionStats[sticker.section].total++;
      
      const isOwned = inventoryMap[sticker.id] > 0;
      if (!isOwned) {
        sectionStats[sticker.section].missing++;
      }

      // Group stats
      const group = getGroupForSticker(sticker.id);
      if (group) {
        groupStats[group].total++;
        if (isOwned) groupStats[group].owned++;
      }
    });
  }

  // Filter sections that actually have missing stickers and sort them by most missing
  const missingBySection = Object.entries(sectionStats)
    .filter(([_, stats]) => stats.missing > 0)
    .sort((a, b) => {
      // If one is Panama, it goes first
      if (a[0].toUpperCase() === 'PANAMA') return -1;
      if (b[0].toUpperCase() === 'PANAMA') return 1;
      // Otherwise sort by missing count
      return b[1].missing - a[1].missing;
    });

  // Build repeated stickers list (for the trade list)
  // We need section info for each sticker — join with allStickers
  const stickerSectionMap: Record<string, string> = {};
  if (allStickers) {
    allStickers.forEach(s => { stickerSectionMap[s.id] = s.section; });
  }
  
  const repeatedStickers = (userStickers || [])
    .filter(s => s.quantity > 1)
    .map(s => ({
      sticker_id: s.sticker_id,
      quantity: s.quantity,
      section: stickerSectionMap[s.sticker_id] || 'Otros',
    }))
    .sort((a, b) => a.section.localeCompare(b.section));

  const faltan = totalStickers - tengo;
  const porcentaje = Math.round((tengo / totalStickers) * 100);

  const stats = {
    total: totalStickers,
    tengo,
    faltan,
    repetidas,
    porcentaje
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 border-b border-[#474A4A]/10 pb-6">
        <div>
          <h1 className="text-4xl font-black text-[#2A398D] dark:text-white italic uppercase tracking-tighter">
            ¡Hola, {displayName}! 👋
          </h1>
          <p className="text-[#474A4A]/60 dark:text-white/60 font-bold uppercase tracking-widest text-xs mt-1">
            Estás a {totalStickers - tengo} figuritas de completar tu álbum
          </p>
        </div>
        <Link 
          href="/album"
          className="bg-[#2A398D] hover:bg-[#3CAC3B] text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all hover:scale-105 shadow-md flex items-center gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          Mi Álbum
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <UsernameSettings initialUsername={profile?.username} />
        <AvatarSelector currentAvatar={profile?.avatar_url} />
      </div>

      {/* Buscador de Amigos */}
      <div className="mb-12">
        <SearchFriends />
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white dark:bg-[#262626] border border-[#474A4A]/20 dark:border-white/10 p-6 rounded-2xl flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#3CAC3B]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="text-[#3CAC3B] mb-3 relative z-10"><CheckCircle className="h-8 w-8 md:h-10 md:w-10" /></div>
          <span className="text-3xl md:text-5xl font-black text-[#474A4A] dark:text-white relative z-10">{stats.tengo}</span>
          <span className="text-xs md:text-sm text-[#474A4A]/80 dark:text-white/60 font-bold uppercase tracking-wider mt-2 relative z-10">Conseguidas</span>
        </div>
        
        <div className="bg-white dark:bg-[#262626] border border-[#474A4A]/20 dark:border-white/10 p-6 rounded-2xl flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#E61D25]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="text-[#E61D25] dark:text-[#E61D25] mb-3 relative z-10"><PackageOpen className="h-8 w-8 md:h-10 md:w-10" /></div>
          <span className="text-3xl md:text-5xl font-black text-[#474A4A] dark:text-white relative z-10">{stats.faltan}</span>
          <span className="text-xs md:text-sm text-[#474A4A]/80 dark:text-white/60 font-bold uppercase tracking-wider mt-2 relative z-10">Faltantes</span>
        </div>

        <div className="bg-white dark:bg-[#262626] border border-[#474A4A]/20 dark:border-white/10 p-6 rounded-2xl flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#2A398D]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="text-[#2A398D] dark:text-[#4C5DBB] mb-3 relative z-10"><Layers className="h-8 w-8 md:h-10 md:w-10" /></div>
          <span className="text-3xl md:text-5xl font-black text-[#474A4A] dark:text-white relative z-10">{stats.repetidas}</span>
          <span className="text-xs md:text-sm text-[#474A4A]/80 dark:text-white/60 font-bold uppercase tracking-wider mt-2 relative z-10">Repetidas</span>
        </div>

        <div className="bg-white dark:bg-[#262626] border border-[#474A4A]/20 dark:border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow">
          <div className="relative h-24 w-24 md:h-32 md:w-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#D1D4D1] dark:text-white/10"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#3CAC3B] transition-all duration-1000 ease-out"
                strokeDasharray={`${stats.porcentaje}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl md:text-3xl font-black text-[#2A398D] dark:text-white">
              {stats.porcentaje}%
            </div>
          </div>
          <span className="text-xs md:text-sm text-[#474A4A]/80 dark:text-white/60 mt-4 font-bold uppercase tracking-wider">Completado</span>
        </div>
      </div>

      {/* Resumen de Grupos (A-L) */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#2A398D]/10 p-2 rounded-lg">
            <Filter className="h-6 w-6 text-[#2A398D]" />
          </div>
          <h2 className="text-2xl font-bold text-[#2A398D] dark:text-white">Resumen de Grupos</h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.entries(groupStats).map(([group, data]) => {
            const percentage = Math.round((data.owned / data.total) * 100) || 0;
            const isNearComplete = percentage > 80;
            
            return (
              <div key={group} className="bg-white border border-[#474A4A]/10 p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-[#2A398D] text-sm tracking-tight">GRUPO {group}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isNearComplete ? 'bg-[#3CAC3B]/10 text-[#3CAC3B]' : 'bg-[#D1D4D1]/30 text-[#474A4A]'
                  }`}>
                    {percentage}%
                  </span>
                </div>
                <div className="w-full bg-[#D1D4D1]/30 h-1.5 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full transition-all duration-1000 ${isNearComplete ? 'bg-[#3CAC3B]' : 'bg-[#2A398D]'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-[#474A4A]/50">
                  <span>{data.owned} / {data.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Faltantes por País/Sección */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#E61D25]/10 p-2 rounded-lg">
            <PackageOpen className="h-6 w-6 text-[#E61D25]" />
          </div>
          <h2 className="text-2xl font-bold text-[#2A398D]">Faltantes por País</h2>
        </div>
        
        {missingBySection.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {missingBySection.map(([section, data]) => {
              const isAlmostComplete = data.missing <= 3;
              const isPanama = section.toUpperCase() === 'PANAMA';
              
              return (
                <div key={section} className={`bg-white border p-4 rounded-xl shadow-sm flex flex-col justify-between transition-all hover:scale-105 ${
                  isPanama ? 'border-[#E61D25] shadow-[#E61D25]/10' :
                  isAlmostComplete ? 'border-[#3CAC3B]/30' : 'border-[#474A4A]/20'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getFlagUrl(section) ? (
                      <img 
                        src={getFlagUrl(section)!} 
                        alt={section} 
                        loading="lazy"
                        className="w-6 h-6 object-cover rounded-full shadow-sm border border-[#474A4A]/20 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 flex items-center justify-center bg-[#D1D4D1] rounded-full text-xs shadow-sm border border-[#474A4A]/20">🏆</div>
                    )}
                    <span className="font-bold text-[#2A398D] text-sm uppercase tracking-wider line-clamp-1">{getSectionDisplayName(section)}</span>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-xs text-[#474A4A]/60 font-medium">Faltan</span>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-black ${isAlmostComplete ? 'text-[#3CAC3B]' : 'text-[#E61D25]'}`}>
                        {data.missing}
                      </span>
                      <span className="text-xs text-[#474A4A]/60 font-bold">/ {data.total}</span>
                    </div>
                  </div>
                  {isAlmostComplete && (
                    <div className="mt-2 text-[10px] font-bold text-[#3CAC3B] bg-[#3CAC3B]/10 px-2 py-1 rounded-md text-center">
                      ¡A punto de completar!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-[#3CAC3B]/20 p-8 rounded-2xl text-center shadow-sm">
            <div className="inline-block bg-[#3CAC3B]/10 p-4 rounded-full mb-4">
              <CheckCircle className="h-12 w-12 text-[#3CAC3B]" />
            </div>
            <h3 className="text-xl font-bold text-[#2A398D] mb-2">¡Álbum Completado!</h3>
            <p className="text-[#474A4A]/80">No te falta ninguna figurita en ninguna sección. ¡Felicidades!</p>
          </div>
        )}
      </div>

      {/* Generador de Lista de Intercambio ⭐ */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#3CAC3B]/10 p-2 rounded-lg">
            <Layers className="h-6 w-6 text-[#3CAC3B]" />
          </div>
          <h2 className="text-2xl font-bold text-[#2A398D]">Intercambio</h2>
        </div>
        <TradeListButton repeatedStickers={repeatedStickers} />
      </div>
      
      {/* Banner de Acción Rápida */}
      <div className="bg-gradient-to-r from-[#2A398D] to-[#1e2a6d] rounded-2xl p-6 md:p-10 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">¡Sigue coleccionando!</h2>
          <p className="text-white/80 max-w-md">Actualiza tu inventario en tiempo real y comparte tus repetidas con tus amigos para completar el álbum más rápido.</p>
        </div>
        <Link 
          href="/album"
          className="relative z-10 flex items-center gap-2 bg-[#3CAC3B] hover:bg-white hover:text-[#3CAC3B] text-white px-8 py-4 rounded-xl font-bold transition-all shadow-md hover:scale-105 active:scale-95 whitespace-nowrap"
        >
          Ir a Mi Álbum
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
