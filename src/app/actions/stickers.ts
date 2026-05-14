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

export async function executeTrade(givenIds: string[], receivedIds: string[], traderName?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autenticado");
  const userId = session.user.id;

  const allIds = [...new Set([...givenIds, ...receivedIds])];
  if (allIds.length === 0) return { success: true };

  // Rate limit
  const rl = checkRateLimit(userId, 'executeTrade', 30, 60_000);
  if (!rl.allowed) throw new Error("Demasiados intercambios. Espera un momento.");

  // Validation
  for (const id of allIds) {
    if (typeof id !== 'string' || !STICKER_ID_REGEX.test(id)) {
      throw new Error(`ID de figurita inválido: ${id}`);
    }
  }

  // Verify stickers exist in catalog
  const { data: validStickers } = await supabase
    .from('stickers')
    .select('id')
    .in('id', allIds);
  
  const validIds = new Set(validStickers?.map(s => s.id));
  for (const id of allIds) {
    if (!validIds.has(id)) throw new Error(`La figurita ${id} no existe en el catálogo`);
  }

  // --- BUSCAR TRADER EN EL SISTEMA ---
  let traderUserId: string | null = null;
  if (traderName && traderName.startsWith('@')) {
    const targetUsername = traderName.substring(1);
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', targetUsername)
      .single();
    if (profile) traderUserId = profile.user_id;
  }

  // --- PROCESAR INVENTARIO USUARIO ACTUAL ---
  const { data: userInv } = await supabase
    .from('user_stickers')
    .select('sticker_id, quantity')
    .eq('user_id', userId)
    .in('sticker_id', allIds);

  const userMap: Record<string, number> = {};
  userInv?.forEach(item => userMap[item.sticker_id] = item.quantity);

  const finalUserQuants = { ...userMap };
  for (const id of givenIds) {
    const cur = finalUserQuants[id] || 0;
    if (cur <= 0) throw new Error(`No tienes la figurita ${id} para entregar`);
    finalUserQuants[id] = cur - 1;
  }
  for (const id of receivedIds) {
    const cur = finalUserQuants[id] || 0;
    const next = cur + 1;
    if (next > MAX_QUANTITY) throw new Error(`Límite alcanzado para ${id}`);
    finalUserQuants[id] = next;
  }

  // --- PROCESAR INVENTARIO TRADER (SI EXISTE) ---
  let traderUpdates: { user_id: string, sticker_id: string, quantity: number }[] = [];
  let traderDeletes: string[] = [];

  if (traderUserId) {
    const { data: traderInv } = await supabase
      .from('user_stickers')
      .select('sticker_id, quantity')
      .eq('user_id', traderUserId)
      .in('sticker_id', allIds);

    const traderMap: Record<string, number> = {};
    traderInv?.forEach(item => traderMap[item.sticker_id] = item.quantity);

    const finalTraderQuants = { ...traderMap };
    
    // El trader entrega lo que el usuario recibe
    for (const id of receivedIds) {
      const cur = finalTraderQuants[id] || 0;
      // No lanzamos error si el trader no la tiene, simplemente se queda en 0 o se resta si tiene
      finalTraderQuants[id] = Math.max(0, cur - 1);
    }
    // El trader recibe lo que el usuario entrega
    for (const id of givenIds) {
      const cur = finalTraderQuants[id] || 0;
      finalTraderQuants[id] = Math.min(MAX_QUANTITY, cur + 1);
    }

    Object.entries(finalTraderQuants).forEach(([id, qty]) => {
      if (qty > 0) {
        traderUpdates.push({ user_id: traderUserId!, sticker_id: id, quantity: qty });
      } else if (traderMap[id] > 0) {
        traderDeletes.push(id);
      }
    });
  }

  // --- PREPARAR CAMBIOS USUARIO ACTUAL ---
  const userUpserts = Object.entries(finalUserQuants)
    .filter(([_, qty]) => qty > 0)
    .map(([id, qty]) => ({ user_id: userId, sticker_id: id, quantity: qty }));
  
  const userDeletes = Object.entries(finalUserQuants)
    .filter(([id, qty]) => qty === 0 && userMap[id] > 0)
    .map(([id, _]) => id);

  // --- EJECUTAR TODO ---
  const promises = [];
  
  // Usuario actual
  if (userUpserts.length > 0) {
    promises.push(supabase.from('user_stickers').upsert(userUpserts, { onConflict: 'user_id, sticker_id' }));
  }
  if (userDeletes.length > 0) {
    promises.push(supabase.from('user_stickers').delete().eq('user_id', userId).in('sticker_id', userDeletes));
  }

  // Trader
  if (traderUserId) {
    if (traderUpdates.length > 0) {
      promises.push(supabase.from('user_stickers').upsert(traderUpdates, { onConflict: 'user_id, sticker_id' }));
    }
    if (traderDeletes.length > 0) {
      promises.push(supabase.from('user_stickers').delete().eq('user_id', traderUserId).in('sticker_id', traderDeletes));
    }
  }

  const results = await Promise.all(promises);
  if (results.some(r => r.error)) throw new Error("Error al ejecutar el intercambio sincrónico");

  // Registrar log
  if (traderName) {
    supabase.from('trade_logs').insert({
      user_id: userId,
      trader_name: traderName,
      given_ids: givenIds,
      received_ids: receivedIds
    }).catch(console.error);
  }

  revalidatePath('/');
  revalidatePath('/album');
  return { success: true };
}

export async function clearRepeatedStickers() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autenticado");
  const userId = session.user.id;

  // Rate limit
  const rl = checkRateLimit(userId, 'clearRepeated', 5, 60_000); 
  if (!rl.allowed) throw new Error("Espera un momento antes de volver a borrar.");

  const { error } = await supabase
    .from('user_stickers')
    .update({ quantity: 1 })
    .eq('user_id', userId)
    .gt('quantity', 1);

  if (error) throw new Error("Error al borrar las repetidas");

  revalidatePath('/');
  revalidatePath('/album');
  return { success: true };
}
