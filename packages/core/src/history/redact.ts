// Derivación del registro de historial a partir de (input, Chain) — PRD §8 «Redacción
// (D7)» y §11. Lógica PURA: es el único sitio donde se decide qué se parece al dato del
// usuario y qué no, para que sea unit-testable y auditable de un vistazo.
//
// 🔴 REGLA DE ORO (criterio 14.8): el input crudo NO se persiste ni se loguea. De aquí
// solo pueden salir dos cosas:
//   - `preview`: redactado POR KIND (ver tabla abajo) y truncado DESPUÉS a 120.
//   - `chain`:   SOLO `[{ kind, transformId }]`. Ningún valor intermedio, ni truncado.
// Añadir aquí cualquier campo que transporte `step.input`/`step.output` rompe D7.
//
// ─── REGLA POR KIND (T2.4 — ampliación aprobada del PRD §8 «Redacción (D7)») ────────────
// La tensión a resolver: el historial tiene que seguir siendo RECONOCIBLE, pero nada que
// pueda descodificar a texto legible puede sobrevivir. Se resuelve recordando que la fila
// NO depende solo del `preview`: `input_kind` y `chain` se guardan aparte y se muestran,
// así que el preview solo tiene que aportar lo que aquellos no dan — FORMA y TAMAÑO.
//
// | kind           | qué se conserva                       | por qué es seguro                    |
// |----------------|---------------------------------------|--------------------------------------|
// | jwt            | header + `.….…`                       | el header es metadatos de algoritmo; |
// |                |                                       | payload y firma se van enteros       |
// | base64         | NADA del contenido: `… (N caracteres)`| el base64 ES el texto legible        |
// |                |                                       | codificado — hasta 4 chars decodifican|
// |                |                                       | 3 bytes de plaintext, así que no se  |
// |                |                                       | conserva ni un prefijo. La LONGITUD  |
// |                |                                       | distingue entradas sin revelar nada  |
// | json           | estructura + CLAVES; todo VALOR → `…` | los valores (string, número, bool)   |
// |                |                                       | son el secreto (`{"password":…}`);   |
// |                |                                       | las claves son nombres de campo, no  |
// |                |                                       | el dato, y son lo que hace la entrada|
// |                |                                       | reconocible                          |
// | url            | `scheme://host` + `/…` si había resto | path, query y fragment transportan   |
// |                |                                       | tokens (`?access_token=…`); el host  |
// |                |                                       | basta para reconocer la entrada      |
// | hash           | verbatim                              | es un digest: por definición NO      |
// |                |                                       | descodifica a texto legible          |
// | uuid           | verbatim                              | identificador opaco, sin contenido   |
// | unix_timestamp | verbatim                              | un número de tiempo; es el dato ÚTIL |
// |                |                                       | y no codifica nada más              |
// | text           | verbatim, SALVO que TENGA PINTA DE    | fallback: no es un portador conocido |
// |                | JSON (empieza por `{`, `[` o `"`) →   | de secretos y redactarlo dejaría el  |
// |                | `…` entero                            | historial sin ninguna entrada legible|
//
// 🔴 EL ENRUTADO ES POR KIND REAL DEL DETECTOR, NO POR INTENCIÓN. `detectJson()` exige
// parseo VÁLIDO y resultado NO escalar, así que un JSON con una coma de más
// (`{"password":"leakme123"`) o un escalar entrecomillado (`"leakme123"`) NUNCA llegan
// aquí como `json`: el motor los clasifica `text`. Sin la salvedad de la fila `text` se
// persistirían VERBATIM — y pegar un fragmento de config mal recortado es de los casos más
// realistas que hay. Por eso la regla de `text` mira la FORMA del input crudo: si empieza
// por `{`, `[` o `"`, se trata como json y `redactJson` lo deja en `…` al no poder parsear.
// (Coste asumido: una frase entrecomillada legítima también se va a `…`. Fallar hacia el
// lado seguro es exactamente lo que se pide.)
//
// RESIDUALES CONOCIDOS (nombrados a propósito, NO resueltos en T2.4):
//   (a) `hash` verbatim: un token de API de 64 hex detecta como `hash` y se guarda ENTERO.
//       Cumple el criterio literal (un digest no descodifica a texto legible) y ver el
//       digest es justo lo útil del historial, pero es exposición residual real.
//   (b) un secreto usado como CLAVE de JSON (`{"sk-live-abc123":"x"}`) SOBREVIVE: es la
//       consecuencia deliberada de conservar las claves para que la entrada sea reconocible.
//   (c) un `text` que CONTIENE JSON pero NO EMPIEZA por `{`/`[`/`"` se guarda VERBATIM —
//       p. ej. `callback({"pw":"x"})` o `config x{"pw":"x"}`. La salvedad de la fila `text`
//       es una heurística del PRIMER carácter, no un buscador de JSON en cualquier posición.
//       Es asimétrica en los dos sentidos y conviene saberlo: SOBRE-redacta texto legítimo
//       que empieza por esos caracteres (`[INFO] user=admin` → `…`) y SUB-redacta el JSON
//       embebido. Buscar JSON en cualquier posición costaría mucha más superficie y falsos
//       positivos; se asume a cambio de que la regla siga siendo trivial de auditar.
//
// COMPOSICIÓN con el truncado: tras redactar, en `json` todos los valores ya son `…` y en
// `base64` no queda contenido, así que el corte a 120 solo puede partir claves/estructura —
// NUNCA puede reintroducir un valor. Por eso el orden redactar→truncar es seguro (al revés
// no lo sería: un truncado «afortunado» dejaría pasar medio payload).
import type { Chain } from '../engine/contracts';
import { JWT_PREFIX_RE } from '../engine/detectors';

