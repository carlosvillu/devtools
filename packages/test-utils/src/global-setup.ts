// globalSetup compartido por TODOS los vitest.config.integration.ts
// (testing/db-integration.md §2). Vitest ejecuta los globalSetup en el proceso
// principal (misma caché de módulos), así que el singleton con refcount funciona
// entre proyectos: el primero arranca el contenedor, el resto lo reutiliza, el
// último teardown lo para.
//
// Expone la connection string vía provide()/inject(), NUNCA vía env: así es
// imposible que un test apunte por accidente a la BD de desarrollo.
//
// En Vitest 4 el globalSetup recibe un `TestProject` (el antiguo
// `GlobalSetupContext` ya no se exporta); ambos exponen `provide()` tipado por
// `ProvidedContext`. La skill avisa de este renombre entre versiones.
import type { TestProject } from 'vitest/node';
import { startPostgresContainer } from './postgres-container';

let harnessPromise: ReturnType<typeof startPostgresContainer> | undefined;
let refs = 0;

export default async function globalSetup({ provide }: TestProject) {
  harnessPromise ??= startPostgresContainer();
  refs += 1;
  const harness = await harnessPromise;
  provide('pgServerUri', harness.serverUri);
  provide('pgTemplateDb', harness.templateDb);
  return async () => {
    refs -= 1;
    if (refs === 0) {
      await harness.stop();
      harnessPromise = undefined;
    }
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    pgServerUri: string;
    pgTemplateDb: string;
  }
}
