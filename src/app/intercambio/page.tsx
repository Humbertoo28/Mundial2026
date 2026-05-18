import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import TradeListButton from "@/components/TradeListButton";
import SearchFriends from "@/components/SearchFriends";
import PersonalStatsShare from "@/components/PersonalStatsShare";
import { getProfile } from "@/app/actions/profile";
import Link from "next/link";
import { RefreshCw, ArrowLeft, Layers, Trophy, CheckCircle, Flame, Users } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic';

export default async function IntercambioPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userId = session.user.id;

  // Fetch all stickers to calculate section stats
  let allStickers: any[] = [];
  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const { data } = await supabase
      .from('stickers')
      .select('id, name, section')
      .order('id', { ascending: true })
      .range(page * 1000, (page + 1) * 1000 - 1);
      
    if (data && data.length > 0) {
      allStickers = [...allStickers, ...data];
    }
    if (!data || data.length < 1000) {
      hasMore = false;
    }
    page++;
  }

  // Fetch all profiles for trader suggestions
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('username')
    .not('username', 'is', null);

  // Fetch trade logs for stats
  const { data: tradeLogs } = await supabase
    .from('trade_logs')
    .select('trader_name, given_ids, received_ids')
    .eq('user_id', userId);

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
      const id = s.sticker_id.replace(/\s/g, '').toUpperCase();
      inventoryMap[id] = (inventoryMap[id] || 0) + s.quantity;
    });
  }

  if (Object.keys(inventoryMap).length > 0) {
    Object.values(inventoryMap).forEach(qty => {
      if (qty > 0) tengo++;
      if (qty > 1) repetidas += (qty - 1);
    });
  }

  const faltantes = totalStickers - tengo;
  const porcentaje = Math.round((tengo / totalStickers) * 100);

  // Trade Stats calculation
  const totalTrades = tradeLogs?.length || 0;
  const uniqueTradersCount = new Set(tradeLogs?.map(log => (log.trader_name || '').toLowerCase())).size;
  const totalItemsTraded = tradeLogs?.reduce((acc, log) => acc + (log.given_ids?.length || 0) + (log.received_ids?.length || 0), 0) || 0;

  const stats = {
    total: totalStickers,
    tengo,
    faltantes,
    repetidas,
    porcentaje,
    totalTrades,
    uniqueTradersCount,
    totalItemsTraded
  };

  // Build missing stickers list
  const missingStickers: { id: string, name: string, section: string }[] = [];
  if (allStickers) {
    allStickers.forEach(sticker => {
      const idNormal = sticker.id.replace(/\s/g, '').toUpperCase();
      const isOwned = (inventoryMap[idNormal] || 0) > 0;
      if (!isOwned) {
        missingStickers.push(sticker);
      }
    });
  }

  // Build repeated stickers list
  const stickerSectionMap: Record<string, string> = {};
  if (allStickers) {
    allStickers.forEach(s => { 
      stickerSectionMap[s.id] = s.section; 
      const normalized = s.id.replace(/\s/g, '').toUpperCase();
      stickerSectionMap[normalized] = s.section;
    });
  }
  
  const repeatedStickers = Object.entries(inventoryMap)
    .filter(([_, qty]) => qty > 1)
    .map(([id, qty]) => {
      const stickerInfo = allStickers?.find(as => 
        as.id.replace(/\s/g, '').toUpperCase() === id
      );
      
      return {
        sticker_id: id,
        name: stickerInfo?.name || '',
        quantity: qty,
        section: stickerSectionMap[id] || stickerInfo?.section || 'Otros',
      };
    })
    .sort((a, b) => a.section.localeCompare(b.section));

  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in duration-500">
      
      {/* Header Premium de la Sección */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 border-b border-[#474A4A]/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#2A398D]">
            <Link href="/" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Resumen
            </Link>
            <span>/</span>
            <span className="text-[#3CAC3B]">Panel de Intercambio</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#2A398D] dark:text-white italic uppercase tracking-tighter mt-1 flex items-center gap-3">
            <RefreshCw className="h-10 w-10 text-[#3CAC3B] animate-spin-slow" />
            Intercambios
          </h1>
          <p className="text-sm text-[#474A4A]/70 dark:text-white/60 font-bold uppercase tracking-wide mt-2">
            Gestiona tus repetidas de forma masiva, genera tu lista para WhatsApp, exporta PDF y conéctate con otros coleccionistas.
          </p>
        </div>
      </div>

      {/* Widgets de Estadísticas de Intercambio */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white dark:bg-[#0D0D0D] border border-[#474A4A]/20 dark:border-white/10 p-6 rounded-2xl flex flex-col items-center text-center shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#3CAC3B]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="text-[#3CAC3B] mb-3 relative z-10"><Layers className="h-8 w-8 md:h-10 md:w-10" /></div>
          <span className="text-3xl md:text-5xl font-black text-[#474A4A] dark:text-white relative z-10">{repetidas}</span>
          <span className="text-xs md:text-sm text-[#474A4A]/80 dark:text-white/60 font-bold uppercase tracking-wider mt-2 relative z-10">Tus Repetidas</span>
        </div>
        
        <div className="bg-white dark:bg-[#0D0D0D] border border-[#474A4A]/20 dark:border-white/10 p-6 rounded-2xl flex flex-col items-center text-center shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#2A398D]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="text-[#2A398D] mb-3 relative z-10"><Trophy className="h-8 w-8 md:h-10 md:w-10" /></div>
          <span className="text-3xl md:text-5xl font-black text-[#474A4A] dark:text-white relative z-10">{totalTrades}</span>
          <span className="text-xs md:text-sm text-[#474A4A]/80 dark:text-white/60 font-bold uppercase tracking-wider mt-2 relative z-10">Trades Completados</span>
        </div>

        <div className="bg-white dark:bg-[#0D0D0D] border border-[#474A4A]/20 dark:border-white/10 p-6 rounded-2xl flex flex-col items-center text-center shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#E61D25]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="text-[#E61D25] mb-3 relative z-10"><Flame className="h-8 w-8 md:h-10 md:w-10" /></div>
          <span className="text-3xl md:text-5xl font-black text-[#474A4A] dark:text-white relative z-10">{totalItemsTraded}</span>
          <span className="text-xs md:text-sm text-[#474A4A]/80 dark:text-white/60 font-bold uppercase tracking-wider mt-2 relative z-10">Figuritas Transadas</span>
        </div>

        <div className="bg-white dark:bg-[#0D0D0D] border border-[#474A4A]/20 dark:border-white/10 p-6 rounded-2xl flex flex-col items-center text-center shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#FDB931]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="text-[#FDB931] mb-3 relative z-10"><Users className="h-8 w-8 md:h-10 md:w-10" /></div>
          <span className="text-3xl md:text-5xl font-black text-[#474A4A] dark:text-white relative z-10">{uniqueTradersCount}</span>
          <span className="text-xs md:text-sm text-[#474A4A]/80 dark:text-white/60 font-bold uppercase tracking-wider mt-2 relative z-10">Socios de Intercambio</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna de Gestión Principal de Intercambio (2/3 de pantalla) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#0D0D0D] border border-[#474A4A]/20 dark:border-white/10 rounded-3xl p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#2A398D] dark:text-white uppercase italic tracking-tighter mb-4 flex items-center gap-2 border-b border-[#474A4A]/10 pb-3">
              <RefreshCw className="h-6 w-6 text-[#3CAC3B]" />
              Gestor Masivo y Listas
            </h2>
            <TradeListButton 
              repeatedStickers={repeatedStickers} 
              allStickers={allStickers || []} 
              allProfiles={allProfiles?.map(p => p.username!) || []}
              username={displayName}
              missingStickers={missingStickers}
            />
          </div>
        </div>

        {/* Columna Lateral: Buscar Coleccionistas y Logros (1/3 de pantalla) */}
        <div className="flex flex-col gap-6">
          
          {/* Compartir Estadísticas */}
          {stats && stats.totalTrades !== undefined && (
            <PersonalStatsShare 
              stats={stats as any} 
              username={displayName} 
              avatarUrl={profile?.avatar_url || "https://flagcdn.com/w80/pa.png"} 
            />
          )}

          {/* Buscador de Coleccionistas */}
          <div className="bg-white dark:bg-[#0D0D0D] border border-[#474A4A]/20 dark:border-white/10 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xl font-black text-[#2A398D] dark:text-white uppercase italic tracking-tighter mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#3CAC3B]" />
              Encontrar Coleccionistas
            </h3>
            <p className="text-xs text-[#474A4A]/70 dark:text-white/55 font-bold uppercase mb-4 tracking-wider leading-relaxed">
              Busca amigos, compara sus figuritas con las tuyas en tiempo real y coordina tus trades sin esfuerzo.
            </p>
            <SearchFriends />
          </div>

        </div>

      </div>

    </div>
  );
}
