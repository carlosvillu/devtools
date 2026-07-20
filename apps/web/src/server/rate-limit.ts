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

// ── Rate limit de LOGIN (PRD §11) ─────────────────────────────────────────────────
// A diferencia de `/api/analyze` (check-and-record en una sola llamada), el login
// limita por FALLOS: el chequeo (¿bloqueado?) y el registro de un intento son ops
// SEPARADAS y solo los intentos fallidos cuentan. Así un login correcto no consume
// cupo (ni bloquea al usuario legítimo ni contamina la suite E2E entre specs), y N
// contraseñas incorrectas seguidas desde una IP → 429 (verificación de la tarea).

/** Limita por número de FALLOS recientes por clave. `reset` limpia tras un éxito. */
export interface AttemptLimiter {
  /** `true` si la clave ya superó el límite de fallos en la ventana. */
  isLimited(key: string): boolean;
  /** Registra un intento fallido. */
  recordFailure(key: string): void;
  /** Descarta el historial de una clave (tras un login correcto). */
  reset(key: string): void;
}

export function makeSlidingWindowAttemptLimiter(opts: SlidingWindowOptions): AttemptLimiter {
  const failures = new Map<string, number[]>();
  const clock = opts.now ?? Date.now;

  const recent = (key: string, nowMs: number): number[] => {
    const cutoff = nowMs - opts.windowMs;
    const kept = (failures.get(key) ?? []).filter((ts) => ts > cutoff);
    failures.set(key, kept);
    return kept;
  };

  return {
    isLimited(key: string): boolean {
      return recent(key, clock()).length >= opts.limit;
    },
    recordFailure(key: string): void {
      const nowMs = clock();
      const kept = recent(key, nowMs);
      kept.push(nowMs);
      failures.set(key, kept);
    },
    reset(key: string): void {
      failures.delete(key);
    },
  };
}

let loginOverride: AttemptLimiter | undefined;
let loginFromEnv: AttemptLimiter | undefined;

/** Solo para tests: inyecta un limiter con umbral bajo y limpia el memoizado (mismo
 *  contrato que `setAnalyzeRateLimiterForTests`). */
export function setLoginRateLimiterForTests(limiter: AttemptLimiter | undefined): void {
  loginOverride = limiter;
  loginFromEnv = undefined;
}

export function getLoginRateLimiter(): AttemptLimiter {
  return (
    loginOverride ??
    (loginFromEnv ??= makeSlidingWindowAttemptLimiter({
      // 5 fallos en 15 min por IP: suficiente para el usuario que se equivoca un par de
      // veces, un muro para el fuerza-bruta. Ajustable por env.
      limit: Number(process.env.LOGIN_MAX_FAILURES ?? 5),
      windowMs: Number(process.env.LOGIN_FAILURE_WINDOW_MS ?? 15 * 60_000),
    }))
  );
}

// ── Rate limit de SIGNUP (PRD §11) ────────────────────────────────────────────────
// A diferencia de login (limita por FALLOS), signup limita TODAS las peticiones por IP
// (check-and-record, como `/api/analyze`): cada signup ejecuta un scrypt (~100ms CPU +
// ~16 MB) ANTES del insert, así que un flood es un DoS de CPU/memoria barato sobre el
// único proceso web; y sin muro, el mensaje «ese email ya está registrado» permite
// enumerar cuentas a ritmo ilimitado. El límite acota AMBOS. (La clave es la IP REAL del
// visitante desde T3.1: `CF-Connecting-IP`, que el borde borra si no viene de Cloudflare
// ⇒ ya no es rotable por el cliente. Ver client-ip.ts.)

let signupOverride: RateLimiter | undefined;
let signupFromEnv: RateLimiter | undefined;

/** Solo para tests: inyecta un limiter con umbral bajo y limpia el memoizado (mismo
 *  contrato que `setAnalyzeRateLimiterForTests`). */
export function setSignupRateLimiterForTests(limiter: RateLimiter | undefined): void {
  signupOverride = limiter;
  signupFromEnv = undefined;
}

export function getSignupRateLimiter(): RateLimiter {
  return (
    signupOverride ??
    (signupFromEnv ??= makeSlidingWindowRateLimiter({
      // 10 altas en 15 min por IP: holgado para un alta legítima (y varias tras un error de
      // validación), un muro para el flood de scrypt y la enumeración. Ajustable por env.
      limit: Number(process.env.SIGNUP_RATE_LIMIT ?? 10),
      windowMs: Number(process.env.SIGNUP_RATE_WINDOW_MS ?? 15 * 60_000),
    }))
  );
}
