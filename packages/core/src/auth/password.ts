// Hash y verificación de contraseñas con scrypt de `node:crypto` (PRD §11, D9).
// Cero dependencias externas: scrypt es KDF resistente a hardware, del runtime.
//
// Lógica PURA (sin IO): vive en core y la consume la capa de auth de apps/web
// (server/auth.ts). Los tests son unit puros (packages/core), sin Postgres.
//
// FORMATO DE ALMACENAMIENTO (PHC-like, todo en la columna `password_hash`):
//   scrypt$ln=<N>,r=<r>,p=<p>$<salt_base64>$<derivedKey_base64>
// El formato lleva EMBEBIDOS el salt y los parámetros de coste, de modo que
// verificar no necesita conocerlos aparte y subir el coste en el futuro no
// invalida los hashes viejos (cada uno recuerda con qué se calculó).
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Wrapper propio (no `promisify`): la firma promisificada de `scrypt` que TS deriva NO
// admite el argumento de opciones (N/r/p/maxmem), y esos parámetros son justo lo que
// necesitamos fijar. Aquí se invoca la sobrecarga de 5 argumentos explícitamente.
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// Parámetros de coste. N=2^14 (16384), r=8, p=1: recomendación sensata y
// ampliamente usada; memoria ≈ 128*N*r ≈ 16 MB, holgada bajo `maxmem`.
const COST = { N: 16384, r: 8, p: 1 } as const;
const KEYLEN = 64;
const SALT_BYTES = 16;
// `maxmem` explícito y generoso: por defecto node limita a 32 MB y con N altos
// scrypt lanza `ERR_CRYPTO_INVALID_SCRYPT_PARAMS`. 64 MB deja margen a COST.
const MAXMEM = 64 * 1024 * 1024;

const PREFIX = 'scrypt';

async function derive(password: string, salt: Buffer): Promise<Buffer> {
  return scrypt(password, salt, KEYLEN, { N: COST.N, r: COST.r, p: COST.p, maxmem: MAXMEM });
}

/** Deriva un hash scrypt con salt aleatorio por usuario y lo serializa en el
 *  formato PHC-like. NUNCA guarda la contraseña en claro (§11). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await derive(password, salt);
  const params = `ln=${String(COST.N)},r=${String(COST.r)},p=${String(COST.p)}`;
  return `${PREFIX}$${params}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

interface ParsedHash {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  derived: Buffer;
}

function parseHash(stored: string): ParsedHash | undefined {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== PREFIX) return undefined;
  const [, paramStr, saltB64, hashB64] = parts;
  if (paramStr === undefined || saltB64 === undefined || hashB64 === undefined) return undefined;

  const params = new Map<string, number>();
  for (const kv of paramStr.split(',')) {
    const [k, v] = kv.split('=');
    if (!k || v === undefined || !/^\d+$/.test(v)) return undefined;
    params.set(k, Number(v));
  }
  const N = params.get('ln');
  const r = params.get('r');
  const p = params.get('p');
  if (N === undefined || r === undefined || p === undefined) return undefined;
  return {
    N,
    r,
    p,
    salt: Buffer.from(saltB64, 'base64'),
    derived: Buffer.from(hashB64, 'base64'),
  };
}

/**
 * Verifica una contraseña contra un hash almacenado. Comparación en tiempo
 * constante con `timingSafeEqual` — comparar strings filtraría por timing cuántos
 * bytes coinciden. Devuelve `false` (nunca lanza) ante un hash con formato
 * inválido, de modo que el llamante no distingue "hash corrupto" de "contraseña
 * mala": ambos son un login fallido.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  try {
    // Un hash puede PARSEAR y aun así llevar params que hacen fallar a scrypt (N no
    // potencia de dos, keylen/maxmem que disparan ERR_CRYPTO_INVALID_SCRYPT_PARAMS): la
    // promesa rechazaría. Se atrapa → `false`, honrando el contrato «nunca lanza» (un hash
    // corrupto es un login fallido, indistinguible de contraseña mala).
    const candidate = await scrypt(password, parsed.salt, parsed.derived.length, {
      N: parsed.N,
      r: parsed.r,
      p: parsed.p,
      maxmem: MAXMEM,
    });
    if (candidate.length !== parsed.derived.length) return false;
    return timingSafeEqual(candidate, parsed.derived);
  } catch {
    return false;
  }
}
