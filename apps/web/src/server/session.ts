// Capa de sesión (PRD §8 auth, §11). Corre en Node (toca Postgres): NO la importa
// `proxy.ts` (Edge). La cookie transporta el ID de la sesión —un uuid v4 generado por
// `gen_random_uuid()` de Postgres, es decir un token opaco de 122 bits de un CSPRNG—
// y la expiración autoritativa vive en la tabla `session` (no solo en la cookie): cada
// petición se valida CONTRA la BD (§11).
//
// DECISIÓN DE DISEÑO (T0.4): el identificador de la cookie es el `session.id`. El
// esquema de §9 (PRD, fuente de verdad del modelo de datos) define `session` con
// columnas id/user_id/expires_at/created_at y SIN columna para un hash de token, así
// que se usa el id —ya aleatorio e impredecible— como bearer token opaco, en lugar de
// añadir una columna fuera de §9. El id nunca se loguea ni viaja en un cuerpo de
// respuesta: vive solo en la cookie HttpOnly. (Guardar un hash de un token separado
// sería un endurecimiento futuro que requeriría ampliar §9 y su migración.)
import {
  createSession,
  deleteSession,
  getSessionById,
  getUserById,
  type Db,
  type Session,
  type User,
} from '@app/db';
import {
  SESSION_TTL_MS,
  buildClearedSessionCookie,
  buildSessionCookie,
  readSessionCookie,
} from './session-cookie';

/** Forma de un UUID (la PK de `session`, generada con `gen_random_uuid()`/uuid v4). Se
 *  comprueba ANTES de consultar: ver el porqué en `resolveSession`. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ¿Debe marcarse `Secure` la cookie? Solo con transporte HTTPS: en dev (`next dev`) y
 * en el stack E2E (`next start` sobre http en loopback) una cookie `Secure` no viajaría
 * y rompería el login. Regla: `Secure` SOLO en producción, y aun ahí desactivable con
 * `COOKIE_SECURE=false` (lo que hace el stack E2E, que corre un build de producción sin
 * TLS). Un arranque de PRODUCCIÓN LIMPIO —sin ninguna env extra— da `Secure=true`.
 */
function cookieSecure(): boolean {
  return process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
}

export interface AuthenticatedSession {
  session: Session;
  user: User;
}

/**
 * Crea una sesión para un usuario y devuelve el `Set-Cookie` que la porta. La
 * expiración se persiste en la BD y se refleja en el `Max-Age` de la cookie.
 */
export async function createUserSession(
  db: Db,
  userId: string,
): Promise<{ session: Session; cookie: string }> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await createSession(db, { userId, expiresAt });
  const cookie = buildSessionCookie(session.id, {
    secure: cookieSecure(),
    maxAgeSec: Math.floor(SESSION_TTL_MS / 1000),
  });
  return { session, cookie };
}

/**
 * Resuelve un id de sesión (el valor de la cookie) a usuario+sesión contra la BD.
 * Devuelve la sesión si existe y NO ha caducado; `null` en cualquier otro caso. Una
 * sesión caducada se borra de la BD de forma oportunista (barrido perezoso).
 * §11: nunca loguea el valor de la cookie ni el id de sesión.
 */
export async function resolveSession(
  db: Db,
  sessionId: string | undefined,
): Promise<AuthenticatedSession | null> {
  if (!sessionId) return null;

  // FORMA ANTES QUE BD: el id de sesión es la PK `uuid` de `session`. Con un valor que no
  // es UUID (`devtools_session=x`, o basura inyectada a mano), Postgres no devuelve «cero
  // filas»: lanza un error de CAST, que subía como 500 en vez del 401 que corresponde.
  // Una cookie forjada tiene que ser indistinguible de una inexistente —ambas son «no hay
  // sesión»—, y un 500 además delata que el valor llegó hasta la consulta. Descartar aquí
  // la forma inválida cumple el contrato que este módulo declara («una cookie forjada no
  // encuentra fila → null → 401») y de paso ahorra el viaje a la BD.
  if (!UUID_RE.test(sessionId)) return null;

  const session = await getSessionById(db, sessionId);
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await deleteSession(db, session.id);
    return null;
  }

  const user = await getUserById(db, session.userId);
  if (!user) return null; // cuenta borrada bajo los pies de una sesión viva

  return { session, user };
}

/**
 * Valida la sesión de una petición leyendo la cookie del propio `Request` (no de
 * `cookies()` de next/headers): así el auth es testeable a nivel handler pasando —o
 * no— el header `cookie` (api.md §6). Las páginas de servidor usan `getServerSession`.
 */
export function validateSession(db: Db, req: Request): Promise<AuthenticatedSession | null> {
  return resolveSession(db, readSessionCookie(req.headers.get('cookie')));
}

/** Invalida la sesión de la petición (logout): borra la fila y devuelve el
 *  `Set-Cookie` que limpia la cookie del navegador. Idempotente. */
export async function revokeSession(db: Db, req: Request): Promise<{ cookie: string }> {
  const sessionId = readSessionCookie(req.headers.get('cookie'));
  if (sessionId) await deleteSession(db, sessionId);
  return { cookie: buildClearedSessionCookie({ secure: cookieSecure() }) };
}
