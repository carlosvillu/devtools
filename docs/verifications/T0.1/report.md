# Verificación T0.1 — Monorepo y esqueleto de proyectos

- **Tarea**: T0.1 · Monorepo y esqueleto de proyectos (`planning.md`)
- **Fecha**: 2026-07-17
- **Ejecutor**: agente `verifier` · sin agent-browser (verificación de terminal: la Verificación es `curl`/build, sin superficie UI — cua.md paso 0)
- **Sistema**: árbol de trabajo sobre commit `8c1bbe0` con el diff de T0.1 **staged sin commitear** (52 ficheros). Sin docker compose (Postgres llega en T0.2). Servidor levantado con `pnpm dev` (Next 16.2.10, puerto 3000).
- **Higiene de entorno**: shell sin `LOG_LEVEL`/`NODE_ENV`/`DATABASE_URL` heredados (comprobado con `env | grep`); aun así todo se ejecutó bajo `env -u LOG_LEVEL -u NODE_ENV -u DATABASE_URL`, y el hallazgo se **replicó con `pnpm dev` pelado** (evidencia 09) para descartar que fuera artefacto de la manipulación de entorno.

## Verificación esperada (literal de planning.md)

> `pnpm build && pnpm gate` en verde → `curl localhost:3000/api/health` devuelve `{ok:true}`; romper a propósito un tipo exportado de `packages/core` rompe la compilación de `apps/web` (control negativo: el fallo se ve y luego se revierte).

## Veredicto final (pasada 2, 2026-07-17)

**PASS** — las tres cláusulas se cumplen contra el sistema real. `pnpm build && pnpm gate` verdes (43 tests, 6 ficheros, los 6 pasos); `curl localhost:3000/api/health` contra `pnpm dev` devuelve **200 `{"ok":true}`** con `.next` borrado antes; el control negativo rompe la compilación de `apps/web` y se revierte.

### Ciclo FAIL → fix → PASS (la verificación mordió)

| Pasada | Veredicto | Qué pasó |
|---|---|---|
| 1 (2026-07-17) | **FAIL** | `curl` contra `pnpm dev` → 500 `{"code":"internal"}`. `pino-pretty` referenciado como `target` string pero **no declarado ni instalado**. Toda ruta con `withRoute` caída en dev, con el gate en verde y 37 tests pasando. |
| 2 (2026-07-17) | **PASS** | `pino-pretty@13.1.3` declarado en `packages/core`; `knip.json` con `ignoreDependencies` justificado; 3 tests nuevos que recorren la rama `pretty: true`. Curl real → 200 `{"ok":true}`. |

El detalle íntegro del FAIL se conserva más abajo: es la evidencia de que este gate muerde y de por qué el "gate verde" no equivale a "sistema que funciona".

---

## Veredicto de la pasada 1 (histórico — CORREGIDO en la pasada 2)

**FAIL** — la cláusula 2 no se cumple: contra el servidor real levantado con `pnpm dev`, `curl localhost:3000/api/health` devuelve **HTTP 500 `{"code":"internal","message":"error interno"}`**, no `{ok:true}`. Las cláusulas 1 y 3 pasan.

### Resultado por cláusula (pasada 1 — histórico)

| # | Cláusula | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|---|
| 1 | `pnpm build && pnpm gate` en verde | ambos exit 0; los 6 pasos del gate reales | build exit 0; gate exit 0 con los 6 pasos ejecutados (lint, typecheck, format:check, knip, readme:status:check, test) y 37 tests / 5 ficheros en verde. Ninguno vacío ni apagado | `01-build.txt`, `02-gate.txt` | ✅ |
| 2 | `curl localhost:3000/api/health` → `{ok:true}` | 200 `{ok:true}` | **500 `{"code":"internal","message":"error interno"}`** bajo `pnpm dev`. En log: `route_bootstrap_failed … unable to determine transport target for "pino-pretty"` | `03-dev-server.log`, `04-curl-health.txt`, `08-dev-server-replay.log`, `09-curl-health-dev-replay.txt` | ❌ |
| 3 | Romper tipo de `packages/core` rompe la compilación de `apps/web`, y se revierte | fallo de compilación real + revert | `tsc --noEmit` y `next build` fallan ambos con `route.ts(17,28) TS2322`; revert verificado por blob sha y typecheck verde | `07-control-negativo.txt` | ✅ |

### Salidas reales de la pasada 1 (pegadas, no parafraseadas)

### Cláusula 1 — `pnpm build` (exit 0)

