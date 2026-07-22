// VERIFIER (T6.5) — recálculo INDEPENDIENTE de todos los vectores publicados que los tests
// transcriben. Los pares (input, esperado) están copiados a mano DEL FICHERO DE TEST; el
// valor esperado se RECALCULA aquí con node:crypto a partir del input. Si el implementer
// transcribió mal un vector, este script lo caza (el test sería una tautología si el motor
// tuviera el mismo error, pero node:crypto no lo tiene).
//
// Además se comprueba que cada literal esperado APARECE en el fichero de test correspondiente
// (para que no se pueda "verificar" un vector que el test no usa).
import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

const HASH_TEST = readFileSync(
  new URL('../../../packages/core/src/engine/hash.test.ts', import.meta.url),
  'utf8',
);
const ENC_TEST = readFileSync(
  new URL('../../../packages/core/src/engine/encode-transforms.test.ts', import.meta.url),
  'utf8',
);

let checked = 0;
let failed = 0;
const line = (ok, label, extra = '') => {
  checked += 1;
  if (!ok) failed += 1;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${extra}`);
};

const utf8 = (s) => Buffer.from(s, 'utf8');
const hexOf = (alg, bytes) => createHash(alg).update(bytes).digest('hex');

function checkDigest(alg, label, input, transcribed, file, fileName) {
  const real = hexOf(alg, utf8(input));
  const match = real === transcribed;
  const present = file.includes(transcribed);
  line(
    match && present,
    `${alg.toUpperCase()} ${label}`,
    match
      ? present
        ? ''
        : `  (¡el literal NO aparece en ${fileName}!)`
      : `\n       transcrito: ${transcribed}\n       real:       ${real}`,
  );
}

console.log('══ SHA-256 · FIPS 180-4 / NIST (transcritos en hash.test.ts) ══');
const shaVectors = [
  ['cadena vacía', '', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['"abc" (B.1)', 'abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  [
    '448 bits (B.2)',
    'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  ],
  [
    '896 bits (dos bloques)',
    'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
    'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1',
  ],
  [
    'el millón de "a" (NIST)',
    'a'.repeat(1_000_000),
    'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
  ],
];
for (const [label, input, expected] of shaVectors)
  checkDigest('sha256', label, input, expected, HASH_TEST, 'hash.test.ts');

console.log('\n══ MD5 · RFC 1321 §A.5, la suite entera (hash.test.ts) ══');
const md5Suite = [
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
for (const [input, expected] of md5Suite)
  checkDigest('md5', JSON.stringify(input).slice(0, 40), input, expected, HASH_TEST, 'hash.test.ts');

console.log('\n══ HMAC-SHA256 · RFC 4231 casos 1–7 (hash.test.ts) ══');
const hex = (h) => Buffer.from(h, 'hex');
const rep = (b, n) => Buffer.alloc(n, b);
const hmacCases = [
  ['caso 1', rep(0x0b, 20), utf8('Hi There'), 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7', 64],
  ['caso 2', utf8('Jefe'), utf8('what do ya want for nothing?'), '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843', 64],
  ['caso 3', rep(0xaa, 20), rep(0xdd, 50), '773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe', 64],
  ['caso 4', hex('0102030405060708090a0b0c0d0e0f10111213141516171819'), rep(0xcd, 50), '82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b', 64],
  // caso 5: la RFC publica la salida TRUNCADA a 128 bits → se compara el prefijo de 32 hex.
  ['caso 5 (truncado 128b)', rep(0x0c, 20), utf8('Test With Truncation'), 'a3b6167473100ee06e0c796c2955552b', 32],
  ['caso 6 (clave 131B)', rep(0xaa, 131), utf8('Test Using Larger Than Block-Size Key - Hash Key First'), '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54', 64],
  [
    'caso 7 (clave 131B + datos largos)',
    rep(0xaa, 131),
    utf8(
      'This is a test using a larger than block-size key and a larger than block-size data. The key needs to be hashed before being used by the HMAC algorithm.',
    ),
    '9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2',
    64,
  ],
];
for (const [label, key, data, transcribed, len] of hmacCases) {
  const real = createHmac('sha256', key).update(data).digest('hex').slice(0, len);
  const match = real === transcribed;
  const present = HASH_TEST.includes(transcribed);
  line(
    match && present,
    `HMAC-SHA256 ${label}`,
    match
      ? present
        ? ''
        : '  (¡el literal NO aparece en hash.test.ts!)'
      : `\n       transcrito: ${transcribed}\n       real:       ${real}`,
  );
}

console.log('\n══ Vectores repetidos en encode-transforms.test.ts (camino de producción) ══');
for (const [label, input, expected] of [
  ['cadena vacía', '', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  ['"abc"', 'abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  [
    '448 bits',
    'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  ],
])
  checkDigest('sha256', label, input, expected, ENC_TEST, 'encode-transforms.test.ts');
for (const [input, expected] of [
  ['', 'd41d8cd98f00b204e9800998ecf8427e'],
  ['abc', '900150983cd24fb0d6963f7d28e17f72'],
  ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
  ['a', '0cc175b9c0f1b6a831c399e269772661'],
])
  checkDigest('md5', JSON.stringify(input), input, expected, ENC_TEST, 'encode-transforms.test.ts');

console.log(`\nRESUMEN: ${checked} vectores comprobados, ${failed} discrepancias.`);
process.exit(failed === 0 ? 0 : 1);
