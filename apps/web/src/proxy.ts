// proxy.ts (Next 16 — sustituye a middleware.ts; el nombre `proxy` es la convención
// vigente, `middleware` está deprecado). Protege las páginas/rutas que exigen sesión.
//
// D6 (DELIBERADO, contradice el default del template): se protegen ÚNICAMENTE `/history`
// y `/api/history`. `/`, `/api/analyze`, `/login`, `/signup` y `/api/auth/*` son PÚBLICAS
// — devtools se usa sin cuenta; la cuenta solo añade historial. El template por defecto
// protegería todo salvo login/health: aquí es al revés.
//
// Corre en el runtime Edge: hace SOLO el chequeo BARATO de PRESENCIA de la cookie (no
// puede tocar Postgres). La validación criptográfica/de expiración real la hace
// `validateSession` en Node, en cada handler/página protegida (defensa en profundidad).
// El `Max-Age` de la cookie se alinea con la expiración en BD, así que una cookie caducada
// el navegador deja de mandarla → el chequeo de presencia también cubre la caducidad.
//
// AUTO-GUARDA: la propia función solo actúa sobre rutas protegidas (no depende solo del
// `matcher`), para que el test-guardián de D6 —que la invoca directamente— sea fiel:
// `/` NUNCA se redirige aunque el matcher se rompiera.
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/server/session-cookie';

const PROTECTED = [/^\/history(?:\/|$)/, /^\/api\/history(?:\/|$)/];

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (!PROTECTED.some((re) => re.test(pathname))) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();

  // API protegida sin sesión → 401 tipado (envelope {code,message}); páginas → redirect
  // a /login conservando el destino en `?next=` para volver tras autenticarse.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { code: 'unauthorized', message: 'sesión requerida' },
      { status: 401 },
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

// El matcher restringe (build-time) las rutas que invocan al proxy — una optimización
// sobre la auto-guarda de arriba. `/` no está aquí: nunca pasa por el proxy.
export const config = {
  matcher: ['/history/:path*', '/api/history/:path*'],
};
