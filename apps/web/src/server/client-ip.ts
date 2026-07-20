// Identificación de la IP del cliente — EL ÚNICO punto de lectura de la IP en toda la
// web. La consumen los TRES rate limits del producto: login y signup (T0.4) y
// `/api/analyze` (T1.4). Cambiar la política aquí las cambia las tres a la vez.
//
// ── El trust boundary real (PRD §10, §11; skill deploy §Topología) ────────────────
// Delante de la app hay DOS proxies: Cloudflare (proxy naranja) y el Caddy central del
// VPS. La app publica SOLO en `127.0.0.1:$WEB_PORT`, así que la IP del socket es
// SIEMPRE la del Caddy local (127.0.0.1) — nunca discrimina a nadie. La IP real del
// visitante llega en `CF-Connecting-IP`; `X-Forwarded-For` lo reescribe Caddy con
// `{client_ip}`, que detrás de Cloudflare es la IP del BORDE de Cloudflare.
//
// Cadena de precedencia (y por qué cada eslabón es de fiar):
//   1. `CF-Connecting-IP` — la IP del visitante. Es de fiar porque el site file de
//      Caddy (`deploy/devtools.carlosvillu.dev.caddy`) BORRA este header cuando la
//      conexión NO viene de un rango de Cloudflare. Sin ese borrado este header sería
//      tan spoofeable como el XFF que sustituye: la defensa vive en el borde, no aquí.
//   2. `X-Forwarded-For` — lo SOBRESCRIBE Caddy con `{client_ip}` (no lo añade a lo que
//      mandara el cliente), así que tampoco es controlable desde fuera. Detrás de
//      Cloudflare vale la IP del borde: peor granularidad, pero no spoofeable. Se toma
//      la ÚLTIMA entrada (PRD §10): la que puso el proxy de confianza más cercano.
//   3. `LOOPBACK_KEY` — CON `TRUST_PROXY=1`, no llegó ningún header de proxy: solo puede
//      pasar en una conexión directa a `127.0.0.1:$WEB_PORT` (no hay otra ruta hasta el
//      proceso), es decir desde el propio host. Ahí no es un `'unknown'` compartido por
//      clientes de internet: ninguno llega sin pasar por Caddy.
//
// `TRUST_PROXY=1` (compose de prod) declara que hay un proxy de confianza delante. Sin
// esa declaración NINGÚN header se lee: en un despliegue expuesto a pelo, creerse un
// header es exactamente el defecto que esta tarea cierra.
//
// ⚠ Pero ojo al reverso: en producción, SIN `TRUST_PROXY=1` toda petición de internet
// colapsaría en `LOOPBACK_KEY` — y eso es el DoS del `'unknown'` compartido con otro
// nombre (5 fallos de cualquiera bloquean el login de todos). Es decir, esta variable
// falla ABIERTA hacia el defecto que T3.1 cierra, así que no basta con ponerla en el
// compose: `assertTrustProxyConfigured()` la exige en el arranque de producción.
//
// Lo que NO se implementa y por qué: la "IP del socket" como último eslabón. Los route
// handlers de Next 16 no exponen la dirección del peer (`NextRequest.ip` se retiró en
// Next 15) y, aunque la expusieran, aquí siempre valdría `127.0.0.1`: el puerto solo
// escucha en loopback. Un eslabón que no discrimina nada no es un fallback.

/** Clave para tráfico que no llega por un proxy de confianza (solo loopback del host). */
export const LOOPBACK_KEY = 'loopback';

/**
 * Se llama en el arranque (`instrumentation.ts`). En producción, `TRUST_PROXY=1` no es
 * una preferencia: sin ella los tres rate limits meten a TODO internet en un mismo
 * bucket (DoS trivial del login). Lanza para que el fallo sea ruidoso en el boot y no
 * una degradación silenciosa de seguridad que nadie mira hasta que la explotan.
 */
export function assertTrustProxyConfigured(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return;
  if (env.TRUST_PROXY === '1') return;
  throw new Error(
    'TRUST_PROXY debe valer "1" en producción: la app corre detrás de Cloudflare + Caddy y sin ' +
      'esa declaración clientIp() ignora CF-Connecting-IP y mete a todos los visitantes en una ' +
      'única clave de rate limit (5 fallos de cualquiera bloquearían el login de todos). ' +
      'Lo fija docker-compose.prod.yml; si falta, el arranque no es el esperado.',
  );
}

// `TRUST_PROXY` es una constante de DESPLIEGUE, pero `clientIp()` es camino caliente (los
// tres rate limits, en cada petición) y `process.env` en Node no es un objeto normal: cada
// lectura entra en un interceptor C++ y asigna un string nuevo. Se memoiza con la misma
// costura de reset que usa rate-limit.ts para sus limiters, así los tests pueden cambiar el
// entorno sin arrastres entre ficheros.
let trustProxy: boolean | undefined;

/** Solo para tests: descarta el valor memoizado (se relee de `process.env` al próximo uso). */
export function resetTrustProxyForTests(): void {
  trustProxy = undefined;
}

export function clientIp(req: Request): string {
  if (!(trustProxy ??= process.env.TRUST_PROXY === '1')) return LOOPBACK_KEY;

  const cf = req.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;

  // La ÚLTIMA entrada sin partir la cadena: `split(',')` asignaría un array con todos los
  // saltos para tirar todos menos uno. Con una sola entrada (el caso real: Caddy sobrescribe)
  // `lastIndexOf` devuelve -1 y `slice(0)` es la cadena entera.
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const last = xff.slice(xff.lastIndexOf(',') + 1).trim();
    if (last) return last;
  }

  return LOOPBACK_KEY;
}
