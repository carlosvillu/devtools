# Journal del dev-loop — devtools

> Memoria del bucle entre sesiones. Append cronológico; una entrada por evento (tarea iniciada/cerrada, bloqueo, parada, decisión de arnés, cierre de fase, hotfix). **Escribe para el agente que retomará el trabajo sin tu contexto**: lo no obvio, las decisiones y sus porqués, las deudas — no un log de comandos. Nunca se reescriben entradas antiguas.

## Formatos de entrada

```markdown
## <YYYY-MM-DD> · ⏳ T<ID> iniciada
- 1-2 líneas: qué entrega y coste esperado. (Se escribe en el SELECT del ciclo.)

## <YYYY-MM-DD> · T<ID> cerrada — PASS
- Coste: $X (vs estimado $Y) · Ciclos verifier: N · Tests: N · Commit: <sha-corto> · Evidencia: docs/verifications/T<ID>/
- Decisiones no obvias que las siguientes tareas deben heredar: <1-3 líneas>
- Deuda anotada: <o "—">

## <YYYY-MM-DD> · arnés: <qué cambió>
- Qué pieza del arnés se corrigió (skill/agente/hook/gate), por qué (el ciclo que reveló la carencia) y desde cuándo aplica. El arnés evoluciona deliberadamente, nunca por deriva.

## <YYYY-MM-DD> · T<ID> cerrada — PASS · FASE F<N> COMPLETA
- Lo del cierre normal + resumen de fase: qué entrega observable quedó viva, commits de la fase, deudas que pasan a la siguiente, READMEs revisados. Termina en parada: esperar OK del usuario.

## <YYYY-MM-DD> · hotfix: <síntoma>
- Trabajo fuera del planning (bug en producción/uso real): causa raíz, fix, test permanente que lo protege, y si destapa deuda mayor → candidata a fase de deuda (F<N>b) acordada con el usuario.
```

---

## 2026-07-17 · Proyecto bootstrapeado

PRD v1.0 aprobado el 2026-07-16 (subido a v1.1 el 2026-07-17, ver más abajo); planning aprobado el 2026-07-17. Próxima tarea elegible: **T0.1**.

**Qué es esto, y por qué importa para todas las decisiones siguientes**
- El usuario declaró que devtools es, ante todo, un **banco de pruebas del arnés** (decisión D1 del PRD). No se busca tracción ni monetización. Por eso **no se hizo deep research** y las dos tesis de mercado del §1 quedan `[verificar]` para siempre — no hay tarea que las cierre (regla 3 del planning lo dice explícitamente).
- La idea inicial del usuario era "una suite de las típicas utilidades de developer". Se le devolvió que una suite son N features y que el arnés está construido para una sola. Eligió el reencuadre: **un único campo que autodetecta y encadena** (D2, D3). El catálogo de utilidades independientes quedó como no-objetivo explícito.
- **D5 (historial en servidor con cuenta) se eligió a sabiendas de que es peor producto**: se le advirtió que un devtools que pide cuenta para guardar historial añade fricción, y que guardar lo que la gente pega significa guardar sus tokens. Lo eligió igual porque ejercita la capa de datos del arnés, que es el objetivo. La mitigación es **D7**: no se persiste el input crudo, solo una vista previa truncada y redactada. Si alguien "simplifica" D7 en una tarea futura, convierte el producto en el pasivo que R2 describe.
- **D6 contradice el default del template**: el módulo de auth protege todo salvo login/health; aquí el middleware protege ÚNICAMENTE `/history` y `/api/history`. `/` y `/api/analyze` son públicas. T0.4 lleva un test que falla si alguien protege `/` por inercia.

**Módulos de F0 elegidos** (menú cruzado contra el PRD; regla: si el PRD no lo exige, fuera)
- Entran: esqueleto+gate (T0.1), Docker+Postgres (T0.2), Drizzle (T0.3), auth multi-usuario (T0.4).
- **Fuera: worker/pg-boss, máquina de estados, checkpoints, sweeper, SSE, storage, spend ledger, credenciales cifradas.** Justificado en §5.2 del PRD: una cadena se resuelve en milisegundos de CPU, no hay proceso persistido ni progreso que emitir. Es tentador meterlos "porque es un banco de pruebas y hay que ejercitarlos", y por eso está anotado como **riesgo R6**: sería esqueleto muerto que el gate mantiene para nadie. Cualquier módulo nuevo exige cambio de PRD, no un atajo en el planning.
- **Dos desviaciones del menú, aprobadas por el usuario**: (1) el módulo "UI principal v1" NO va en F0 — la pantalla principal *es* la feature y su motor nace en F1; montarla en F0 contra un motor de pega y recablearla después es churn. (2) el deploy NO va en F0 sino en fase propia (F3): desplegar un cascarón no verifica nada. **El coste asumido de (2)**: las roturas exclusivas de producción (el gotcha de `next start` vs `next dev`) se descubrirán al final.

**Design system y mockups**
- DS: `https://claude.ai/design/p/9d6b478a-191a-4d6c-8071-441488dd195f`. Ya es específico de este producto: `StepCard`, `ChainSummary`, `ConfidenceBar` y `HistoryRow` existen porque el PRD los pide. Eso hizo que TD.2–TD.5 se pudieran repartir contra el inventario real y no contra una plantilla genérica.
- Mockups: `https://claude.ai/design/p/1132e88c-090e-42ad-a121-490714cf7ec5`. **Variante elegida: A "Claro"**. Cuatro pantallas: `FieldClaro` → `/`, `HistoryClaro` → `/history`, `LoginClaro` → `/login`, `SignupClaro` → `/signup`.
- **Desviación deliberada del patrón TD**: TD.1 se encarga también del espejo de `docs/mockups/`. Motivo: los mockups son JSX que necesitan el bundle del DS para renderizar; fabricarlos a mano en el bootstrap habría sido inventar el diseño. TD.1 es la primera tarea que tiene `DesignSync` y el DS en la mano, y la regla 7 exige el mockup local antes de T0.4.
- **Pendiente en TD.1**: confirmar si `variant-mobile.jsx` es de la variante A o de la B (anotado en `docs/mockups/README.md`).
- **Consecuencia de orden que conviene recordar**: el grafo obliga a T0.1 → TD completa → T0.2. La primera parada de revisión humana (el OK visual de TD.7) llega muy pronto.

**El VPS: lo que se descubrió inspeccionándolo (el bucle corre DENTRO del VPS)**
- Topología real, verificada contra `~/infra/caddy` y el proyecto vecino `ugc-factory`: Cloudflare (proxy naranja, SSL Full strict) → Caddy central `edge-caddy` en **`network_mode: host`** → `127.0.0.1:<puerto>`. La fuente de verdad operativa es **`~/AGENTS.md` del VPS**: léelo antes de tocar producción.
- **Bloque de puertos reservado para devtools: 3110–3119 (web=3110)**, según el registro de `~/AGENTS.md` §3. T3.1 debe registrarlo allí en el mismo cambio — ese fichero lo exige.
- **Nunca publicar en `0.0.0.0`**: un puerto abierto por Docker se salta UFW (Docker escribe iptables por debajo del firewall). Solo `127.0.0.1:3110`.
- **Trust boundary**: hay DOS proxies delante. El vecino ya lo resolvió con `header_up X-Forwarded-For {client_ip}` + `TRUST_PROXY=1`, pero con Cloudflare en proxy naranja **eso da la IP de Cloudflare**: la real llega en `CF-Connecting-IP`. Afecta a los dos rate limits (login de T0.4 y `/api/analyze` de T1.4); se cierra en T3.1.
- Por esto el **PRD subió a v1.1** (2026-07-17): §10 y §11 se corrigieron contra el terreno. El §10 original daba VPS y DNS por pendientes de contratar y ambos existían ya. Sin cambio de alcance.
- El directorio del repo se renombró de `~/projects/test-project` a **`~/projects/devtools`** para cumplir la convención `~/projects/<proyecto>` de `~/AGENTS.md` y para que la autodetección local/remote de la skill `deploy` funcione por "ruta del repo == REMOTE_DIR".

