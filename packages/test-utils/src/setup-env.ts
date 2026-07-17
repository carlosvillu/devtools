// setupFile universal de todos los proyectos de Vitest (testing/stack-setup.md §4).
// Carga `.env.test.local` (gitignored, claves reales) y después `.env.test`
// (committeado, claves falsas) SIN override: lo local gana.
//
// `process.loadEnvFile` (nativo de Node ≥22) tiene exactamente la semántica que
// exige el contrato: una variable ya presente en process.env NO se sobrescribe.
// Por eso no hace falta dotenv.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Las rutas se resuelven contra ESTE fichero, jamás contra process.cwd(): los
// scripts por paquete ejecutan vitest desde el directorio del paquete.
//
// Se usa `import.meta.dirname` (Node ≥20.11; aquí Node 24) en vez de
// `fileURLToPath(new URL(...))`: bajo `environment: jsdom` vitest sustituye el `URL`
// global por el de jsdom, cuyo resultado no pasa el chequeo de file-scheme de
// `fileURLToPath` y hace petar el setup ("The URL must be of scheme file"). Este
// fichero corre en TODOS los proyectos, incluidos los jsdom (tests de componente de
// apps/web, testing/frontend.md §2); `import.meta.dirname` no toca el global `URL`.
const repoRoot = resolve(import.meta.dirname, '../../..');

for (const file of ['.env.test.local', '.env.test']) {
  const path = resolve(repoRoot, file);
  if (existsSync(path)) process.loadEnvFile(path);
}
