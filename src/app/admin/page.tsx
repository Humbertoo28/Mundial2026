import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { createClient } from '@supabase/supabase-js';
import { Users, Database, Star, Trophy, ArrowLeft } from "lucide-react";
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

  // Inicializar cliente dentro de la función para asegurar lectura de env vars en runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch all users with error logging
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url, created_at')
    .order('created_at', { ascending: false });

  if (profilesError) {
    console.error("Admin Dashboard: Error fetching profiles", profilesError);
  }

  // Fetch all user stickers to calculate progress
  const { data: allUserStickers, error: stickersError } = await supabase
    .from('user_stickers')
    .select('user_id, quantity');
    
  if (stickersError) {
    console.error("Admin Dashboard: Error fetching stickers", stickersError);
  }

  // Si hay error crítico, mostrar mensaje en pantalla
  if (profilesError || !profiles) {
    return (
      <div className="min-h-screen bg-[#F4F4F4] p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-red-500 max-w-md text-center">
          <h1 className="text-2xl font-black text-red-600 mb-4 uppercase">Error de Conexión</h1>
          <p className="text-[#474A4A] font-bold mb-6">
            No se pudo conectar con la base de datos. Verifica que la variable <code className="bg-gray-100 px-2 py-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> esté configurada en Vercel.
          </p>
          <Link href="/" className="bg-[#2A398D] text-white px-6 py-3 rounded-xl font-bold uppercase text-sm">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  // Stats calculation
  const totalUsers = profiles?.length || 0;
  
  // Aggregate stats per user
  const userStats = profiles?.map(profile => {
    const userStickers = allUserStickers?.filter(us => us.user_id === profile.id) || [];
    const uniqueStickers = userStickers.filter(us => us.quantity > 0).length;
    const repeatedStickers = userStickers.reduce((acc, us) => acc + (us.quantity > 1 ? us.quantity - 1 : 0), 0);
    const totalStickersCount = userStickers.reduce((acc, us) => acc + us.quantity, 0);
    
    return {
      ...profile,
      uniqueStickers,
      repeatedStickers,
      totalStickersCount,
      percentage: Math.round((uniqueStickers / 670) * 100) // Assuming ~670 total stickers
    };
  }).sort((a, b) => b.uniqueStickers - a.uniqueStickers);

  const totalStickersPlatform = allUserStickers?.reduce((acc, us) => acc + us.quantity, 0) || 0;

  return (
    <div className="container mx-auto px-4 py-8">
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
              Estadísticas globales de Panini Tracker PTY
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white dark:bg-[#262626] p-8 rounded-3xl border border-[#2A398D]/10 dark:border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#2A398D]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <Users className="h-10 w-10 text-[#2A398D] mb-4 relative z-10" />
          <p className="text-4xl font-black text-[#2A398D] dark:text-white relative z-10">{totalUsers}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-[#474A4A]/60 dark:text-white/40 mt-1 relative z-10">Usuarios Registrados</p>
        </div>

        <div className="bg-white dark:bg-[#262626] p-8 rounded-3xl border border-[#3CAC3B]/10 dark:border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#3CAC3B]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <Star className="h-10 w-10 text-[#3CAC3B] mb-4 relative z-10" />
          <p className="text-4xl font-black text-[#3CAC3B] relative z-10">{totalStickersPlatform}</p>
          <p className="text-xs font-bold uppercase tracking-widest text-[#474A4A]/60 dark:text-white/40 mt-1 relative z-10">Figuritas en Circulación</p>
        </div>

        <div className="bg-white dark:bg-[#262626] p-8 rounded-3xl border border-[#E61D25]/10 dark:border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#E61D25]/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <Trophy className="h-10 w-10 text-[#E61D25] mb-4 relative z-10" />
          <p className="text-4xl font-black text-[#E61D25] relative z-10">
            {userStats?.[0]?.percentage || 0}%
          </p>
          <p className="text-xs font-bold uppercase tracking-widest text-[#474A4A]/60 dark:text-white/40 mt-1 relative z-10">Máximo Progreso Alcanzado</p>
        </div>
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-white dark:bg-[#262626] rounded-3xl border border-[#2A398D]/10 dark:border-white/5 shadow-2xl">
        <div className="p-6 border-b border-[#2A398D]/10 dark:border-white/5 bg-[#2A398D]/5 flex items-center justify-between">
          <h2 className="text-xl font-black text-[#2A398D] dark:text-white uppercase italic">Ranking de Coleccionistas</h2>
          <ExportDataButton data={userStats as any} />
        </div>
        <div className="overflow-x-auto rounded-b-3xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#D1D4D1]/20 dark:bg-white/5 text-[#474A4A]/60 dark:text-white/40 text-[10px] uppercase tracking-widest font-black">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Únicas</th>
                <th className="px-6 py-4">Repetidas</th>
                <th className="px-6 py-4">Progreso</th>
                <th className="px-6 py-4 text-right">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A398D]/5 dark:divide-white/5">
              {userStats?.map((user) => (
                <tr key={user.id} className="hover:bg-[#2A398D]/5 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatar_url || 'https://via.placeholder.com/32'} 
                        className="w-8 h-8 rounded-full border border-[#2A398D]/20 shadow-sm"
                        alt=""
                      />
                      <span className="font-bold text-[#474A4A] dark:text-white">
                        {user.username || 'Sin nombre'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-black text-[#2A398D] dark:text-[#4C5DBB]">{user.uniqueStickers}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-[#E61D25]">{user.repeatedStickers}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-[#D1D4D1] dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#3CAC3B]" 
                          style={{ width: `${user.percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-[#3CAC3B]">{user.percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-[#474A4A]/40 dark:text-white/20 font-medium">
                    {user.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
