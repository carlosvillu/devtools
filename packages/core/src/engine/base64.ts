// Decodificación base64 **sin `Buffer`** (RFC 4648) + paso de bytes a texto UTF-8.
//
// ── POR QUÉ EXISTE ESTE MÓDULO (deuda de T6.4 saldada en T6.6) ──────────────────────
// Hasta T6.5 la dirección de DECODIFICAR (§6.2/§6.3) usaba `Buffer.from(s,'base64')`, que solo
// existe en Node. Era inocuo mientras ese código corría exclusivamente detrás de
// `POST /api/analyze`. Deja de serlo con `compose()`: por I10 el motor de composición
// **re-ejecuta los detectores de §6.2 sobre la salida de cada paso**, y por D10 eso ocurre en el
// NAVEGADOR → `Buffer` sería un `ReferenceError` en tiempo de ejecución, no un problema latente.
// Además `encode-transforms.ts` importa `applyJsonMinify` de `transforms.ts`, que arrastra ese
// módulo (y su `base64.decode`) al cono de imports de la composición.
// Por eso el decodificador se escribe aquí en TS puro y `detectors.ts` / `transforms.ts` lo usan.
// El guard `client-only.test.ts` cubre desde T6.6 el CONO REAL de imports, no una lista.
//
// ── EQUIVALENCIA CON `Buffer` (lo que NO puede cambiar) ─────────────────────────────
// Esto sustituye código de F1 verificado y con corpus, así que la regla es «mismo resultado,
// byte a byte», no «resultado razonable». Dos detalles heredados a propósito:
//   1. **Tolerancia al grupo incompleto.** `Buffer.from('Q','base64')` no lanza: devuelve 0
//      bytes (6 bits sueltos no forman ninguno). Aquí pasa lo mismo — los bits sobrantes de un
//      grupo final incompleto se DESCARTAN. Quien quiera rechazar esa entrada lo hace antes,
//      con su propia regla de longitud (`detectBase64`/`base64.decode` ya lo hacen).
//   2. **`ignoreBOM: true` en el `TextDecoder`.** Es el detalle que separa el reemplazo correcto
//      del casi-correcto: por defecto `TextDecoder` se COME un BOM inicial (U+FEFF) y
//      `Buffer.toString('utf8')` NO. Sin este flag, un segmento cuyo JSON empieza con BOM
//      pasaría de «no parsea» (hoy) a «parsea», cambiando la DETECCIÓN. Se fija en el test
//      diferencial contra `Buffer`.
// `fatal` se deja en su valor por defecto (`false`): el UTF-8 inválido se sustituye por U+FFFD,
// que es exactamente lo que hace `Buffer.toString('utf8')` y lo que la totalidad (I1) exige.
//
// El lado de CODIFICAR no vive aquí: `encodeBase64` está en `encode-transforms.ts` desde T6.4,
// ya es TS puro y nunca tuvo el problema. No se mueve solo por simetría estética.

// ── los alfabetos de la RFC 4648, declarados UNA vez ───────────────────────────────
// Este módulo es el dueño de las tablas: las consume el decodificador de aquí abajo y
// `encode-transforms.ts` las importa para codificar. Antes vivían por duplicado en los dos
// sitios y `DECODE_TABLE` además fijaba `-`/`_` a 62/63 a mano — tres copias del mismo dato,
// que es como se producen las divergencias silenciosas (basta con que alguien "arregle" un
// alfabeto en un sitio para emitir tokens que ningún verificador acepta).
// OJO: `base64.test.ts` mantiene su PROPIA copia a propósito. Es el oráculo independiente
// frente a `Buffer`, y un oráculo que importa lo que verifica no verifica nada.
export const ALPHABET_STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// base64url (RFC 4648 §5): idéntico salvo los dos últimos caracteres, `-_` en vez de `+/`.
export const ALPHABET_URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Ambos alfabetos en una sola tabla: los callers ya han decidido con su regex si la entrada es
// estándar (`+/`) o URL-safe (`-_`), así que aquí no hace falta distinguirlos — y `Buffer`
// tampoco lo hace (acepta los dos con cualquiera de los dos flags).
// Tabla indexada por CODE UNIT (no un `Record<string, number>` indexado por carácter): `-1`
// marca «fuera del alfabeto». La diferencia no es estilística, es medida — ver la nota de
// rendimiento de `decodeBase64Bytes`: `charAt(i)` asigna una cadena de un carácter por
// iteración, y sobre los 128 KB que admite I7 eso cuesta 2,7× más que indexar un `Int8Array`.
const DECODE_TABLE = new Int8Array(128).fill(-1);
for (const alphabet of [ALPHABET_STD, ALPHABET_URL]) {
  for (let i = 0; i < alphabet.length; i += 1) DECODE_TABLE[alphabet.charCodeAt(i)] = i;
}

