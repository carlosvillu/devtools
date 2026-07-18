// Identificación de la IP del cliente — EL ÚNICO punto de lectura de la IP en toda la
// web (lo consumen el rate limit de `/api/analyze` y el de login de `/api/auth/login`).
//
// ⚠ PROVISIONAL — ESTE es el punto que T3.1 debe cambiar. El trust boundary real son
// dos proxies delante (Cloudflare + Caddy): la IP verdadera del cliente llega en
// `CF-Connecting-IP`, no en `x-forwarded-for` (controlable por el cliente hoy). Hasta
// T3.1 esto NO es una defensa robusta: solo cablea la superficie del rate limit para no
// dejarla suelta. T3.1: sustituir por `CF-Connecting-IP` tras validar `TRUST_PROXY=1`
// (PRD §10, §11). Al vivir en un solo sitio, el cambio de T3.1 toca UN fichero.
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  return xff ? (xff.split(',')[0]?.trim() ?? 'unknown') : 'unknown';
}
