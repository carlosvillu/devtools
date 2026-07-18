// Orquestación de auth del lado servidor (PRD §8 auth, §11): compone los repos de
// @app/db con el hashing puro de @app/core/auth. Vive aquí (no en core) porque toca IO
// (Postgres). Los route handlers son finos y delegan en estas funciones.
import {
  hashPassword,
  verifyPassword,
  type AuthUser,
  type Login,
  type Signup,
} from '@app/core/auth';
import { AppError } from '@app/core/contracts';
import type { Db } from '@app/db';
import { createUser, getUserByEmail } from '@app/db';

// §11 INDISTINGUIBILIDAD: el mensaje de error de login es IDÉNTICO —byte a byte— para
// «el email no existe» y para «la contraseña es incorrecta». Un solo literal, un solo
// status (401), para que un atacante no pueda enumerar qué emails están registrados.
export const INVALID_CREDENTIALS_MESSAGE = 'Email o contraseña incorrectos.';

// Hash «dummy» con los MISMOS parámetros de coste que uno real, calculado UNA vez. Se
// verifica contra él cuando el email no existe, de modo que el coste temporal del login
// sea el mismo exista o no la cuenta: sin esto, «no existe» retornaría antes que «existe
// pero contraseña mala» y el timing filtraría qué emails están registrados (§11).
let dummyHashPromise: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  return (dummyHashPromise ??= hashPassword('dummy-password-for-timing-not-a-secret'));
}

// Drizzle 0.44+ ENVUELVE el error de pg (`DrizzleQueryError`): el SQLSTATE real viaja
// en la cadena de `.cause`, no en el `.code` de arriba. Se recorre la cadena para
// encontrarlo (mismo criterio que `pgErrorCode` de @app/test-utils, que es solo de test).
function pgErrorCode(err: unknown): string | undefined {
  let current: unknown = err;
  for (let depth = 0; depth < 10 && current != null; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/**
 * Registra una cuenta: hashea la contraseña con scrypt y crea el usuario. Un email ya
 * registrado (constraint única `lower(email)`, 23505) se traduce a un `validation_error`
 * con el error en el campo `email`, para que el formulario lo muestre ahí (skill frontend).
 */
export async function signup(db: Db, input: Signup): Promise<AuthUser> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await createUser(db, { email: input.email, passwordHash });
    return { id: user.id, email: user.email };
  } catch (err) {
    if (pgErrorCode(err) === '23505') {
      const message = 'Ese email ya está registrado.';
      throw new AppError('validation_error', message, {
        formErrors: [],
        fieldErrors: { email: [message] },
      });
    }
    throw err;
  }
}

/**
 * Autentica un login. Respuestas INDISTINGUIBLES (§11): tanto si el email no existe
 * como si la contraseña es incorrecta, lanza el MISMO `AppError('unauthorized', …)`
 * con el mismo mensaje y hace el mismo trabajo de scrypt (dummy cuando no hay usuario).
 */
export async function login(db: Db, input: Login): Promise<AuthUser> {
  const user = await getUserByEmail(db, input.email);

  if (!user) {
    // Verificación «en vacío» para igualar el coste temporal con el caso de usuario real.
    await verifyPassword(input.password, await getDummyHash());
    throw new AppError('unauthorized', INVALID_CREDENTIALS_MESSAGE);
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new AppError('unauthorized', INVALID_CREDENTIALS_MESSAGE);

  return { id: user.id, email: user.email };
}
