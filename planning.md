# Planning — devtools

> Plan de ejecución del `PRD.md` (v1, aprobado 2026-07-16). Fases → tareas → subtareas.
>
> **Filosofía baby steps**: cada tarea es autocontenida (se empieza y se termina en una sesión de trabajo), deja el sistema en un estado funcional (nunca a medias), y termina con una **verificación en el mundo real**: una acción concreta con un resultado observable que demuestra sin lugar a dudas que funciona — no "el código compila", sino "hago X y veo Y". Ninguna verificación depende de piezas que aún no se hayan construido en el momento de la tarea.
>
> Convenciones: `[ ]` pendiente · `[x]` hecha (marcar al completar, con fecha) · **Depende de** lista los IDs que deben estar hechos antes (el orden real lo dicta este grafo, no la numeración) · ⚠ marca prerequisitos externos que debe hacer el usuario · las referencias `§` apuntan al PRD; `D<n>` a sus decisiones e `I<n>` a los invariantes del motor (§6.4). Los ítems `[verificar]` del PRD se cierran dentro de la tarea que integra ese componente.
>
> **Sin líneas de Coste estimado en todo el planning**: por decisión D8 el producto no consume ninguna API de pago, así que ninguna verificación tiene coste variable. El coste de los agentes del bucle se anota igualmente en el journal y en cada report (criterio 14.13). Si alguna tarea llegara a necesitar una API de pago, es un cambio de alcance (regla 6), no una improvisación de presupuesto.

## Estado global

| Fase | Nombre | Entrega observable al cerrar la fase | Estado |
|---|---|---|---|
| F0 | Fundaciones | Monorepo con `pnpm gate` verde, Postgres en Docker, migración inicial aplicada y auth email+contraseña operable en el navegador: registrarse, entrar, y que la sesión sobreviva a un refresh | ☐ |
| TD | Design system | `/design-system` muestra tokens y componentes fieles a Claude Design, lint de adherencia activo y skill frontend actualizada — se ejecuta tras T0.1, antes de continuar F0 | ☐ |
| F1 | El motor y el campo | Pegas un JWT (o un base64, o un timestamp) en `/` y ves la cadena desenredada paso a paso, con las alternativas de detección a un clic y el desvío de cualquier paso | ☐ |
| F2 | El historial | Con cuenta iniciada, lo que analizas aparece en `/history` con la vista previa redactada; se puede reabrir y borrar. Sin cuenta, `/` sigue funcionando igual | ☐ |
| F3 | Producción | `https://devtools.carlosvillu.dev` sirve la app con TLS válido, el recorrido completo funciona en producción y el backup diario produce un dump restaurable | ☐ |

**Hitos de valor real**: tras **F1** el producto ya sirve para algo real (pegas y desenreda, sin cuenta ni historial) — si el proyecto se parase ahí seguiría siendo defendible; tras **F2** además recuerda lo que analizaste; tras **F3** existe para el mundo.

## Mapa de pantallas → mockup → tarea

La regla 7 es vinculante: ninguna pantalla se implementa sin su mockup delante. Fuente de los mockups (aprobados por el usuario, **variante A "Claro"**): proyecto de Claude Design `https://claude.ai/design/p/1132e88c-090e-42ad-a121-490714cf7ec5` (fichero `devtools Mockups.html`, componentes `variant-claro.jsx`). El espejo local lo genera **TD.1**.

| Pantalla | Ruta | Componente del mockup | Mockup local | Tarea que la construye |
|---|---|---|---|---|
| El campo | `/` | `FieldClaro` | `docs/mockups/field.html` | **T1.5** (+ interacción en T1.6) |
| Historial | `/history` | `HistoryClaro` | `docs/mockups/history.html` | **T2.2** |
| Entrar | `/login` | `LoginClaro` | `docs/mockups/login.html` | **T0.4** |
| Crear cuenta | `/signup` | `SignupClaro` | `docs/mockups/signup.html` | **T0.4** |
| Showcase del DS | `/design-system` | — (no es pantalla de producto) | — | TD.1–TD.5 |

Referencia móvil: `variant-mobile.jsx` del mismo proyecto → `docs/mockups/mobile.html`. Cubre el requisito de §7 "responsive real" (la cadena se apila, no es tabla horizontal). **A confirmar en TD.1**: si esa variante móvil corresponde a la variante A o a la B; si fuera de la B, se anota en «Notas de fidelidad» y se pide criterio al usuario.

---

## F0 — Fundaciones

El corazón de F0 es el suelo verificable: monorepo con gate, base de datos real y sesiones. Al cerrarla no hay producto todavía —el motor es F1— pero sí un sistema donde cualquier cosa que se construya encima se puede probar de verdad. Módulos elegidos (etapa 3 del bootstrap): esqueleto+gate, Docker Compose con Postgres, Drizzle, auth multi-usuario. Descartados por no exigirlos el PRD (§5.2): worker/pg-boss, máquina de estados, SSE, storage, spend ledger, credenciales cifradas.

