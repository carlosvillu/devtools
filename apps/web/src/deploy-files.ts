// Lectura de ficheros del repo para los tests de invariantes estáticos de deploy
// (`deploy-infra.test.ts`, `deploy-backup.test.ts`).
//
// ⚠ Este módulo TIENE que vivir en este directorio. `read` resuelve contra
// `import.meta.url`, así que la base de las rutas relativas que le pasan sus
// llamantes (`../../../docker-compose.prod.yml`, `../Dockerfile`…) es la carpeta de
// ESTE fichero. Moverlo a `packages/test-utils` —o a cualquier otro nivel— no
// rompería la compilación: rompería las rutas en SILENCIO, con un ENOENT opaco en
// vez de una aserción fallida. Funciona porque los dos tests que lo usan son sus
// hermanos de directorio.
// Además, la resolución TIENE que hacerse aquí y no en los tests: bajo el entorno
// `jsdom` del proyecto `web:unit`, el `import.meta.url` de un fichero *.test.ts no
// es una URL `file://` y `fileURLToPath` revienta con «The URL must be of scheme
// file». El de este módulo sí lo es. Por eso se exporta `resolve` en vez de dejar
// que cada test construya sus propias rutas.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const resolve = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

export const read = (rel: string): string => readFileSync(resolve(rel), 'utf8');