```
apps/web build: ▲ Next.js 16.2.10 (Turbopack)
apps/web build: ✓ Compiled successfully in 6.5s
apps/web build:   Running TypeScript ...
apps/web build:   Finished TypeScript in 7.9s ...
apps/web build: ✓ Generating static pages using 3 workers (3/3) in 268ms
apps/web build: Route (app)
apps/web build: ┌ ○ /
apps/web build: ├ ○ /_not-found
apps/web build: └ ƒ /api/health
apps/web build: Done
=== EXIT: 0 ===
```

### Cláusula 1 — `pnpm gate` (exit 0, los 6 pasos)

```
$ pnpm lint && pnpm typecheck && pnpm format:check && pnpm knip && pnpm readme:status:check && pnpm test
$ eslint .
Multiple projects found, consider using a single `tsconfig` with `references` to speed up, or use `noWarnOnMultipleProjects` to suppress this warning
$ tsc -p tsconfig.json --noEmit && pnpm -r --parallel typecheck
packages/db typecheck: Done
packages/test-utils typecheck: Done
packages/core typecheck: Done
apps/web typecheck: Done
$ prettier --check .
All matched files use Prettier code style!
$ knip
$ node scripts/readme-status.mjs --check
readme:status — la tabla del README coincide con planning.md ✓
$ vitest run --project '*:unit' --project '*:integration'
 Test Files  5 passed (5)
      Tests  37 passed (37)
=== EXIT: 0 ===
```

### Cláusula 2 — el curl real contra `pnpm dev` (FALLA)

```
$ curl -i -s http://localhost:3000/api/health
HTTP/1.1 500 Internal Server Error
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
content-type: application/json
Transfer-Encoding: chunked

{"code":"internal","message":"error interno"}
```

Log del servidor dev en cada petición:

```
apps/web dev: ✓ Ready in 1144ms
apps/web dev: route_bootstrap_failed name=Error message=unable to determine transport target for "pino-pretty"
apps/web dev:  GET /api/health 500 in 1818ms (next.js: 1738ms, application-code: 80ms)
```

### Cláusula 3 — control negativo (el fallo se ve, y luego se revierte)

Cambio introducido a propósito en `packages/core/src/contracts/health.ts`:

```diff
 export const HealthSchema = z.object({
-  ok: z.literal(true),
+  ok: z.literal('healthy'),
 });
```

`tsc --noEmit` en `apps/web`:

```
src/app/api/health/route.ts(17,28): error TS2322: Type 'true' is not assignable to type '"healthy"'.
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @app/web@ typecheck: `tsc --noEmit`
Exit status 2
```

`next build` en `apps/web`:

```
  Running TypeScript ...
Failed to type check.

./src/app/api/health/route.ts:17:28
Type error: Type 'true' is not assignable to type '"healthy"'.

> 17 |     const body: Health = { ok: true };
     |                            ^
Next.js build worker exited with code: 1 and signal: null
Exit status 1
```

Revert y comprobación:

```
$ git checkout -- packages/core/src/contracts/health.ts
$ git hash-object packages/core/src/contracts/health.ts
d3d7828e48663b123792b61f71abdf625db4f9e7        <- idéntico al original
$ git diff packages/core/src/contracts/health.ts
(vacío)
$ pnpm --filter @app/web typecheck
$ tsc --noEmit
EXIT: 0
```

El acoplamiento core↔web es real, no decorativo.

### Causa raíz de la cláusula 2 (pasada 1)

`packages/core/src/observability/logger.ts:75` configura el transport de pino:

```ts
transport: opts.pretty ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
```

y `apps/web/src/server/logger.ts:29` activa `pretty` con `process.env.NODE_ENV === 'development'` — exactamente lo que pone `next dev`.

**Pero `pino-pretty` no está declarado como dependencia en ningún `package.json` del monorepo ni instalado en el store**:

```
$ node -e "require.resolve('pino-pretty')"     -> NOT RESOLVABLE: MODULE_NOT_FOUND
$ ls node_modules/.pnpm | grep -i pino         -> pino@10.3.1, pino-abstract-transport@3.0.0,
                                                  @pinojs+redact@0.4.0, pino-std-serializers@7.1.0
                                                  (pino-pretty NO aparece)
$ grep -rn "pino-pretty" --include=package.json .   -> (declarado en NINGUNA parte)
```

