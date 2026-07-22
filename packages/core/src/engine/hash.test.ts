// Corpus de las primitivas criptográficas puras de T6.5 (§6.6): SHA-256, MD5 y HMAC-SHA256.
//
// ── La regla que gobierna este fichero ──────────────────────────────────────────────
// **Un hash NO se verifica contra sí mismo.** Comprobar que `sha256(x)` es estable, o que
// coincide con lo que devolvió la primera vez, no prueba absolutamente nada: una
// implementación rota es igual de determinista que una correcta. Todos los digests esperados
// de aquí abajo están TRANSCRITOS de los documentos normativos:
//
//   - SHA-256 → FIPS 180-4 (los dos ejemplos del apéndice B.1/B.2, «abc» y el de 448 bits) y
//     los vectores canónicos del NIST para la cadena vacía y el millón de `a`.
//   - MD5     → RFC 1321, apéndice A.5 («MD5 test suite»): sus SIETE casos, completos.
//   - HMAC    → RFC 4231 §4: los casos 1–7 completos, incluidos el de salida TRUNCADA (5) y
//     los de CLAVE MÁS LARGA QUE EL BLOQUE (6 y 7) — los únicos que distinguen una
//     implementación correcta de una que se salta el «hash the key first» de la RFC 2104.
//
// ── Dónde SÍ se usa `node:crypto` (y por qué es legítimo) ───────────────────────────
// Los vectores publicados no cubren las longitudes de mensaje que caen en el BORDE del
// padding (55/56/63/64 bytes), que es donde una implementación a mano falla en silencio. Para
// esas se usa `node:crypto` como **oráculo independiente**: es otra implementación, escrita
// por otra gente, así que un fallo compartido es inverosímil. El TEST puede importarlo; el
// MOTOR no (§5.3, vigilado por `client-only.test.ts`). Es un complemento de los vectores, no
// un sustituto: si mañana se borraran las tablas de arriba, este fichero dejaría de demostrar
// que implementamos SHA-256 y pasaría a demostrar solo que coincidimos con alguien.
import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hmacSha256, md5, sha256, toHex } from './hash';

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

// Los vectores de la RFC 4231 vienen dados en hex; se convierten aquí, en el TEST. No se
// exporta desde `hash.ts` un `hexToBytes` que producción no necesitaría (knip lo marcaría, y
// con razón: código muerto en el motor).
function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

const repeatByte = (byte: number, count: number): Uint8Array => new Uint8Array(count).fill(byte);

// ── SHA-256: FIPS 180-4 ─────────────────────────────────────────────────────────────

