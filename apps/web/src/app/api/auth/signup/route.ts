// POST /api/auth/signup (PRD §8 auth, D9): valida email+contraseña con el schema de
// core, crea la cuenta (scrypt) y deja la sesión iniciada (cookie httpOnly + fila en
// `session`). Público (D6). §11: el input nunca se loguea.
import { AuthResponseSchema, SignupSchema } from '@app/core/auth';
import { AppError } from '@app/core/contracts';
import { withRoute } from '@/server';
import { getDb } from '@/server/db';
import { signup } from '@/server/auth';
import { createUserSession } from '@/server/session';
import { clientIp } from '@/server/client-ip';
import { getSignupRateLimiter } from '@/server/rate-limit';

// scrypt (node:crypto) + pg ⇒ runtime Node, nunca Edge. La respuesta depende del body.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRoute(
  async ({ req, body }) => {
    // Rate limit por IP ANTES del scrypt: cada alta ejecuta un scrypt caro, así que el
    // muro protege del flood (DoS) y de la enumeración vía «email ya registrado» (§11).
    if (!getSignupRateLimiter().check(clientIp(req))) {
      throw new AppError(
        'rate_limited',
        'Demasiados intentos. Inténtalo de nuevo en unos minutos.',
      );
    }

    const db = getDb();
    const user = await signup(db, body);
    const { cookie } = await createUserSession(db, user.id);
    return Response.json(AuthResponseSchema.parse({ user }), {
      headers: { 'set-cookie': cookie },
    });
  },
  { route: '/api/auth/signup', body: SignupSchema },
);