**Deudas del arnés detectadas en el bootstrap** (ninguna se tocó: la skill bootstrap prohíbe modificar `scripts/`, hooks y skills)
1. **`scripts/readme-status.mjs` no ve la fase TD.** Detecta fases con `^## (F[\dA-Za-z]+) — (.+)$`, que exige prefijo `F`; `## TD — Design system` no casa y `current` se pone a null, así que sus **7 tareas no se cuentan**. La portada dice "0 de 18" cuando el planning tiene 25. Que el regex de *tareas* sí contemple `TD.1` (con un comentario que lo menciona) indica que es un descuido, no una decisión. Anotado también como nota visible en el README para que la portada no engañe.
2. **`redeploy.sh` asume una red docker `edge` que este VPS no usa.** Hace `docker network create edge` + `docker network connect edge edge-caddy`, y `edge-caddy` corre en modo host: un contenedor en host **no se puede conectar a una red bridge**. La rama es inerte (falla con `warn`, no rompe el deploy). La vía correcta —loopback— la contempla la propia SKILL.md. Configurado en `deploy.env` como `CADDY_UPSTREAM="127.0.0.1:3110"` y documentado allí.
3. **Sin CI todavía**: el repo se creó en el bootstrap (`carlosvillu/devtools`, público). Activar CI cuando haya `package.json` (T0.1 en adelante).

**Decisión pendiente para el usuario (no bloquea T0.1)**
- **AGPL §13 y el enlace a fuente**: devtools es una webapp bajo AGPL-3.0. La §13 obliga a quien despliegue una versión *modificada* a ofrecer su código a los usuarios que interactúen por red — lo habitual es un enlace "Source" visible en la UI. Los mockups de la variante A no lo llevan. No se añadió nada al planning para no meter alcance sin aprobar; si el usuario lo quiere, es un cambio menor en el layout de T1.5 (y en el mockup, que manda).

**Coste del bootstrap**: solo agentes (sin APIs de pago; D8). Ninguna tarea del planning lleva `Coste estimado` por el mismo motivo — si alguna llegara a necesitar una API de pago, es cambio de alcance (regla 6), no improvisación de presupuesto.

## 2026-07-17 · arnés: la skill deploy y readme-status, corregidos en el template y sincronizados aquí

Las tres deudas que dejó anotadas el bootstrap están **pagadas**: se arreglaron en `web-template` (commit `b3f2916`, pusheado) y se sincronizaron a este repo. Lo que reveló la carencia fue el propio bootstrap: tuve que esquivar a mano todo lo de abajo para escribir T3.1, que es exactamente la señal de que el arnés estaba mal, no el proyecto.

**Causa raíz**: la skill `deploy` se escribió contra un VPS imaginado y **nunca contra `~/AGENTS.md`**, que es donde el VPS documenta su propia realidad. Ahora la §Topología apunta allí como fuente de verdad. Si vuelves a encontrar un desajuste entre skill y VPS, ese es el sitio donde mirar primero.

**Qué cambió (todo verificado, no deducido)**
1. **La red `edge` no existe ni puede existir.** `redeploy.sh` hacía `docker network create edge` + `docker network connect edge edge-caddy` en cada deploy. Probado en el VPS: docker lo rechaza — *"container sharing network namespace with another container or host cannot be connected to any other network"* — porque `edge-caddy` corre en `network_mode: host`. Un `warn` lo tapaba. Y con el default `CADDY_UPSTREAM="web:3000"` el site file generado **nunca habría resuelto**: el dominio no enrutaría. Paso eliminado (5 → 4).
2. **`WEB_PORT` es ahora obligatorio** en `deploy.env` (falla rápido con mensaje claro) y `CADDY_UPSTREAM` deriva de él. Aquí vale **3110** (bloque 3110–3119 de `~/AGENTS.md` §3). Antes yo lo tenía escondido dentro de `CADDY_UPSTREAM`, que era un apaño.
3. **El site file generado ya lleva `header_up X-Forwarded-For {client_ip}`.** La SKILL afirmaba que Caddy sobrescribía el header; el fichero que generaba no lo hacía. El vecino lo había añadido a mano en producción y el template nunca aprendió.
4. **Cloudflare y `CF-Connecting-IP` documentados** en la skill `deploy` y en `f0-modules.md`. Consecuencia directa para **T3.1**: con proxy naranja hay DOS proxies, `x-forwarded-for` trae la IP de Cloudflare y la real va en `CF-Connecting-IP`. **Esto ya está vivo como bug en el proyecto vecino** (`carlosvillu/ugc-factory#2`): su rate limit de login agrupa a todos los usuarios por IP de borde de Cloudflare. Evidencia en el issue.
5. **`readme-status.mjs` ya ve las fases transversales**: los dos regex comparten un `PHASE_ID` que acepta `F0..Fn` y `T<LETRA>`. Verificado contra este planning: **0/25 con las 5 fases**, TD incluida. La portada ya no miente y la nota de aviso del README se ha retirado.

**Cambio de infraestructura, no del arnés**: los remotes de `web-template` y `devtools` pasaron de HTTPS a SSH (`git@github.com:…`), como ya tenía ugc-factory. Motivo: no hay credential helper para HTTPS en este VPS, así que **el `git push` del bucle habría fallado en la primera tarea** — el push del bootstrap coló solo porque lo hizo `gh` con su propia auth, no `git`. Con SSH está probado que funciona.

**Sigue pendiente (no se tocó)**: las skills del proyecto (`deploy`, `frontend`, `testing`…) conservan `{{PROJECT_NAME}}` sin sustituir en sus descripciones — el bootstrap solo rellena placeholders en `CLAUDE.md`, `AGENTS.md` y `README.md`. Es cosmético (afecta a cómo se listan las skills), pero es deuda real del template.

## 2026-07-17 · ⏳ T0.1 iniciada

Primera tarea del proyecto: monorepo pnpm (`apps/web`, `packages/core`, `packages/db`), tooling compartido, logger pino con `request_id`, `pnpm gate` con los 6 pasos y `/api/health`. Coste esperado: solo agentes (D8, sin APIs de pago).

## 2026-07-17 · T0.1 cerrada — PASS

- Coste: $0 (vs estimado $0; D8: sin APIs de pago) · Ciclos verifier: **2 (FAIL → fix → PASS)** · Tests: 43 en 6 ficheros · Evidencia: `docs/verifications/T0.1/` (conserva el ciclo FAIL→PASS entero: el FAIL es la prueba de que la verificación muerde)

**Decisiones no obvias que heredan las siguientes tareas**
- **Versiones**: Next 16.2.10, React 19.2.7, TypeScript ~5.9 (existe TS 7, pero typescript-eslint 8 declara peer `<6.1.0`), ESLint 9.39.5 (existe 10; eslint-config-next 16 no lo declara probado), zod ^4, pino ^10. Lo compartido va por catalogs.
- **`withRoute(handler, { route, … })`**: el parámetro `route` es un añadido sobre `api.md` (que pasa solo `schemas`). Lo necesita el child logger para tener un nombre estable de ruta. **Todo handler nuevo debe pasarlo.**
- **La opacidad del 5xx es propiedad del STATUS, no orden de ramas** (`errors.ts`): opaco ⟺ `status >= 500`, detalle SOLO al log. Nació de un bug real (ver incidente 2). No lo conviertas otra vez en una rama.
- **`packages/db` nace vacío** (`export {}`) y **no declara `@app/core`** todavía: sería dep huérfana y knip la caza. T0.3 la añade.
- **`HealthSchema` es hoy `{ok: literal true}`; T0.2 le añade `db: boolean`** (PRD §9). El acoplamiento core↔web que sostiene el control negativo de la Verificación vive en `const body: Health` de `route.ts` — no lo quites.
- **`@app/test-utils` tiene `capture-logs`**: es LA costura con la que se prueba §11. Úsala; no te fabriques otra (`testing/SKILL.md:96` lo veta).
- **`knip.json` ignora `pino-pretty`**: knip no ve un `target: '<string>'`. Está acotado y apunta al test que sí la protege (verificado: quitando el ignore, knip tumba el gate; mutando el target, 3 tests rojos).
- **`pnpm gate` solo existe en la raíz.** Desde un paquete falla con `Command "gate" not found`, que no es un error útil. Ejecuta siempre desde la raíz.