describe('sha256 — vectores publicados (FIPS 180-4)', () => {
  const vectors: [name: string, input: string, expected: string][] = [
    ['cadena vacía', '', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    [
      '"abc" (FIPS 180-4 B.1)',
      'abc',
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    ],
    [
      'el de 448 bits (FIPS 180-4 B.2)',
      'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    ],
    [
      'el de 896 bits (dos bloques)',
      'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
      'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1',
    ],
  ];

  it.each(vectors)('%s', (_name, input, expected) => {
    expect(toHex(sha256(utf8(input)))).toBe(expected);
  });

  // El vector largo del NIST: 1.000.000 de `a`. Es el que caza los desbordamientos de la
  // aritmética de 32 bits y el cálculo de la longitud en bits de mensajes grandes — los dos
  // errores que dan resultados CORRECTOS para entradas cortas.
  it('el millón de "a" (vector largo del NIST)', () => {
    expect(toHex(sha256(utf8('a'.repeat(1_000_000))))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    );
  });
});

// ── MD5: RFC 1321 §A.5, la suite ENTERA ─────────────────────────────────────────────

describe('md5 — la MD5 test suite completa (RFC 1321 §A.5)', () => {
  const suite: [input: string, expected: string][] = [
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['a', '0cc175b9c0f1b6a831c399e269772661'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
    ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
    [
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      'd174ab98d277d9f5a5611c2c9f419d9f',
    ],
    [
      '12345678901234567890123456789012345678901234567890123456789012345678901234567890',
      '57edf4a22be3c955ac49da2e2107b67a',
    ],
  ];

  it.each(suite)('MD5(%j)', (input, expected) => {
    expect(toHex(md5(utf8(input)))).toBe(expected);
  });

  it('los 7 casos de la suite están todos', () => {
    expect(suite).toHaveLength(7);
  });
});

// ── El borde del padding: oráculo independiente (node:crypto) ───────────────────────

describe('el borde del padding y del bloque final (55/56/63/64…)', () => {
  // 55 = cabe justo con el 0x80 y los 8 de longitud; 56 = ya NO cabe y exige un bloque
  // entero extra; 63/64/65 = los bordes del bloque; 119/120 = lo mismo un bloque más allá.
  const lengths = [0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 1000];

  it.each(lengths)('sha256 de %i bytes coincide con node:crypto (oráculo independiente)', (n) => {
    const input = utf8('a'.repeat(n));
    expect(toHex(sha256(input))).toBe(createHash('sha256').update(input).digest('hex'));
  });

  it.each(lengths)('md5 de %i bytes coincide con node:crypto (oráculo independiente)', (n) => {
    const input = utf8('a'.repeat(n));
    expect(toHex(md5(input))).toBe(createHash('md5').update(input).digest('hex'));
  });

  // Bytes ARBITRARIOS, no solo 'a': una implementación que confundiera el endianness de las
  // palabras podría sobrevivir a un mensaje de bytes todos iguales.
  it('bytes arbitrarios (0..255 repetidos) coinciden con node:crypto', () => {
    const input = new Uint8Array(300);
    for (let i = 0; i < input.length; i += 1) input[i] = (i * 37 + 11) % 256;
    expect(toHex(sha256(input))).toBe(createHash('sha256').update(input).digest('hex'));
    expect(toHex(md5(input))).toBe(createHash('md5').update(input).digest('hex'));
  });

  // Control de que el oráculo MUERDE: si `node:crypto` y nuestra implementación devolvieran
  // lo mismo por accidente (p. ej. ambas la cadena vacía), los asserts de arriba pasarían en
  // vacío. Se comprueba que un byte distinto da un digest distinto en las dos.
  it('el oráculo distingue: un byte cambiado cambia el digest en ambas implementaciones', () => {
    const a = utf8('a'.repeat(56));
    const b = utf8(`${'a'.repeat(55)}b`);
    expect(toHex(sha256(a))).not.toBe(toHex(sha256(b)));
    expect(createHash('sha256').update(a).digest('hex')).not.toBe(
      createHash('sha256').update(b).digest('hex'),
    );
  });
});

// ── HMAC-SHA256: RFC 4231 §4, casos 1–7 ─────────────────────────────────────────────

describe('hmacSha256 — vectores de la RFC 4231 (casos 1–7)', () => {
  // El caso 5 va aparte (su salida publicada está truncada a 128 bits): ver el `it` de abajo.
  const cases: [name: string, key: Uint8Array, data: Uint8Array, expected: string][] = [
    [
      'caso 1: clave de 20 bytes (0x0b), "Hi There"',
      repeatByte(0x0b, 20),
      utf8('Hi There'),
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    ],
    [
      'caso 2: clave más CORTA que el bloque ("Jefe")',
      utf8('Jefe'),
      utf8('what do ya want for nothing?'),
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    ],
    [
      'caso 3: clave de 20 bytes (0xaa), datos de 50 bytes (0xdd)',
      repeatByte(0xaa, 20),
      repeatByte(0xdd, 50),
      '773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe',
    ],
    [
      'caso 4: clave de 25 bytes (0x01..0x19), datos de 50 bytes (0xcd)',
      hexToBytes('0102030405060708090a0b0c0d0e0f10111213141516171819'),
      repeatByte(0xcd, 50),
      '82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b',
    ],
    [
      'caso 6: CLAVE DE 131 BYTES (más larga que el bloque: hay que hashearla primero)',
      repeatByte(0xaa, 131),
      utf8('Test Using Larger Than Block-Size Key - Hash Key First'),
      '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54',
    ],
    [
      'caso 7: clave de 131 bytes y datos más largos que el bloque',
      repeatByte(0xaa, 131),
      utf8(
        'This is a test using a larger than block-size key and a larger than block-size data. The key needs to be hashed before being used by the HMAC algorithm.',
      ),
      '9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2',
    ],
  ];

  it.each(cases)('%s', (_name, key, data, expected) => {
    expect(toHex(hmacSha256(key, data))).toBe(expected);
  });

  // El caso 5 va aparte porque la RFC publica la salida TRUNCADA a 128 bits: se compara la
  // primera mitad del hex, no el digest entero (que la RFC no da).
  it('caso 5: salida truncada a 128 bits ("Test With Truncation")', () => {
    const mac = toHex(hmacSha256(repeatByte(0x0c, 20), utf8('Test With Truncation')));
    expect(mac.slice(0, 32)).toBe('a3b6167473100ee06e0c796c2955552b');
    expect(mac).toHaveLength(64); // el digest completo sigue siendo de 32 bytes
  });

  // La clave larga es EL caso que separa una implementación correcta de una ingenua: la RFC
  // 2104 manda sustituir la clave por su hash cuando supera el bloque. Se fija además la
  // consecuencia observable de esa regla, que ningún vector suelto muestra: la clave de 131
  // bytes y su SHA-256 (32 bytes) producen EXACTAMENTE la misma MAC.
  it('una clave > 64 bytes es equivalente a su propio SHA-256 (RFC 2104)', () => {
    const longKey = repeatByte(0xaa, 131);
    const data = utf8('mensaje cualquiera');
    expect(toHex(hmacSha256(longKey, data))).toBe(toHex(hmacSha256(sha256(longKey), data)));
  });

  // Y el control cruzado con el oráculo independiente sobre longitudes de clave alrededor del
  // borde del bloque (63/64/65), que la RFC no cubre.
  it.each([0, 1, 63, 64, 65, 200])('clave de %i bytes: coincide con node:crypto', (keyLength) => {
    const key = repeatByte(0x5a, keyLength);
    const data = utf8('los bordes del bloque de HMAC son 64 bytes');
    expect(toHex(hmacSha256(key, data))).toBe(
      createHmac('sha256', Buffer.from(key)).update(Buffer.from(data)).digest('hex'),
    );
  });
});

// ── forma de la salida ──────────────────────────────────────────────────────────────

describe('toHex — la representación que consume §6.6', () => {
  it('hex en minúsculas, con los ceros a la izquierda de cada byte', () => {
    expect(toHex(new Uint8Array([0x00, 0x0f, 0xff, 0xa0]))).toBe('000fffa0');
  });

  it('las longitudes son las del algoritmo: 64 hex para SHA-256, 32 para MD5', () => {
    expect(toHex(sha256(utf8('x')))).toHaveLength(64);
    expect(toHex(md5(utf8('x')))).toHaveLength(32);
  });
});
