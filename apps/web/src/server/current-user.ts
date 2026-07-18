// Sesión actual para SERVER COMPONENTS (layout/páginas). Lee la cookie vía
// `cookies()` de next/headers y la resuelve contra la BD. NON-FATAL: si la BD está
// caída, devuelve `null` (usuario anónimo) en vez de lanzar — `/` es pública y debe
// renderizar aunque Postgres no responda (misma filosofía que la sonda de salud de
// T0.2). §11: nunca loguea la cookie ni el id de sesión.
import { cookies } from 'next/headers';
import { getDb } from './db';
import { resolveSession, type AuthenticatedSession } from './session';
import { SESSION_COOKIE } from './session-cookie';

export async function getServerSession(): Promise<AuthenticatedSession | null> {
  try {
    const store = await cookies();
    const sessionId = store.get(SESSION_COOKIE)?.value;
    return await resolveSession(getDb(), sessionId);
  } catch {
    // BD caída / cookie ilegible: el visitante se trata como anónimo, no se rompe la página.
    return null;
  }
}
