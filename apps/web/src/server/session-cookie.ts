// Nombre y (de)serialización de la cookie de sesión. Módulo DELIBERADAMENTE ligero:
// SIN imports de `node:*` ni de `pg`/Drizzle, de modo que `proxy.ts` (que corre en el
// runtime Edge) pueda importar el nombre de la cookie sin arrastrar la capa de BD.
// La validación real contra la BD y la lectura de env viven en `session.ts` (Node).
//
// FIJO desde F0 y NO se cambia: cambiar el nombre invalida todas las sesiones.
export const SESSION_COOKIE = 'devtools_session';

// TTL de sesión por defecto (7 días). La expiración autoritativa vive en la tabla
// `session` (§11); el `Max-Age` de la cookie se alinea con ella para que el navegador
// deje de mandarla al expirar (y el chequeo de presencia del proxy cubra la caducidad).
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CookieOptions {
  /** `Secure` solo cuando el transporte es HTTPS (prod). En dev/test (http) rompería. */
  secure: boolean;
}

/** Construye el `Set-Cookie` de una sesión activa: HttpOnly + SameSite=Lax (§11). */
export function buildSessionCookie(
  value: string,
  opts: CookieOptions & { maxAgeSec: number },
): string {
  return serialize(SESSION_COOKIE, value, { ...opts, maxAgeSec: opts.maxAgeSec });
}

/** Construye el `Set-Cookie` que BORRA la cookie de sesión (logout): Max-Age=0. */
export function buildClearedSessionCookie(opts: CookieOptions): string {
  return serialize(SESSION_COOKIE, '', { ...opts, maxAgeSec: 0 });
}

function serialize(
  name: string,
  value: string,
  opts: CookieOptions & { maxAgeSec: number },
): string {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${String(Math.max(0, Math.floor(opts.maxAgeSec)))}`,
  ];
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * Lee el valor de la cookie de sesión del header `Cookie` CRUDO de un `Request`.
 * Se lee del propio Request (no de `cookies()` de next/headers) para que el auth
 * sea testeable a nivel handler pasando —o no— el header `cookie` (api.md §6).
 * Devuelve `undefined` si no está presente.
 */
export function readSessionCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const pair of cookieHeader.split(';')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim();
    if (key === SESSION_COOKIE) return pair.slice(eq + 1).trim();
  }
  return undefined;
}