#### T0.1 · Monorepo y esqueleto de proyectos [x] 2026-07-17 — PASS, ver docs/verifications/T0.1/
- **Depende de**: —
- **Entrega**: pnpm workspaces con `apps/web` (Next.js App Router + Tailwind v4 CSS-first), `packages/core` (contratos Zod), `packages/db` (el paquete nace aquí aunque Postgres llegue en T0.2); sin `apps/worker` (§5.2); tsconfig/eslint/prettier compartidos; pino con `request_id` de correlación desde el día 1; `pnpm gate` operativo (lint && typecheck && format:check && knip && readme:status:check && test); página raíz mínima + healthcheck `/api/health` devolviendo `{ok:true}`.
- **Subtareas**:
  - [x] Workspaces, catalogs y tsconfig/eslint/prettier compartidos (skill backend, `references/tooling.md` §8)
  - [x] `apps/web` con Next.js App Router + Tailwind v4 (sin `tailwind.config.js`)
  - [x] `packages/core` y `packages/db` vacíos pero importables y bajo typecheck
  - [x] Logger pino con `request_id`; **regla §11: el input del usuario nunca se loguea** — dejarlo escrito en el módulo de logging desde el día 1
  - [x] `pnpm gate` con los 6 pasos + `/api/health`
- **Verificación**: `pnpm build && pnpm gate` en verde → `curl localhost:3000/api/health` devuelve `{ok:true}`; romper a propósito un tipo exportado de `packages/core` rompe la compilación de `apps/web` (control negativo: el fallo se ve y luego se revierte).

#### T0.2 · Docker Compose de desarrollo con Postgres
- **Depende de**: T0.1; TD.7 (dependencia de ORDEN, no técnica: toda UI posterior se construye con las primitivas del DS)
- **Entrega**: `docker-compose.dev.yml` con `postgres:16` y volumen persistente; `.env.example` documentado; `apps/web` conecta al arrancar y `/api/health` pasa a devolver `{ok:true, db:true}`.
- **Verificación**: `docker compose -f docker-compose.dev.yml up -d` → `curl /api/health` devuelve `{ok:true, db:true}`; parar el contenedor de Postgres → `/api/health` devuelve `{ok:true, db:false}` **sin tumbar la app** (control negativo: la web sigue sirviendo).

#### T0.3 · Drizzle y migración inicial
- **Depende de**: T0.2
- **Entrega**: Drizzle en `packages/db` con el esquema de §9 (`user`, `session`, `history_entry`), migración inicial, runner `db:migrate` y repos tipados mínimos. **Decidir y anotar aquí** (§9): si `email` se resuelve con `citext` o con normalización a minúsculas en aplicación + índice único; y si la migración corre on-boot con lock o como paso de deploy (la decisión condiciona T3.1).
- **Subtareas**:
  - [ ] Esquema Drizzle de las 3 tablas con los índices de §9 (`(user_id, created_at desc)` en `history_entry`)
  - [ ] Migración inicial + `db:migrate`
  - [ ] Repos mínimos: crear/leer usuario, crear/leer sesión
  - [ ] Anotar en el planning y en el PRD (§9) la decisión de `citext` y la de on-boot vs deploy
- **Verificación**: `pnpm db:migrate` sobre una BD vacía crea las 3 tablas (`psql \dt` las lista con sus índices); un script de smoke inserta un `user` y lo lee de vuelta; insertar un segundo `user` con el mismo email en distinta capitalización **falla** (control negativo que prueba la decisión de unicidad).

#### T0.4 · Auth email + contraseña
- **Depende de**: T0.3, TD.7
- **Entrega**: signup, login y logout (§8 módulo `auth`, D9): hash de contraseña con scrypt de `node:crypto`, sesión en cookie httpOnly/secure/sameSite=lax con expiración en la tabla `session` (no solo en la cookie), rate limit por IP en login, y respuestas indistinguibles entre "email no existe" y "contraseña incorrecta" (§11). Pantallas `/login` y `/signup` construidas con las primitivas del DS. **Middleware que protege ÚNICAMENTE `/history` y `/api/history` (D6)** — `/` y `/api/analyze` son públicas: esto contradice el default del template y es deliberado.
- **Subtareas**:
  - [ ] `POST /api/auth/{signup,login,logout}` + hash scrypt + sesión en BD
  - [ ] Middleware con la lista de rutas protegidas de D6 (y un test que falle si `/` se protege por error)
  - [ ] Pantallas `/login` y `/signup` desde sus mockups
  - [ ] Rate limit por IP en login (el trust boundary de `x-forwarded-for` se resuelve en T3.1; hasta entonces, IP directa)
- **Mockup**: `docs/mockups/login.html`, `docs/mockups/signup.html`
- **Playwright permanente**: `apps/web/e2e/auth.spec.ts` — protege: signup crea cuenta y deja sesión iniciada; la cookie sobrevive a un refresh; logout la invalida; `/history` sin sesión redirige a `/login`; **`/` sin sesión responde 200 y es usable** (el guardián de D6).
- **Verificación**: en el navegador, registrarse con un email nuevo → queda la sesión iniciada y sobrevive a un refresh; contraseña incorrecta repetida → el rate limit se hace visible; el mensaje de error es idéntico para email inexistente y para contraseña mal (se comparan literalmente); `/history` sin sesión redirige a `/login` y `/` sin sesión carga con normalidad.

