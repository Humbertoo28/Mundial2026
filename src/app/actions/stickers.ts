'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { checkRateLimit } from "@/lib/rateLimit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation: sticker IDs follow pattern LETTERS+NUMBERS, max 10 chars
const STICKER_ID_REGEX = /^[A-Z0-9]{2,10}$/;
const MAX_QUANTITY = 50; // Nadie tiene más de 50 copias de la misma figurita

export async function updateStickerQuantity(stickerId: string, quantity: number) {
  // 1. Auth check - primero lo más importante
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }

  const userId = session.user.id;

  // 2. Rate limit: máx 120 actualizaciones por minuto (2 por segundo en promedio)
  const rl = checkRateLimit(userId, 'updateSticker', 120, 60_000);
  if (!rl.allowed) {
    const secs = Math.ceil((rl.retryAfterMs ?? 60000) / 1000);
    throw new Error(`Demasiadas actualizaciones. Intenta en ${secs} segundos.`);
  }

  // 3. Validación de inputs - previene inyección y abuso
  if (typeof stickerId !== 'string' || !STICKER_ID_REGEX.test(stickerId)) {
    throw new Error("ID de figurita inválido");
  }

  if (
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    quantity > MAX_QUANTITY
  ) {
    throw new Error(`Cantidad inválida. Debe ser entre 0 y ${MAX_QUANTITY}`);
  }

  // 4. Verificar que la figurita existe en el catálogo (previene phantom inserts)
  const { data: stickerExists } = await supabase
    .from('stickers')
    .select('id')
    .eq('id', stickerId)
    .single();

  if (!stickerExists) {
    throw new Error("La figurita no existe en el catálogo");
  }

  // 5. Escritura estrictamente acotada al usuario autenticado
  if (quantity === 0) {
    const { error } = await supabase
      .from('user_stickers')
      .delete()
      .match({ user_id: userId, sticker_id: stickerId });

    if (error) throw new Error("Error al eliminar figurita");
  } else {
    const { error } = await supabase
      .from('user_stickers')
      .upsert(
        { user_id: userId, sticker_id: stickerId, quantity },
        { onConflict: 'user_id, sticker_id' }
      );

    if (error) throw new Error("Error al guardar figurita");
  }

  revalidatePath('/');
  revalidatePath('/album');

  return { success: true };
}
