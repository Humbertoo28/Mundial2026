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

// Regex estricto: solo alfanuméricos, guiones y guiones bajos
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,15}$/;

// Dominios permitidos para avatares (Solo banderas de FlagCDN)
const ALLOWED_AVATAR_DOMAINS = [
  'flagcdn.com',
];

export async function updateUsername(username: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'No autorizado' };

  // Rate limit: máx 5 cambios de nombre por hora
  const rl = checkRateLimit(session.user.id, 'updateUsername', 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    const mins = Math.ceil((rl.retryAfterMs ?? 60000) / 60000);
    return { success: false, error: `Demasiados cambios. Intenta en ${mins} minutos.` };
  }

  const cleanUsername = username.trim();
  if (!cleanUsername) return { success: false, error: 'Nombre vacío' };
  if (!USERNAME_REGEX.test(cleanUsername)) {
    return { success: false, error: 'Solo letras, números, guiones y guiones bajos (3-15 caracteres)' };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ username: cleanUsername })
      .eq('id', session.user.id);

    if (error) {
      if (error.code === '23505') return { success: false, error: 'Este nombre ya existe' };
      throw error;
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[updateUsername] Error:', error);
    return { success: false, error: 'Error al actualizar' };
  }
}

export async function updateAvatar(flagUrl: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: 'No autorizado' };

  // Rate limit: máx 20 cambios de avatar por hora
  const rl = checkRateLimit(session.user.id, 'updateAvatar', 20, 60 * 60 * 1000);
  if (!rl.allowed) {
    return { success: false, error: 'Demasiados cambios. Intenta más tarde.' };
  }

  // Validar URL: debe ser HTTPS y de un dominio permitido
  try {
    const urlObj = new URL(flagUrl);
    if (urlObj.protocol !== 'https:') {
      return { success: false, error: 'Solo se permiten URLs seguras (HTTPS)' };
    }
    const isAllowed = ALLOWED_AVATAR_DOMAINS.some(
      d => urlObj.hostname === d || urlObj.hostname.endsWith('.' + d)
    );
    if (!isAllowed) {
      return { success: false, error: 'Dominio de avatar no permitido' };
    }
  } catch {
    return { success: false, error: 'URL de avatar inválida' };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: flagUrl })
      .eq('id', session.user.id);

    if (error) throw error;

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('[updateAvatar] Error:', error);
    return { success: false, error: 'Error al actualizar avatar' };
  }
}

export async function getProfile() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, full_name, avatar_url')
      .eq('id', session.user.id)
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