**Incidente 1 — EL ARNÉS MÁS CÓMODO QUE LA REALIDAD (el FAIL del verifier)**
`pino-pretty` no estaba declarado en ningún `package.json`, pero el logger pide `transport: {target:'pino-pretty'}` cuando `NODE_ENV === 'development'` — lo que pone `next dev`. `makeLogger()` lanzaba al construirse ⇒ **HTTP 500 en TODA ruta que pasara por `withRoute`, en desarrollo**. `next start` funcionaba: el fallo era **dev-only**.
La suite estaba **VERDE** todo el tiempo. El mecanismo del engaño, y esto es lo generalizable: `route.test.ts` se declaraba a sí mismo «la conservación permanente de esta cláusula, no solo un curl one-shot del verifier», pero llamaba a `GET()` **en proceso y bajo `NODE_ENV=test`**, donde `pretty=false` y el transport roto no se construye jamás. Test verde y endpoint 500 conviviendo sin contradicción, porque **ninguna rama `pretty:true` se instanciaba en toda la suite**.
→ **Regla derivada (añadida a la skill `testing` y a `dev-loop` en esta misma sesión)**: la conservación permanente de una cláusula (regla 8 del planning) tiene que **ejercitar la MISMA capa que la Verificación**. Si la Verificación dice «curl contra el servidor levantado», un test que llama al handler en proceso NO la conserva — y encima miente diciendo que sí.
→ Efecto colateral bueno: `bootstrapErrorResponse` convirtió el crash crudo de Next en un 500 con envelope + traza por stderr. Por eso el diagnóstico fue de 30 segundos.

**Incidente 2 — el 500 «opaco» no lo era** (lo cazó `simplify`, verificado ejecutando el wrapper)
`AppError('internal', msg, details)` salía por la rama `instanceof AppError` y serializaba `message` y `details` **verbatim al cliente**, esquivando el fallback opaco: el body llegó a llevar una connstring. `architecture.md` §5 es vinculante («el detalle va SOLO al log»). No filtró nada porque los mensajes eran literales nuestros, pero **el primer throw site vivo de `AppError('internal', …)` lo creó un fix pedido en el propio REVIEW de esta tarea** — el hueco pasó de teórico a portante en el mismo ciclo. En F1, `throw new AppError('internal', \`no se pudo parsear ${input}\`)` habría mandado el input del usuario AL CLIENTE, por encima de `REDACT_PATHS` (que solo cubre logs).

**Incidente 3 — la captura de logs que miente VACÍA** (corrige un hallazgo MÍO que era falso)
El bucle afirmó que pino con `transport` + `destination` **lanza**. Es **FALSO**, verificado por el implementer y confirmado por el bucle: pino **no lanza — el transport gana y el destination se descarta en silencio (0 líneas capturadas)** mientras el dato sale por stdout. Consecuencia directa: **cualquier test que combine ambos y afirme `not.toContain('secreto')` pasa VACUAMENTE**, y son justo los tests que protegen §11. Hoy no ocurre (`captureLogs()` nunca pasa `pretty`, todas las llamadas van a `trace`, y el test de §11 de `with-route.test.ts` lleva guard `expect(captured.lines.length).toBeGreaterThan(0)`).
→ Lección de método, no solo de pino: **el bucle trasladó un diagnóstico sin verificarlo y el implementer hizo bien en testearlo en vez de creérselo.** Un assert negativo (`not.toContain`) sin un assert positivo que exija captura no vacía no prueba nada.

**Hueco conocido y documentado (NO es deuda pendiente: es contrato)**
`err.message`/`err.stack` **NO los cubre la redaction** de pino. Verificado: V8 mete un prefijo de 10 caracteres del input en los mensajes de `JSON.parse` (`"eyJhbGciOi"... is not valid JSON`). Está escrito en `redact.ts` y `logger.ts`, y **fijado por tests en core** que se ponen rojos si alguien añade un serializer que scrubee (cambiar la política es visible, no silencioso). Por eso `readJson` distingue el TIPO del fallo (`err_name`) y **jamás** su mensaje.

**Deuda anotada**
1. **Para T1.4 (la tarea que estrena el contrato de `POST /api/analyze`)**: `REDACT_PATHS` **adivina** los nombres de campo (`input`/`raw`/`value`) de un contrato que aún no existe, y `logger.test.ts` es circular en ese punto (prueba que `input` se redacta porque la lista dice `input`). **Si F1 llama al campo `text`, `source` o `payload`, la única pieza estructural del §11 deja de cubrir nada EN SILENCIO y el gate sigue verde.** T1.4 está obligada a revisar esa lista contra el contrato real. La red no es el mecanismo: el mecanismo es no pasarle el input al logger.
2. `setup-env.ts` carga `.env.test.local` bajo `if (existsSync(...))` y ese fichero no existe: rama no recorrida por nadie. Riesgo bajo (infra de test, fallaría ruidosamente). Confirmado por el verifier.
3. Warning no bloqueante de ESLint: `Multiple projects found, consider using a single tsconfig with references…`.

**Test borrado (excepción consciente a «no se debilitan tests»)**
`route.test.ts` tenía un test «es público: responde sin cookie de sesión (D6)» que **no podía fallar**: hacía la misma llamada que el test de la línea 9 y llamaba a `GET()` directo, así que ni con el middleware de T0.4 habría cazado que alguien protegiera `/api/health`. Cobertura falsa de una decisión de producto es peor que ninguna. **El test real de D6 lo escribe T0.4**, que ya lo tiene asignado.

**Considerado y RECHAZADO**
- Paralelizar los pasos del gate (medido: 46.8s → ~21s). `pnpm gate` es propiedad del arnés y su orden con fail-fast es deliberado; 47s no duele. No se toca sin decisión explícita.

**Decisión de proceso**
- **`ds-reviewer` (paso 5c) SALTADO deliberadamente**: el diff toca `apps/web/**`, pero ese pase revisa contra el espejo del Design System en `docs/design-system/`, que **está vacío hasta TD.1**. No hay primitivas que adoptar y `page.tsx` no lleva ni un estilo a propósito. Saltarlo en silencio habría sido deriva; queda escrito. Ver la entrada de arnés siguiente.

## 2026-07-17 · arnés: la conservación de una cláusula debe ejercitar su MISMA capa; y `ds-reviewer` necesita un DS que exista

Dos carencias que reveló T0.1, corregidas en la misma sesión (regla de mejora continua del arnés). Ambas nacen de incidentes reales de este ciclo, no de especulación.

**1 · `testing/SKILL.md` — séptima forma del anti-patrón «el arnés más cómodo que la realidad»**
El FAIL del verifier (incidente 1 de la entrada de T0.1) no encaja del todo en ninguna de las seis formas que ya listaba la skill: la más próxima («el runtime del test es más permisivo que el de producción») habla de Node vs bundler/navegador, y aquí el runtime era el mismo — lo que cambiaba era **la rama de configuración que selecciona `NODE_ENV`**. Añadida como forma 7: **un test que dice conservar una cláusula de la Verificación pero la ejercita en otra capa**, con la pregunta de control (g) y el corolario «una rama de config que ningún test instancia no existe hasta que un usuario la pisa». Lo que la hace cara es que el test **declaraba por escrito** que conservaba la cláusula: esa frase es la que apaga la alarma de todo el mundo, incluido el bucle.

