// Auth handler-level contra Postgres real (testing/api.md §2). Cubre la Entrega de
// T0.4: signup/login/logout, sesión en BD con expiración, respuestas indistinguibles
// (§11) y rate limit de login. La cookie httpOnly y el redirect visual se prueban en
// e2e (auth.spec.ts); aquí, el contrato HTTP + el efecto en las filas.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, makeUser, type TestDatabase } from '@app/test-utils';
import { createSession, createUser, getSessionById, getUserByEmail } from '@app/db';
import { setDbForTests } from '@/server/db';
import { INVALID_CREDENTIALS_MESSAGE } from '@/server/auth';
import {
  makeSlidingWindowAttemptLimiter,
  makeSlidingWindowRateLimiter,
  setLoginRateLimiterForTests,
  setSignupRateLimiterForTests,
} from '@/server/rate-limit';
import { validateSession, createUserSession } from '@/server/session';
import { SESSION_COOKIE } from '@/server/session-cookie';
import { POST as signup } from '@/app/api/auth/signup/route';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { callRoute, getSetCookie } from '../../helpers/call-route';
import { expectApiError } from '../../helpers/expect-api-error';

let ctx: TestDatabase;
beforeAll(async () => {
  ctx = await createTestDatabase({ label: 'web-auth' });
  setDbForTests(ctx.db);
});
afterAll(async () => {
  setDbForTests(undefined);
  await ctx.close();
});

// Limiter con umbral ALTO por defecto: los fallos de credenciales de otros tests no se
// acumulan hasta bloquear. El test de rate limit instala su propio limiter bajo.
beforeEach(() => {
  setLoginRateLimiterForTests(makeSlidingWindowAttemptLimiter({ limit: 1000, windowMs: 60_000 }));
  // Igual para signup: umbral alto para que las altas de otros tests no disparen el muro.
  setSignupRateLimiterForTests(makeSlidingWindowRateLimiter({ limit: 1000, windowMs: 60_000 }));
});
afterEach(() => {
  setLoginRateLimiterForTests(undefined);
  setSignupRateLimiterForTests(undefined);
});

const cookieHeader = (res: Response): string => {
  const value = getSetCookie(res, SESSION_COOKIE) ?? '';
  return `${SESSION_COOKIE}=${value}`;
};

