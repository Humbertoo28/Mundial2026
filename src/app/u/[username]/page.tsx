import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { CheckCircle, Layers, Trophy, ArrowLeft, Heart } from "lucide-react";
import Link from "next/link";
import { getFlagUrl, getSectionDisplayName } from "@/lib/flags";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function PublicProfile({ params }: { params: { username: string } }) {
  const { username } = params;
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  // Validar formato del username antes de consultar la BD
  // Previene que usernames maliciosos (`../admin`, `<script>`, etc.) lleguen a Supabase
  const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,15}$/;
  if (!USERNAME_REGEX.test(username)) {
    notFound();
  }

  // 1. Fetch the user profile by username
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('username', username)
    .single();

  if (!profile) {
    notFound();
  }

  // 2. Fetch their stickers progress
  const { data: userStickers } = await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', profile.id);

  // 2b. Fetch logged in user's stickers for comparison
  const { data: myStickers } = currentUserId ? await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', currentUserId) : { data: [] };

  const myOwnedIds = new Set(myStickers?.filter(s => s.quantity > 0).map(s => s.sticker_id));

  const { data: allStickers } = await supabase
    .from('stickers')
    .select('id, section');

  const totalStickersCount = 994;
  const ownedCount = userStickers?.filter(s => s.quantity > 0).length || 0;
  const repetidasCount = userStickers?.filter(s => s.quantity > 1).reduce((acc, s) => acc + (s.quantity - 1), 0) || 0;
  const percentage = Math.round((ownedCount / totalStickersCount) * 100);

  // Group by section for the summary and for the trade list
  const sectionStats: Record<string, { total: number, owned: number }> = {};
  const repeatedBySection: Record<string, { id: string, qty: number }[]> = {};
  allStickers?.forEach(s => {
    if (!sectionStats[s.section]) sectionStats[s.section] = { total: 0, owned: 0 };
    sectionStats[s.section].total++;
  });

  userStickers?.forEach(s => {
    const sticker = allStickers?.find(as => as.id === s.sticker_id);
    if (sticker && s.quantity > 0) {
      sectionStats[sticker.section].owned++;
      
      if (s.quantity > 1) {
        if (!repeatedBySection[sticker.section]) repeatedBySection[sticker.section] = [];
        repeatedBySection[sticker.section].push({ id: s.sticker_id, qty: s.quantity - 1 });
      }
    }
  });

  const topSections = Object.entries(sectionStats)
    .sort((a, b) => b[1].owned - a[1].owned)
    .slice(0, 8);

  return (
    <div className="container mx-auto px-4 py-12 animate-in fade-in duration-500">
      <Link href="/" className="inline-flex items-center gap-2 text-[#2A398D] font-bold mb-8 hover:translate-x-1 transition-transform">
        <ArrowLeft className="h-4 w-4" />
        Volver a mi Dashboard
      </Link>

      <div className="bg-white border-2 border-[#2A398D]/10 rounded-3xl p-8 shadow-xl mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Trophy className="w-32 h-32 text-[#2A398D]" />
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <img 
              src={profile.avatar_url || 'https://via.placeholder.com/150'} 
              alt={profile.username}
              className="w-32 h-32 rounded-full border-4 border-[#2A398D] shadow-lg"
            />
            <div className="absolute -bottom-2 -right-2 bg-[#3CAC3B] text-white p-2 rounded-full shadow-md">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black text-[#2A398D] uppercase tracking-tighter italic">
              @{profile.username}
            </h1>
            <p className="text-[#474A4A]/60 font-bold uppercase tracking-widest text-sm mb-4">
              {profile.full_name}
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <div className="bg-[#2A398D]/10 px-4 py-2 rounded-xl text-center">
                <span className="block text-[10px] font-black text-[#2A398D] uppercase">Tengo</span>
                <span className="text-xl font-black text-[#2A398D]">{ownedCount}</span>
              </div>
              <div className="bg-[#E61D25]/10 px-4 py-2 rounded-xl text-center">
                <span className="block text-[10px] font-black text-[#E61D25] uppercase">Repetidas</span>
                <span className="text-xl font-black text-[#E61D25]">{repetidasCount}</span>
              </div>
              <div className="bg-[#3CAC3B]/10 px-4 py-2 rounded-xl text-center">
                <span className="block text-[10px] font-black text-[#3CAC3B] uppercase">Progreso</span>
                <span className="text-xl font-black text-[#3CAC3B]">{percentage}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h2 className="text-2xl font-black text-[#2A398D] uppercase italic mb-6">Mejores Selecciones</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topSections.map(([section, stats]) => {
              const perc = Math.round((stats.owned / stats.total) * 100);
              return (
                <div key={section} className="bg-white border border-[#474A4A]/10 p-4 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    {getFlagUrl(section) ? (
                      <img src={getFlagUrl(section)!} className="w-6 h-6 object-cover rounded-full border border-[#474A4A]/10" alt="" />
                    ) : (
                      <div className="w-6 h-6 bg-[#D1D4D1] rounded-full flex items-center justify-center text-[10px]">🏆</div>
                    )}
                    <span className="font-bold text-[#2A398D] text-sm uppercase">{getSectionDisplayName(section)}</span>
                  </div>
                  <div className="w-full bg-[#D1D4D1]/30 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2A398D] transition-all" style={{ width: `${perc}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-bold text-[#474A4A]/50">
                    <span>{stats.owned} / {stats.total}</span>
                    <span>{perc}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border-2 border-[#E61D25]/10 rounded-3xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#E61D25] rounded-xl text-white">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black text-[#2A398D] uppercase italic">Repetidas para Intercambio</h2>
          </div>

          {currentUserId && repetidasCount > 0 && (
            <div className="mb-6 p-3 bg-[#2A398D]/5 border border-[#2A398D]/10 rounded-xl flex items-center gap-2">
              <div className="w-4 h-4 bg-[#2A398D] rounded flex items-center justify-center">
                <Heart className="w-2.5 h-2.5 text-white fill-current" />
              </div>
              <p className="text-[10px] font-bold text-[#2A398D] uppercase tracking-wider">
                Las figuritas en <span className="underline decoration-wavy">Azul</span> son las que te faltan a ti. ¡Pídelas!
              </p>
            </div>
          )}

          {repetidasCount > 0 ? (
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(repeatedBySection).sort().map(([section, stickers]) => (
                <div key={section} className="border-b border-[#474A4A]/10 pb-4 last:border-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-black text-[#2A398D] uppercase tracking-wider">{getSectionDisplayName(section)}</span>
                    <div className="flex-1 h-px bg-[#2A398D]/10"></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stickers.map(s => {
                      const iNeedIt = currentUserId && !myOwnedIds.has(s.id);
                      return (
                        <div key={s.id} className="relative group">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold border transition-all ${
                            iNeedIt 
                              ? 'bg-[#2A398D] text-white border-[#2A398D] shadow-md scale-105' 
                              : 'bg-[#D1D4D1]/30 border-[#474A4A]/10 text-[#474A4A]'
                          }`}>
                            {s.id} {s.qty > 1 && <span className={iNeedIt ? 'text-white/70' : 'text-[#2A398D] ml-1'}>x{s.qty}</span>}
                            {iNeedIt && <Heart className="h-3 w-3 fill-current animate-pulse text-[#E61D25]" />}
                          </span>
                          {iNeedIt ? (
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#3CAC3B] text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                              ¡La necesito!
                            </span>
                          ) : currentUserId && (
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#474A4A] text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                              Ya la tengo
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-[#474A4A]/40 font-bold uppercase tracking-widest text-sm">
              No tiene figuritas repetidas aún
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
