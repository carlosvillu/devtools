// Accessor lazy del logger base de web (observability.md §2-§3).
// Importar este módulo NO crea el logger ni lee env: se memoiza en el primer uso
// — mismo principio que getDb() (api.md §3). Nada en module scope.
import { makeLogger, type Logger } from '@app/core/observability';

let override: Logger | undefined;
let fromEnv: Logger | undefined;

/**
 * Mismo molde que getDb()/setDbForTests() (api.md §3): así los tests pueden
 * capturar lo que se loguea de verdad — que es como se prueba la regla §11
 * (el input del usuario nunca sale en un log).
 *
 * Pasar `undefined` restaura Y descarta el logger memoizado, de modo que el
 * siguiente `getRootLogger()` vuelva a leer el env. Sin eso, un test que cambie
 * `LOG_LEVEL` seguiría viendo el logger construido por el test anterior.
 */
export function setRootLoggerForTests(logger: Logger | undefined): void {
  override = logger;
  fromEnv = undefined;
}

export function getRootLogger(): Logger {
  return (
    override ??
    (fromEnv ??= makeLogger({
      name: 'web',
      level: process.env.LOG_LEVEL ?? 'info',
      pretty: process.env.NODE_ENV === 'development',
    }))
  );
}