Consecuencia: en modo desarrollo, `makeLogger()` lanza al construirse, `withRoute` lo captura como `route_bootstrap_failed` y devuelve 500. **No es exclusivo de `/api/health`: afecta a toda ruta que pase por `withRoute`**, es decir a toda la capa API del proyecto bajo `pnpm dev`.

#### Alcance exacto (dev sí, prod no)

| Modo | Comando | `GET /api/health` | Evidencia |
|---|---|---|---|
| Desarrollo (`NODE_ENV=development`) | `pnpm dev` | **500** `{"code":"internal",…}` | `04-curl-health.txt`, `09-…-replay.txt` |
| Producción (`NODE_ENV=production`) | `pnpm --filter @app/web start` tras `pnpm build` | 200 `{"ok":true}` | `06-curl-health-prod.txt` |

`GET /` responde 200 en dev porque es estática y nunca toca el logger. El fallo solo asoma en rutas de servidor con `pretty: true`.

**Por qué esto es FAIL y no una nota al margen**: `pnpm dev` es el comando canónico de desarrollo local y es el que la propia `cua.md` (paso 1) prescribe como gate de arranque de toda verificación futura (`pnpm dev` → `curl -s localhost:3000/api/health`). Tal como está, ese gate devuelve 500 desde el día 1, y la Verificación de T0.2 (`curl /api/health` → `{ok:true, db:true}` contra el stack de compose en dev) queda bloqueada. Que producción funcione no salva la cláusula: la Verificación pide `curl localhost:3000/api/health` → `{ok:true}`, y en el flujo de desarrollo eso no ocurre.

### Por qué los 37 tests no lo cazaban (agujero de cobertura — cerrado en la pasada 2)

`apps/web/src/app/api/health/route.test.ts` se declara a sí mismo (líneas 1-3) como la conservación permanente de esta cláusula de la Verificación:

> «la cláusula determinista de la Verificación de T0.1 («/api/health devuelve {ok:true}») se queda como test permanente dentro de `pnpm gate`, no solo como un curl one-shot del verifier»

Pero **no la cubre**: llama a `GET(new Request(...))` en proceso, y corre con `NODE_ENV=test` (`.env.test`), donde `pretty` es `false` y el transport roto nunca se construye. El test verde y el endpoint 500 conviven sin contradicción. La afirmación del comentario es, hoy, falsa.

### Qué debía arreglar el implementer (pasada 1 — ambos puntos HECHOS, verificados en la pasada 2)

1. **Causa raíz**: o declarar `pino-pretty` como `devDependency` (y garantizar que Next lo resuelve en el runtime del servidor — `serverExternalPackages` puede hacer falta con Turbopack), o eliminar el transport y usar un destino pretty sin transport worker. Decisión suya; el criterio es que `pnpm dev` + `curl localhost:3000/api/health` devuelva `{ok:true}`.
2. **Cerrar el agujero de cobertura**: el gate debe poder cazar esto. Un test que construya `makeLogger({ pretty: true })` de verdad (hoy nada instancia esa rama) habría fallado en `pnpm gate`. Sin eso, el mismo fallo puede volver en cualquier tarea futura sin que el gate se entere.

### Rarezas de la pasada 1

- **El diff sigue sin commitear** (staged). El veredicto es sobre el árbol de trabajo, no sobre un commit.
- `pnpm lint` emite un warning de ESLint no bloqueante: `Multiple projects found, consider using a single tsconfig with references to speed up, or use noWarnOnMultipleProjects to suppress this warning`. No afecta al veredicto; anotado por si molesta al crecer el monorepo.
- **`process.loadEnvFile` no sobrescribe** variables ya presentes en `process.env` (`setup-env.ts` lo documenta como deliberado). Consecuencia real para futuros verifiers: una shell con `LOG_LEVEL`/`NODE_ENV` exportados manda sobre `.env.test` y puede enmascarar fallos. Ejecutar siempre con `env -u LOG_LEVEL -u NODE_ENV -u DATABASE_URL`. En esta sesión la shell estaba limpia, así que no influyó.
- El puerto 3000 quedó libre y ningún proceso `next` de esta verificación sigue vivo al cerrar.
  (Existe en la máquina un `next-server` huérfano pid 556392, arrancado el 2026-07-16 por el usuario `ubuntu`, sin puerto TCP y ajeno a este repo: NO es de esta sesión ni del proyecto, y se dejó intacto.) `apps/web/.next` (del build) está gitignored.
- `packages/core/src/contracts/health.ts` fue restaurado tras el control negativo: blob sha `d3d7828e48663b123792b61f71abdf625db4f9e7`, idéntico al original, `git diff` vacío y typecheck verde.