#### T0.5 · E2E de fase F0
- **Depende de**: T0.4
- **Entrega**: spec de fase en `apps/web/e2e/phases/f0.spec.ts` con tags `@f0 @phase` que recorre el suelo completo sobre el sistema real levantado con Docker.
- **Playwright permanente**: `apps/web/e2e/phases/f0.spec.ts` — recorrido: arranque con BD real → signup → login → refresh → logout.
- **Verificación**: con `docker compose -f docker-compose.dev.yml up -d` desde cero y BD vacía: `pnpm db:migrate` crea el esquema, `pnpm gate` en verde, `pnpm test:e2e` en verde, y el recorrido signup → refresh → logout se completa en el navegador. `/api/health` devuelve `{ok:true, db:true}`.

---

## TD — Design system (la piedra angular de toda UI)

**Fuente de verdad visual**: proyecto de Claude Design `https://claude.ai/design/p/9d6b478a-191a-4d6c-8071-441488dd195f`. El espejo local `docs/design-system/` es **solo-lectura**: se regenera con la tool `DesignSync` y JAMÁS se edita a mano.

Principios vinculantes de la fase:
- El código **OBEDECE** al DS, nunca al revés.
- **Ningún valor visual se inventa en código**: si falta un token o una variante, se añade al DS, se vuelca y se usa. Si falta un componente entero, se crea siguiendo las foundations del DS y se **sube a Claude Design en la misma tarea**.
- Un cambio visual empieza en Claude Design; el commit de código es la traducción, no la decisión.
- Gotcha de subagentes: `DesignSync` puede no estar disponible en hijos frescos — si el implementer no la tiene, la subida la ejecuta el bucle principal en el CLOSE.

Inventario real del DS (leído en el bootstrap): **tokens** (`base`, `colors`, `effects`, `fonts`, `spacing`, `typography`) · **guidelines** (brand-chain, brand-wordmark, colors-accent/kinds/neutrals/semantic/surfaces, radii, shadows, spacing-scale, type-body/display/mono/scale) · **forms** (Button, Field, IconButton, Input, Select, Textarea) · **display** (Badge, Card, CodeBlock, ConfidenceBar, CopyButton, Icon, Kbd) · **feedback** (Callout, EmptyState, Spinner) · **chain** (StepCard, ChainSummary) · **history** (HistoryRow). El DS ya es específico de este producto: `ConfidenceBar`, `StepCard`, `ChainSummary` y `HistoryRow` existen porque el PRD los pide.

#### TD.1 · Tokens del DS, fuentes, espejos y showcase `/design-system`
- **Depende de**: T0.1
- **Entrega**: espejo inicial de `docs/design-system/` regenerado con `DesignSync`; `globals.css` con TODOS los tokens del espejo (`tokens/*.css`) volcados **verbatim** (hex tal cual, sin conversiones, naming 1:1) en los **3 bloques canónicos de Tailwind v4 CSS-first** (no existe `tailwind.config.js`): (1) `:root` + overrides — tema claro por defecto en `:root` (variante A), el oscuro como override completo bajo `[data-theme=…]`, acentos bajo `[data-accent=…]`, semánticos FIJOS, densidad vía `--ui-fs`; (2) `@theme inline {}` mapeando cada token con el naming del DS (`bg-surface`, `text-text-2`, `rounded-md`…); (3) `@layer base {}` con defaults mínimos. Fuentes del DS self-hosted (0 requests a CDNs). Página `/design-system` con specimens de fundaciones y switchers de tema/acento/densidad (por atributo en `<html>`, nunca por media query; defaults sin atributo = SSR limpio).
  **Además (desviación deliberada del patrón TD, acordada en el bootstrap): el espejo de los mockups.** Volcar a `docs/mockups/` los 4 mockups de **variante A "Claro"** del proyecto `1132e88c-090e-42ad-a121-490714cf7ec5` como HTML autónomos renderizables en `file://` — `field.html` (`FieldClaro`), `history.html` (`HistoryClaro`), `login.html` (`LoginClaro`), `signup.html` (`SignupClaro`) — más `mobile.html` (`variant-mobile.jsx`) como referencia responsive. Rellenar el «Mapa página → mockup» de `docs/mockups/README.md`. **Confirmar** a qué variante corresponde la móvil y anotarlo en «Notas de fidelidad» si no es la A. Motivo de la desviación: la regla 7 exige el mockup local antes de T0.4/T1.5/T2.2, y esta es la primera tarea que tiene `DesignSync` y el DS en la mano.
  **Gotcha `--shadow-*`** (el DS tiene `guidelines/shadows.html` y `tokens/effects.css`): si el DS llama a sus sombras `--shadow-*`, ese namespace lo usa `@theme` y crea un `var()` circular — se vuelcan como `--elevation-*` en `:root` y `@theme` mapea `--shadow-sm: var(--elevation-sm)` (las clases resultantes conservan `shadow-sm/md/lg`). Es la ÚNICA desviación de naming permitida.
- **Subtareas**:
  - [ ] Regenerar espejo `docs/design-system/` con `DesignSync`
  - [ ] Volcar tokens verbatim a los 3 bloques de `globals.css` (ojo al gotcha `--shadow-*`)
  - [ ] Fuentes self-hosted
  - [ ] `/design-system` con specimens + switchers de tema/acento/densidad
  - [ ] Espejo de mockups en `docs/mockups/` + catálogo en su README
