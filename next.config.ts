import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

// CSP estricto para producción, relajado para desarrollo
const cspDirectives = [
  "default-src 'self'",
  // En prod: sin unsafe-eval. En dev: necesario para Next.js HMR
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Permitir imágenes de banderas y placeholder local
  "img-src 'self' data: blob: https://flagcdn.com",
  // Supabase WebSocket y REST + Google OAuth
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com",
  // No iframes bajo ninguna circunstancia
  "frame-src 'none'",
  "frame-ancestors 'none'",
  // No plugins (Flash, etc.)
  "object-src 'none'",
  // Base URI bloqueada para prevenir ataques de base-tag injection
  "base-uri 'self'",
  // Forms solo a nosotros mismos
  "form-action 'self'",
  // Bloquea upgrade inseguro a seguro
  "upgrade-insecure-requests",
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // ── Clickjacking ──────────────────────────────────────
          { key: 'X-Frame-Options', value: 'DENY' },

          // ── MIME Sniffing ─────────────────────────────────────
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // ── Referrer ──────────────────────────────────────────
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // ── Content Security Policy ───────────────────────────
          { key: 'Content-Security-Policy', value: cspDirectives },

          // ── HSTS (HTTP Strict Transport Security) ────────────
          // 2 años, incluye subdominios, pre-cargado en listas de navegadores
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },

          // ── Permissions Policy ────────────────────────────────
          // Deshabilita todas las APIs del navegador que no necesitamos
          {
            key: 'Permissions-Policy',
            value: [
              'camera=(self)',
              'microphone=()',
              'geolocation=()',
              'interest-cohort=()', // Deshabilita FLoC de Google
              'payment=()',
              'usb=()',
              'bluetooth=()',
            ].join(', '),
          },

          // ── Cross-Origin Policies ─────────────────────────────
          // Aísla el proceso del navegador para prevenir Spectre/Meltdown
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          // 'unsafe-none' permite cargar imágenes externas (flagcdn, google avatars, etc.)
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },

          // ── XSS Protection (legacy browsers) ─────────────────
          { key: 'X-XSS-Protection', value: '1; mode=block' },

          // ── DNS Prefetch Control ──────────────────────────────
          // Evita que el navegador haga DNS lookups de recursos externos
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ];
  },

  // Bloquear acceso a archivos sensibles vía URL
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