### Coste real de la pasada 1

**$0** — ninguna API de pago involucrada (D8: sin llamadas externas en T0.1). Solo tiempo de agente. Estimado del planning: $0. Sin desviación.

### Índice de evidencia de la pasada 1

| Fichero | Contenido |
|---|---|
| `01-build.txt` | `pnpm build` completo (exit 0) |
| `02-gate.txt` | `pnpm gate` completo, 6 pasos, 37 tests (exit 0) |
| `03-dev-server.log` | Log de `pnpm dev`: `route_bootstrap_failed` + 500 en bucle |
| `04-curl-health.txt` | El curl real contra dev: 500 |
| `05-prod-server.log` | Log de `next start` (producción) |
| `06-curl-health-prod.txt` | Curl contra producción: 200 `{"ok":true}` |
| `07-control-negativo.txt` | Diff del tipo roto, error de `tsc`, error de `next build`, revert y typecheck verde |
| `08-dev-server-replay.log` | Réplica con `pnpm dev` pelado (sin `env -u`) |
| `09-curl-health-dev-replay.txt` | Curl de la réplica: 500 de nuevo |

---

# Pasada 2 (re-verificación completa tras el fix) — 2026-07-17

- **Ejecutor**: agente `verifier`, contexto fresco. Sin agent-browser (superficie de terminal).
- **Sistema**: mismo árbol, diff de T0.1 ampliado a **63 ficheros / 7982 inserciones**, staged sin commitear, sobre `8c1bbe0`.
- **Método**: **las tres cláusulas re-ejecutadas enteras**, no solo la que falló. Todo desde la **raíz del repo** y bajo `env -u LOG_LEVEL -u NODE_ENV -u DATABASE_URL`. Shell sin `LOG_LEVEL`/`NODE_ENV`/`DATABASE_URL` heredados (comprobado). `apps/web/.next` **borrado** antes de la cláusula 1.

## Resultado por cláusula (pasada 2)

| # | Cláusula | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|---|
| 1 | `pnpm build && pnpm gate` en verde | exit 0 ambos; los 6 pasos reales | build exit 0 con `.next` borrado; gate exit 0, los 6 pasos, **43 tests / 6 ficheros** | `10-build-pass2.txt`, `11-gate-pass2.txt` | ✅ |
| 2 | `curl localhost:3000/api/health` → `{ok:true}` | 200 `{ok:true}` contra servidor real | **200 `{"ok":true}`** contra `pnpm dev`; 4/4 peticiones 200; **cero** `route_bootstrap_failed` | `12-dev-server-pass2.log`, `13-curl-health-dev-pass2.txt` | ✅ |
| 3 | Romper tipo de core rompe la compilación de web, y se revierte | fallo real + revert | `tsc` exit 2 y `next build` exit 1, ambos `route.ts(17,28) TS2322`; revertido (sha `d3d7828`, typecheck exit 0) | `14-control-negativo-pass2.txt` | ✅ |

## Salidas reales (pasada 2)

### Cláusula 1 — `.next` borrado + `pnpm build` (exit 0)

```
.next borrado
apps/web build: ▲ Next.js 16.2.10 (Turbopack)
apps/web build: ✓ Compiled successfully in 5.8s
apps/web build:   Finished TypeScript in 6.5s ...
apps/web build: Route (app)
apps/web build: ┌ ○ /
apps/web build: ├ ○ /_not-found
apps/web build: └ ƒ /api/health
apps/web build: Done
=== EXIT BUILD: 0 ===
```

### Cláusula 1 — `pnpm gate` (exit 0, los 6 pasos, 43 tests)

```
$ pnpm lint && pnpm typecheck && pnpm format:check && pnpm knip && pnpm readme:status:check && pnpm test
$ eslint .
$ tsc -p tsconfig.json --noEmit && pnpm -r --parallel typecheck
apps/web typecheck: Done
$ prettier --check .
All matched files use Prettier code style!
$ knip
$ node scripts/readme-status.mjs --check
readme:status — la tabla del README coincide con planning.md ✓
$ vitest run --project '*:unit' --project '*:integration'
 Test Files  6 passed (6)
      Tests  43 passed (43)
=== EXIT GATE: 0 ===
```

### Cláusula 2 — el curl que falló en la pasada 1, ahora contra `pnpm dev` (PASA)

```
$ curl -i -s http://localhost:3000/api/health
HTTP/1.1 200 OK
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
content-type: application/json
Transfer-Encoding: chunked

{"ok":true}

=== solo el body ===
{"ok":true}
=== status ===
200
```

