import { getRankingData } from "@/app/actions/ranking";
import { Trophy, Medal, Crown, ArrowLeft, Share2, Layers, Check, PackageOpen } from "lucide-react";
import Link from "next/link";
import RankingShare from "@/components/RankingShare";

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Forzar revalidación en cada carga

export default async function RankingPage() {
  const ranking = await getRankingData();
  const top5 = ranking.slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
        <div className="flex flex-col items-center md:items-start">
          <Link href="/" className="inline-flex items-center gap-2 text-[#2A398D] dark:text-[#4C5DBB] font-bold mb-4 hover:translate-x-1 transition-transform">
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </Link>
          <h1 className="text-5xl font-black text-[#2A398D] dark:text-white italic uppercase tracking-tighter flex items-center gap-4">
            <Trophy className="h-10 w-10 text-yellow-500" />
            Ranking Mundial
          </h1>
          <p className="text-[#474A4A]/60 dark:text-white/60 font-bold uppercase tracking-widest text-sm mt-2">
            Compite con otros coleccionistas y llega al Top 1
          </p>
        </div>
        
        <RankingShare top5={top5} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {ranking.map((user, index) => {
          const isTop3 = index < 3;
          const isMe = false; // TODO: handle current user highlight if needed

          return (
            <div 
              key={user.id}
              className={`relative bg-white dark:bg-[#0D0D0D] border-2 rounded-3xl p-6 transition-all hover:scale-[1.01] flex flex-col md:flex-row items-center gap-6 shadow-sm ${
                index === 0 ? 'border-yellow-400 shadow-yellow-400/10' :
                index === 1 ? 'border-slate-300 shadow-slate-300/10' :
                index === 2 ? 'border-amber-600 shadow-amber-600/10' :
                'border-[#474A4A]/10 dark:border-white/5'
              }`}
            >
              {/* Posición */}
              <div className="flex items-center justify-center w-12 h-12 shrink-0">
                {index === 0 ? <Crown className="h-8 w-8 text-yellow-500" /> :
                 index === 1 ? <Medal className="h-8 w-8 text-slate-400" /> :
                 index === 2 ? <Medal className="h-8 w-8 text-amber-700" /> :
                 <span className="text-2xl font-black text-[#474A4A]/20 dark:text-white/20">#{index + 1}</span>}
              </div>

              {/* Avatar y Usuario */}
              <div className="flex items-center gap-4 flex-1">
                <img 
                  src={user.avatar_url || 'https://flagcdn.com/w80/pa.png'} 
                  alt={user.username}
                  className={`w-14 h-14 rounded-full border-2 ${
                    index === 0 ? 'border-yellow-400' : 'border-[#2A398D]/20'
                  } shadow-md`}
                />
                <div>
                  <h3 className="text-xl font-black text-[#2A398D] dark:text-white uppercase italic">
                    @{user.username}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-[#D1D4D1]/30 dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          index === 0 ? 'bg-yellow-500' : 'bg-[#2A398D]'
                        }`}
                        style={{ width: `${user.porcentaje}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-[#2A398D] dark:text-white/60">{user.porcentaje}%</span>
                  </div>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
                <div className="text-center px-4">
                  <span className="block text-[8px] font-black text-[#474A4A]/40 dark:text-white/40 uppercase tracking-widest">Tengo</span>
                  <span className="text-lg font-black text-[#3CAC3B]">{user.tengo}</span>
                </div>
                <div className="text-center px-4">
                  <span className="block text-[8px] font-black text-[#474A4A]/40 dark:text-white/40 uppercase tracking-widest">Faltan</span>
                  <span className="text-lg font-black text-[#E61D25]">{user.faltantes}</span>
                </div>
                <div className="text-center px-4">
                  <span className="block text-[8px] font-black text-[#474A4A]/40 dark:text-white/40 uppercase tracking-widest">Repetidas</span>
                  <span className="text-lg font-black text-[#2A398D] dark:text-[#4C5DBB]">{user.repetidas}</span>
                </div>
                <Link 
                  href={`/u/${user.username}`}
                  className="flex items-center justify-center bg-[#2A398D]/5 dark:bg-white/5 hover:bg-[#2A398D] hover:text-white dark:hover:bg-[#4C5DBB] text-[#2A398D] dark:text-white px-4 py-2 rounded-xl transition-all group"
                >
                  <Share2 className="h-4 w-4 group-hover:scale-110" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
