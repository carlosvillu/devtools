# Imagen de producción de apps/web (T1.8). Contexto de build = RAÍZ del repo:
#   docker build -f apps/web/Dockerfile .
# (docker-compose.prod.yml usa `context: .` + `dockerfile: apps/web/Dockerfile`.)
#
# Next standalone (§10): el stage de build exporta NEXT_OUTPUT=standalone para
# activar `output: 'standalone'` en next.config.ts (gateado por esa env para no
# romper el `next start` del stack E2E local), y el runtime ejecuta el server.js
# trazado. `@app/core` se compila DENTRO del bundle (transpilePackages) y `pg`
# (server/db-health.ts) queda bundleado; pino se externaliza y lo arrastra el file
# tracing de standalone.

FROM node:24-slim AS base
# pnpm anclado a la versión del `packageManager` del repo, vía npm (no corepack:
# corepack está deprecado y desaparece de las imágenes oficiales de node).
RUN npm install -g pnpm@11.13.1

FROM base AS build
WORKDIR /app
# El .dockerignore de la raíz poda node_modules/.next/.env*/docs/.git.
COPY . .
# Instalación filtrada al workspace de web + sus dependencias internas (@app/core,
# @app/test-utils como devDep). El store se cachea entre builds (BuildKit).
# --ignore-scripts: el `prepare` de la raíz (`lefthook install`) exige un `.git`
# que la imagen no tiene y reventaría el build; los binarios nativos (oxide de
# tailwind, esbuild) llegan por optionalDependencies de plataforma, sin postinstall.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --filter @app/web...
ENV NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @app/web build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
# HOSTNAME=0.0.0.0 NO ES OPCIONAL: el server.js de Next escucha en localhost por
# defecto ⇒ solo DENTRO del contenedor. El healthcheck corre dentro y PASA, el
# contenedor sale `healthy`… y desde el puerto publicado no responde nadie:
# contenedor verde, sitio caído (~/AGENTS.md §8 trampa 5). Esto NO contradice el
# "nunca 0.0.0.0" de §2: aquí es la interfaz DENTRO del contenedor; el puerto del
# HOST se publica solo en 127.0.0.1 (docker-compose.prod.yml).
# standalone = server.js + node_modules trazados, con el layout del monorepo
# (apps/web/server.js) porque outputFileTracingRoot es la raíz del repo.
COPY --from=build /app/apps/web/.next/standalone ./
# Los estáticos NO entran en el standalone: se copian a mano (docs de Next), o la
# web sale sin CSS ni JS. (No hay carpeta apps/web/public/ — si algún día aparece,
# se copia también aquí.)
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
# exec-form: el proceso es PID 1 y recibe la señal de apagado (apaga limpio).
CMD ["node", "apps/web/server.js"]