/** Máximo de caracteres de `preview` (PRD §9: «truncado + redactado (D7), máx 120 chars»). */
export const PREVIEW_MAX_CHARS = 120;

/** Marca de redacción/truncado. */
const ELLIPSIS = '…';

/** Resumen de un paso: tipo detectado + transformación aplicada (null si terminal).
 *  Estructuralmente compatible con `ChainSummaryEntry` de `@app/db` (core no puede
 *  importar de db: la dirección de dependencias es db → core). */
export interface ChainSummaryStep {
  kind: string;
  transformId: string | null;
}

export interface HistoryRecordDraft {
  preview: string;
  inputKind: string;
  chain: ChainSummaryStep[];
}

/** Profundidad máxima al redactar un JSON anidado: más allá, todo es `…`. Acota el coste
 *  y el tamaño de salida sin afectar a la seguridad (recortar de más nunca filtra). */
const JSON_MAX_DEPTH = 3;
/** Elementos de array que se describen antes de resumir el resto con `…`. */
const JSON_MAX_ARRAY_ITEMS = 5;

/**
 * Redacta un valor JSON ya parseado: se conservan la ESTRUCTURA y las CLAVES; todo valor
 * escalar (string, número, booleano, null) se sustituye por `…` sin excepción — un número
 * es tan secreto como un string (`{"exp":1752624000}`).
 */
function redactJsonValue(value: unknown, depth = 0): string {
  if (depth >= JSON_MAX_DEPTH) return ELLIPSIS;

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const shown = value
      .slice(0, JSON_MAX_ARRAY_ITEMS)
      .map((item) => redactJsonValue(item, depth + 1));
    if (value.length > JSON_MAX_ARRAY_ITEMS) shown.push(ELLIPSIS);
    return `[${shown.join(',')}]`;
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const body = entries
      .map(([key, child]) => `${JSON.stringify(key)}:${redactJsonValue(child, depth + 1)}`)
      .join(',');
    return `{${body}}`;
  }

  // Escalar (incluido el JSON de nivel superior `"secreto"` o `42`): nunca sobrevive.
  return ELLIPSIS;
}

/** Input que TIENE PINTA de JSON aunque el detector no lo haya clasificado como tal (un
 *  JSON malformado o un escalar entrecomillado caen en `text`, ver la nota del encabezado).
 *  Se mira solo el primer carácter del input crudo: barato, puro y sin falsos negativos
 *  para el caso que importa (un fragmento de config mal recortado). */
