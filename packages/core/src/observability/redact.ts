// Redaction declarativa del logger base (observability.md §4).
// La redaction vive AQUÍ, nunca ad hoc en los call sites: borrar campos a mano
// antes de loguear es el patrón que falla en el call site nuevo.
//
// Regla operativa: si un secreto puede aparecer en un payload logueado, su path
// entra en esta lista ANTES de escribir el log que lo incluye, en el mismo commit.

export const REDACT_PATHS = [
  // headers y credenciales de sesión
  'authorization',
  '*.authorization',
  'cookie',
  '*.cookie',
  'set-cookie',
  '*["set-cookie"]',
  // claves y credenciales en objetos de config / payloads
  '*.apiKey',
  '*.api_key',
  '*.token',
  '*.password',
  '*.secret',

  // ── Regla §11 del PRD: EL INPUT DEL USUARIO NUNCA SE LOGUEA ──────────────
  // Estos paths son la red de seguridad, NO el mecanismo: la regla se cumple no
  // pasando nunca el input al logger (ver el contrato en ./logger.ts). Existen
  // porque devtools es, literalmente, un campo donde la gente pega tokens y
  // secretos: un log que incluyera la entrada convertiría los logs en el mismo
  // pasivo que D7 evita en la BD.
  'input',
  '*.input',
  'raw',
  '*.raw',
  'value',
  '*.value',
] as const;

// Gotcha verificado (fast-redact, el motor de pino): el wildcard `*` cubre UN
// nivel de anidamiento, no recursión profunda — `*.input` redacta
// `{ req: { input } }` pero no `{ a: { b: { input } } }`. Si un objeto profundo
// pudiera contener la entrada, no se loguea el objeto entero (observability.md §5).
//
// ── HUECO CONOCIDO Y VERIFICADO: `err.message` / `err.stack` NO se redactan ──
// La redaction opera sobre PATHS de campos, y el mensaje de un error es texto
// libre: si el input del usuario acabó dentro del string, sale VERBATIM al log.
//
// V8 mete literalmente un prefijo de 10 caracteres del input en el mensaje:
//   JSON.parse('eyJhbGciOiJIUzI1NiJ9.SUPERSECRETO')
//     → SyntaxError: Unexpected token 'e', "eyJhbGciOi"... is not valid JSON
// Comprobado ejecutando pino con ESTA misma lista: `log.error({ err }, '…')`
// escribe ese mensaje (y su stack) sin censurar — `*.message` no está aquí, y
// añadirlo cegaría TODOS los diagnósticos, que es peor que el problema.
//
// Consecuencia para quien parsee input del usuario (T1.2 en adelante: JSON,
// base64, JWT…): el error de parseo **se scrubea en ORIGEN**. Nunca
// `log.error({ err })` con un error que nació de parsear la entrada; loguea el
// TIPO (`err.name`) y nada más. Ver el contrato completo en ./logger.ts.
// Es el camino real por el que §11 y el criterio 14.9 del PRD se romperían.