- **Verificación**: `/design-system` en el navegador muestra los specimens de fundaciones; los switchers cambian tema, acento y densidad en vivo; comparación visual contra `guidelines/` del espejo sin desviaciones perceptibles; los 5 HTML de `docs/mockups/` abren en el navegador y se parecen a lo que muestra el canvas de Claude Design; ninguna petición a CDNs externos en la pestaña de red.

#### TD.2 · Primitivas de formulario
- **Depende de**: TD.1
- **Entrega**: `Button`, `Input`, `Textarea`, `Select`, `Field`, `IconButton` en `apps/web/src/components/ui/` — generadas con shadcn sobre **Base UI** y ajustadas 1:1 al espejo `components/forms/`: variantes cva con **los MISMOS nombres de variante que el DS** (`Button.jsx` es la spec; `Button.prompt.md` la intención), clases semánticas de token, `data-slot` conservado, a11y de la primitiva intacta, **glifos Unicode en lugar de librerías de iconos** (shadcn trae imports de lucide: sustituirlos es parte del ajuste). Secciones nuevas en `/design-system`.
- **Verificación**: comparación en navegador contra los specimens del espejo en **ambos temas**: variantes y estados hover/focus/disabled fieles; todos los controles operables por rol y accessible name.

#### TD.3 · Primitivas de display y feedback
- **Depende de**: TD.2
- **Entrega**: `Badge`, `Card`, `CodeBlock`, `ConfidenceBar`, `CopyButton`, `Icon`, `Kbd` (espejo `components/display/`) y `Callout`, `EmptyState`, `Spinner` (espejo `components/feedback/`), mismo estándar que TD.2. Secciones en `/design-system`.
- **Verificación**: comparación contra sus specimens en ambos temas; `CopyButton` y `Kbd` operables por teclado; `ConfidenceBar` legible sin depender solo del color (requisito de §7 O5: la ambigüedad se comunica, no se insinúa).

#### TD.4 · Gaps: primitivas fuera del DS + subida a Claude Design
- **Depende de**: TD.3
- **Entrega**: las primitivas que el producto necesita y el DS **no** define, creadas siguiendo las **foundations** del DS (hairlines, radios, focus ring único, glifos Unicode, sin gradientes ni glassmorphism). Candidatas detectadas al leer los mockups: `Wordmark` (existe como guideline `brand-wordmark.html`, no como componente), y las que el producto hará inevitables — confirmación de borrado del historial (dialog), aviso de "copiado" (toast), `Tooltip` y `Skeleton`. **La lista definitiva se cierra en la tarea**: se crea solo lo que T1.5/T1.6/T2.2 vayan a consumir, nada especulativo. Secciones en `/design-system` + **subida de todas al proyecto de Claude Design vía `DesignSync`** en su formato (`.jsx` + `.prompt.md` + card), regenerando el espejo después — el DS sigue siendo inventario completo. Solo se suben **tokens y componentes**, no mecanismos de compilación propios (`@utility`, keyframes wrapper): eso sería contenido muerto para el DS.
- **Verificación**: revisión en navegador de las secciones nuevas en ambos temas (coherencia con las foundations); `DesignSync list_files` muestra los ficheros nuevos y el espejo regenerado los incluye.

#### TD.5 · Composites de producto (presentacionales puros)
- **Depende de**: TD.3
- **Entrega**: `StepCard` y `ChainSummary` (espejo `components/chain/`) y `HistoryRow` (espejo `components/history/`) como presentacionales **PUROS**: props planas, **prohibido importar tipos de dominio de `packages/core`** — los wrappers de dominio llegan con las features (T1.5, T2.2). Fieles a sus specs del espejo. Secciones en `/design-system` con los datos de ejemplo del propio DS.
- **Verificación**: comparación contra sus specimens en ambos temas; animaciones apagadas bajo `prefers-reduced-motion` sin perder el estado visible; un test de lint/typecheck falla si un composite importa de `packages/core` (control negativo de la pureza).

#### TD.6 · Lint de adherencia al DS
- **Depende de**: TD.5
- **Entrega**: reglas de lint (scope `apps/web`, dentro de `pnpm gate`) adaptando las ideas de `_adherence.oxlintrc.json` del proyecto de Claude Design al flat config del repo. **Prohíben**: paleta cruda de Tailwind (`bg-blue-500`…), valores arbitrarios crudos en `className` (`bg-[#…]`, `rounded-[10px]`) fuera de `globals.css`, e imports de `@radix-ui/*`, `lucide-react` o cualquier librería de iconos. **NO prohíben**: spacing fraccionario (`size-4.5` — es el mecanismo de fidelidad al px) ni token-vía-var (`[--x:var(--warning)]`).
- **Verificación**: un fichero de prueba con una violación de cada tipo hace fallar `pnpm lint` **nombrando la regla**; al retirarlo, `pnpm gate` queda verde (el control negativo muerde).

#### TD.7 · Cierre: skill frontend contra la realidad + OK humano
- **Depende de**: TD.4, TD.6
- **Entrega**: skill `frontend` actualizada **contra el código real committeado** (no contra el espejo): inventario definitivo de `components/ui/` con variantes y props leídas de los `.tsx`, desviaciones deliberadas documentadas (incluida la de `--shadow-*` si aplicó), obligatoriedad explícita («si existe el componente del DS, usarlo es obligatorio; HTML crudo estilado equivalente = error de review») y ajustes descubiertos en la fase anotados en el journal.
- **Verificación (E2E de fase)**: recorrido completo de `/design-system` — ambos temas y ≥2 acentos — con evidencia visual en `docs/verifications/TD.7/`; `pnpm gate` verde; y **revisión humana final del showcase** (parada de fin de fase: el usuario da el OK visual).