**2 · `dev-loop/SKILL.md` §5c — `ds-reviewer` exige que el espejo del DS exista**
La condición era «corre si el diff tocó `apps/web/**`». T0.1 la cumple (crea `page.tsx`, `layout.tsx`, `globals.css`) pero `docs/design-system/` está vacío hasta TD.1: el pase revisa el diff CONTRA el espejo, así que sin espejo no hay vara de medir y solo puede producir ruido. La condición pasa a ser «tocó `apps/web/**` **Y** el espejo existe», con la obligación de anotarlo en el journal cuando se aplique la excepción. Es un desajuste de ORDEN inherente a este planning (T0.1 va antes que TD.1, y su página raíz no lleva estilos a propósito), no un caso patológico.

**3 · `dev-loop/SKILL.md` §5a — el revisor compara capa-de-la-cláusula vs capa-del-test**
Contrapartida operativa de (1) en la lista de lo que el revisor tiene que hacer.

## 2026-07-17 · ⏳ TD.1 iniciada

Espejo del DS (`docs/design-system/`) + tokens verbatim en `globals.css` (3 bloques de Tailwind v4) + fuentes self-hosted + showcase `/design-system` con switchers + espejo de los 5 mockups de la variante A. Coste esperado: solo agentes.
Comprobado por el bucle antes de arrancar: **ambos proyectos de Claude Design son legibles con `DesignSync`**. El DS (`9d6b478a…`) tiene 97 paths y su inventario coincide EXACTO con lo que leyó el bootstrap. El de mockups (`1132e88c…`) es `PROJECT_TYPE_PROJECT`, **no un design system**, por eso NO sale en `list_projects` (que filtra a design systems escribibles) — hay que ir a él por `projectId` directo. Contiene `variant-claro.jsx`, `variant-mobile.jsx`, `variant-oscuro.jsx`, `ui-shared.jsx`, `support.js`, `design-canvas.jsx` y `devtools Mockups.html`.

## 2026-07-17 · TD.1 · corrección de alcance MENOR: fuera los switchers de acento y densidad

**El implementer paró en punto estable** y pidió fallo antes de construir el showcase. Tenía razón, y el bucle lo verificó contra fuentes primarias antes de decidir nada (regla: no se traslada un diagnóstico sin comprobarlo).

**Lo verificado (tres ángulos independientes, ninguno de memoria)**
1. **El DS no soporta ni acento conmutable ni densidad.** Leídos con `DesignSync`: `tokens/colors.css` define **UN** acento (`--blue-*`; el comentario dice «one accent», `guidelines/colors-accent.html` se titula «the single brand hue») y **ningún** `[data-accent]`; `tokens/base.css` y `tokens/typography.css` **no tienen `--ui-fs`** ni escala de densidad (el type scale es rem fijo, base 16px). El `readme.md` del DS añade «Max restraint: no gradients, no decorative colour fields».
2. **El PRD no menciona acento, densidad ni switchers**: cero coincidencias. **Ninguna decisión de producto se toca** al retirarlos.
3. **La skill `frontend` los formula CONDICIONALES**: «los acentos conmutables **los dicta el DS**», «**Si** el DS define densidades, viven como var de escala (p. ej. `--ui-fs`)», «`--accent` … **y puede ser conmutable**». El planning los transcribió en afirmativo: **arrastre de la plantilla genérica**.

**Por qué es MENOR y no una parada**: el cambio de alcance mayor se define como «el PRD necesita un ajuste que altera decisiones de producto». Aquí el PRD **no necesita ajuste ninguno** — nunca prometió esto. Lo que estaba mal era el planning, que contradecía el DS del propio usuario. Corregido en la misma sesión (TD.1 Entrega, subtareas y Verificación; **y la Verificación de TD.7**, que exigía «≥2 acentos» y era igual de imposible de pasar). Si algún día se quieren acentos: se añaden al DS en Claude Design primero, y el código los hereda — nunca al revés.

**Segunda corrección del planning: el gotcha `--shadow-*` era FALSO.**
Decía que `--shadow-*` crea un `var()` circular con `@theme` y mandaba renombrar a `--elevation-*` («la ÚNICA desviación de naming permitida»). El implementer lo desmontó con un **build real** de Tailwind v4.3.3: `@theme inline` **no emite la variable**, inserta el `var()` en la utilidad (`.shadow-sm { --tw-shadow: var(--shadow-sm) }`, resolviendo contra el `:root` del volcado). **Cero circularidad.** Renombrar habría metido una desviación de naming para un problema inexistente, violando el «naming 1:1» que es la regla primaria. Y el «única colisión» también era falso: colisionan **7 namespaces** (`--radius-*`, `--text-*`, `--font-*`, `--leading-*`, `--tracking-*`, `--ease-*`, `--shadow-*`), y todos conservan el nombre del DS. Gotcha retirado del planning con la evidencia escrita.
→ **Lección de método**: el gotcha venía de la plantilla y sonaba plausible. El implementer no lo obedeció ni lo ignoró: lo **probó**. Es el mismo patrón que el incidente 3 de T0.1 (el bucle afirmó que pino lanzaba y era falso). **Una advertencia heredada no es un hecho verificado.**

**Resuelto el pendiente de `variant-mobile.jsx`** (lo dejó abierto el bootstrap en `docs/mockups/README.md`): **ni A ni B — contiene LAS DOS**. Su cabecera dice «Mobile versions of all pages, both variants» y exporta `FieldClaroM/HistoryClaroM/LoginClaroM/SignupClaroM` junto a los `*OscuroM`; el `Shell` recibe `theme` por parámetro. La referencia responsive de la variante A son los `*ClaroM`. **No hace falta criterio del usuario.**

**Desviaciones deliberadas de TD.1 (documentadas en código)**
1. **Fuentes**: el DS las carga por `@import` a Google Fonts (`tokens/fonts.css`), incompatible con la cláusula «0 CDNs» de la Verificación. Self-hosted con el paquete `geist` + `next/font`; misma fuente, solo `--font-sans`/`--font-mono` puentean a `var(--font-geist-*)`. El `readme.md` del DS invita explícitamente a ello.
2. **`rounded-base`**: el `--radius: 6px` del DS no tiene forma de clase en Tailwind v4 (`rounded` a secas está fijado a `0.25rem`).

**Hallazgo colateral que habría roto el volcado verbatim en silencio**: **prettier reescribía 21 valores del DS** (`oklch(0.930 0.050 295)` → `oklch(0.93 0.05 295)`). Mismo color, pero rompe la fidelidad literal que hace triviales los diffs contra el espejo. `globals.css` añadido a `.prettierignore` (como ya estaba `docs/`) y los 21 restaurados.

**Deuda del arnés — el espejo se vuelca A MANO** (anotada, no arreglada)
`DesignSync.get_file` devuelve el contenido **al contexto del agente**, y la única forma de persistirlo es que el agente lo **reescriba con `Write`** — es decir, «editar a mano» un espejo cuyo contrato dice que **JAMÁS se edita a mano**, con riesgo de corrupción silenciosa. Para los 8 ficheros de fundaciones es asumible (y merecen spot-check); para `_ds_bundle.js` y 60+ componentes es caro y frágil. **Además: `DesignSync` NO es visible para los subagentes** — el implementer delegó el volcado a un `general-purpose` y volvió con «No matching deferred tools found». Solo puede volcarlo el agente que tiene la sesión de claude.ai. Consecuencia práctica: el volcado del espejo no se puede paralelizar; lo hace el implementer en serie o el bucle.

## 2026-07-17 · ⏸ PARADA en TD.1 (VERIFY) — el entorno no tiene navegador para el gate CUA

TD.1 está **code-complete y en verde**, pero **no cerrada**: su Verificación es visual y el entorno no puede correr un navegador. Prerequisito externo (clase ⚠), parada legítima del protocolo. Preguntado al usuario (AskUserQuestion): eligió **provisionar las libs por `sudo`** él mismo. A la espera de que ejecute el `apt-get install`.