Log del servidor dev — sin un solo `route_bootstrap_failed` (compárese con la pasada 1):

```
apps/web dev$ next dev
apps/web dev: ▲ Next.js 16.2.10 (Turbopack)
apps/web dev: - Local:         http://localhost:3000
apps/web dev: ✓ Ready in 691ms
apps/web dev:  GET /api/health 200 in 1603ms (next.js: 1527ms, application-code: 76ms)
apps/web dev:  GET /api/health 200 in 37ms (next.js: 23ms, application-code: 13ms)
apps/web dev:  GET /api/health 200 in 20ms (next.js: 6ms, application-code: 14ms)
apps/web dev:  GET /api/health 200 in 11ms (next.js: 4ms, application-code: 7ms)
```

`grep -c route_bootstrap_failed` sobre ese log → **0**.

**Confirmada la afirmación del implementer sobre Turbopack**: `pino-pretty` resuelve en el runtime de servidor de `next dev` **sin** `serverExternalPackages`. No es teoría: es el 200 de arriba.

### Cláusula 3 — control negativo re-ejecutado (`route.ts` se tocó desde la pasada 1)

Mismo diff deliberado (`ok: z.literal(true)` → `ok: z.literal('healthy')`). `tsc --noEmit`:

```
src/app/api/health/route.ts(17,28): error TS2322: Type 'true' is not assignable to type '"healthy"'.
Exit status 2
```

`next build`:

```
Failed to type check.
./src/app/api/health/route.ts:17:28
Type error: Type 'true' is not assignable to type '"healthy"'.
> 17 |     const body: Health = { ok: true };
     |                            ^
Next.js build worker exited with code: 1 and signal: null
Exit status 1
```

Revert verificado: blob sha `d3d7828e48663b123792b61f71abdf625db4f9e7` (idéntico al original), `git diff` vacío, `pnpm --filter @app/web typecheck` exit 0. El acoplamiento core↔web sigue siendo real.

## Escrutinio extra pedido por el coordinador

### 1. ¿El `ignoreDependencies` de knip está justificado o es un silenciador? → **Justificado**

No me fié del comentario: lo probé por los dos lados.

**Es necesario** — retirando el bloque de `knip.json`, knip tumba el gate (`16-knip-ignore-justificado.txt`):

```
$ knip
Unused devDependencies (1)
pino-pretty  packages/core/package.json:21:6
[ELIFECYCLE] Command failed with exit code 1.
```

Confirma la razón escrita: knip no puede ver un `target: 'pino-pretty'` que es un *string*. El ignore está **mínimamente acotado** (solo esa dep, solo en `packages/core`), no es un `ignoreDependencies` de brocha gorda.

**Y el test al que apunta muerde de verdad** (`15-mutacion-tests-muerden.txt`). Mutando `target: 'pino-pretty'` → `'pino-pretty-NOT-INSTALLED'`, `pnpm test` se pone rojo: **3 tests fallan en 2 ficheros**, incluido el que reproduce el bug original:

```
FAIL |web:unit| src/server/logger.test.ts > getRootLogger > con NODE_ENV=development construye el logger pretty sin lanzar (lo que hace `next dev`)
AssertionError: expected [Function] to not throw an error but 'Error: unable to determine transport …' was thrown
+ Received: "Error: unable to determine transport target for \"pino-pretty-NOT-INSTALLED\""

 Test Files  2 failed | 4 passed (6)
      Tests  3 failed | 40 passed (43)
```

Mutación revertida; 43 tests verdes de nuevo. **El agujero de la pasada 1 está cerrado**: si alguien vuelve a dejar `pino-pretty` sin resolver, el gate se entera — que es exactamente lo que no ocurría.

### 2. ¿Hay tests de captura de logs pasando VACUAMENTE (transport + destination)? → **No**

El riesgo es real y está confirmado: pino con `transport` + `destination` no lanza, el transport gana y el destination se descarta en silencio (0 líneas). Barrido completo del repo:

- **`captureLogs()` nunca pasa `pretty`** (`grep pretty capture-logs.ts` → sin coincidencias): no puede caer en la trampa por construcción.
- **Las 8 llamadas a `captureLogs()`** usan el nivel por defecto (`trace`); ninguna usa `silent`.
- **Todos los `not.toContain` van acompañados de un assert positivo** que exige captura no vacía: los de `logger.test.ts` (18, 28) conviven con `expect(lines[0]?.input).toBe('[REDACTED]')`; y el de §11 en `with-route.test.ts` lleva un guard anti-vacuidad explícito:

