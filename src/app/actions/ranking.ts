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
  total: number;
};

export async function getRankingData(): Promise<RankingUser[]> {
  const totalStickers = 994;

  // 1. Fetch all profiles
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url');

  if (pError) throw new Error("Error al cargar perfiles");

  // 2. Fetch all user stickers using pagination to bypass the 1000 row limit
  let allUserStickers: { user_id: string, quantity: number }[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('user_stickers')
      .select('user_id, quantity')
      .range(from, from + PAGE_SIZE - 1);
    
    if (error) {
      console.error("Ranking Action: Error fetching stickers page", error);
      break;
    }

    if (data && data.length > 0) {
      allUserStickers = [...allUserStickers, ...data];
      from += PAGE_SIZE;
      if (data.length < PAGE_SIZE) hasMore = false;
    } else {
      hasMore = false;
    }
    
    if (from > 50000) break; // Safety break
  }

  // 3. Process data in memory
  const statsMap: Record<string, { tengo: number, repetidas: number }> = {};

  allUserStickers.forEach(s => {
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
      porcentaje: parseFloat(((stats.tengo / totalStickers) * 100).toFixed(1)),
      total: totalStickers
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
