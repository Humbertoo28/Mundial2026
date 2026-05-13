'use server';

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type RankingUser = {
  id: string;
  username: string;
  avatar_url: string | null;
  tengo: number;
  repetidas: number;
  faltantes: number;
  porcentaje: number;
};

export async function getRankingData(): Promise<RankingUser[]> {
  const totalStickers = 994;

  // 1. Fetch all profiles
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url');

  if (pError) throw new Error("Error al cargar perfiles");

  // 2. Fetch all sticker counts
  // We only need user_id and quantity to calculate the stats
  const { data: userStickers, error: sError } = await supabase
    .from('user_stickers')
    .select('user_id, quantity');

  if (sError) throw new Error("Error al cargar estadísticas");

  // 3. Process data in memory
  const statsMap: Record<string, { tengo: number, repetidas: number }> = {};

  userStickers.forEach(s => {
    if (!statsMap[s.user_id]) {
      statsMap[s.user_id] = { tengo: 0, repetidas: 0 };
    }
    
    if (s.quantity > 0) {
      statsMap[s.user_id].tengo++;
    }
    
    if (s.quantity > 1) {
      statsMap[s.user_id].repetidas += (s.quantity - 1);
    }
  });

  // 4. Combine with profiles
  const ranking: RankingUser[] = profiles.map(p => {
    const stats = statsMap[p.id] || { tengo: 0, repetidas: 0 };
    return {
      id: p.id,
      username: p.username || 'Anónimo',
      avatar_url: p.avatar_url,
      tengo: stats.tengo,
      repetidas: stats.repetidas,
      faltantes: totalStickers - stats.tengo,
      porcentaje: Math.round((stats.tengo / totalStickers) * 100)
    };
  });

  // 5. Sort by percentage (desc) and then by username
  return ranking.sort((a, b) => {
    if (b.porcentaje !== a.porcentaje) {
      return b.porcentaje - a.porcentaje;
    }
    return b.tengo - a.tengo;
  });
}
