// Factories de las filas de persistencia (testing/db-integration.md §9): cada
// una devuelve un input de INSERT válido y acepta overrides parciales. Cuando el
// schema evolucione, se arregla aquí una vez, no en cincuenta tests.
import { randomBytes } from 'node:crypto';
import type { NewSession, NewUser } from '@app/db/schema';

/** Input para crear un `user`. Email único por defecto (evita colisiones entre
 *  tests que no las están probando). El hash es un literal de test evidente. */
export function makeUser(overrides: Partial<NewUser> = {}): NewUser {
  return {
    email: `user-${randomBytes(4).toString('hex')}@example.com`,
    passwordHash: 'scrypt$test$hash-not-a-secret',
    ...overrides,
  };
}

/** Input para crear una `session`. `userId` es obligatorio (FK): pásalo por
 *  override con el id de un user ya insertado. Expira a la hora por defecto. */
export function makeSession(overrides: Partial<NewSession> & { userId: string }): NewSession {
  return {
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  };
}
