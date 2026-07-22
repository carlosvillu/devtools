// Test DIFERENCIAL del decodificador base64 puro contra `Buffer` (T6.6).
//
// Por qué diferencial y no de ejemplos: `decodeBase64Bytes`/`bytesToUtf8` sustituyen a
// `Buffer.from(s, 'base64').toString('utf8')` dentro de código de F1 ya verificado
// (`detectors.ts`, `transforms.ts`). El criterio de aceptación no es «decodifica bien», es
// **«devuelve exactamente lo mismo que `Buffer`»** para todo lo que los callers pueden pasarle.
// Este fichero es un TEST: puede usar `Buffer` (el veto de D10 es sobre el código de PRODUCCIÓN
// del cono de composición, ver `client-only.test.ts`) — y precisamente por eso puede usarlo como
// oráculo.
import { describe, expect, it } from 'vitest';
import { ALPHABET_STD, ALPHABET_URL, bytesToUtf8, decodeBase64Bytes } from './base64';
import { buildEncodeIndex } from './encode-transforms';

// Copia LITERAL de los alfabetos, deliberadamente NO importada de `base64.ts`. Este fichero es
// el oráculo independiente: si importara las tablas que verifica, un error en ellas sería
// invisible aquí. Que la copia y el original coincidan se comprueba abajo, explícitamente.
const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// El oráculo: lo que hacía el código anterior, literalmente.
function bufferDecode(s: string, std: boolean): { bytes: number[]; text: string } {
  const buf = Buffer.from(s, std ? 'base64' : 'base64url');
  return { bytes: [...new Uint8Array(buf)], text: buf.toString('utf8') };
}

function pureDecode(s: string): { bytes: number[]; text: string } | null {
  const bytes = decodeBase64Bytes(s);
  if (bytes === null) return null;
  return { bytes: [...bytes], text: bytesToUtf8(bytes) };
}

// PRNG determinista (I5/I11: los tests no pueden depender de `Math.random`).
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// Corpus fijo: los casos que los callers reales producen, más los bordes que rompen a las
// implementaciones ingenuas.
const FIXED: [name: string, value: string, std: boolean][] = [
  ['vacío', '', true],
  ['1 carácter (grupo incompleto: 0 bytes en Buffer)', 'Q', true],
  ['2 caracteres → 1 byte', 'YQ', false],
  ['3 caracteres → 2 bytes', 'YWI', false],
  ['grupo completo', 'aG9sYQ==', true],
  ['sin padding, alfabeto url', 'aG9sYQ', false],
  ['5 caracteres (mod 4 === 1)', 'aG9sY', false],
  ['header de JWT', 'eyJhbGciOiJIUzI1NiJ9', false],
  ['con + y /', 'Pz8/Pz8+', true],
  ['con - y _', 'Pz8_Pz8-', false],
  ['UTF-8 multibyte (emoji)', '8J+Zgg==', true],
  ['UTF-8 inválido → U+FFFD', '/w==', true],
  ['BOM inicial (U+FEFF): Buffer NO lo come', '77u/eyJhIjoxfQ==', true],
  ['solo padding', '====', true],
  ['ceros', 'AAAA', true],
  ['todo el alfabeto estándar', STD, true],
  ['todo el alfabeto url', URL_ALPHABET, false],
];

describe('los alfabetos RFC 4648 se declaran UNA vez y son los correctos', () => {
  // `base64.ts` es el dueño único desde T6.6: `encode-transforms.ts` los importa en vez de
  // repetirlos. Este test compara el original contra la copia independiente de arriba —que es
  // la que da valor al oráculo— y contra la RFC (64 caracteres, sin repetidos, y los dos
  // alfabetos idénticos salvo en los índices 62 y 63).
  it('coinciden con la copia independiente del oráculo', () => {
    expect(ALPHABET_STD).toBe(STD);
    expect(ALPHABET_URL).toBe(URL_ALPHABET);
  });

  it('cumplen la RFC 4648: 64 caracteres únicos y solo difieren en los dos últimos', () => {
    for (const alphabet of [ALPHABET_STD, ALPHABET_URL]) {
      expect(alphabet).toHaveLength(64);
      expect(new Set(alphabet).size).toBe(64);
    }
    expect(ALPHABET_STD.slice(0, 62)).toBe(ALPHABET_URL.slice(0, 62));
    expect(ALPHABET_STD.slice(62)).toBe('+/');
    expect(ALPHABET_URL.slice(62)).toBe('-_');
  });

  // La razón por la que la deduplicación importa: codificar y decodificar deben leer la MISMA
  // tabla. Se comprueba por comportamiento, que es lo único que lo demuestra.
  it.each(['base64.encode', 'base64url.encode'])(
    'lo que codifica %s con esas tablas lo decodifica esta tabla',
    (id) => {
      const value = 'hola, año 🙂';
      const encoded = buildEncodeIndex({ now: new Date('2025-07-15T00:00:00Z') })
        .get(id)
        ?.apply(value);
      const bytes = decodeBase64Bytes(encoded?.ok === true ? encoded.output : '');
      expect(bytesToUtf8(bytes ?? new Uint8Array())).toBe(value);
    },
  );
});

