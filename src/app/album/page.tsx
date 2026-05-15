import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { createClient } from '@supabase/supabase-js';
import AlbumGrid from "@/components/AlbumGrid";
import { Layers } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AlbumPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  const userId = session.user.id;

  // Fetch all stickers
  const { data: stickers, error: stickersError } = await supabase
    .from('stickers')
    .select('*')
    .order('id', { ascending: true });

  if (stickersError) {
    console.error("Error fetching stickers:", stickersError);
  }

  // Fetch user inventory
  const { data: userStickers, error: userStickersError } = await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', userId);

  if (userStickersError) {
    console.error("Error fetching user inventory:", userStickersError);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#2A398D]/10 p-3 rounded-xl border border-[#2A398D]/20">
          <Layers className="h-8 w-8 text-[#2A398D]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[#2A398D] dark:text-white">Mi Álbum</h1>
          <p className="text-[#474A4A]/80 dark:text-white/80">Gestiona tus figuritas, filtra por selección y actualiza tus repetidas.</p>
        </div>
      </div>

      <AlbumGrid 
        initialStickers={stickers || []} 
        initialUserStickers={userStickers || []} 
      />
    </div>
  );
}
