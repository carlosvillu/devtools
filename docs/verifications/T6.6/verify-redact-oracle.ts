// La REDACCIÓN DE PRIVACIDAD de F4 (§11) comparte `decodeJwtHeader`/`decodeSegmentJson` con los
// detectores que T6.6 ha operado. Aquí se comprueba por COMPORTAMIENTO que su veredicto no ha
// cambiado: el mismo `redact.ts` se instancia dos veces, una contra los detectores NUEVOS
// (sin Buffer) y otra contra los de HEAD (con Buffer), y se diffean sus salidas.
// Corre con: node_modules/.bin/tsx docs/verifications/T6.6/verify-redact-oracle.ts
import * as nuevo from '../../../packages/core/src/history/redact';
import * as viejo from './oracle-old/redact';

const b64u = (s: string): string => Buffer.from(s, 'utf8').toString('base64url');
const hdr = b64u('{"alg":"HS256","typ":"JWT"}');
const pl = b64u('{"sub":"1","name":"carlos","iat":1752537600}');
const sig = 'sigsigsigsigsigsigsigsigsigsigsigsigsigsigsi';

const inputs: [string, string][] = [
  ['jwt', `${hdr}.${pl}.${sig}`],
  ['jwt', `Bearer ${hdr}.${pl}.${sig}`],
  ['jwt', `${b64u('﻿{"alg":"HS256","typ":"JWT"}')}.${pl}.${sig}`], // header con BOM
  ['jwt', `${b64u('{"alg":"none"}')}.${pl}.${sig}`],
  ['jwt', `${b64u('no json')}.${pl}.${sig}`],
  ['jwt', `${Buffer.from('ff', 'hex').toString('base64url')}.${pl}.${sig}`], // UTF-8 inválido
  ['jwt', `a.a.a`],
  ['jwt', `${hdr}.${pl}`],
  ['jwt', 'a.'.repeat(200) + 'a'],
  ['base64', Buffer.from('{"a":1}', 'utf8').toString('base64')],
  ['base64', 'QQ=='],
  ['base64', '===='],
  ['json', '{"password":"hunter2","user":"carlos"}'],
  ['text', 'texto libre del usuario'],
  ['url', 'https://ejemplo.com/x?token=abc'],
  ['uuid', '550e8400-e29b-41d4-a716-446655440000'],
  ['unix_timestamp', '1752537600'],
  ['hash', 'd41d8cd98f00b204e9800998ecf8427e'],
];

let diffs = 0;
for (const [kind, input] of inputs) {
  for (const [fn, name] of [
    [(m: typeof nuevo, i: string, k: string) => m.redactInput(i, k), 'redactInput'],
    [(m: typeof nuevo, i: string, k: string) => m.buildPreview(i, k), 'buildPreview'],
  ] as const) {
    const a = fn(nuevo, input, kind);
    const b = fn(viejo as unknown as typeof nuevo, input, kind);
    if (a !== b) {
      diffs += 1;
      console.log(`DIVERGENCIA · ${name} · kind=${kind} · input=${JSON.stringify(input.slice(0, 60))}\n  nuevo=${JSON.stringify(a)}\n  viejo=${JSON.stringify(b)}`);
    } else {
      console.log(`OK · ${name} kind=${kind} → ${JSON.stringify(a)}`);
    }
  }
}
console.log(`\nentradas: ${String(inputs.length)} · comparaciones: ${String(inputs.length * 2)} · divergencias: ${String(diffs)}`);
process.exit(diffs === 0 ? 0 : 1);
