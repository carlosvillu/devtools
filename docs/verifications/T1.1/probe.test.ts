// VERIFIER probe (efímero) — llama a la función real @app/core/engine y comprueba
// la Verificación LITERAL de T1.1. No es del implementer. Se ejecuta y se documenta.
import { describe, it, expect } from 'vitest';
import {
  detect,
  DetectionSchema,
  DataKindSchema,
  DetectionSchema as DS,
} from '@app/core/engine';

const kinds = (input: string) => detect(input).map((d) => d.kind);
const confs = (input: string) => detect(input).map((d) => d.confidence);

function assertOrderedDesc(input: string) {
  const c = confs(input);
  for (let i = 1; i < c.length; i++) expect(c[i - 1]).toBeGreaterThanOrEqual(c[i]);
}
function assertTextLast(input: string) {
  const k = kinds(input);
  expect(k.filter((x) => x === 'text').length).toBe(1); // exactamente una vez
  expect(k[k.length - 1]).toBe('text'); // en último lugar
  const t = detect(input).find((d) => d.kind === 'text')!;
  expect(t.confidence).toBe(0.01);
}

describe('R4 + I8 controles duros', () => {
  it('R4: holaquetalestamos NO es base64, cae a text', () => {
    const k = kinds('holaquetalestamos');
    console.log('holaquetalestamos =>', JSON.stringify(detect('holaquetalestamos')));
    expect(k).not.toContain('base64');
    expect(k).toContain('text');
  });
  it('R4: base64 estructuralmente válido con decodificado BINARIO NO es base64', () => {
    // "3q2+7wAAAAAAAAAA" = deadbeef + ceros => binario, no imprimible
    const k = kinds('3q2+7wAAAAAAAAAA');
    console.log('3q2+7wAAAAAAAAAA =>', JSON.stringify(detect('3q2+7wAAAAAAAAAA')));
    expect(k).not.toContain('base64');
    // otro: longitud coherente (múltiplo de 4) pero binario
    const k2 = kinds('AAAAAAAA');
    console.log('AAAAAAAA =>', JSON.stringify(detect('AAAAAAAA')));
    expect(k2).not.toContain('base64');
  });
  it('R4: base64 con decodificado TEXTO sí es base64 (positivo, contraste)', () => {
    // "aG9sYQ==" => "hola"
    const k = kinds('aG9sYQ==');
    console.log('aG9sYQ== =>', JSON.stringify(detect('aG9sYQ==')));
    expect(k).toContain('base64');
  });
  it('I8: 1752624000 => exactamente [unix_timestamp, text]', () => {
    const k = kinds('1752624000');
    console.log('1752624000 =>', JSON.stringify(detect('1752624000')));
    expect(k).toEqual(['unix_timestamp', 'text']);
    assertOrderedDesc('1752624000');
    assertTextLast('1752624000');
  });
});

