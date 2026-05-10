/**
 * RATE LIMITER — In-memory, sin dependencias externas.
 * Protege los Server Actions contra bots y abuso masivo.
 * 
 * Estrategia: sliding window por userId + acción.
 * En producción real se recomendaría Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Mapa global: "userId:accion" -> { count, resetAt }
const rateLimitMap = new Map<string, RateLimitEntry>();

// Limpieza periódica para evitar memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) rateLimitMap.delete(key);
  }
}, 60_000); // Limpiar cada minuto

/**
 * Verifica si un usuario excede el límite de llamadas para una acción dada.
 * @param userId - ID del usuario autenticado
 * @param action - Nombre de la acción (ej: "updateUsername")
 * @param maxRequests - Máximo de llamadas permitidas en la ventana
 * @param windowMs - Ventana de tiempo en milisegundos
 * @returns { allowed: boolean, retryAfterMs?: number }
 */
export function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; retryAfterMs?: number } {
  const key = `${userId}:${action}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    // Nueva ventana
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true };
}