---

## F1 — El motor y el campo

El primer hito de valor real. Al cerrar F1 se pega algo en `/` y se ve la cadena desenredada, sin cuenta y sin historial. El motor (§6) se construye entero en `packages/core` **antes** de que exista una sola línea de UI que lo consuma: es lógica pura, determinista y barata de testear, y es el sitio donde el banco de pruebas gana más.

#### T1.1 · Contratos del motor y detectores
- **Depende de**: T0.1
- **Entrega**: en `packages/core`, los contratos de §6.1 (`DataKind`, `Detection`, `Transform`, `TransformResult`, `ChainStep`, `Chain`) como tipos TS **y** esquemas Zod, y los 8 detectores de §6.2 (`jwt`, `json`, `base64`, `unix_timestamp`, `url`, `uuid`, `hash`, `text`) como funciones puras que devuelven `Detection[]` ordenadas por confianza descendente.
- **Subtareas**:
  - [ ] Contratos + esquemas Zod
  - [ ] Los 8 detectores, cada uno con su regla de §6.2
  - [ ] `base64` solo detecta si el decodificado es **texto imprimible o JSON** (§6.2, riesgo R4)
  - [ ] `jwt` tolera el prefijo `Bearer ` (CU1)
  - [ ] `text` siempre presente como último recurso con confianza 0.01 (I6)
- **Verificación**: `pnpm test` con el corpus de casos: cada detector acierta sobre sus positivos y **no dispara sobre los negativos** — en particular, una cadena alfanumérica arbitraria (`"holaquetalestamos"`) NO se detecta como base64 pese a ser base64 válido (R4), y `1752624000` produce `[unix_timestamp, text]` con la alternativa presente (I8). Los tests son parte del gate desde esta tarea (regla 8).

#### T1.2 · Transformaciones
- **Depende de**: T1.1
- **Entrega**: las 11 transformaciones de §6.3 (`base64.decode`, `jwt.decode`, `json.format`, `json.minify`, `json.sort_keys`, `timestamp.to_iso`, `timestamp.to_relative`, `url.decode`, `url.split_query`, `uuid.describe`, `hash.identify`) como funciones **puras y totales** (I1: nunca lanzan; un fallo es `{ok:false,error}`), con el registro de cuál es la transformación por defecto de cada kind (§6.3). El tiempo se inyecta: `timestamp.to_relative` y la expiración del JWT reciben `now: Date` como parámetro explícito (I4).
- **Verificación**: `pnpm test` — cada transformación sobre entradas válidas produce la salida esperada y sobre entradas rotas devuelve `{ok:false}` **sin lanzar** (control negativo: un test que envuelve cada `apply` en try/catch y falla si algo lanza); `timestamp.to_relative` con el mismo `now` fijado produce el mismo texto en dos ejecuciones (I5); ninguna función del motor referencia `Date.now()` (control negativo: un lint/test que hace grep sobre `packages/core` y falla si aparece).

#### T1.3 · Motor de cadena
- **Depende de**: T1.2
- **Entrega**: `analyze(input, { now })` en `packages/core` que construye la `Chain` completa de §6.1: detecta → aplica la transformación por defecto → **re-detecta sobre el resultado** → repite. Implementa los invariantes I1–I6: pureza y totalidad, profundidad máxima 8 (`terminal:'max_depth'`), detección de ciclos (`terminal:'cycle'`), tiempo inyectado, determinismo, `text` terminal. Incluye la regla de §6.5 que el implementer no debe adivinar: **una transformación no se re-aplica si su salida es idéntica a su entrada** (`terminal:'no_transform'`). Corpus de golden files.
- **Subtareas**:
  - [ ] Bucle de encadenado + los 5 finales de `terminal`
  - [ ] Detección de ciclos por output ya visto como input previo (I3)
  - [ ] Golden files del corpus (incluido el ejemplo trabajado de §6.5)
- **Verificación**: `pnpm test` — el ejemplo de §6.5 produce **exactamente** la cadena documentada (jwt → json → terminal `no_transform`, con la nota de expiración); ninguna entrada del corpus supera 8 pasos ni entra en bucle (criterio 14.7); dos ejecuciones con el mismo `now` producen `Chain` idéntica byte a byte (criterio 14.6, I5); una entrada construida para auto-alimentarse en base64 termina con `terminal:'cycle'` y conserva los pasos previos (control negativo de I3).

#### T1.4 · `POST /api/analyze`
- **Depende de**: T1.3, T0.1
- **Entrega**: route handler en `apps/web` (§8 módulo `analyze`) que valida la entrada con Zod, aplica el **límite de 128 KB → 413 sin procesar** (I7), invoca `analyze()` con `now` explícito y devuelve la `Chain` validada contra su esquema. Rate limit por IP (§11; el trust boundary de `x-forwarded-for` se resuelve en T3.1). **Público, sin auth** (D6). Logging de §11: se registran `input_kind`, longitud en bytes, número de pasos y duración — **nunca el input**.
- **Verificación**: `curl -X POST /api/analyze` con el JWT del ejemplo de §6.5 devuelve la `Chain` esperada sin sesión iniciada (D6); un cuerpo de 200 KB devuelve **413** y los logs muestran que no se procesó (criterio 14.5); superar el rate limit devuelve 429; `grep` del input de prueba sobre los logs de la web **no devuelve ninguna coincidencia** (criterio 14.9, control negativo que protege §11).

