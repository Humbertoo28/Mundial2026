import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Renamed from middleware to proxy — required by Next.js v16+
// See: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // ── Protección del Panel Admin ────────────────────────────────
    // Segunda capa de defensa: verifica el email aquí también.
    // Incluso si el Server Component falla, el proxy bloquea.
    if (pathname.startsWith('/admin')) {
      const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "humbertolandero78@gmail.com";
      if (token?.email !== ADMIN_EMAIL) {
        // Redirige silenciosamente al inicio sin revelar que /admin existe
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // ── Cabeceras de seguridad adicionales en cada respuesta ──────
    const response = NextResponse.next();

    // Previene que la respuesta sea cacheada en proxies intermediarios
    response.headers.set('Cache-Control', 'no-store, max-age=0');

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Solo proteger estas rutas — las públicas no necesitan auth
export const config = {
  matcher: [
    "/album/:path*",   // Álbum de figuritas - requiere auth
    "/admin/:path*",   // Panel de administración - requiere auth + email admin
  ],
};
