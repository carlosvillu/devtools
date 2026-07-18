// POST /api/auth/logout (PRD §8 auth): invalida la sesión (borra la fila) y limpia la
// cookie. Idempotente: sin sesión, responde igual. §11: no loguea la cookie.
import { LogoutResponseSchema } from '@app/core/auth';
import { withRoute } from '@/server';
import { getDb } from '@/server/db';
import { revokeSession } from '@/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRoute(
  async ({ req }) => {
    const { cookie } = await revokeSession(getDb(), req);
    return Response.json(LogoutResponseSchema.parse({ ok: true }), {
      headers: { 'set-cookie': cookie },
    });
  },
  { route: '/api/auth/logout' },
);