#### T1.5 · La pantalla `/` — el campo y la cadena
- **Depende de**: T1.4, TD.7, TD.5
- **Entrega**: la pantalla principal (§7) construida desde su mockup con las primitivas del DS: textarea grande con **foco automático**, análisis disparado **al pegar o tras 300 ms de inactividad** al escribir (sin botón de "analizar"), y la cadena desplegada debajo — un `StepCard` por paso con su tipo detectado, la transformación aplicada, el valor resultante y `CopyButton`. `ChainSummary` con los kinds de la cadena. `Callout` de seguridad de §11 ("devtools procesa lo que pegas en el servidor…"). Si no se detecta nada (`text`), se dice explícitamente con qué se intentó — nunca pantalla vacía (§7). Wrappers de dominio: los composites de TD.5 siguen siendo puros; la traducción `Chain` → props vive aquí.
- **Mockup**: `docs/mockups/field.html` (referencia responsive: `docs/mockups/mobile.html`)
- **Playwright permanente**: `apps/web/e2e/field.spec.ts` — protege: pegar un JWT despliega la cadena `jwt → json` sin tocar ningún botón; el foco está en el campo al cargar; cada paso intermedio se copia; el `Callout` de seguridad es visible; entrada no reconocida muestra el mensaje explícito y no una pantalla vacía; en viewport móvil la cadena se apila (no hay scroll horizontal del body).
- **Verificación**: en el navegador, pegar `Bearer <JWT>` real → en < 1 s aparece la cadena `jwt → json` con el payload formateado y la expiración en lenguaje natural, sin que el usuario elija nada (criterio 14.1); pegar un base64 que contiene JSON → 3 pasos visibles y el valor de cualquier paso intermedio se copia con un clic (criterio 14.2); comparación visual contra `docs/mockups/field.html` sin desviaciones no acordadas (regla 7).

#### T1.6 · Alternativas de detección y desvío de la cadena
- **Depende de**: T1.5
- **Entrega**: la interacción que cierra O4 y O5 sobre la pantalla de T1.5: cada paso muestra las **detecciones descartadas** con su `ConfidenceBar` cuando hay alguna con confianza ≥ 0.3 (I8: la ambigüedad nunca se oculta), y permite **elegir una transformación alternativa** a la propuesta; al hacerlo, la cadena se **recalcula desde ese paso** dejando intactos los anteriores.
- **Mockup**: `docs/mockups/field.html`
- **Playwright permanente**: `apps/web/e2e/field-alternatives.spec.ts` — protege: `1752624000` muestra la alternativa `text`; cambiar a la alternativa recalcula la cadena; elegir otra transformación en el paso N deja intactos los pasos < N y recalcula los > N.
- **Verificación**: en el navegador, pegar `1752624000` → la UI muestra la lectura como timestamp **y** deja ver que existe la alternativa `text`; cambiar a la alternativa recalcula la cadena (criterio 14.3); en cualquier paso, elegir una transformación distinta de la propuesta recalcula desde ese punto y deja los pasos anteriores intactos (criterio 14.4, CU4).

#### T1.7 · E2E de fase F1
- **Depende de**: T1.6
- **Entrega**: spec de fase en `apps/web/e2e/phases/f1.spec.ts` con tags `@f1 @phase` que recorre el journey completo de la fase contra el sistema real.
- **Playwright permanente**: `apps/web/e2e/phases/f1.spec.ts` — recorrido: los 5 casos de uso de §3 que no necesitan cuenta (CU1 token opaco, CU2 log ilegible, CU3 ambigüedad, CU4 desvío, CU5 URL con parámetros).
- **Verificación (E2E de fase)**: **cierra los criterios 14.1, 14.2, 14.3, 14.4, 14.5, 14.6 y 14.7 del PRD**, cada uno ejecutado literalmente y con evidencia en `docs/verifications/T1.7/`; `pnpm gate` y `pnpm test:e2e` en verde; sin regresión del E2E de F0 ni del showcase de TD. Parada de fin de fase: resumen al usuario y esperar OK.

---

## F2 — El historial

La cuenta deja de ser decorado: lo que analizas queda registrado —redactado (D7)— y se puede revisar. La regla que gobierna la fase es que **el dato crudo no se persiste ni se loguea**: si esta fase se implementa mal, el producto se convierte en el pasivo que el PRD describe en R2.

