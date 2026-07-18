// Rate limit por IP en memoria del proceso (PRD §11). Ventana deslizante: cuenta las
// peticiones de una clave dentro de los últimos `windowMs` y rechaza a partir de `limit`.
//
// En memoria basta para v1: la web corre en UN solo proceso (§5.2, sin worker ni Redis).
// El accessor es lazy con override para tests, el mismo molde que getDb()/getRootLogger()
// (api.md §3): importar el módulo no lee env ni crea estado — el limiter se construye en el
// primer uso. `setAnalyzeRateLimiterForTests(makeSlidingWindowRateLimiter({limit, windowMs}))`
// inyecta el MISMO limiter real con config de test (no un doble que miente): el test ejercita
// la lógica de producción, solo con un umbral bajo para no tener que emitir 60 peticiones.

/** Devuelve `true` si la petición se admite; `false` si supera el límite de la ventana. */
export interface RateLimiter {
  check(key: string): boolean;
}

interface SlidingWindowOptions {
  limit: number;
  windowMs: number;
  /** Inyectable para tests deterministas; por defecto el reloj real. */
  now?: () => number;
}

export function makeSlidingWindowRateLimiter(opts: SlidingWindowOptions): RateLimiter {
  const hits = new Map<string, number[]>();
  const clock = opts.now ?? Date.now;

  return {
    check(key: string): boolean {
      const nowMs = clock();
      const cutoff = nowMs - opts.windowMs;
      // Solo las marcas dentro de la ventana cuentan; las viejas se descartan (y se reescriben,
      // así el Map no crece sin fin para una clave que vuelve tras un silencio).
      const recent = (hits.get(key) ?? []).filter((ts) => ts > cutoff);

      if (recent.length >= opts.limit) {
        hits.set(key, recent);
        return false;
      }

      recent.push(nowMs);
      hits.set(key, recent);
      return true;
    },
  };
}

let override: RateLimiter | undefined;
let fromEnv: RateLimiter | undefined;

/**
 * Solo para tests. Pasar `undefined` limpia el override Y descarta el memoizado, de modo que
 * el siguiente `getAnalyzeRateLimiter()` vuelva a construir desde env (mismo contrato que
 * setRootLoggerForTests). Sin esto, el estado en memoria del limiter contamina entre tests.
 */
export function setAnalyzeRateLimiterForTests(limiter: RateLimiter | undefined): void {
  override = limiter;
  fromEnv = undefined;
}

export function getAnalyzeRateLimiter(): RateLimiter {
  return (
    override ??
    (fromEnv ??= makeSlidingWindowRateLimiter({
      // Umbral generoso: `/api/analyze` es idempotente y barato; el rate limit protege de un
      // bucle abusivo, no del uso normal (pegar varias cosas seguidas). Ajustable por env.
      limit: Number(process.env.ANALYZE_RATE_LIMIT ?? 60),
      windowMs: Number(process.env.ANALYZE_RATE_WINDOW_MS ?? 60_000),
    }))
  );
}