**Qué está hecho y revisado en TD.1** (todo staged, sin commitear):
- Volcado completo del espejo `docs/design-system/`: fundaciones + 14 guidelines + **62 ficheros de `components/**`** (round-trip verificado byte-a-byte con `jq`, sin transcripción a mano) + `SKILL.md` + `_adherence.oxlintrc.json` (confirmado: es el insumo de TD.6).
- `globals.css`: volcado verbatim de tokens en los 3 bloques de Tailwind v4; namespaces del DS vaciados con `*: initial`.
- 5 mockups en `docs/mockups/` renderizables offline en `file://` (React 18.3.1 + Babel 7.29.0 **self-hosteados**, sha384 idéntico al canvas; `_ds_bundle.js` 56 KB).
- Página `/design-system` (server component, prerender estático) + switcher de tema (island `'use client'`, anti-flash, cleanup anti-fuga).
- **REVIEW completo**: `code-review` (medium) → arregló una fuga real de `data-theme` entre rutas (cleanup al desmontar, con control negativo); `simplify` → 2 cleanups aplicados + 2 notas de altitud documentadas; **`ds-reviewer` → LIMPIO** (primera vez que corre: el espejo del DS ya existe).
- Gate: **57 tests / 9 ficheros, verde**. Build: `/design-system` `○ Static`.

**Parte automatizable de la Verificación (hecha, evidencia en `docs/verifications/TD.1/report.md`)**: el HTML servido tiene los specimens + switcher; fuentes self-hosted (`../media/Geist*.woff2`, 0 Google Fonts); 0 hosts externos en el HTML de la página y su CSS. **Pendiente de navegador**: switch de tema en vivo, paridad visual vs `guidelines/`, render de los 5 mockups, y la pestaña de red definitiva (0 CDN).

**INCIDENTE DE ENTORNO — no hay navegador operable (afecta a TODO el pipeline web)**
`agent-browser` (0.32.1) trae su Chrome pero **no arranca**: faltan ~20 libs de sistema (`libatk`, `libgtk-3`, `libcups`, `libgbm`, `libpango`, `libX*`, `libatspi`, `libavahi`…) y **no hay `sudo` con contraseña**. Impacto: el gate CUA no corre en NINGUNA tarea web (TD.1, TD.7, T0.4, T0.5, F1, F2) ni los specs Playwright permanentes.
- **Workaround PROBADO por el bucle** (por si el `sudo` del usuario no fuera opción en el futuro): `apt-get download` de las libs (sin root) + extraer a un prefijo + `LD_LIBRARY_PATH` con **rutas ABSOLUTAS** (con relativas falla al cambiar de cwd) → **Chrome headless directo arranca y renderiza** (probado: `chrome --headless --dump-dom localhost:3000/api/health` → `{"ok":true}`). 
- **Dos paredes con `agent-browser`**: (1) no propaga `LD_LIBRARY_PATH` a su Chrome hijo; (2) el intento de instalar un wrapper de su binario lo **bloqueó el clasificador de permisos**. También bloqueó `kill`/`pkill` genéricos (un `kill <pid>` concreto sí pasó). Por eso la vía elegida es que el usuario instale las libs a nivel de sistema (entonces `agent-browser` funciona sin trucos).
- **Comando dado al usuario**: `sudo apt-get install -y libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 libgbm1 libasound2t64 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxkbcommon0 libpango-1.0-0 libcairo2 libatspi2.0-0t64 libgtk-3-0t64` (apt resuelve el resto de la cadena). Alternativa: `npx playwright install-deps chromium`.

**Decisiones de TD.1 que heredan las siguientes tareas** (no obvias):
- **Infra de tests de componente — divergencia DELIBERADA de `testing/frontend.md §2`, documentada en `apps/web/vitest.config.ts`**: TD.1 usa jsdom **por-fichero** (`// @vitest-environment jsdom`), sin `@vitejs/plugin-react` (hipótesis: `oxc.jsx` lo hace redundante) y sin `vitest.setup.ts`. Basta para TD.1. **TD.2 DEBE** montar el setup jsdom a nivel de proyecto que pide la skill (`vitest.setup.ts` con matchers de jest-dom + mocks `matchMedia`/`ResizeObserver`) ANTES de que las primitivas Base UI (dialog/popover/tooltip) lo exijan — o caerá en el falso negativo silencioso que §2 advierte. Y confirmar si `oxc.jsx` hace redundante a `plugin-react`. Es un caso "la skill puede necesitar actualización": se resuelve en TD.2 con la evidencia de volumen, no ahora.
- **`packages/test-utils/src/setup-env.ts`**: se cambió `fileURLToPath(new URL())` → `import.meta.dirname` porque el primero peta bajo `environment: jsdom` (vitest sustituye el `URL` global). Defecto latente de T0.1 que el primer test de componente destapó. Corre en TODOS los proyectos; verificado que sigue verde en los node.
- **`theme-switcher.tsx`**: el cleanup hace `removeAttribute('data-theme')` INCONDICIONAL — asume propiedad exclusiva de `<html data-theme>`. Cuando **F1** introduzca theming de app global, su provider debe **guardar y restaurar** el valor previo, no borrar. Anotado en el docblock.
- **`eslint.config.ts` y `knip.json`** ignoran `docs/**` (espejo + mockups con vendor JS; no es código del proyecto, igual que `.prettierignore`).
- **`docs/mockups/assets/vendor` pesa ~4.2 MB** (babel-standalone 3 MB + react-dom dev 1.1 MB) versionados. **Considerado y aceptado**: es artefacto de referencia bajo `docs/` en un banco de pruebas; el peso del repo no es preocupación de producto (D1); a cambio los mockups renderizan offline. Alternativa (volver a unpkg CDN) anotada por si se revisa.
- **`variant-mobile.jsx` resuelto** (pendiente que dejó el bootstrap): contiene LAS DOS variantes («both variants»); la referencia responsive de la A son los `*ClaroM`. Anotado en `docs/mockups/README.md`.
- **Limitación del arnés**: `DesignSync` sirve para el bucle principal pero **es intermitente/ausente en subagentes** (un implementer volvió con «No matching deferred tools»; su MCP se cayó a media tarea). El volcado del espejo no se puede paralelizar en hijos con fiabilidad; lo coordina el bucle o un implementer con conexión viva, en serie, con round-trip byte-a-byte (riesgo de corrupción silenciosa al reescribir con `Write` lo que `get_file` devuelve al contexto).

## 2026-07-17 · arnés: CUA operativo en el VPS + `--no-sandbox` documentado

Instaladas las dependencias de CUA (`agent-browser`, Vercel Labs) para el gate de verificación de UI, que TD.1 estrena (primera tarea con superficie web verificable en navegador). Estado: CLI 0.32.1 global, Chrome 151 instalado, daemon vivo, CDN alcanzable.
- **Librerías de sistema del navegador**: faltaban 12 (`libatk-1.0.so.0`, `libgbm.so.1`, `libcups.so.2`, `libasound.so.2`, `libpango-1.0.so.0`, X11…). Las instaló el USUARIO con `sudo agent-browser install --with-deps` (requiere root; el bucle no tiene sudo sin contraseña). Una sola vez.
- **`--no-sandbox` es obligatorio en este entorno**: Ubuntu 24.04 con `kernel.apparmor_restrict_unprivileged_userns = 1` desactiva los user namespaces sin privilegios ⇒ el sandbox de Chrome no arranca. Verificado: `agent-browser open --args "--no-sandbox" https://example.com` navega y `get title` lee la página. `agent-browser doctor` seguirá dando **1 fail en «Launch test»** (su prueba interna no acepta args) — NO es bloqueo. Documentado en `testing/references/cua.md` §Paso 2 para que ningún verifier lo lea como FAIL ni lo re-descubra.

## 2026-07-17 · TD.1 · FAIL del verifier en los mockups → corregido (2 bugs de `file://`)

