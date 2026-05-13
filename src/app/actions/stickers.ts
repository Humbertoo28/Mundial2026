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

// Validation: sticker IDs can contain letters, numbers, spaces, slashes, and hyphens, max 50 chars
const STICKER_ID_REGEX = /^[A-Z0-9 \/.-]{1,50}$/i;
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

export async function bulkUpdateStickerQuantities(updates: { stickerId: string, quantity: number }[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }

  const userId = session.user.id;

  if (!Array.isArray(updates) || updates.length === 0) {
    return { success: true };
  }

  // Limit bulk updates to 100 at a time to prevent abuse and timeouts
  if (updates.length > 100) {
    throw new Error("Máximo 100 actualizaciones por lote");
  }

  // Rate limit: una operación masiva cuenta como una operación pesada
  const rl = checkRateLimit(userId, 'bulkUpdateSticker', 30, 60_000); 
  if (!rl.allowed) {
    throw new Error("Demasiadas actualizaciones masivas. Espera un momento.");
  }

  // Validar todos los inputs
  for (const update of updates) {
    if (typeof update.stickerId !== 'string' || !STICKER_ID_REGEX.test(update.stickerId)) {
      throw new Error(`ID de figurita inválido: ${update.stickerId}`);
    }
    if (
      typeof update.quantity !== 'number' ||
      !Number.isInteger(update.quantity) ||
      update.quantity < 0 ||
      update.quantity > MAX_QUANTITY
    ) {
      throw new Error(`Cantidad inválida para ${update.stickerId}`);
    }
  }

  // Separar upserts de deletes
  const toUpsert = updates
    .filter(u => u.quantity > 0)
    .map(u => ({ user_id: userId, sticker_id: u.stickerId, quantity: u.quantity }));
  
  const toDelete = updates
    .filter(u => u.quantity === 0)
    .map(u => u.stickerId);

  // Ejecutar operaciones en paralelo
  const promises = [];

  if (toUpsert.length > 0) {
    promises.push(
      supabase
        .from('user_stickers')
        .upsert(toUpsert, { onConflict: 'user_id, sticker_id' })
    );
  }

  if (toDelete.length > 0) {
    promises.push(
      supabase
        .from('user_stickers')
        .delete()
        .eq('user_id', userId)
        .in('sticker_id', toDelete)
    );
  }

  const results = await Promise.all(promises);
  const errors = results.filter(r => r.error);

  if (errors.length > 0) {
    console.error("Errors in bulk update:", errors);
    throw new Error("Error al realizar la actualización masiva");
  }

  revalidatePath('/');
  revalidatePath('/album');

  return { success: true };
}