describe('POST /api/auth/signup', () => {
  it('crea la cuenta, inicia sesión y devuelve el usuario (sin el hash)', async () => {
    const res = await callRoute(signup, '/api/auth/signup', {
      method: 'POST',
      json: { email: 'Nueva@Cuenta.COM', password: 'un-secreto-123' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string; email: string } };
    expect(body.user.email).toBe('nueva@cuenta.com'); // normalizado por el repo
    expect(body.user.id).toMatch(/^[0-9a-f-]{36}$/);
    // La respuesta NUNCA lleva el hash de contraseña.
    expect(JSON.stringify(body)).not.toContain('scrypt');

    // Cookie de sesión httpOnly presente.
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/httponly/i);
    expect(setCookie).toMatch(/samesite=lax/i);
    expect(setCookie).toMatch(new RegExp(`${SESSION_COOKIE}=`, 'i'));

    // El usuario existe en la BD con un hash scrypt (no la contraseña en claro).
    const user = await getUserByEmail(ctx.db, 'nueva@cuenta.com');
    expect(user).toBeDefined();
    expect(user!.passwordHash).toMatch(/^scrypt\$/);
    expect(user!.passwordHash).not.toContain('un-secreto-123');

    // La sesión existe en BD y su id ES el valor de la cookie (token opaco).
    const sessionId = getSetCookie(res, SESSION_COOKIE);
    const row = await getSessionById(ctx.db, sessionId!);
    expect(row?.userId).toBe(user!.id);
    expect(row?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('un email ya registrado → 400 validation_error con el error en el campo email', async () => {
    await callRoute(signup, '/api/auth/signup', {
      method: 'POST',
      json: { email: 'dup@example.com', password: 'contrasena-1' },
    });
    const res = await callRoute(signup, '/api/auth/signup', {
      method: 'POST',
      json: { email: 'DUP@example.com', password: 'contrasena-2' }, // misma cuenta, otra capitalización
    });
    const body = await expectApiError(res, 400, 'validation_error');
    expect((body.details as { fieldErrors: { email?: string[] } }).fieldErrors.email).toBeDefined();
  });

  it('una contraseña de menos de 8 caracteres → 400 validation_error', async () => {
    const res = await callRoute(signup, '/api/auth/signup', {
      method: 'POST',
      json: { email: 'corta@example.com', password: '1234567' },
    });
    expect(res.status).toBe(400);
    const body = await expectApiError(res, 400, 'validation_error');
    expect(
      (body.details as { fieldErrors: { password?: string[] } }).fieldErrors.password,
    ).toBeDefined();
  });
});

describe('POST /api/auth/login', () => {
  const email = 'login-user@example.com';
  const password = 'la-buena-123';

  beforeAll(async () => {
    await callRoute(signup, '/api/auth/signup', { method: 'POST', json: { email, password } });
  });

  it('credenciales correctas → 200 + cookie de sesión nueva', async () => {
    const res = await callRoute(login, '/api/auth/login', {
      method: 'POST',
      json: { email, password },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie') ?? '').toMatch(/httponly/i);
    const sessionId = getSetCookie(res, SESSION_COOKIE);
    expect(sessionId).toBeTruthy();
  });

  it('§11 INDISTINGUIBILIDAD: email inexistente y contraseña mala dan el MISMO mensaje', async () => {
    const wrongPw = await callRoute(login, '/api/auth/login', {
      method: 'POST',
      json: { email, password: 'contrasena-incorrecta' },
    });
    const noUser = await callRoute(login, '/api/auth/login', {
      method: 'POST',
      json: { email: 'no-existe@example.com', password: 'lo-que-sea-123' },
    });
    const b1 = await expectApiError(wrongPw, 401, 'unauthorized');
    const b2 = await expectApiError(noUser, 401, 'unauthorized');
    // Comparación LITERAL del mensaje: es la garantía de §11. Ambas ramas emiten el
    // MISMO mensaje canónico y no filtran cuál de las dos condiciones falló.
    expect(b1.message).toBe(b2.message);
    expect(b1.message).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(b2.message).toBe(INVALID_CREDENTIALS_MESSAGE);
  });
});

describe('login rate limit por IP (§11)', () => {
  it('N fallos desde una IP → 429; un login correcto NO cuenta', async () => {
    // Limiter propio con umbral bajo para este test.
    setLoginRateLimiterForTests(makeSlidingWindowAttemptLimiter({ limit: 3, windowMs: 60_000 }));
    const email = 'rl-user@example.com';
    const password = 'rl-secreto-123';
    await callRoute(signup, '/api/auth/signup', { method: 'POST', json: { email, password } });
    const ip = '203.0.113.7'; // IP fija y única para aislar la clave del limiter
    const headers = { 'x-forwarded-for': ip };

    // Un login CORRECTO no consume cupo (resetea).
    const good = await callRoute(login, '/api/auth/login', {
      method: 'POST',
      json: { email, password },
      headers,
    });
    expect(good.status).toBe(200);

    // 3 fallos consumen el cupo…
    for (let i = 0; i < 3; i++) {
      const bad = await callRoute(login, '/api/auth/login', {
        method: 'POST',
        json: { email, password: 'malísima' },
        headers,
      });
      await expectApiError(bad, 401, 'unauthorized');
    }
    // …el siguiente intento (aun con contraseña correcta) → 429.
    const blocked = await callRoute(login, '/api/auth/login', {
      method: 'POST',
      json: { email, password },
      headers,
    });
    await expectApiError(blocked, 429, 'rate_limited');
  });
});

describe('signup rate limit por IP (§11)', () => {
  it('N altas desde una IP → 429 ANTES de tocar la BD (anti-flood/enumeración)', async () => {
    setSignupRateLimiterForTests(makeSlidingWindowRateLimiter({ limit: 2, windowMs: 60_000 }));
    const ip = '198.51.100.9'; // IP fija y única para aislar la clave del limiter
    const headers = { 'x-forwarded-for': ip };
    const password = 'signup-rl-123';

    // Las 2 primeras altas (emails distintos) pasan…
    for (let i = 0; i < 2; i++) {
      const ok = await callRoute(signup, '/api/auth/signup', {
        method: 'POST',
        json: { email: `srl-${String(i)}@example.com`, password },
        headers,
      });
      expect(ok.status).toBe(200);
    }
    // …la 3ª → 429 y NO crea la cuenta (el muro corre antes del scrypt/insert).
    const blockedEmail = 'srl-blocked@example.com';
    const blocked = await callRoute(signup, '/api/auth/signup', {
      method: 'POST',
      json: { email: blockedEmail, password },
      headers,
    });
    await expectApiError(blocked, 429, 'rate_limited');
    expect(await getUserByEmail(ctx.db, blockedEmail)).toBeUndefined();
  });
});

// ALCANCE de este bloque: la PRECEDENCIA que aplica `clientIp()` dentro del handler —
// entre los headers que ya llegaron, gana `CF-Connecting-IP`. Eso es media respuesta.
//
// Lo que estos tests NO prueban (y por eso no lo dicen en su título): que un cliente de
// producción no pueda FIJAR `CF-Connecting-IP`. Aquí se inyecta a mano un valor que en el
// sistema real el borde borra si la conexión no viene de Cloudflare; estos tests pasarían
// igual con esa línea del Caddy completamente ausente. Esa mitad —la que convierte la
// precedencia en una defensa— vive en `deploy/devtools.carlosvillu.dev.caddy` y la
// comprueba la sonda de forja de `.claude/skills/deploy/scripts/verify.sh` contra el
// borde real. Las dos mitades juntas son el trust boundary; ninguna basta sola.
describe('precedencia de clientIp() en los muros de auth (T3.1, PRD §10/§11)', () => {
  // El defecto que cierra T3.1: hasta ahora la clave salía de `X-Forwarded-For`, que
  // cualquier cliente puede rotar por petición ⇒ el muro de login NO saltaba nunca
  // (observado al verificar T0.4: 6 intentos → 401 con la clave real ya bloqueada).
  it('con CF-Connecting-IP fija, rotar X-Forwarded-For no abre buckets nuevos', async () => {
    setLoginRateLimiterForTests(makeSlidingWindowAttemptLimiter({ limit: 3, windowMs: 60_000 }));
    const email = 'tb-login@example.com';
    const password = 'tb-secreto-123';
    await callRoute(signup, '/api/auth/signup', { method: 'POST', json: { email, password } });

    const attacker = '203.0.113.44'; // la IP real que Cloudflare comunica: NO cambia
    for (let i = 0; i < 3; i++) {
      const bad = await callRoute(login, '/api/auth/login', {
        method: 'POST',
        json: { email, password: 'malísima' },
        // XFF DISTINTO en cada intento: es lo que antes reseteaba el bucket.
        headers: { 'cf-connecting-ip': attacker, 'x-forwarded-for': `198.51.100.${String(i)}` },
      });
      await expectApiError(bad, 401, 'unauthorized');
    }

    const blocked = await callRoute(login, '/api/auth/login', {
      method: 'POST',
      json: { email, password },
      headers: { 'cf-connecting-ip': attacker, 'x-forwarded-for': '198.51.100.250' },
    });
    expect(blocked.status).toBe(429);
    await expectApiError(blocked, 429, 'rate_limited');
  });

  // Segundo defecto de T0.4: `clientIp()` devolvía la cadena `'unknown'` para todo el
  // mundo ⇒ 5 fallos de cualquiera bloqueaban el login de TODOS. Con la clave real, dos
  // visitantes distintos tienen buckets distintos. (El control equivalente en el BORDE
  // —que Caddy no deje a un cliente fabricarse ese header— no se prueba aquí: se
  // comprueba desde fuera del VPS contra el Caddy real.)
  it('dos visitantes con CF-Connecting-IP distinta NO comparten bucket', async () => {
    setLoginRateLimiterForTests(makeSlidingWindowAttemptLimiter({ limit: 2, windowMs: 60_000 }));
    const email = 'tb-vecino@example.com';
    const password = 'tb-vecino-123';
    await callRoute(signup, '/api/auth/signup', { method: 'POST', json: { email, password } });

    for (let i = 0; i < 2; i++) {
      const bad = await callRoute(login, '/api/auth/login', {
        method: 'POST',
        json: { email, password: 'malísima' },
        headers: { 'cf-connecting-ip': '203.0.113.55' },
      });
      await expectApiError(bad, 401, 'unauthorized');
    }
    // El primer visitante ya está bloqueado…
    const blocked = await callRoute(login, '/api/auth/login', {
      method: 'POST',
      json: { email, password },
      headers: { 'cf-connecting-ip': '203.0.113.55' },
    });
    await expectApiError(blocked, 429, 'rate_limited');

    // …y el segundo, con su propia IP, entra sin arrastrar los fallos del primero.
    const other = await callRoute(login, '/api/auth/login', {
      method: 'POST',
      json: { email, password },
      headers: { 'cf-connecting-ip': '203.0.113.56' },
    });
    expect(other.status).toBe(200);
  });

  // El muro de signup usa la MISMA clave (los tres rate limits del producto comparten
  // `clientIp()`): se revisa aquí que también deja de ser esquivable rotando XFF.
  it('signup: su muro se lleva por la misma clave (rotar XFF no abre buckets nuevos)', async () => {
    setSignupRateLimiterForTests(makeSlidingWindowRateLimiter({ limit: 2, windowMs: 60_000 }));
    const password = 'tb-signup-123';
    const cf = { 'cf-connecting-ip': '203.0.113.77' };

    for (let i = 0; i < 2; i++) {
      const ok = await callRoute(signup, '/api/auth/signup', {
        method: 'POST',
        json: { email: `tb-srl-${String(i)}@example.com`, password },
        headers: { ...cf, 'x-forwarded-for': `198.51.100.${String(i)}` },
      });
      expect(ok.status).toBe(200);
    }
    const blockedEmail = 'tb-srl-blocked@example.com';
    const blocked = await callRoute(signup, '/api/auth/signup', {
      method: 'POST',
      json: { email: blockedEmail, password },
      headers: { ...cf, 'x-forwarded-for': '198.51.100.99' },
    });
    await expectApiError(blocked, 429, 'rate_limited');
    expect(await getUserByEmail(ctx.db, blockedEmail)).toBeUndefined();
  });
});

describe('POST /api/auth/logout', () => {
  it('borra la sesión de la BD y limpia la cookie (Max-Age=0); idempotente', async () => {
    const email = 'logout-user@example.com';
    const password = 'logout-secreto-1';
    const signupRes = await callRoute(signup, '/api/auth/signup', {
      method: 'POST',
      json: { email, password },
    });
    const sessionId = getSetCookie(signupRes, SESSION_COOKIE)!;
    const cookie = cookieHeader(signupRes);

    const res = await callRoute(logout, '/api/auth/logout', {
      method: 'POST',
      headers: { cookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie') ?? '').toMatch(/max-age=0/i);

    // La fila de sesión ya no existe → la cookie vieja no valida.
    expect(await getSessionById(ctx.db, sessionId)).toBeUndefined();

    // Idempotente: logout sin cookie responde igual.
    const again = await callRoute(logout, '/api/auth/logout', { method: 'POST' });
    expect(again.status).toBe(200);
  });
});

describe('validateSession (sesión en BD)', () => {
  it('valida una sesión viva y rechaza (borrando) una caducada', async () => {
    const u = await createUser(ctx.db, makeUser());

    // Sesión viva: valida y devuelve el usuario.
    const { cookie } = await createUserSession(ctx.db, u.id);
    const value = /devtools_session=([^;]*)/.exec(cookie)?.[1] ?? '';
    const liveReq = new Request('http://test.local/history', {
      headers: { cookie: `${SESSION_COOKIE}=${value}` },
    });
    const live = await validateSession(ctx.db, liveReq);
    expect(live?.user.id).toBe(u.id);

    // Sesión caducada: se rechaza y se borra de la BD (barrido perezoso).
    const expired = await createSession(ctx.db, {
      userId: u.id,
      expiresAt: new Date(Date.now() - 1000),
    });
    const expReq = new Request('http://test.local/history', {
      headers: { cookie: `${SESSION_COOKIE}=${expired.id}` },
    });
    expect(await validateSession(ctx.db, expReq)).toBeNull();
    expect(await getSessionById(ctx.db, expired.id)).toBeUndefined();
  });

  it('sin cookie → null', async () => {
    const req = new Request('http://test.local/history');
    expect(await validateSession(ctx.db, req)).toBeNull();
  });
});
