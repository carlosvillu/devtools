// Factory pino compartido (observability.md §2). Es la ÚNICA excepción a
// "core sin I/O": el proyecto necesita UN logger con serializers y redaction
// comunes, y duplicarlo por app garantiza drift de redaction.
// Frontera estricta: SOLO este módulo importa pino; el resto consume el puerto Logger.
import pino, { type DestinationStream } from 'pino';
import type { Logger } from '../ports';
import { REDACT_PATHS } from './redact';

export type { Logger };

// ───────────────────────────────────────────────────────────────────────────
//  REGLA §11 DEL PRD — EL INPUT DEL USUARIO NUNCA SE LOGUEA.
//
//  Ni entero, ni truncado, ni "solo cuando falla", ni en nivel debug. devtools
//  existe para que la gente pegue JWTs, tokens y secretos en un campo: la
//  entrada es un pasivo, no un dato de diagnóstico.
//
//  Lo ÚNICO que se puede loguear de una petición de análisis (§11):
//    - `input_kind`   (el kind detectado: 'jwt' | 'base64' | …)
//    - `input_bytes`  (longitud en bytes)
//    - `steps`        (número de pasos de la cadena)
//    - `duration_ms`  (duración)
//
//  Correcto:   log.info({ input_kind, input_bytes, steps, duration_ms }, 'analyzed')
//  PROHIBIDO:  log.info({ input }, 'analyzed')
//              log.error({ err, body }, 'analyze failed')   // el body LLEVA el input
//              log.debug({ preview: input.slice(0, 40) }, '…')  // truncar no es redactar
//
//  `REDACT_PATHS` (./redact.ts) redacta `input`/`raw`/`value` como red de
//  seguridad, pero la red no es la regla: no se le pasa el input al logger.
//  El criterio 14.9 del PRD lo verifica en real: un `grep` del input de prueba
//  sobre los logs de la web no debe devolver NINGUNA coincidencia.
//
//  ⚠ LA RED NO CUBRE `err.message` NI `err.stack` (verificado, ver ./redact.ts).
//  La redaction opera sobre paths de campos; el mensaje de un error es texto
//  libre. Y V8 mete un prefijo de 10 caracteres del input en él:
//     JSON.parse('eyJhbGciOiJIUzI1NiJ9.SUPERSECRETO')
//       → SyntaxError: Unexpected token 'e', "eyJhbGciOi"... is not valid JSON
//  `log.error({ err }, '…')` con ESE error escribe el prefijo sin censurar.
//
//  Regla para todo el que parsee entrada del usuario (T1.2+: JSON, base64, JWT):
//    PROHIBIDO:  catch (err) { log.error({ err }, 'parse failed') }   // filtra input
//    Correcto:   catch (err) { log.debug({ err_name: err.name }, 'parse failed') }
//  El error de parseo se scrubea EN ORIGEN: al logger solo llega el tipo.
//  Ejemplo vivo de la regla: `readJson` en apps/web/src/server/with-route.ts.
// ───────────────────────────────────────────────────────────────────────────

export interface MakeLoggerOptions {
  /** 'web' es el único proceso: el PRD (§5.2) descarta apps/worker. */
  name: 'web';
  /** El composition root pasa process.env.LOG_LEVEL ?? 'info'. */
  level: string;
  /** SOLO dev: pino-pretty es transport de desarrollo, jamás en producción. */
  pretty?: boolean;
}

/**
 * Instanciado UNA vez por proceso desde el composition root
 * (`apps/web/src/server/logger.ts`). Importar este módulo no crea logger ni lee env.
 *
 * @param destination costura de test: permite capturar la salida NDJSON y probar
 *   la redaction de verdad. En producción se omite y pino escribe a stdout.
 *   NO combinable con `pretty: true`, y el fallo es SILENCIOSO (verificado): pino
 *   no lanza — el transport gana y el destination se descarta sin avisar, así que
 *   la captura recibe CERO líneas. Un test que pase los dos y afirme sobre un
 *   array vacío pasa en falso. Si necesitas capturar, `pretty: false`.
 */
export function makeLogger(opts: MakeLoggerOptions, destination?: DestinationStream): Logger {
  return pino(
    {
      name: opts.name,
      level: opts.level,
      redact: { paths: [...REDACT_PATHS], censor: '[REDACTED]' },
      serializers: { err: pino.stdSerializers.err },
      transport: opts.pretty ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
    },
    destination,
  );
}