function looksLikeJson(trimmed: string): boolean {
  return /^[{["]/.test(trimmed);
}

/** `json` → estructura y claves; todos los valores a `…`. JSON inválido → `…` (fallar
 *  hacia el lado seguro: aquí llegan también los `text` con pinta de JSON). */
function redactJson(trimmed: string): string {
  try {
    return redactJsonValue(JSON.parse(trimmed));
  } catch {
    return ELLIPSIS;
  }
}

/** `base64` → NADA del contenido; solo su longitud, que distingue entradas entre sí sin
 *  revelar un solo byte descodificable. */
function redactBase64(trimmed: string): string {
  return `${ELLIPSIS} (${String(trimmed.length)} caracteres)`;
}

/** `url` → `scheme://host` y, si había path/query/fragment, `/…` para decir que existía
 *  algo más sin decir qué (ahí es donde viajan los tokens). URL inválida → `…`. */
function redactUrl(trimmed: string): string {
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return ELLIPSIS;
  }
  const hasRest = parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '';
  return `${parsed.protocol}//${parsed.host}${hasRest ? `/${ELLIPSIS}` : ''}`;
}

/**
 * Redacta el input según su kind detectado, siguiendo la tabla del encabezado del módulo.
 * Función PURA: mismo input → mismo output, sin IO, unit-testable de un vistazo.
 */
export function redactInput(input: string, kind: string): string {
  const trimmed = input.trim();
  // El `looksLikeJson` va aquí a propósito: cubre el HUECO entre lo que el detector llama
  // `json` y lo que el usuario pegó creyendo que lo era. Ningún otro kind puede empezar por
  // `{`, `[` o `"` (base64/jwt/uuid/hash tienen alfabetos cerrados; una url lleva esquema),
  // así que anteponerlo no le roba entradas a nadie.
  if (kind === 'json' || looksLikeJson(trimmed)) return redactJson(trimmed);
  if (kind === 'base64') return redactBase64(trimmed);
  if (kind === 'url') return redactUrl(trimmed);
  if (kind !== 'jwt') return trimmed;

  // Mismo recorte que el motor (`JWT_PREFIX_RE`, fuente única): el prefijo —`Bearer ` o la
  // cabecera entera `Authorization: Bearer `— se CONSERVA en el preview (no es dato del
  // usuario: es el sobre que lo transportaba) y lo que se redacta es el token de dentro.
  // Si aquí no se reconociera el prefijo, `Authorization: Bearer eyJhbG…` se partiría por el
  // primer `.` y el «header» conservado arrastraría el prefijo pegado: sigue sin filtrar
  // payload ni firma, pero el preview quedaría desalineado con lo que el motor entiende.
  const prefix = JWT_PREFIX_RE.exec(trimmed)?.[0] ?? '';
  const token = trimmed.slice(prefix.length);
  const segments = token.split('.');
  // Un `jwt` siempre trae 3 segmentos; si por lo que sea no los trae, se redacta TODO
  // menos el primer segmento igualmente (fallar hacia el lado seguro, nunca hacia el dato).
  if (segments.length < 2) return `${prefix}${ELLIPSIS}`;
  const [header] = segments;
  const redactedRest = segments.slice(1).map(() => ELLIPSIS);
  return `${prefix}${[header, ...redactedRest].join('.')}`;
}

/** Trunca a `PREVIEW_MAX_CHARS` contando el propio marcador de truncado. */
export function truncatePreview(value: string, max: number = PREVIEW_MAX_CHARS): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}${ELLIPSIS}`;
}

/** `preview` final: se redacta PRIMERO y se trunca DESPUÉS — al revés, un truncado
 *  «afortunado» podría dejar pasar medio payload de un JWT largo. */
export function buildPreview(input: string, kind: string): string {
  return truncatePreview(redactInput(input, kind));
}

/** Kind del paso 0 (§9 `input_kind`): la detección elegida (la de mayor confianza).
 *  Sin detecciones, `text` — el motor siempre detecta al menos `text`, pero el default
 *  evita que un hueco del motor escriba `null` en una columna NOT NULL. */
export function inputKindOf(chain: Chain): string {
  return chain.steps[0]?.detections[0]?.kind ?? 'text';
}

/** Resumen de la cadena (D7): por cada paso, tipo detectado y transformación aplicada.
 *  JAMÁS `step.input` ni `step.output`. */
export function summarizeChain(chain: Chain): ChainSummaryStep[] {
  return chain.steps.map((step) => ({
    kind: step.detections[0]?.kind ?? 'text',
    transformId: step.applied,
  }));
}

/**
 * Construye la fila de historial a persistir a partir del input crudo y la cadena. Es
 * la ÚNICA función que el route handler debe usar para llegar a la BD: recibe el dato
 * crudo y devuelve algo que ya no lo contiene.
 */
export function buildHistoryRecord(input: string, chain: Chain): HistoryRecordDraft {
  const inputKind = inputKindOf(chain);
  return {
    preview: buildPreview(input, inputKind),
    inputKind,
    chain: summarizeChain(chain),
  };
}