#### T2.1 · Registro de historial redactado
- **Depende de**: T0.4, T1.4
- **Entrega**: `POST /api/analyze` pasa a registrar una fila de `history_entry` **cuando hay sesión** (§8): `preview` calculado en el servidor antes de persistir — truncado a 120 caracteres y, si el kind es `jwt`, con payload y firma sustituidos por `…`; `input_kind` del paso 0; `chain` con el resumen `[{kind, transform_id}]` **sin valores intermedios** (D7). Sin sesión no se registra nada. Repo tipado en `packages/db`.
- **Playwright permanente**: no aplica (sin superficie de navegador propia; la cubre T2.2).
- **Verificación**: con sesión iniciada, analizar el JWT del ejemplo de §6.5 → en `psql`, la fila de `history_entry` existe y su `preview` **no contiene el token completo** ni el payload, y `chain` no contiene ningún valor (control negativo literal: `grep` del token en el dump de la fila no devuelve nada — criterio 14.8); sin sesión, analizar lo mismo **no crea ninguna fila** (control negativo de D6).

#### T2.2 · La pantalla `/history`
- **Depende de**: T2.1, TD.7, TD.5
- **Entrega**: `/history` (§7) construida desde su mockup con `HistoryRow`: lista de las últimas 50 entradas del usuario (vista previa redactada, tipo detectado, cadena aplicada, fecha relativa), con **reabrir** (restaura la cadena, no el dato — D7, y la UI lo dice) y **borrar** (una entrada / todas, con confirmación). `GET/DELETE /api/history` paginado y **solo del usuario de la sesión**. `EmptyState` cuando no hay entradas.
- **Mockup**: `docs/mockups/history.html`
- **Playwright permanente**: `apps/web/e2e/history.spec.ts` — protege: analizar algo con sesión lo hace aparecer en `/history`; reabrir restaura la cadena y muestra el aviso de D7; borrar una entrada la quita; borrar todas deja el `EmptyState`; `/history` sin sesión redirige a `/login`; **un usuario no ve las entradas de otro** (control negativo de aislamiento, con dos cuentas).
- **Verificación**: en el navegador con sesión, analizar algo → aparece en `/history` con la vista previa redactada (criterio 14.8); reabrir muestra la cadena y el aviso de que el dato no se restaura; borrar funciona; con una segunda cuenta, `/history` está vacío y un `GET /api/history` manipulando el id de usuario **no devuelve entradas ajenas**; comparación visual contra `docs/mockups/history.html` (regla 7).

#### T2.3 · E2E de fase F2
- **Depende de**: T2.2
- **Entrega**: spec de fase en `apps/web/e2e/phases/f2.spec.ts` con tags `@f2 @phase`.
- **Playwright permanente**: `apps/web/e2e/phases/f2.spec.ts` — recorrido: CU6 (el regreso) completo — signup → analizar dos entradas → `/history` → reabrir → borrar; más el guardián de D6: todo `/` sigue funcionando sin cuenta.
- **Verificación (E2E de fase)**: **cierra los criterios 14.8 y 14.9 del PRD**, ejecutados literalmente con evidencia en `docs/verifications/T2.3/` (incluido el `grep` sobre los logs y el `psql` sobre la fila); `pnpm gate` y `pnpm test:e2e` en verde; sin regresión de los E2E de F0 y F1. Parada de fin de fase.

---

## F3 — Producción

El producto existe para el mundo o no existe. Se despliega en el VPS —**donde el propio bucle se está ejecutando**, así que la skill `deploy` autodetecta modo VPS— bajo `devtools.carlosvillu.dev`. Toda la operación va por la skill `deploy` (configuración en `deploy.env`); nada de SSH a mano ni tocar el Caddy central por libre.

#### T3.1 · Compose de producción, Caddy y dominio ⚠
- **Depende de**: T2.2, T0.4; ⚠ **el usuario aporta**: confirmación en el panel de Cloudflare de que `devtools.carlosvillu.dev` apunta al origen `80.190.75.149` y de que el modo SSL es **Full (strict)** — el DNS ya resuelve por Cloudflare, pero desde el VPS no se puede ver a qué origen apunta
- **Entrega**: `docker-compose.prod.yml` (web Next standalone + postgres con volumen persistente; **sin worker**, §5.2), `DEPLOY.md`, deploy por `git pull && docker compose up -d --build` **vía la skill `deploy`** (autodetecta modo local: el bucle corre EN el VPS). Todo según la topología real de §10 y el `~/AGENTS.md` del VPS:
  - **La web publica solo en `127.0.0.1:$WEB_PORT`** (3110, ya en `deploy.env`), nunca en `0.0.0.0` — un puerto abierto por Docker se salta UFW. Bloque de devtools: 3110–3119.
  - Site file `~/infra/caddy/sites/devtools.carlosvillu.dev.caddy` con `reverse_proxy 127.0.0.1:3110`, siguiendo el patrón ya probado del vecino (`ugc.carlosvillu.dev.caddy`); validate + reload del Caddy central. **devtools no lleva reverse proxy propio ni gestiona TLS.**
  - **Registrar devtools en el registro de puertos de `~/AGENTS.md` §3 en este mismo cambio** — ese fichero lo exige para cualquier cambio estructural (un puerto, un sitio, una convención).
  - **Trust boundary** (§10, §11): `header_up X-Forwarded-For {client_ip}` en el site file + `TRUST_PROXY=1` en la app; y como Cloudflare va en proxy naranja, la IP real del cliente es **`CF-Connecting-IP`**, no la del socket ni la de XFF. Al cerrar la tarea se revisan contra esta decisión los dos rate limits ya construidos: login (T0.4) y `/api/analyze` (T1.4).
  - Se ejecuta la decisión de T0.3 sobre migración on-boot vs paso de deploy.
  - La skill `deploy` ya genera el site file correcto (loopback + `header_up`) y exige `WEB_PORT`: se corrigió en el template el 2026-07-17 y se sincronizó aquí (ver journal). Si algo no encaja con el VPS, **el bug es de la skill**, no una excusa para improvisar comandos a mano.
