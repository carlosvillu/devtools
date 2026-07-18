// POST /api/auth/login (PRD §8 auth, §11): rate limit por IP + login con respuestas
// INDISTINGUIBLES entre «email no existe» y «contraseña mala». Público (D6). El input
// nunca se loguea (§11).
import { AuthResponseSchema, LoginSchema } from '@app/core/auth';
import { AppError } from '@app/core/contracts';
import { withRoute } from '@/server';
import { getDb } from '@/server/db';
import { login } from '@/server/auth';
import { createUserSession } from '@/server/session';
import { clientIp } from '@/server/client-ip';
import { getLoginRateLimiter } from '@/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRoute(
  async ({ req, body }) => {
    const db = getDb();
    const limiter = getLoginRateLimiter();
    const key = clientIp(req);

    // Rate limit por IP ANTES de tocar la BD: los fallos previos ya bloquean.
    if (limiter.isLimited(key)) {
      throw new AppError(
        'rate_limited',
        'Demasiados intentos. Inténtalo de nuevo en unos minutos.',
      );
    }

    let user;
    try {
      user = await login(db, body);
    } catch (err) {
      // Solo los fallos de credenciales cuentan contra el límite; un 500 (BD caída) no.
      if (err instanceof AppError && err.code === 'unauthorized') limiter.recordFailure(key);
      throw err;
    }
    limiter.reset(key); // login correcto: no penaliza intentos futuros del usuario legítimo

    const { cookie } = await createUserSession(db, user.id);
    return Response.json(AuthResponseSchema.parse({ user }), {
      headers: { 'set-cookie': cookie },
    });
  },
  { route: '/api/auth/login', body: LoginSchema },
);
