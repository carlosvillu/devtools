// 🔴 withSession — la BARRERA REAL de autenticación de la API protegida (T2.2).
//
// POR QUÉ EXISTE, Y POR QUÉ NO ES OPCIONAL:
// `proxy.ts` corre en el runtime Edge y solo comprueba que la cookie EXISTE
// (`Boolean(valor)`): no mira la BD, no comprueba expiración ni revocación. Una cookie
// FORJADA (`devtools_session=<uuid inventado>`) o REVOCADA tras un logout atraviesa el
// middleware sin despeinarse. Confiar en que «el middleware ya autenticó» es un bypass
// de autenticación trivial. Por eso TODO handler protegido pasa por aquí, que resuelve
// la sesión CONTRA POSTGRES vía `validateSession`.
//
// DIFERENCIA DELIBERADA con el `withAuth` de backend/api.md §6: aquel devuelve un
// booleano (basta para un producto single-user). Aquí NO basta: este proyecto es
// multi-usuario y el aislamiento del historial DERIVA de la identidad. Por eso este HOF
// PROVEE la sesión resuelta al handler (`{ auth }`), que la usa para acotar sus consultas.
//
// 🔴 REGLA DE AISLAMIENTO: el `auth.user.id` que sale de aquí es el ÚNICO origen legítimo
// de identidad de un handler. Ningún handler debe leer un id de usuario de la query
// string, de un header ni del body — no existe un parámetro así en el contrato.
//
// CORRELACIÓN: igual que `withRoute`, este wrapper ABRE el contexto de request
// (`runWithRequestContext`) antes de ejecutar nada. Sin él, los errores de las rutas
// protegidas saldrían SIN `request_id` en el envelope y sus logs caerían al logger raíz
// sin `route` ni `request_id` — se perdería justo la correlación cliente↔servidor que esta
// maquinaria existe para dar, y solo en las rutas autenticadas.
import { AppError } from '@app/core/contracts';
import type { Logger } from '@app/core/observability';
import { getDb } from './db';
import { validateSession, type AuthenticatedSession } from './session';
import { bootstrapErrorResponse, toErrorResponse } from './errors';
import { getRootLogger } from './logger';
import { runWithRequestContext } from './request-context';
import { resolveRequestId } from './with-route';

type SessionHandler = (input: { req: Request; auth: AuthenticatedSession }) => Promise<Response>;

interface SessionOptions {
  /** Nombre estable de la ruta en los logs: '/api/history'. */
  route: string;
}

export function withSession(handler: SessionHandler, opts: SessionOptions) {
  return async (req: Request): Promise<Response> => {
    // El SETUP va dentro de su propia costura de errores, por la misma razón que en
    // `withRoute`: `getRootLogger()` construye pino, y pino LANZA al construirse si
    // `LOG_LEVEL` es inválido — y `getRootLogger` no memoiza si `makeLogger` lanza. Sin
    // esta red, un 500 con la config de logs rota escaparía del propio `catch` de abajo
    // (que depende del logger) y devolvería un 500 crudo de Next, sin envelope ni
    // request_id. Se reutiliza el mecanismo de `withRoute`, no se duplica.
    let requestId: string;
    let log: Logger;
    try {
      requestId = resolveRequestId(req.headers.get('x-request-id'));
      log = getRootLogger().child({ request_id: requestId, route: opts.route });
    } catch (err) {
      return bootstrapErrorResponse(err);
    }

    return runWithRequestContext({ log, requestId }, async () => {
      try {
        // Validación REAL contra la BD: existencia + expiración + usuario vivo. Una cookie
        // forjada no encuentra fila → null → 401. Una sesión revocada (logout) tampoco.
        const auth = await validateSession(getDb(), req);
        if (!auth) throw new AppError('unauthorized', 'sesión requerida');
        return await handler({ req, auth });
      } catch (err) {
        return toErrorResponse(err);
      }
    });
  };
}
