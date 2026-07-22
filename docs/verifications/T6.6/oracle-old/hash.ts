// Primitivas criptográficas de la dirección inversa (§6.6, T6.5): SHA-256, MD5 y
// HMAC-SHA256, implementadas en **TypeScript puro** sobre `Uint8Array`.
//
// ── Por qué a mano y no con la plataforma ───────────────────────────────────────────
// Ni `node:crypto` (no existe en el navegador: el motor de composición corre entero en el
// cliente, D10/§5.3) ni Web Crypto (`crypto.subtle.digest` devuelve una **Promise**, y el
// contrato del §6.1/§6.6 es `apply(input): TransformResult`, **síncrono**). Un motor
// asíncrono obligaría a que cada paso de `compose()` fuera `await`-able y a que la UI
// gestionara estados intermedios por paso: no es un detalle de implementación, es un cambio
// de contrato. Así que las dos funciones hash se escriben aquí, y su corrección se demuestra
// contra los **vectores publicados** (FIPS 180-4, RFC 1321, RFC 4231) en `hash.test.ts`, no
// contra sí mismas. Lo protege además el grep de `client-only.test.ts`, que vigila este
// fichero.
//
// ── Las tres trampas de escribir un hash a mano (todas cubiertas por tests) ──────────
// 1. **Aritmética de 32 bits.** JS opera en doble precisión: `a + b` puede pasarse de 2^32 y
//    seguir dando resultados CORRECTOS para entradas cortas mientras produce basura para las
//    largas. Toda suma se cierra con `>>> 0` (o `| 0`) y todo desplazamiento se hace con
//    `>>>` cuando el valor es lógicamente sin signo.
// 2. **El padding y el bloque final.** El caso peligroso es la longitud que cae justo en el
//    borde (55/56/63/64 bytes), donde la longitud ya no cabe en el bloque y hay que emitir
//    uno extra. `padMessage` es COMPARTIDA por los dos algoritmos precisamente para que ese
//    cálculo exista una sola vez y un solo conjunto de tests lo cubra.
// 3. **El endianness.** SHA-256 es **big-endian** (palabras y longitud) y MD5 es
//    **little-endian** (palabras y longitud). Mezclarlos es el error clásico, y por eso
//    `padMessage` recibe el endianness de la longitud como parámetro explícito en vez de
//    asumir uno.
//
// Este módulo NO exporta transformaciones: es la capa de primitivas que consume
// `encode-transforms.ts` (`hash.sha256`, `hash.md5`, `jwt.sign`).

// Acceso indexado con default. Con `noUncheckedIndexedAccess` cada `a[i]` es
// `number | undefined`; el `!` está prohibido en producción y un `?? 0` suelto en cada uso
// enterraría el algoritmo en ruido. Los índices de aquí abajo son siempre válidos por
// construcción (bucles acotados por `length`), así que el default nunca se alcanza.
const at = (a: ArrayLike<number>, i: number): number => a[i] ?? 0;

const rotr = (x: number, n: number): number => ((x >>> n) | (x << (32 - n))) >>> 0;
const rotl = (x: number, n: number): number => ((x << n) | (x >>> (32 - n))) >>> 0;

// Padding de Merkle–Damgård, común a SHA-256 y MD5 (§5.1 de FIPS 180-4 / §3.1-3.2 de la
// RFC 1321): se añade un `0x80`, luego ceros hasta que la longitud ≡ 56 (mod 64), y por
// último la longitud del mensaje EN BITS en 8 bytes. Lo único que difiere entre los dos
// algoritmos es el orden de esos 8 bytes.
//
// El borde: con 55 bytes de mensaje el `0x80` + la longitud caben justo en un bloque; con 56
// ya no, y hace falta un bloque ENTERO extra. La aritmética `(len + 8) % 64` lo resuelve sin
// ramas, y los tests lo ejercen en 55/56/63/64 (y en 0).
function padMessage(bytes: Uint8Array, lengthLittleEndian: boolean): Uint8Array {
  const bitLen = bytes.length * 8; // exacto en doble precisión hasta 2^53 bits
  const totalLen = bytes.length + 1 + ((55 - (bytes.length % 64) + 64) % 64) + 8;
  const out = new Uint8Array(totalLen);
  out.set(bytes, 0);
  out[bytes.length] = 0x80;
  // La longitud como par (hi, lo) de 32 bits: `bitLen` puede superar 2^32 (mensajes > 512 MB)
  // y `<<`/`>>>` truncan a 32, así que la parte alta se obtiene dividiendo, no desplazando.
  const lo = bitLen >>> 0;
  const hi = Math.floor(bitLen / 0x100000000) >>> 0;
  const tail = totalLen - 8;
  for (let i = 0; i < 4; i += 1) {
    const loByte = (lo >>> (8 * i)) & 0xff;
    const hiByte = (hi >>> (8 * i)) & 0xff;
    if (lengthLittleEndian) {
      out[tail + i] = loByte;
      out[tail + 4 + i] = hiByte;
    } else {
      out[tail + 7 - i] = loByte;
      out[tail + 3 - i] = hiByte;
    }
  }
  return out;
}

