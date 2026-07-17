// El CABLEADO de la config de desarrollo. El test de `pretty: true` de
// packages/core prueba que makeLogger sabe construir el transport; este prueba lo
// que de verdad se rompió: que ESTA línea (`NODE_ENV === 'development'`) activa
// esa rama en el arranque de web, que es lo que ejecuta `next dev`.
//
// Sin él, el gate seguía verde con `curl localhost:3000/api/health` devolviendo
// 500 en TODA ruta, porque toda la suite corre con NODE_ENV=test.
//
// `vi.stubEnv` y no `process.env.NODE_ENV = …`: Next tipa NODE_ENV como readonly.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRootLogger, setRootLoggerForTests } from './logger';

describe('getRootLogger', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    setRootLoggerForTests(undefined); // descarta el memoizado entre tests
  });

  it('con NODE_ENV=development construye el logger pretty sin lanzar (lo que hace `next dev`)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('LOG_LEVEL', 'silent');
    setRootLoggerForTests(undefined);

    // Antes del fix: «unable to determine transport target for "pino-pretty"».
    expect(() => {
      getRootLogger().info({ request_id: 'req-1' }, 'arranque en dev');
    }).not.toThrow();
  });

  it('con NODE_ENV=production construye el logger JSON (stdout lo recoge Docker)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LOG_LEVEL', 'silent');
    setRootLoggerForTests(undefined);

    expect(() => {
      getRootLogger().info({ request_id: 'req-1' }, 'arranque en prod');
    }).not.toThrow();
  });

  it('memoiza: el mismo logger para todo el proceso', () => {
    expect(getRootLogger()).toBe(getRootLogger());
  });
});