Con el navegador ya operativo, el verifier corrió TD.1 completa contra Chrome real: **fundaciones y showcase PASARON** (specimens, switcher de tema en vivo, paridad vs `guidelines/`); **los 5 mockups FALLARON** por dos bugs que la verificación estática no veía. Ambos corregidos y **reverificados en navegador** (`agent-browser`, `--no-sandbox`, `file://`): los 5 renderizan con contenido y 0 errores de consola; 0 hosts externos en la pestaña de red.

- **Bug 1 — mockups EN BLANCO en `file://`**. Cargaban el JSX con `<script type="text/babel" src="…">`; babel-standalone lo pide por **XHR**, y **Chrome bloquea XHR bajo `file://`** → componentes `undefined` → `#root` vacío. Servidos por HTTP renderizaban bien (por eso la verificación estática y las sesiones previas no lo vieron). **Fix**: precompilar los `.jsx` a `.js` plano (Babel preset `react`) y cargarlos con `<script src>` normales; el bloque `App` inline va compilado y **envuelto en IIFE** — sin ella, su `const { DesignCanvas… } = window` colisiona en ámbito global con las `function DesignCanvas/DCSection/DCArtboard` que `design-canvas.js` declara a top-level (con babel-over-HTTP cada script tenía ámbito propio; como `<script>` plano comparten el global). Fuera `@babel/standalone` del runtime.
- **Bug 2 — Google Fonts (CDN) en los mockups**. Enlazaban `../design-system/tokens/fonts.css` (y `styles.css`, que lo re-`@importa`), cuya línea 4 hace `@import` de `fonts.googleapis.com` → 5 peticiones externas (una por mockup), capturadas en el `.har` del verifier. **Fix**: los HTML dejan de enlazar `fonts.css`/`styles.css` del espejo y enlazan `assets/fonts.css` (Geist/Geist Mono self-hosted desde `assets/fonts/*.woff2`, del paquete `geist`). El espejo NO se tocó (es solo-lectura). Los otros 5 token files se siguen reutilizando por ruta relativa (no van a CDN).

**Retracto de claims previos de este journal que quedaron falsos** (para que el registro no mienta):
- El bullet de arriba «5 mockups renderizables offline en `file://` (React 18.3.1 + Babel 7.29.0 self-hosteados…)» **era falso**: renderizaban en blanco por `file://`. Ahora sí renderizan, pero **sin Babel en runtime** (precompilados).
- «`docs/mockups/assets/vendor` pesa ~4.2 MB (babel-standalone 3 MB + react-dom dev 1.1 MB)»: al quitar `babel.min.js`, `vendor/` baja a ~1.2 MB (solo React + ReactDOM dev). El argumento del peso ya no incluye babel.
- La «única dependencia de red que queda: `tokens/fonts.css` → Google Fonts» del README de mockups **se eliminó**: ahora son 0 CDNs, verificado en la pestaña de red del navegador.

## 2026-07-17 · TD.1 cerrada — PASS

- Coste: $0 (D8, sin APIs de pago) · Ciclos verifier: **3 (BLOQUEADA por navegador → FAIL → PASS)** · Tests: 57 en 9 ficheros · Evidencia: `docs/verifications/TD.1/` (conserva el histórico bloqueo→FAIL→PASS entero)
- Commit: (ver abajo) · El espejo del DS, `globals.css`, `/design-system`, el switcher de tema y los 5 mockups quedan vivos.

**Decisiones no obvias que heredan TD.2–TD.7 y F1/F2**
- **CUA operativo** (ver la entrada de arnés): `agent-browser` + Chrome funcionan con `--no-sandbox`. El gate CUA ya corre en tareas web. La entrada previa «PARADA por falta de navegador» quedó RESUELTA.
- **Corrección de alcance de TD.1 (solo-tema)**: se retiraron los switchers de acento y densidad porque el DS no los define (un solo brand hue; sin tokens de densidad) y el PRD no los menciona — arrastre de plantilla. Confirmado por el usuario. Si algún día se quieren, empiezan en Claude Design, no en código.
- **El gotcha `--shadow-*` del planning era FALSO** (premisa incorrecta): `@theme inline` no crea `var()` circular. Naming 1:1 conservado en los 7 namespaces que colisionan. No lo re-introduzcas.
- **Infra de tests de componente (jsdom)**: TD.1 usó jsdom por-fichero sin setup a nivel de proyecto. **TD.2 DEBE montar `vitest.setup.ts`** (jest-dom + mocks matchMedia/ResizeObserver) ANTES de que las primitivas Base UI (dialog/popover/tooltip) lo exijan, y confirmar si `oxc.jsx` hace redundante a `@vitejs/plugin-react`. Documentado en `apps/web/vitest.config.ts`.
- **`theme-switcher.tsx`** hace `removeAttribute('data-theme')` incondicional al desmontar (asume propiedad exclusiva de `<html data-theme>`). Cuando **F1** meta theming global, su provider debe guardar/restaurar, no borrar.
- **Mockups**: se sirven en `file://` con JS **precompilado** (no babel-standalone: los `<script type=text/babel src>` fallan por XHR bajo `file://`). Los `.jsx` quedan como fuente de referencia; los `.js` hermanos son lo que carga el HTML. Fuentes self-hosted en `docs/mockups/assets/fonts/`. `variant-mobile` contiene AMBAS variantes; la referencia responsive de la A son los `*ClaroM`.

**INCIDENTE 1 — el gate CUA cazó lo que el análisis estático NO podía (el valor del navegador)**
La verificación parcial (sin navegador) dio verde a mockups y fuentes por análisis estático del HTML servido de `/design-system`. Con navegador real, DOS FAIL: (a) los 5 mockups renderizaban EN BLANCO en `file://` (Babel pide el JSX por XHR, Chrome lo bloquea bajo `file://`; por HTTP renderizaban — de ahí el falso verde del implementer, que los probó por HTTP); (b) los mockups enlazaban el `fonts.css` del espejo que `@importa` `fonts.googleapis.com` → 5 peticiones a un CDN, que el estático no miró porque solo revisó `/design-system`. Lección: **el análisis estático de una cláusula de navegador es una aproximación; la cláusula solo la cierra el navegador.** Ya estaba escrito en el test de 0-CDN («esto es una aproximación»), y se confirmó en la práctica.

**INCIDENTE 2 — la aserción de contraste (cua.md) cazó un fallo WCAG DENTRO del DS**
El verifier midió el contraste texto/fondo real (no solo el fondo) y encontró **4 pares por debajo de AA**, el más grave el **botón primario en oscuro (blanco/acento = 4.27, necesita 4.5)** — que TD.2 habría heredado en TODOS los botones. Eran valores del DS volcados verbatim, así que se rutearon al usuario (no eran bug de código de TD.1). El usuario eligió corregirlos en el DS. **Corregidos en Claude Design primero** (fuente de verdad), luego re-volcado espejo + `globals.css`:
- dark `--accent` blue-500→blue-600 (btn 4.27→5.69); dark `--accent-hover` blue-400→blue-700 (oscurece en hover, coherente con el readme del DS que decía «darken on hover» y el token hacía lo contrario); light `--text-muted` gray-500→gray-600 y `--text-subtle` gray-400→gray-500 (subtle 2.5→4.6); dark `--text-subtle` gray-500→**gray-450** (nuevo step); `--amber-700` 0.560→0.545 (warning-subtle 4.41→4.70).
- **Hallazgo estructural**: el DS no podía tener 3 tiers de texto todos-AA con el más claro por debajo del medio, porque el medio (text-muted) ya estaba en el suelo AA (4.61). Se reestructuró: muted baja a gray-600, subtle sube a gray-500, orden preservado. Decisión del usuario.
- Los números los calculé A MANO con la aritmética WCAG (oklch→sRGB→ratio) ANTES de tocar el DS, y el verifier los re-midió en navegador: coinciden. Regla del arnés cumplida: no trasladar/aplicar un número sin verificarlo.