// ── SHA-256 (FIPS 180-4 §6.2) ───────────────────────────────────────────────────────

// Los 64 primeros 32 bits de las partes fraccionarias de las raíces cúbicas de los 64
// primeros primos (FIPS 180-4 §4.2.2). Literales de la norma, no calculados.
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

// Los 32 bits de las partes fraccionarias de las raíces cuadradas de los 8 primeros primos
// (FIPS 180-4 §5.3.3).
const SHA256_H0 = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

/** SHA-256 de un bloque de bytes → los 32 bytes del digest. Pura y total: no lanza. */
export function sha256(bytes: Uint8Array): Uint8Array {
  const h = Uint32Array.from(SHA256_H0);
  const padded = padMessage(bytes, false); // longitud BIG-endian
  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    // Palabras BIG-endian: el byte de menor índice es el más significativo.
    for (let i = 0; i < 16; i += 1) {
      const j = off + i * 4;
      w[i] =
        ((at(padded, j) << 24) |
          (at(padded, j + 1) << 16) |
          (at(padded, j + 2) << 8) |
          at(padded, j + 3)) >>>
        0;
    }
    for (let i = 16; i < 64; i += 1) {
      const x = at(w, i - 15);
      const y = at(w, i - 2);
      const s0 = (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
      const s1 = (rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10)) >>> 0;
      w[i] = (at(w, i - 16) + s0 + at(w, i - 7) + s1) >>> 0;
    }
    let a = at(h, 0);
    let b = at(h, 1);
    let c = at(h, 2);
    let d = at(h, 3);
    let e = at(h, 4);
    let f = at(h, 5);
    let g = at(h, 6);
    let hh = at(h, 7);
    for (let i = 0; i < 64; i += 1) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (hh + S1 + ch + at(SHA256_K, i) + at(w, i)) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h[0] = (at(h, 0) + a) >>> 0;
    h[1] = (at(h, 1) + b) >>> 0;
    h[2] = (at(h, 2) + c) >>> 0;
    h[3] = (at(h, 3) + d) >>> 0;
    h[4] = (at(h, 4) + e) >>> 0;
    h[5] = (at(h, 5) + f) >>> 0;
    h[6] = (at(h, 6) + g) >>> 0;
    h[7] = (at(h, 7) + hh) >>> 0;
  }
  return wordsToBytes(h, false);
}

// ── MD5 (RFC 1321) ──────────────────────────────────────────────────────────────────

// `T[i] = floor(abs(sin(i+1)) * 2^32)` (RFC 1321 §3.4). Se escriben como LITERALES en vez de
// calcularse con `Math.sin`: el estándar ECMAScript no exige a `Math.sin` una precisión
// concreta, así que derivarlos en runtime ataría el digest a la libm del motor.
const MD5_T = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
];

// Desplazamientos por ronda (RFC 1321 §3.4).
const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
  20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
  10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const MD5_H0 = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];