describe('positivos y negativos por detector (funcion real)', () => {
  const REAL_JWT =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  it('jwt positivo', () => {
    console.log('jwt =>', JSON.stringify(detect(REAL_JWT)));
    expect(kinds(REAL_JWT)).toContain('jwt');
  });
  it('jwt con Bearer (CU1)', () => {
    expect(kinds('Bearer ' + REAL_JWT)).toContain('jwt');
  });
  it('jwt 3 segmentos pero header no-JSON => NO jwt', () => {
    const bad = 'aaa.bbb.ccc';
    console.log('aaa.bbb.ccc =>', JSON.stringify(detect(bad)));
    expect(kinds(bad)).not.toContain('jwt');
  });
  it('json objeto y array', () => {
    expect(kinds('{"a":1}')).toContain('json');
    expect(kinds('[1,2]')).toContain('json');
  });
  it('json escalar desnudo NO', () => {
    console.log('123 =>', JSON.stringify(detect('123')));
    console.log('"x" =>', JSON.stringify(detect('"x"')));
    expect(kinds('123')).not.toContain('json');
    expect(kinds('"x"')).not.toContain('json');
  });
  it('url positivo con query, negativos ftp/hola', () => {
    const d = detect('https://x.com/a?b=1').find((x) => x.kind === 'url')!;
    console.log('url =>', JSON.stringify(detect('https://x.com/a?b=1')));
    expect(d).toBeTruthy();
    expect(d.meta?.hasQuery).toBe(true);
    expect(kinds('ftp://x')).not.toContain('url');
    expect(kinds('hola')).not.toContain('url');
  });
  it('uuid canonico si, 32hex sin guiones NO (es hash)', () => {
    const d = detect('550e8400-e29b-41d4-a716-446655440000').find((x) => x.kind === 'uuid')!;
    console.log('uuid =>', JSON.stringify(detect('550e8400-e29b-41d4-a716-446655440000')));
    expect(d).toBeTruthy();
    expect(d.meta?.version).toBe(4);
    const k32 = kinds('550e8400e29b41d4a716446655440000');
    console.log('32hex =>', JSON.stringify(detect('550e8400e29b41d4a716446655440000')));
    expect(k32).not.toContain('uuid');
    expect(k32).toContain('hash');
  });
  it('hash 32/40/64 hex si, 31 hex y con g NO', () => {
    expect(kinds('d41d8cd98f00b204e9800998ecf8427e')).toContain('hash'); // 32 md5
    expect(kinds('da39a3ee5e6b4b0d3255bfef95601890afd80709')).toContain('hash'); // 40 sha1
    expect(kinds('a'.repeat(64))).toContain('hash'); // 64 sha256
    expect(kinds('a'.repeat(31))).not.toContain('hash');
    expect(kinds('g'.repeat(32))).not.toContain('hash');
  });
  it('unix_timestamp 10 y 13 si, 9 y 11 NO', () => {
    expect(kinds('1752624000')).toContain('unix_timestamp');
    expect(kinds('1752624000000')).toContain('unix_timestamp');
    console.log('9digits =>', JSON.stringify(detect('175262400')));
    console.log('11digits =>', JSON.stringify(detect('17526240000')));
    expect(kinds('175262400')).not.toContain('unix_timestamp');
    expect(kinds('17526240000')).not.toContain('unix_timestamp');
  });
  it('text siempre presente, unico, ultimo, orden desc en varias entradas', () => {
    for (const input of [
      'holaquetalestamos',
      '1752624000',
      '{"a":1}',
      REAL_JWT,
      'https://x.com/a?b=1',
      'd41d8cd98f00b204e9800998ecf8427e',
      '',
      '   ',
    ]) {
      assertTextLast(input);
      assertOrderedDesc(input);
    }
  });
});

describe('determinismo I5', () => {
  it('dos llamadas identicas', () => {
    for (const input of ['1752624000', '{"a":1}', 'aG9sYQ==']) {
      expect(JSON.stringify(detect(input))).toBe(JSON.stringify(detect(input)));
    }
  });
});

describe('schema Zod §6.1', () => {
  it('cada Detection de detect() valida contra DetectionSchema', () => {
    for (const input of ['1752624000', '{"a":1}', 'aG9sYQ==', 'holaquetalestamos']) {
      for (const d of detect(input)) {
        expect(DetectionSchema.safeParse(d).success).toBe(true);
      }
    }
  });
  it('DetectionSchema rechaza confidence fuera de [0,1] y kind invalido', () => {
    expect(DS.safeParse({ kind: 'json', confidence: 1.5 }).success).toBe(false);
    expect(DS.safeParse({ kind: 'json', confidence: -0.1 }).success).toBe(false);
    expect(DS.safeParse({ kind: 'nope', confidence: 0.5 }).success).toBe(false);
    expect(DataKindSchema.safeParse('nope').success).toBe(false);
  });
});
