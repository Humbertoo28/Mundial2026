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

  // 1. Fetch ALL profiles using pagination
  let allProfiles: any[] = [];
  let pFrom = 0;
  const P_PAGE_SIZE = 1000;
  let pHasMore = true;

  while (pHasMore) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .range(pFrom, pFrom + P_PAGE_SIZE - 1);
    
    if (error) {
      console.error("Ranking Action: Error fetching profiles page", error);
      break;
    }

    if (data && data.length > 0) {
      allProfiles = [...allProfiles, ...data];
      pFrom += P_PAGE_SIZE;
      if (data.length < P_PAGE_SIZE) pHasMore = false;
    } else {
      pHasMore = false;
    }
    if (pFrom > 10000) break; // Safety break
  }

  // 2. Fetch ALL user stickers using pagination
  let allUserStickers: { user_id: string, sticker_id: string, quantity: number }[] = [];
  let sFrom = 0;
  const S_PAGE_SIZE = 1000;
  let sHasMore = true;

  while (sHasMore) {
    const { data, error } = await supabase
      .from('user_stickers')
      .select('user_id, sticker_id, quantity')
      .range(sFrom, sFrom + S_PAGE_SIZE - 1);
    
    if (error) {
      console.error("Ranking Action: Error fetching stickers page", error);
      break;
    }

    if (data && data.length > 0) {
      allUserStickers = [...allUserStickers, ...data];
      sFrom += S_PAGE_SIZE;
      if (data.length < S_PAGE_SIZE) sHasMore = false;
    } else {
      sHasMore = false;
    }
    if (sFrom > 100000) break; // Safety break (increased to 100k)
  }

  // 3. Process data in memory with Normalization (Same as Admin)
  const statsMap: Record<string, Record<string, number>> = {};

  allUserStickers.forEach(s => {
    if (!statsMap[s.user_id]) {
      statsMap[s.user_id] = {};
    }
    // Normalize ID to avoid duplicates like "ARG01" vs "ARG 01"
    const id = s.sticker_id.replace(/\s/g, '').toUpperCase();
    statsMap[s.user_id][id] = (statsMap[s.user_id][id] || 0) + s.quantity;
  });

  // 4. Combine with profiles
  const ranking: RankingUser[] = allProfiles.map(p => {
    const userInventory = statsMap[p.id] || {};
    let tengo = 0;
    let repetidas = 0;
    
    Object.values(userInventory).forEach(qty => {
      if (qty > 0) tengo++;
      if (qty > 1) repetidas += (qty - 1);
    });

    return {
      id: p.id,
      username: p.username || 'Anónimo',
      avatar_url: p.avatar_url,
      tengo: tengo,
      repetidas: repetidas,
      faltantes: totalStickers - tengo,
      porcentaje: parseFloat(((tengo / totalStickers) * 100).toFixed(1)),
      total: totalStickers
    };
  });

  // 5. Sort by tengo (unique) primarily, then by percentage
  return ranking.sort((a, b) => {
    if (b.tengo !== a.tengo) {
      return b.tengo - a.tengo;
    }
    return b.porcentaje - a.porcentaje;
  });
}