**INCIDENTE 3 — corrección MÍA cazada por el propio flujo**: lancé un `AskUserQuestion` sobre acento/densidad que **el planning YA tenía resuelto** en la pasada anterior (contexto resumido entre sesiones). El usuario reconfirmó, sin daño. Lección: al retomar tras un corte de contexto, LEER el estado del árbol y el journal ANTES de preguntar — el planning ya llevaba la corrección aplicada.

**Deuda anotada**
1. **`--gray-450` no está especimenado** en `guidelines/colors-neutrals.html` (es un step AA nuevo). No es desviación (no cambia un valor), pero el swatch del ramp está incompleto. Candidato a añadir en Claude Design cuando se toque ese guideline (TD.3/TD.5).
2. **Heredada de T0.1 para T1.4**: `REDACT_PATHS` adivina los nombres de campo del contrato de `/api/analyze` (`input`/`raw`/`value`). Sigue viva.
3. **Espejo del DS se vuelca A MANO** (`DesignSync.get_file` → `Write`), y `DesignSync` NO es visible para subagentes: el volcado no se paraleliza, lo hace el bucle en serie con round-trip byte-a-byte. Limitación del arnés, anotada, sin arreglo hoy.

## 2026-07-17 · ⏳ TD.2 iniciada

6 primitivas de formulario (`Button`, `Input`, `Textarea`, `Select`, `Field`, `IconButton`) en `apps/web/src/components/ui/`, shadcn sobre Base UI, ajustadas 1:1 al espejo `components/forms/`, con secciones en `/design-system`. Coste esperado: solo agentes. Estrena: Base UI + shadcn + cva en el repo, y el `vitest.setup.ts` jsdom a nivel de proyecto que TD.1 dejó pendiente.

## 2026-07-18 · TD.2 cerrada — PASS

- Coste: $0 (D8) · Ciclos verifier: **2 (FAIL glifos tofu → fix Icon SVG → PASS)** · Tests: 115 en 16 ficheros · Evidencia: `docs/verifications/TD.2/` (histórico FAIL→PASS)
- Las 6 primitivas de formulario del DS (`Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Field`) + el `Icon` SVG viven en `apps/web/src/components/ui/` y se muestran en `/design-system`.

**Decisiones no obvias que heredan TD.3–TD.7 y F1/F2**
- **Base UI diferido a TD.4** (desviación anotada en planning): las 6 primitivas son controles NATIVOS; instalar Base UI ahora = dep huérfana. TD.4 lo estrena con la 1ª primitiva portalizada (dialog/tooltip/toast). Toolchain shadcn (`components.json` + cva/clsx/tailwind-merge) ya instalado.
- **`components.json` tiene `iconLibrary: "lucide"` A PROPÓSITO**: quitarlo hace que shadcn caiga a `radix` (`@radix-ui/react-icons`), que el proyecto prohíbe MÁS que lucide. No hay opción "none". **Trampa conocida para TD.4**: cualquier `shadcn add` regenerará imports de iconos (lucide) que hay que arrancar a mano — como TD.2 ya hizo. El valor del campo solo elige QUÉ librería nombran los imports generados, no si aparecen.
- **`vitest.setup.ts` a nivel de proyecto** montado (jest-dom + mocks matchMedia/ResizeObserver + `afterEach(cleanup)`), `environment: 'jsdom'`, `unstubGlobals: true`. **CONFIRMADO: `oxc.jsx` hace redundante a `@vitejs/plugin-react`** (la batería completa de tests de componente pasa sin él; añadirlo = devDep huérfana). Cierra la pregunta abierta de TD.1.
- **Altura de control por token del DS**: se mapeó `--control-h-*` en `@theme` de `globals.css` → utilidades `h-control-sm/md/lg`, y Button/Input/Select las usan (antes literales `h-7.5/9/11`). Mismo patrón que el radio. IconButton usa `size-7/8/10` (escala cuadrada 28/32/40, sin token equivalente). Si el DS mueve `--control-h`, la utilidad sigue — sin drift.
- **`theme-switcher.tsx`** (de TD.1): su cleanup borra `data-theme` incondicional; cuando F1 meta theming global, guardar/restaurar.

**INCIDENTE — glifos Unicode vs el sistema de iconos SVG del DS (el FAIL del verifier)**
La Entrega de TD.2 mandaba «glifos Unicode en lugar de librerías de iconos». El `code-review` (medium) avisó del riesgo de tofu; el **verifier lo confirmó en navegador**: `copy` (⧉ U+29C9) —usado en 2 specimens— e info/shield/key salen **tofu (□)** porque Geist no cubre esos code points, y **no hay glifo Unicode fiel de "copiar"**. Causa raíz más profunda: el sistema de iconos del propio DS ES **SVG-inline** (`display/Icon.jsx`, paths lucide inline, cero dependencia), así que un carácter Unicode nunca es 1:1 con el specimen — el mandato Unicode contradecía al DS que la fase obliga a obedecer.
- **Decisión del usuario**: adoptar el `Icon` SVG del DS ahora. Se portó `Icon.jsx` 1:1 a `apps/web/src/components/ui/icon.tsx` (26 paths verbatim, `aria-hidden`, tamaños por spec), se borró `icon-glyph.tsx`, y las primitivas usan `<Icon>`. Contrato `icon?: IconName` intacto.
- **Corrección de alcance anotada en planning**: TD.2 adelanta la construcción del `Icon`; **TD.4 ya NO lo lista**; la sección de showcase del `Icon` y el resto de `display/` siguen en **TD.3**.
- **Lección de arnés**: cuando la Entrega de una tarea manda un MECANISMO (no un resultado) que contradice al DS/fuente-de-verdad, el DS gana (principio vinculante de la fase); el mandato se corrige, no se fuerza. El code-review olió el riesgo, pero fue el **navegador** quien lo probó — el análisis estático no cazaba el tofu (depende de la cobertura de la fuente). Refuerza la regla ya escrita: una cláusula de navegador solo la cierra el navegador.

**Deuda anotada (candidatas a corregir en el DS / tareas futuras)**
1. **DS `Button.jsx` usa `var(--red-700)` directo** en vez del `--danger-hover` que añadimos al DS en TD.2: incoherencia interna del DS (define el token pero su propio spec no lo consume). Candidata a actualizar `Button.jsx` en Claude Design.
2. **DS `Field` no cablea `aria-describedby`**: el error/hint no se asocia al control (nuestra `Field` es 1:1 con el spec, que tampoco lo hace) → el lector de pantalla no lo anuncia. Mejora de a11y del DS Field, candidata a subir a Claude Design.
3. **`Select` derrama `style` sobre el `<select>` interno**, mientras `Select.jsx` lo pone en el `<div>` wrapper. Contrato («acepta style») cumplido; matiz de fidelidad menor.
4. **`Select` keys duplicadas** si dos options comparten value: edge case de datos del consumidor.
5. **Glifos Unicode latentes ya no aplican** (icon-glyph borrado); pero para F1/F2, cualquier icono nuevo usa `<Icon>` SVG (añadir el path al `PATHS` del DS primero).

## 2026-07-18 · ⏳ TD.3 iniciada

Primitivas de display+feedback: `Badge`, `Card`, `CodeBlock`, `ConfidenceBar`, `CopyButton`, `Kbd` (display) + `Callout`, `EmptyState`, `Spinner` (feedback), 1:1 al espejo, secciones en `/design-system`. **`Icon` ya se construyó en TD.2** (adelantado): TD.3 solo añade su sección de showcase, no lo reconstruye. Coste esperado: solo agentes.

## 2026-07-18 · ⚠ DECISIÓN PENDIENTE DEL USUARIO — contraste de los badges violet/cyan en tema OSCURO (TD.3)

**Qué**: los badges de DataKind `violet` (json) y `cyan` (base64/uuid) FALLAN WCAG en tema oscuro. Medido por el bucle (oklab color-mix → sRGB → WCAG), no estimado:

| Badge | Claro | Oscuro | Umbral |
|---|---|---|---|
| violet (text-violet-700 sobre color-mix bg) | 6.24 ✅ | **2.11** ❌ | 4.5 (y <3 grande) |
| cyan (text-cyan-700 sobre color-mix bg) | 5.17 ✅ | **2.49** ❌ | 4.5 (y <3 grande) |

**Por qué NO se arregló en TD.3** (decisión vía advisor, con el usuario dormido): a diferencia del contraste de TD.1 (re-alias mecánicos a steps existentes) y del `--danger-hover` de TD.2 (nombrar un valor existente, cero cambio visual), arreglar esto exige **inventar valores nuevos** (los hues secundarios violet/cyan solo tienen steps 100/500/700 — no hay `-200` como el accent usa para su subtle-fg en oscuro) o re-aliasar a `-100` (más claro que el patrón del accent → inconsistencia). Eso es una **decisión de identidad de producto** (los colores de DataKind son un sistema deliberado del DS README: «each DataKind gets one fixed hue… reads the same everywhere»), NO un suelo AA mecánico. Varias soluciones válidas dan looks distintos → es del usuario.
**No bloquea TD.3**: cua.md dice que un par sub-AA cuyo color viene del DS es «hallazgo a rutear, decisión del usuario, se REPORTA, no se ignora» — no un FAIL. Los badges son fieles al specimen (la cláusula «ambos temas» pasa), y **no hay consumidor de producto hasta F1** (la UI de la cadena) → cero daño en vivo por diferir.
**Opciones para el usuario** (decide el CÓMO): (A) añadir `--violet-200`/`--cyan-200` al DS y darle al badge un override de tema oscuro que use el step claro para el texto (espeja el patrón `accent-subtle-fg → blue-200` en oscuro; consistente pero inventa valores); (B) re-aliasar el texto oscuro a `--violet-100`/`--cyan-100` (existen, pero más claros/menos saturados que el patrón del accent). Empezar por Claude Design (fuente de verdad), luego re-volcar.
**Relacionado**: se acumulan decisiones de DS para el usuario — [[deuda]] de TD.2 (Button.jsx no consume --danger-hover; Field sin aria-describedby) + esta. Candidatas a una tanda de correcciones de DS acordada.

## 2026-07-18 · TD.3 CERRADA — primitivas de display + feedback (PASS)

**Entrega**: 9 primitivas nuevas (`Badge, Card, CodeBlock, ConfidenceBar, CopyButton, Kbd` display + `Callout, EmptyState, Spinner` feedback), cada una espejo 1:1 de `docs/design-system/components/{display,feedback}/`, con `.test.tsx`. Showcase en `/design-system` (secciones `#display` y `#feedback`). Gate verde: 164 tests / 25 ficheros.
**REVIEW**:
- code-review (correctness): sin arreglos. `CopyButton.onCopy` dispara tras el `setCopied` aunque el clipboard no exista → es **fiel al mirror** (`CopyButton.jsx:15-17` hace lo mismo); no se toca. `prefers-reduced-motion` del Spinner cubierto por la regla universal `!important` de globals.css (línea 485).
- simplify: 1 hallazgo (Spinner inyecta `<style>` keyframe `dtds-spin` por instancia) → **SKIP documentado**: el mirror `Spinner.jsx:12` lo lleva inline por diseño; mover el keyframe a globals.css desviaría el cuerpo del componente del mirror y el ds-reviewer lo declaró conforme. Coste real despreciable (pocos spinners a la vez; `<style>` idéntico dedupea en CSSOM).
- ds-reviewer: 1 hallazgo (Callout columna interna `gap-0.5`=2px vs mirror `gap:3`=3px) → **APLICADO** `gap-0.75`.
- Extra (catch del advisor): subtítulo obsoleto «glifos Unicode» en la sección de formularios de `page.tsx` (falso desde que TD.2 adoptó Icon SVG) → corregido a «iconos SVG del DS».
**VERIFY (navegador, CUA, verifier con contexto fresco)**: PASS. 10 primitivas fieles en ambos temas (cero tofu, 26 iconos SVG nítidos, CodeBlock terminal oscuro en ambos temas). CopyButton copia de verdad por teclado (espía en `navigator.clipboard.writeText` invocado con Enter Y con Espacio; aria-label→«Copiado»). Kbd: pase por vacuidad LEGÍTIMO (specimen `<kbd>` no-interactivo confirmado). ConfidenceBar O5: longitud del relleno + etiqueta numérica cambian con el valor (dos canales no cromáticos). Contraste medido independientemente: todas las superficies AA en ambos temas EXCEPTO violet/cyan DataKind en oscuro (2.11/2.49) → ruteado como [[deuda]] de paleta del DS (decisión del usuario), NO FAIL, porque `badge.tsx` es espejo byte-a-byte del specimen. Evidencia: `docs/verifications/TD.3/report.md` + 15 capturas/outputs.
**Coste**: $0 (superficie frontend estática, sin APIs de pago).
**Nota de proceso**: el violet/cyan oscuro se decidió vía advisor (usuario dormido) — se difiere por exigir inventar valores nuevos / cambiar identidad de producto (ver entrada ⚠ arriba), no un re-alias mecánico como TD.1/TD.2.

## 2026-07-18 · TD.5 CERRADA — composites de producto presentacionales puros (PASS)

**Entrega**: `ChainSummary` (server), `StepCard` (client) espejo de `components/chain/`, y `HistoryRow` (client) espejo de `components/history/` — presentacionales PUROS (props planas, cero import de `@app/core`), que SOLO componen primitivas de TD.2/TD.3. Sección "Composites" en `/design-system` con `composites-demo.tsx` y datos de ejemplo del propio DS. Regla de pureza permanente (bloque 5b en `eslint.config.ts`: `no-restricted-imports` scoped a `components/{chain,history}`). Gate verde: 187 tests / 28 ficheros.
**REVIEW**: code-review (correctness) sin bugs; simplify = limpio (sin hallazgos); ds-reviewer = conforme sin hallazgos. Cero ediciones en REVIEW → gate seguía verde. Desviaciones documentadas en cabecera (todas precedente de TD.3): `HistoryRow` usa `group`/`group-hover:`+`focus-within:` en vez de `useState` (sirve mejor reduced-motion + a11y de teclado); px del mirror vía rejilla 4px (`size-6.5`=26px, `gap-1.75`=7px, `max-w-80`=320px, `opacity-35`); sombra vía clase `shadow-sm` mapeada a token; `type Terminal` interno hasta primer consumidor (knip).
**VERIFY (navegador CUA + gate, verifier contexto fresco)**: PASS. (1) 3 composites 1:1 con specimens en claro y oscuro, sin tofu; picker O4 del StepCard actualiza `applied` en vivo (jwt.decode→base64.decode). (2) reduced-motion: `matchMedia(reduce)=true`, `transition-duration≈0`, y el estado visible se conserva — foco de teclado revela las acciones (opacidad 0.35→1), operables. (3) Control negativo de pureza verificado independiente: `pnpm lint` FALLA nombrando `no-restricted-imports`+mensaje TD.5 tanto con `import { }` como con `import type { }` de `@app/core`; dentro de `pnpm gate`; revertido → gate verde sin rastro. Evidencia: `docs/verifications/TD.5/report.md` + 13 capturas/outputs.
**Coste**: $0.
**Recurrencia de [[deuda]] de DS**: el verifier volvió a medir independiente el contraste sub-AA de violet/cyan en oscuro (json 2.11, cyan/base64 2.49; +uuid comparte el defecto) → mismo hallazgo ya ruteado al usuario (ver entrada ⚠ arriba), NO defecto de TD.5 (el Badge es espejo fiel del specimen). Se acumula: la corrección vive en el primitivo Badge (TD.3)/valores del DS.