// Decodifica base64/base64url a bytes. Devuelve `null` si aparece un carácter fuera del
// alfabeto (el `=` de padding solo se admite al final). NUNCA lanza (I1/I9).
//
// RENDIMIENTO — dos decisiones medidas, no intuidas. Este es un primitivo EXPORTADO: no puede
// tener precondiciones de rendimiento que su firma no anuncie, aunque hoy los tres callers
// (`detectBase64`, `applyBase64Decode`, `decodeSegmentJson`) acoten la entrada antes de llamar.
//   1. El padding se recorta con un BUCLE LINEAL, no con `/=+$/`. Esa regex es O(n²) por
//      backtracking sobre un run de `=`: medido, `'='.repeat(20000)+'A'` tarda 526 ms. Es
//      exactamente el caso que `history/redact.ts` documentó y evitó por escrito con este mismo
//      bucle; repetir aquí su error habría sido tropezar dos veces con la piedra del repo.
//   2. El bucle indexa `DECODE_TABLE` por `charCodeAt`. Con `charAt` + objeto, una entrada de
//      128 KB (el tope de I7) tardaba 4,6 ms; así, 1,7 ms. `Buffer` hacía 0,4 ms: sigue siendo
//      ~4× más lento, y ese es el precio HONESTO de correr en el navegador (D10). Se paga.
export function decodeBase64Bytes(input: string): Uint8Array | null {
  // Recorte lineal del padding final (ver nota 1).
  let end = input.length;
  while (end > 0 && input.charCodeAt(end - 1) === 0x3d /* '=' */) end -= 1;
  // Cota superior exacta: 4 caracteres → 3 bytes, y el grupo final incompleto aporta menos.
  const bytes = new Uint8Array((end * 3) >> 2);
  let acc = 0;
  let bits = 0;
  let out = 0;
  for (let i = 0; i < end; i += 1) {
    const code = input.charCodeAt(i);
    // `code >= 128` (no-ASCII) cae fuera de la tabla: es `-1` por la misma vía que un `.` o un
    // espacio. Sin este guard, indexar fuera del `Int8Array` daría `undefined` y no `-1`.
    const value = code < 128 ? DECODE_TABLE[code] : -1;
    if (value === undefined || value < 0) return null;
    acc = (acc << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[out] = (acc >> bits) & 0xff;
      out += 1;
    }
  }
  // `subarray` (vista, sin copia): los bits sobrantes del grupo incompleto se quedan fuera.
  return bytes.subarray(0, out);
}

// Bytes → texto UTF-8, con la misma semántica que `Buffer.toString('utf8')` (ver cabecera).
//
// El `TextDecoder` es una CONSTANTE DE MÓDULO, no una instancia por llamada. Construirlo cuesta
// ~0,75 µs, que sobre las ~65.000 llamadas del peor caso del barrido de `history/redact.ts` son
// decenas de ms de event loop tirados. Y no compromete la pureza: `decode()` sin `{stream:true}`
// no conserva estado entre llamadas —cada invocación decodifica su búfer de principio a fin—,
// así que dos llamadas iguales siguen dando el mismo resultado (I5/I11).
const UTF8_DECODER = new TextDecoder('utf-8', { ignoreBOM: true });

export function bytesToUtf8(bytes: Uint8Array): string {
  return UTF8_DECODER.decode(bytes);
}
