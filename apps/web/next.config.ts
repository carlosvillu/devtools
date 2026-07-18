import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Salida standalone SOLO para la imagen Docker de producción (T1.8): su
  // Dockerfile exporta `NEXT_OUTPUT=standalone` en el stage de build, y el runner
  // ejecuta `node apps/web/server.js`. Se GATEA por env —en vez de fijarla— porque
  // el stack E2E del proyecto sirve el build de producción con `next build` +
  // `next start` (scripts/e2e-stack.ts): con `output: 'standalone'` fijo ese flujo
  // deja de arrancar el server esperado. Patrón ya probado en el VPS por el vecino
  // ugc-factory (apps/web/next.config.ts). El `pnpm build`/`next dev` local no se
  // ven afectados: sin la env, la salida es la de siempre.
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' as const } : {}),
  // Monorepo: raíz EXPLÍCITA del file tracing. El standalone copia desde aquí los
  // node_modules trazados con el layout del monorepo (server.js queda en
  // `apps/web/server.js`). Sin esto Next la infiere del lockfile — explícito es
  // determinista y no depende de qué haya alrededor del repo.
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  // Migración on-boot (instrumentation.ts): las migraciones SQL de @app/db son DATA en
  // disco (packages/db/drizzle), no código bundleado. El file tracing de standalone no
  // las arrastra solo, así que se INCLUYEN explícitamente → quedan en
  // `standalone/packages/db/drizzle`. Con cwd=`standalone/apps/web` en runtime, el
  // candidato `../../packages/db/drizzle` de instrumentation.ts las encuentra. (En
  // `next start`/dev no-standalone se resuelven en su ubicación real del monorepo.)
  outputFileTracingIncludes: {
    '/**/*': ['../../packages/db/drizzle/**/*'],
  },
  // pino se deja FUERA del bundle del server para que resuelva sus internals
  // (thread-stream/sonic-boom, y en dev el transport pino-pretty) desde sus
  // ficheros reales en runtime; el file tracing de standalone los arrastra. En
  // producción `pretty` es false (logger.ts) ⇒ pino-pretty no se carga, pero
  // externalizarlo evita que el bundler intente resolver su target dinámico.
  serverExternalPackages: ['pino', 'pino-pretty'],
  // Los paquetes internos exportan TypeScript fuente (exports JIT, sin build):
  // Next los compila (architecture.md §7). `pg` (usado por server/db-health.ts y por
  // @app/db) NO se externaliza: queda bundleado dentro de standalone a propósito.
  // `@app/db` (Drizzle + repos + runner de migraciones) entra con el auth de T0.4:
  // lo consumen server/db.ts, server/session.ts y instrumentation.ts (migración
  // on-boot). Sus migraciones SQL viven en packages/db/drizzle (fuera del bundle) y se
  // localizan en runtime (ver outputFileTracingIncludes + instrumentation.ts), NO por
  // require.resolve (que el bundler reescribe a un id numérico).
  transpilePackages: ['@app/core', '@app/db'],
};

export default nextConfig;