- **Verificación**: desde **fuera** del VPS, `https://devtools.carlosvillu.dev` sirve la app con certificado válido; login funciona; pegar el JWT del ejemplo de §6.5 devuelve la cadena. **Gotcha conocido y de verificación obligatoria**: `next start` no resuelve rutas como `next dev` — la verificación ejercita `docker compose up` REAL, no el modo dev. Controles negativos: (a) `ss -ltn` en el VPS muestra el 3110 escuchando **solo en loopback** y desde fuera `http://80.190.75.149:3110` no responde; (b) el rate limit distingue dos clientes con `CF-Connecting-IP` distinta, en vez de contar a todo Cloudflare como uno solo.

#### T3.2 · Backup diario y restore verificado
- **Depende de**: T3.1
- **Entrega**: cron de `pg_dump` diario con retención, según la skill `deploy`.
- **Verificación**: forzar el backup produce un dump legible por `pg_restore --list` (criterio 14.10); restaurarlo sobre una BD vacía de prueba reproduce las 3 tablas con sus filas (el control que convierte un backup en un backup de verdad).

#### T3.3 · E2E de fase F3
- **Depende de**: T3.2
- **Entrega**: recorrido completo en producción con evidencia en `docs/verifications/T3.3/`.
- **Verificación (E2E de fase)**: **cierra el criterio 14.10 del PRD**: desde fuera del VPS, `https://devtools.carlosvillu.dev` con certificado válido, el recorrido de 14.1 (pegar un JWT → cadena) funciona en producción, y el backup produce un dump restaurable. Además, sin regresión: `pnpm test:e2e` completo en verde contra el entorno local. Parada de fin de fase y cierre del proyecto v1.

---

## Reglas de trabajo

1. **Orden**: el grafo `Depende de` manda (la numeración es orientativa); entre fases se puede adelantar trabajo que no dependa de lo pendiente, pero una fase solo se cierra cuando su E2E final pasa.
2. **Definición de hecho**: subtareas completas + verificación ejecutada y anotada (fecha + resultado + coste real si aplica) + sin regresión del E2E de la fase anterior.
3. **Deudas `[verificar]`**: cada una se cierra en la tarea que la nombra y el resultado se anota también en el PRD para mantenerlo veraz. (En este proyecto los dos `[verificar]` de §1 son supuestos de mercado que D1 declara no bloqueantes: se quedan marcados, no se cierran con una tarea.)
4. **Los E2E de fase son sagrados**: T0.5, TD.7, T1.7, T2.3 y T3.3, y los criterios de éxito del PRD, son la vara de "funciona en el mundo real"; no se marcan por aproximación.
5. **Costes**: toda tarea que llame a APIs de pago anota el coste real observado; si difiere >25 % del estimado, se recalibra el estimador/receta en la misma tarea. (Aquí ninguna lo hace, D8: lo que se anota es el coste de los agentes.)
6. **Cambios de alcance**: si una tarea revela que el PRD necesita ajuste, se edita el PRD en la misma sesión y se anota en ambos documentos (planning y journal). PRD y planning nunca se cuentan historias distintas.
7. **Mockups de página**: cada página con pantalla propia tiene un mockup aprobado por el usuario en `docs/mockups/` (catálogo en `docs/mockups/README.md`), construido con los tokens del design system. La tarea que la desarrolla lo referencia con `- **Mockup**: docs/mockups/<x>.html` y su desarrollo **parte de ese mockup** (con los componentes `components/ui/` del DS, no reinventado). Una página que se desvíe del mockup sin acuerdo explícito es un error de review. Páginas nuevas sin mockup: se acuerda el layout con el usuario antes de implementarlas.
8. **Las cláusulas deterministas de una Verificación se quedan como tests**: todo check automatizable y gratuito de un DoD (asserts sobre ficheros, validadores de schema/seeds, linters, golden files) se codifica como test permanente dentro de `pnpm gate` en la misma tarea — así el "sin regresión" de la regla 2 es ejecutable y gratis para siempre. Las cláusulas con APIs de pago o juicio humano quedan one-shot con su evidencia en `docs/verifications/`.
9. **Coste estimado por tarea**: toda tarea cuya verificación consuma APIs de pago lleva una línea `- **Coste estimado**` — es la base del cap de gasto del bucle. Si una tarea sin estimado resulta necesitar APIs de pago, el bucle la trata como parada de gasto (no improvisa el presupuesto).
10. **Playwright permanente por tarea web**: toda tarea cuya Entrega añada o modifique comportamiento operable en navegador declara una línea `- **Playwright permanente**` con el fichero exacto y los comportamientos protegidos. El spec se crea o actualiza en esa misma tarea, usa providers fake/fixtures para ser determinista y gratuito, y queda en `pnpm test:e2e`. Los E2E de fase viven además en `apps/web/e2e/phases/` con tags `@fN @phase`. Una excepción por infraestructura o proveedor real debe quedar escrita en la tarea junto con la capa permanente alternativa; nunca se omite en silencio.
