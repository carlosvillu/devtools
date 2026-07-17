// setupFile universal de todos los proyectos de Vitest (testing/stack-setup.md §4).
// Carga `.env.test.local` (gitignored, claves reales) y después `.env.test`
// (committeado, claves falsas) SIN override: lo local gana.
//
// `process.loadEnvFile` (nativo de Node ≥22) tiene exactamente la semántica que
// exige el contrato: una variable ya presente en process.env NO se sobrescribe.
// Por eso no hace falta dotenv.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Las rutas se resuelven contra ESTE fichero, jamás contra process.cwd(): los
// scripts por paquete ejecutan vitest desde el directorio del paquete.
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

for (const file of ['.env.test.local', '.env.test']) {
  const path = `${repoRoot}${file}`;
  if (existsSync(path)) process.loadEnvFile(path);
}