/** MD5 de un bloque de bytes → los 16 bytes del digest. Pura y total: no lanza. */
export function md5(bytes: Uint8Array): Uint8Array {
  const h = Uint32Array.from(MD5_H0);
  const padded = padMessage(bytes, true); // longitud LITTLE-endian (al revés que SHA-256)
  const m = new Uint32Array(16);
  for (let off = 0; off < padded.length; off += 64) {
    // Palabras LITTLE-endian: el byte de menor índice es el MENOS significativo.
    for (let i = 0; i < 16; i += 1) {
      const j = off + i * 4;
      m[i] =
        (at(padded, j) |
          (at(padded, j + 1) << 8) |
          (at(padded, j + 2) << 16) |
          (at(padded, j + 3) << 24)) >>>
        0;
    }
    let a = at(h, 0);
    let b = at(h, 1);
    let c = at(h, 2);
    let d = at(h, 3);
    for (let i = 0; i < 64; i += 1) {
      // Las cuatro rondas de la RFC 1321 §3.4: función no lineal + índice de palabra.
      const round = Math.floor(i / 16);
      const f =
        round === 0
          ? (b & c) | (~b & d)
          : round === 1
            ? (d & b) | (~d & c)
            : round === 2
              ? b ^ c ^ d
              : c ^ (b | ~d);
      const g =
        round === 0
          ? i
          : round === 1
            ? (5 * i + 1) % 16
            : round === 2
              ? (3 * i + 5) % 16
              : (7 * i) % 16;
      const tmp = (f + a + at(MD5_T, i) + at(m, g)) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotl(tmp, at(MD5_S, i))) >>> 0;
    }
    h[0] = (at(h, 0) + a) >>> 0;
    h[1] = (at(h, 1) + b) >>> 0;
    h[2] = (at(h, 2) + c) >>> 0;
    h[3] = (at(h, 3) + d) >>> 0;
  }
  return wordsToBytes(h, true);
}

// ── HMAC-SHA256 (RFC 2104) ──────────────────────────────────────────────────────────

const SHA256_BLOCK_BYTES = 64; // el tamaño de BLOQUE de SHA-256, no el de su digest (32)

/**
 * HMAC-SHA256 de `message` con `key` → los 32 bytes de la MAC (RFC 2104 §2).
 *
 * El caso que hunde a las implementaciones ingenuas está aquí: **una clave más larga que el
 * bloque (64 bytes) se sustituye por su propio SHA-256** antes de derivar los pads. Sin ese
 * paso, todos los vectores de la RFC 4231 pasan menos los casos 6 y 7 (clave de 131 bytes),
 * que son justo los que existen para cazarlo. Una clave más corta se rellena con ceros a la
 * derecha; nunca se trunca.
 */
export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  const normalized = key.length > SHA256_BLOCK_BYTES ? sha256(key) : key;
  const block = new Uint8Array(SHA256_BLOCK_BYTES); // ya viene a cero: eso ES el padding
  block.set(normalized, 0);
  const inner = new Uint8Array(SHA256_BLOCK_BYTES + message.length);
  const outerKey = new Uint8Array(SHA256_BLOCK_BYTES);
  for (let i = 0; i < SHA256_BLOCK_BYTES; i += 1) {
    inner[i] = at(block, i) ^ 0x36; // ipad
    outerKey[i] = at(block, i) ^ 0x5c; // opad
  }
  inner.set(message, SHA256_BLOCK_BYTES);
  const innerDigest = sha256(inner);
  const outer = new Uint8Array(SHA256_BLOCK_BYTES + innerDigest.length);
  outer.set(outerKey, 0);
  outer.set(innerDigest, SHA256_BLOCK_BYTES);
  return sha256(outer);
}

// ── utilidades de representación ────────────────────────────────────────────────────

// Palabras de 32 bits → bytes, en el endianness del algoritmo que las produjo.
function wordsToBytes(words: Uint32Array, littleEndian: boolean): Uint8Array {
  const out = new Uint8Array(words.length * 4);
  for (let i = 0; i < words.length; i += 1) {
    const word = at(words, i);
    for (let b = 0; b < 4; b += 1) {
      out[i * 4 + b] = (word >>> (8 * (littleEndian ? b : 3 - b))) & 0xff;
    }
  }
  return out;
}

/** Bytes → hex en minúsculas, la forma en que §6.6 pide la salida de `hash.*`. */
export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += at(bytes, i).toString(16).padStart(2, '0');
  }
  return out;
}