describe('decodeBase64Bytes: mismo resultado que Buffer, sin Buffer (T6.6)', () => {
  it.each(FIXED)('%s', (_name, value, std) => {
    expect(pureDecode(value)).toEqual(bufferDecode(value, std));
  });

  // El BOM es el detalle que separa el reemplazo correcto del casi-correcto: sin
  // `ignoreBOM: true` el `TextDecoder` se lo come y el texto sale SIN el U+FEFF, lo que haría
  // que un JSON con BOM pasara de «no parsea» a «parsea» y cambiaría la DETECCIÓN (§6.2).
  it('el BOM se conserva, como en Buffer (si no, cambiaría la detección)', () => {
    const decoded = pureDecode('77u/eyJhIjoxfQ==');
    expect(decoded?.text).toBe('﻿{"a":1}');
    expect(() => {
      JSON.parse(decoded?.text ?? '');
    }).toThrow();
  });

  // Fuzz determinista sobre cadenas del alfabeto que los callers realmente dejan pasar
  // (sus regex admiten exactamente esto), con y sin padding, de longitud 0..40.
  it('fuzz determinista de 2000 cadenas: idéntico a Buffer byte a byte', () => {
    const rng = makeRng(20260722);
    const divergentes: string[] = [];
    for (let i = 0; i < 2000; i += 1) {
      const std = rng() < 0.5;
      const alphabet = std ? STD : URL_ALPHABET;
      const length = Math.floor(rng() * 41);
      let s = '';
      for (let j = 0; j < length; j += 1) s += alphabet.charAt(Math.floor(rng() * 64));
      if (std && s.length % 4 !== 0) s += '='.repeat((4 - (s.length % 4)) % 4);
      const mine = pureDecode(s);
      const theirs = bufferDecode(s, std);
      if (JSON.stringify(mine) !== JSON.stringify(theirs)) divergentes.push(s);
    }
    expect(divergentes).toEqual([]);
  });

  // Fuzz sobre BYTES arbitrarios: se codifican con Buffer y se comprueba que el decodificador
  // puro los recupera. Cubre lo que el fuzz de cadenas no puede garantizar (secuencias UTF-8
  // válidas, bytes altos, ceros embebidos).
  it('fuzz de 500 payloads binarios: round-trip exacto contra lo que codifica Buffer', () => {
    const rng = makeRng(777);
    for (let i = 0; i < 500; i += 1) {
      const length = 1 + Math.floor(rng() * 64);
      const bytes = new Uint8Array(length);
      for (let j = 0; j < length; j += 1) bytes[j] = Math.floor(rng() * 256);
      const encoded = Buffer.from(bytes).toString('base64');
      expect([...(decodeBase64Bytes(encoded) ?? [])]).toEqual([...bytes]);
    }
  });

  // Totalidad (I1/I9): nada lanza y lo que no es del alfabeto devuelve `null` — nunca bytes
  // inventados. `Buffer` aquí es MÁS permisivo (ignora la basura en silencio); devolver `null`
  // es una decisión consciente y NO cambia el comportamiento observable, porque los tres
  // callers validan el alfabeto con su regex antes de llamar.
  it.each([
    ['espacio', 'aG9s YQ'],
    ['punto', 'aG9s.YQ'],
    ['ñ', 'añññ'],
    ['padding en medio', 'aG=9sYQ'],
  ])('devuelve null ante un carácter fuera del alfabeto: %s', (_name, value) => {
    expect(decodeBase64Bytes(value)).toBeNull();
  });
});
