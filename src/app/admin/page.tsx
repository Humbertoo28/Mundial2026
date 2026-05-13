import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { createClient } from '@supabase/supabase-js';
import { Users, Database, Star, Trophy, ArrowLeft, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";
import ExportDataButton from "@/components/admin/ExportDataButton";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "humbertolandero78@gmail.com";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  // Protección de ruta para el creador
  if (session?.user?.email !== ADMIN_EMAIL) {
    redirect('/');
  }

  // Inicializar variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  let profiles: any[] | null = null;
  let profilesError: any = null;
  let allUserStickers: any[] | null = null;
  let stickersError: any = null;
  let tradeLogs: any[] | null = null;

  try {
    // Si faltan las variables, no intentar conectarse para no crashear (luego mostramos el error rojo)
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Fetch all users with error logging
      const profilesResult = await supabase
        .from('profiles')
        .select('id, username, email, avatar_url, updated_at')
        .order('updated_at', { ascending: false });
        
      profiles = profilesResult.data;
      profilesError = profilesResult.error;

      if (profilesError) {
        console.error("Admin Dashboard: Error fetching profiles", profilesError);
      }

      // Fetch all user stickers to calculate progress
      const stickersResult = await supabase
        .from('user_stickers')
        .select('user_id, sticker_id, quantity')
        .limit(10000); // Aumentar límite para evitar truncado
        
      allUserStickers = stickersResult.data;
      stickersError = stickersResult.error;

      // Fetch all trade logs
      const tradeLogsResult = await supabase
        .from('trade_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // Limitar logs recientes
      
      tradeLogs = tradeLogsResult.data;
    }
  } catch (err: any) {
    console.error("Admin Dashboard: Critical Error", err);
    profilesError = err;
  }

  // Si hay error crítico, mostrar mensaje en pantalla detallado
  if (profilesError || !profiles) {
    const isMissingUrl = !supabaseUrl;
    const isMissingKey = !supabaseServiceKey;
    
    return (
      <div className="min-h-screen bg-[#F4F4F4] p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-red-500 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="text-red-600 h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-red-600 mb-4 uppercase">Error de Configuración</h1>
          <div className="text-[#474A4A] font-bold mb-6 text-sm text-left space-y-2">
            <p className={isMissingUrl ? "text-red-500" : "text-green-600"}>
              {isMissingUrl ? "❌ Falta NEXT_PUBLIC_SUPABASE_URL" : "✅ URL configurada"}
            </p>
            <p className={isMissingKey ? "text-red-500" : "text-green-600"}>
              {isMissingKey ? "❌ Falta SUPABASE_SERVICE_ROLE_KEY" : "✅ Key configurada"}
            </p>
            {profilesError && (
              <p className="text-red-500 mt-4 p-2 bg-red-50 rounded border border-red-100">
                Error de Supabase: {profilesError.message}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-6">
            Asegúrate de haber añadido estas variables en Vercel y haber hecho un <b>Redeploy</b>.
          </p>
          <Link href="/" className="inline-block bg-[#2A398D] text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-[#3CAC3B] transition-colors">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  // Stats calculation
  const totalUsers = profiles?.length || 0;
  const TOTAL_ALBUM_STICKERS = 994;
  
  // Aggregate stats per user
  const userStats = profiles?.map(profile => {
    const rawStickers = allUserStickers?.filter(us => us.user_id === profile.id) || [];
    
    // Agrupar por ID normalizado
    const inventoryMap: Record<string, number> = {};
    rawStickers.forEach(s => {
      const id = s.sticker_id.replace(/\s/g, '').toUpperCase();
      inventoryMap[id] = (inventoryMap[id] || 0) + s.quantity;
    });

    let uniqueStickers = 0;
    let repeatedStickers = 0;
    let totalStickersCount = 0;

    Object.values(inventoryMap).forEach(qty => {
      if (qty > 0) uniqueStickers++;
      if (qty > 1) repeatedStickers += (qty - 1);
      totalStickersCount += qty;
    });
    
    return {
      ...profile,
      uniqueStickers,
      repeatedStickers,
      totalStickersCount,
      percentage: Math.round((uniqueStickers / TOTAL_ALBUM_STICKERS) * 100)
    };
  }).sort((a, b) => b.uniqueStickers - a.uniqueStickers);

  const totalStickersPlatform = allUserStickers?.reduce((acc, us) => acc + us.quantity, 0) || 0;
  const totalTrades = tradeLogs?.length || 0;
  const totalMovedItems = tradeLogs?.reduce((acc: any, log: any) => acc + (log.given_ids?.length || 0) + (log.received_ids?.length || 0), 0) || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ... existing header ... */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="bg-[#E61D25] p-3 rounded-2xl shadow-lg">
            <Database className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#2A398D] dark:text-white uppercase italic tracking-tighter">
              Panel del Creador
            </h1>
            <p className="text-[#474A4A]/60 dark:text-white/60 font-bold uppercase tracking-widest text-xs">
              Métricas en Tiempo Real
            </p>
          </div>
        </div>
        <Link 
          href="/" 
          className="flex items-center gap-2 text-sm font-bold text-[#474A4A] dark:text-white/60 hover:text-[#2A398D] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-[#262626] p-6 rounded-3xl border border-[#2A398D]/10 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#2A398D]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <Users className="h-8 w-8 text-[#2A398D] mb-2 relative z-10" />
          <p className="text-3xl font-black text-[#2A398D] dark:text-white relative z-10">{totalUsers}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#474A4A]/60 dark:text-white/40 mt-1 relative z-10">Usuarios</p>
        </div>

        <div className="bg-white dark:bg-[#262626] p-6 rounded-3xl border border-[#3CAC3B]/10 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#3CAC3B]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <Star className="h-8 w-8 text-[#3CAC3B] mb-2 relative z-10" />
          <p className="text-3xl font-black text-[#3CAC3B] relative z-10">{totalStickersPlatform}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#474A4A]/60 dark:text-white/40 mt-1 relative z-10">Figuritas Circulando</p>
        </div>

        <div className="bg-white dark:bg-[#262626] p-6 rounded-3xl border border-[#E61D25]/10 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#E61D25]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <RefreshCw className="h-8 w-8 text-[#E61D25] mb-2 relative z-10" />
          <p className="text-3xl font-black text-[#E61D25] relative z-10">{totalTrades}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#474A4A]/60 dark:text-white/40 mt-1 relative z-10">Intercambios</p>
        </div>

        <div className="bg-white dark:bg-[#262626] p-6 rounded-3xl border border-[#2A398D]/10 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-[#2A398D]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <Trophy className="h-8 w-8 text-[#2A398D] mb-2 relative z-10" />
          <p className="text-3xl font-black text-[#2A398D] dark:text-white relative z-10">{totalMovedItems}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#474A4A]/60 dark:text-white/40 mt-1 relative z-10">Figuritas Movidas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Usuarios */}
        <div className="lg:col-span-2 bg-white dark:bg-[#262626] rounded-3xl border border-[#2A398D]/10 dark:border-white/5 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-[#2A398D]/10 dark:border-white/5 bg-[#2A398D]/5 flex items-center justify-between">
            <h2 className="text-xl font-black text-[#2A398D] dark:text-white uppercase italic">Ranking</h2>
            <ExportDataButton data={userStats as any} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#D1D4D1]/20 dark:bg-white/5 text-[#474A4A]/60 dark:text-white/40 text-[10px] uppercase tracking-widest font-black">
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Únicas</th>
                  <th className="px-6 py-4">Progreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A398D]/5 dark:divide-white/5">
                {userStats?.map((user) => (
                  <tr key={user.id} className="hover:bg-[#2A398D]/5 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.avatar_url || 'https://via.placeholder.com/32'} 
                          className="w-8 h-8 rounded-full border border-[#2A398D]/20"
                          alt=""
                        />
                        <div>
                          <p className="font-bold text-[#474A4A] dark:text-white text-sm leading-none">{user.username || 'Sin nombre'}</p>
                          <p className="text-[9px] text-[#474A4A]/40 mt-1 uppercase">{user.email?.split('@')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-[#2A398D] dark:text-[#4C5DBB]">{user.uniqueStickers}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-[#D1D4D1] dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#3CAC3B]" style={{ width: `${user.percentage}%` }} />
                        </div>
                        <span className="text-[9px] font-black text-[#3CAC3B]">{user.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="bg-white dark:bg-[#262626] rounded-3xl border border-[#E61D25]/10 dark:border-white/5 shadow-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#E61D25]/10 dark:border-white/5 bg-[#E61D25]/5">
            <h2 className="text-xl font-black text-[#E61D25] uppercase italic">Actividad</h2>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[600px] p-4 space-y-3">
            {tradeLogs?.map((log: any) => {
              const user = profiles?.find(p => p.id === log.user_id);
              return (
                <div key={log.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-[#3CAC3B]/30 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-black text-[10px] text-[#2A398D]">@{user?.username || 'user'}</span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span className="font-black text-[10px] text-[#3CAC3B]">{log.trader_name || 'Alguien'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <span className="text-[9px] font-bold bg-[#E61D25]/10 text-[#E61D25] px-2 py-0.5 rounded-full">-{log.given_ids?.length || 0}</span>
                      <span className="text-[9px] font-bold bg-[#3CAC3B]/10 text-[#3CAC3B] px-2 py-0.5 rounded-full">+{log.received_ids?.length || 0}</span>
                    </div>
                    <span className="text-[8px] text-gray-400 font-medium">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