```ts
expect(captured.lines.length).toBeGreaterThan(0); // si no se loguea nada, el test no prueba nada
expect(logs).not.toContain('SUPERSECRETO');
```

- **El test que clava el comportamiento NO está a nivel `silent`**: usa `level: 'info'` y emite un `.info(...)`, así que `expect(lines).toHaveLength(0)` prueba el descarte del destination, no un silencio por nivel. (El otro `toHaveLength(0)`, en el test de `silent`, es un test *de nivel*, sin `pretty`: no se pisan.)

El comportamiento queda además documentado en el docstring de `makeLogger` (`NO combinable con pretty: true, y el fallo es SILENCIOSO`).

### 3. Rama `.env.test.local` de `setup-env.ts` → **confirmado, y no esconde nada peor**

Solo existe `.env.test` en el árbol; `.env.test.local` no existe, así que el `if (existsSync(path))` es falso y esa rama no la recorre nada. Coincide con lo reportado. **No es FAIL**: es infra de test y fallaría ruidosamente. La consecuencia operativa relevante (y la razón de ejecutar con `env -u`) sigue siendo la otra: `process.loadEnvFile` **no sobrescribe** lo ya presente en `process.env`, así que un shell con `LOG_LEVEL`/`NODE_ENV` exportados manda sobre `.env.test`. En esta pasada la shell estaba limpia.

## Rarezas (pasada 2, aunque el veredicto sea PASS)

- **`withRoute` no emite ningún log en el camino feliz** (solo en los caminos de error), así que el log de `pnpm dev` no muestra salida pretty en un 200. No es un fallo — es diseño — pero significa que la *emisión* pretty por stdout no queda ejercitada por el curl; lo que sí queda probado es la construcción y resolución del transport, que es exactamente lo que se rompía. El `request_id` de correlación que promete la Entrega está cubierto por `with-route.test.ts`.
- Persiste el warning no bloqueante de ESLint: `Multiple projects found, consider using a single tsconfig with references…`.
- El diff **sigue staged sin commitear** (63 ficheros): el veredicto es sobre el árbol de trabajo, no sobre un commit.
- Sigue vivo el `next-server` huérfano pid 556392 (2026-07-16, usuario `ubuntu`, sin puerto TCP, ajeno al repo): no es de esta sesión ni del proyecto; intacto.
- **Nota de operación** (me la ahorró el coordinador, la dejo escrita): `pnpm gate` **solo existe en la raíz**. Lanzado desde `packages/core` falla con `Command "gate" not found`, no con un error útil.

## Estado del árbol al cerrar la pasada 2

Todas mis mutaciones revertidas y comprobadas: `git diff --stat` vacío, `health.ts` en `d3d7828`, `logger.ts` y `knip.json` sin diff, `planning.md` intacto, puerto 3000 libre, sin procesos `next` de esta sesión, sin commits. Lo único añadido: ficheros de evidencia bajo `docs/verifications/T0.1/`. Gate final tras revertirlo todo: **exit 0, 43 tests** (`17-gate-final.txt`).

## Coste real (pasada 2)

**$0** (estimado $0, sin desviación) — ninguna API de pago (D8: T0.1 no hace llamadas externas). Solo tiempo de agente. **Coste acumulado T0.1 (pasadas 1 + 2): $0.**

## Índice de evidencia de la pasada 2

| Fichero | Contenido |
|---|---|
| `10-build-pass2.txt` | `pnpm build` con `.next` borrado (exit 0) |
| `11-gate-pass2.txt` | `pnpm gate`, 6 pasos, 43 tests (exit 0) |
| `12-dev-server-pass2.log` | Log de `pnpm dev`: 4× 200, cero `route_bootstrap_failed` |
| `13-curl-health-dev-pass2.txt` | **El curl de la cláusula 2**: 200 `{"ok":true}` |
| `14-control-negativo-pass2.txt` | Control negativo re-ejecutado: `tsc`, `next build`, revert y typecheck verde |
| `15-mutacion-tests-muerden.txt` | Mutación del target: 3 tests rojos → prueba que la protección es real; revert verde |
| `16-knip-ignore-justificado.txt` | knip sin el ignore: `Unused devDependencies: pino-pretty` → el ignore es necesario |
| `17-gate-final.txt` | Gate tras revertir todas las mutaciones del verifier (exit 0, 43 tests) |
