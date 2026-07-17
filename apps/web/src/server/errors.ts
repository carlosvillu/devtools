// Mapeo error → envelope HTTP, en UN solo sitio (api.md §2).
import { ZodError } from 'zod';
import { AppError, type ErrorEnvelope } from '@app/core/contracts';
import { getRequestId, getRequestLogger } from './request-context';

interface Classified {
  code: ErrorEnvelope['code'];
  message: string;
  details?: unknown;
  status: number;
}

/**
 * La opacidad del 5xx es propiedad del STATUS, no del orden de las ramas.
 *
 * Antes dependía de por dónde cayera el error: `AppError('internal', msg, details)`
 * salía por la rama `instanceof AppError` y serializaba `msg` y `details`
 * VERBATIM al cliente, esquivando el fallback opaco. `architecture.md` §5 es
 * vinculante: de `internal` dice «el envelope sale opaco y el detalle va SOLO al
 * log». Dejarlo en manos de cada call site significa que en F1 un
 * `throw new AppError('internal', \`no se pudo parsear ${input}\`)` mandaría el
 * input del usuario AL CLIENTE — por encima de REDACT_PATHS, que solo cubre logs.
 */
export function toErrorResponse(err: unknown): Response {
  const request_id = getRequestId(); // viaja en los logs Y en el envelope: es el cruce cliente↔servidor
  const { code, message, details, status } = classify(err, request_id);

  // La ÚNICA construcción del envelope. Opaco ⟺ 5xx: el mensaje interno puede
  // llevar rutas, SQL, keys o el input del usuario; su sitio es el log, no el cliente.
  const body: ErrorEnvelope =
    status >= 500
      ? { code, message: 'error interno', request_id }
      : { code, message, details, request_id };

  return Response.json(body, { status });
}

function classify(err: unknown, request_id: string | undefined): Classified {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      // El detalle del 5xx no viaja al cliente: aquí es donde tiene que quedar.
      // La clave `err` activa el serializer de pino (message, stack, y las props
      // propias de AppError: code, status, details).
      getRequestLogger().error({ err, request_id }, 'app_error_5xx');
    }
    return { code: err.code, message: err.message, details: err.details, status: err.status };
  }

  if (err instanceof ZodError) {
    // La ENTRADA ya llega convertida a AppError por withRoute (parseOrThrow): un
    // ZodError crudo aquí es drift de SALIDA o de datos internos — bug nuestro.
    getRequestLogger().error({ err, request_id }, 'zod_contract_drift');
    return { code: 'internal', message: 'error interno', status: 500 };
  }

  getRequestLogger().error({ err, request_id }, 'unhandled_route_error');
  return { code: 'internal', message: 'error interno', status: 500 };
}

/**
 * Último recurso cuando falla el PROPIO setup de la ruta (p. ej. `LOG_LEVEL`
 * inválido en el .env del VPS: pino lanza al construirse). Aquí no se puede usar
 * el logger — es justamente lo que está roto —, así que la traza sale por
 * stderr, que Docker recoge igual. Sin `request_id`: no llegó a existir.
 */
export function bootstrapErrorResponse(err: unknown): Response {
  const name = err instanceof Error ? err.name : 'UnknownError';
  // El message de un fallo de arranque viene de NUESTRA config, nunca del input
  // del usuario (que ni se ha leído todavía): es seguro emitirlo.
  const message = err instanceof Error ? err.message : '';
  console.error(`route_bootstrap_failed name=${name} message=${message}`);

  return Response.json({ code: 'internal', message: 'error interno' } satisfies ErrorEnvelope, {
    status: 500,
  });
}
