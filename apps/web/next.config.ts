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
  // pino se deja FUERA del bundle del server para que resuelva sus internals
  // (thread-stream/sonic-boom, y en dev el transport pino-pretty) desde sus
  // ficheros reales en runtime; el file tracing de standalone los arrastra. En
  // producción `pretty` es false (logger.ts) ⇒ pino-pretty no se carga, pero
  // externalizarlo evita que el bundler intente resolver su target dinámico.
  serverExternalPackages: ['pino', 'pino-pretty'],
  // Los paquetes internos exportan TypeScript fuente (exports JIT, sin build):
  // Next los compila (architecture.md §7). `pg` (usado por server/db-health.ts)
  // NO se externaliza: queda bundleado dentro de standalone a propósito.
  transpilePackages: ['@app/core'],
};

export default nextConfig;
