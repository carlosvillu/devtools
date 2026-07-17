// Wrapper único de los route handlers (api.md §1): parsear → validar → delegar
// en core → serializar. Además es donde nace la correlación: crea el child logger
// con `request_id` y lo mete en el AsyncLocalStorage (observability.md §3.2).
import { z } from 'zod';
import { AppError } from '@app/core/contracts';
import type { Logger } from '@app/core/observability';
import { bootstrapErrorResponse, toErrorResponse } from './errors';
import { getRootLogger } from './logger';
import { getRequestLogger, runWithRequestContext } from './request-context';

interface Ctx {
  params: Promise<Record<string, string>>;
}

interface RouteOptions<B, P> {
  /** Nombre estable de la ruta en los logs: '/api/health', '/api/history/[id]'… */
  route: string;
  body?: z.ZodType<B>;
  params?: z.ZodType<P>;
}

export function withRoute<B = undefined, P = Record<string, string>>(
  handler: (input: { req: Request; body: B; params: P }) => Promise<Response>,
  opts: RouteOptions<B, P>,
) {
  return async (req: Request, ctx?: Ctx): Promise<Response> => {
    // El SETUP también va dentro de una costura de errores: `getRootLogger()`
    // construye pino, y pino LANZA al construirse si `LOG_LEVEL` es inválido
    // («default level:verbose must be included in custom levels»). Un typo en el
    // .env del VPS dejaba toda ruta devolviendo un 500 crudo de Next: sin
    // envelope, sin log y sin request_id — justo el fallo que esta maquinaria
    // existe para diagnosticar. Aquí no se puede usar toErrorResponse: depende
    // del logger, que es lo que puede estar roto.
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
        const raw = (await ctx?.params) ?? {};
        const params = (opts.params ? parseOrThrow(opts.params, raw) : raw) as P;
        const body = (opts.body ? parseOrThrow(opts.body, await readJson(req)) : undefined) as B;
        return await handler({ req, body, params });
      } catch (err) {
        // TODO error sale por aquí: envelope único, nunca un throw sin formato.
        return toErrorResponse(err);
      }
    });
  };
}

// Forma aceptada para un `x-request-id` entrante: charset seguro y acotado
// (un UUID v4 casa de sobra, y también los ids de trazas tipo `abc-123_x`).
const REQUEST_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;

/**
 * El header entrante es ENTRADA NO CONFIABLE, no un dato de infraestructura:
 * `/api/health` es pública (D6) —y desde F1 también `/` y `/api/analyze`—, y hoy
 * ni Caddy ni Cloudflare fijan ni eliminan `x-request-id`: lo que manda el
 * cliente llega tal cual. Sin validar, dos abusos triviales:
 *   - mandar SIEMPRE el mismo id colapsa la correlación, que es la única
 *     propiedad por la que este módulo existe;
 *   - mandar 1 MB de header lo escribe en cada línea de log y se refleja en el
 *     envelope de error (./errors.ts).
 * Por eso se acepta solo si casa una forma acotada; si no, se genera uno nuevo.
 * Se prefiere el id del cliente cuando es válido porque permite correlacionar
 * cliente↔servidor, que es justo para lo que sirve el header.
 */
function resolveRequestId(incoming: string | null): string {
  return incoming !== null && REQUEST_ID_RE.test(incoming) ? incoming : crypto.randomUUID();
}

// Privado a propósito: api.md lo exporta para los verificadores de webhooks, y
// devtools no recibe webhooks (§5.2 del PRD). Se exportará el día que exista un
// segundo consumidor — un export que nadie importa es lo que knip caza.
function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  // Ojo §11: `details` lleva z.flattenError(), que NO incluye el valor recibido.
  // Nunca metas el input en un AppError — el envelope viaja y los logs también.
  if (!r.success)
    throw new AppError('validation_error', 'payload inválido', z.flattenError(r.error));
  return r.data;
}

/**
 * `req.json()` no falla solo por JSON malformado: también por stream abortado
 * (el cliente se fue a mitad del envío) o body ya consumido — un bug nuestro.
 * Tratarlo todo como "el body no es JSON" reporta como culpa del cliente un
 * corte de red y deja el diagnóstico sin traza ninguna.
 *
 * ⚠ §11: se distingue el TIPO del fallo, JAMÁS su mensaje. El `err.message` de
 * un SyntaxError de JSON.parse contiene un prefijo de 10 caracteres del input
 * (ver el contrato en @app/core/observability), así que ni se loguea ni viaja al
 * envelope: al log solo llega `err_name`, que es un literal de V8
 * ('SyntaxError' | 'AbortError' | 'TypeError'), nunca dato del usuario.
 */
async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch (err) {
    const errName = err instanceof Error ? err.name : 'UnknownError';

    // 1) JSON malformado: culpa del cliente y caso más común. No es un incidente,
    //    así que `debug` deja la traza sin ensuciar la señal de producción.
    if (errName === 'SyntaxError') {
      getRequestLogger().debug({ err_name: errName }, 'request_body_not_json');
      throw new AppError('validation_error', 'el body no es JSON');
    }

    // 2) El cliente se fue a mitad del envío: degradación por causa externa, el
    //    sistema no falló (observability.md §7 → warn).
    if (errName === 'AbortError' || req.signal.aborted) {
      getRequestLogger().warn({ err_name: errName }, 'request_body_aborted');
      throw new AppError('validation_error', 'la petición se interrumpió antes de recibir el body');
    }

    // 3) Cualquier otra cosa (body ya consumido, stream roto): NO es atribuible
    //    al cliente — tratarlo como 400 es cerrarse la puerta al diagnóstico y
    //    culpar al usuario de un bug nuestro. `error` + 500 opaco.
    getRequestLogger().error({ err_name: errName }, 'request_body_unreadable');
    throw new AppError('internal', 'no se pudo leer el body de la petición');
  }
}
