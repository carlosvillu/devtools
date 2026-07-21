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
| F0 | Fundaciones | Monorepo con `pnpm gate` verde, Postgres en Docker, migración inicial aplicada y auth email+contraseña operable en el navegador: registrarse, entrar, y que la sesión sobreviva a un refresh | ✅ |
| TD | Design system | `/design-system` muestra tokens y componentes fieles a Claude Design, lint de adherencia activo y skill frontend actualizada — se ejecuta tras T0.1, antes de continuar F0 | ✅ |
| F1 | El motor y el campo | Pegas un JWT (o un base64, o un timestamp) en `/` y ves la cadena desenredada paso a paso, con las alternativas de detección a un clic y el desvío de cualquier paso | ✅ |
| F2 | El historial | Con cuenta iniciada, lo que analizas aparece en `/history` con la vista previa redactada; se puede reabrir y borrar. Sin cuenta, `/` sigue funcionando igual | ✅ |
| F3 | Producción | `https://devtools.carlosvillu.dev` sirve la app con TLS válido, el recorrido completo funciona en producción y el backup diario produce un dump restaurable | ✅ |
| F4 | Post-v1 (v1.1) | Pegar una petición HTTP entera en `/` no deja el payload del JWT en la BD: la redacción del preview deja de depender de que el detector acierte con el tipo | ✅ |
| F5 | La landing | `/` es una landing estilo Google (wordmark + campo + badges + footer); pegar o Enter salta a `/analyze`, que es la experiencia de análisis de hoy. El input viaja por sessionStorage, nunca por la URL | ☐ |

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

#### T0.2 · Docker Compose de desarrollo con Postgres [x] 2026-07-18 — PASS, ver docs/verifications/T0.2/
- **Depende de**: T0.1; TD.7 (dependencia de ORDEN, no técnica: toda UI posterior se construye con las primitivas del DS)
- **Entrega**: `docker-compose.dev.yml` con `postgres:16` y volumen persistente; `.env.example` documentado; `apps/web` conecta al arrancar y `/api/health` pasa a devolver `{ok:true, db:true}`.
- **Verificación**: `docker compose -f docker-compose.dev.yml up -d` → `curl /api/health` devuelve `{ok:true, db:true}`; parar el contenedor de Postgres → `/api/health` devuelve `{ok:true, db:false}` **sin tumbar la app** (control negativo: la web sigue sirviendo).

#### T0.3 · Drizzle y migración inicial [x] 2026-07-18 — PASS, ver docs/verifications/T0.3/
- **Depende de**: T0.2
- **Entrega**: Drizzle en `packages/db` con el esquema de §9 (`user`, `session`, `history_entry`), migración inicial, runner `db:migrate` y repos tipados mínimos. **Decidir y anotar aquí** (§9): si `email` se resuelve con `citext` o con normalización a minúsculas en aplicación + índice único; y si la migración corre on-boot con lock o como paso de deploy (la decisión condiciona T3.1).
  - **DECIDIDO (T0.3)**: email → normalización en app + **índice único funcional `lower(email)`** (sin citext); migraciones **on-boot con lock** (`pg_advisory_lock`). Anotado en PRD §9.
- **Subtareas**:
  - [x] Esquema Drizzle de las 3 tablas con los índices de §9 (`(user_id, created_at desc)` en `history_entry`)
  - [x] Migración inicial + `db:migrate`
  - [x] Repos mínimos: crear/leer usuario, crear/leer sesión
  - [x] Anotar en el planning y en el PRD (§9) la decisión de `citext` y la de on-boot vs deploy
- **Verificación**: `pnpm db:migrate` sobre una BD vacía crea las 3 tablas (`psql \dt` las lista con sus índices); un script de smoke inserta un `user` y lo lee de vuelta; insertar un segundo `user` con el mismo email en distinta capitalización **falla** (control negativo que prueba la decisión de unicidad).

#### T0.4 · Auth email + contraseña [x] 2026-07-19 — PASS, ver docs/verifications/T0.4/
- **Depende de**: T0.3, TD.7
- **Entrega**: signup, login y logout (§8 módulo `auth`, D9): hash de contraseña con scrypt de `node:crypto`, sesión en cookie httpOnly/secure/sameSite=lax con expiración en la tabla `session` (no solo en la cookie), rate limit por IP en login, y respuestas indistinguibles entre "email no existe" y "contraseña incorrecta" (§11). Pantallas `/login` y `/signup` construidas con las primitivas del DS. **Middleware que protege ÚNICAMENTE `/history` y `/api/history` (D6)** — `/` y `/api/analyze` son públicas: esto contradice el default del template y es deliberado.
- **Riesgos ACEPTADOS conscientemente (anotados al cerrar T0.4, 2026-07-19)** — decisiones de postura, no descuidos; se registran para que sean revisables y no «deuda invisible»:
  1. **El token de sesión se guarda en claro**: el id de sesión (UUID v4, 122 bits de CSPRNG) ES el bearer token y viaja tal cual a la columna `session.id`. Lo impone el esquema de §9, que no tiene columna de hash. Implicación: quien pueda LEER la tabla `session` (dump, backup, SQLi) puede suplantar sesiones vivas. Aceptable en v1 (entropía suficiente contra fuerza bruta, dato de baja sensibilidad, superficie de BD controlada); el endurecimiento sería guardar `sha256(token)` y comparar por hash.
  2. **Enumeración de cuentas por signup**: el login es indistinguible (§11) pero el signup responde «Ese email ya está registrado» — es INEVITABLE para que el formulario sea usable. Se acota con rate limit por IP en signup (añadido al cerrar T0.4: 10/15 min, además de proteger del flood de scrypt), no se elimina.
  3. **Rate limit sobre `x-forwarded-for`**: ver los dos defectos concretos detallados en **T3.1**, que es donde se cierran.
- **Subtareas**:
  - [x] `POST /api/auth/{signup,login,logout}` + hash scrypt + sesión en BD
  - [x] Middleware con la lista de rutas protegidas de D6 (y un test que falle si `/` se protege por error)
  - [x] Pantallas `/login` y `/signup` desde sus mockups
  - [x] Rate limit por IP en login (+ en signup, añadido en la review: protege del flood de scrypt y acota la enumeración). **Ojo, la letra pequeña de esta subtarea NO se cumple literalmente**: decía «hasta entonces, IP directa», pero `clientIp()` no lee la IP del socket — sin `x-forwarded-for` devuelve `'unknown'` y todos comparten bucket. Medido al verificar; ver los dos defectos concretos en **T3.1**, que es donde se cierra
- **Mockup**: `docs/mockups/login.html`, `docs/mockups/signup.html`
- **Playwright permanente**: `apps/web/e2e/auth.spec.ts` — protege: signup crea cuenta y deja sesión iniciada; la cookie sobrevive a un refresh; logout la invalida; `/history` sin sesión redirige a `/login`; **`/` sin sesión responde 200 y es usable** (el guardián de D6).
- **Verificación**: en el navegador, registrarse con un email nuevo → queda la sesión iniciada y sobrevive a un refresh; contraseña incorrecta repetida → el rate limit se hace visible; el mensaje de error es idéntico para email inexistente y para contraseña mal (se comparan literalmente); `/history` sin sesión redirige a `/login` y `/` sin sesión carga con normalidad.

#### T0.5 · E2E de fase F0 [x] 2026-07-19 — PASS, ver docs/verifications/T0.5/
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

#### TD.1 · Tokens del DS, fuentes, espejos y showcase `/design-system` [x] 2026-07-17 — PASS, ver docs/verifications/TD.1/
- **Depende de**: T0.1
- **Entrega**: espejo inicial de `docs/design-system/` regenerado con `DesignSync`; `globals.css` con TODOS los tokens del espejo (`tokens/*.css`) volcados **verbatim** (hex tal cual, sin conversiones, naming 1:1) en los **3 bloques canónicos de Tailwind v4 CSS-first** (no existe `tailwind.config.js`): (1) `:root` + overrides — tema claro por defecto en `:root` (variante A), el oscuro como override completo bajo `[data-theme=…]`, semánticos FIJOS; (2) `@theme inline {}` mapeando cada token con el naming del DS (`bg-surface`, `text-text-2`, `rounded-md`…); (3) `@layer base {}` con defaults mínimos. Fuentes del DS self-hosted (0 requests a CDNs). Página `/design-system` con specimens de fundaciones y switcher de tema (por atributo en `<html>`, nunca por media query; defaults sin atributo = SSR limpio).
  **Corrección de alcance (2026-07-17, en TD.1)**: esta entrada exigía además switchers de **acento** y **densidad**. Se eliminan porque **el DS no los soporta y construirlos exigiría inventar valores visuales**, que es justo lo que los principios de esta fase prohíben. Verificado contra fuentes primarias: `tokens/colors.css` define **un solo acento** (`--blue-*`, «one accent»; `guidelines/colors-accent.html` se titula «the single brand hue») y **ningún** `[data-accent]`; y **no existe `--ui-fs`** ni escala de densidad en los 6 `tokens/*.css` (el scale de `typography.css` es rem fijo). El **PRD no menciona acento ni densidad ni switchers** (cero coincidencias), así que no hay decisión de producto que revisar: era **arrastre de la plantilla genérica**, cuya skill `frontend` los formula CONDICIONALES («los acentos conmutables **los dicta el DS**», «**si** el DS define densidades»). El **tema sí se queda**: el DS define el oscuro (bajo `.dark`, que se traduce a `[data-theme=…]` por mandato de la skill). Si algún día se quieren acentos, el camino es añadirlos al DS en Claude Design primero — nunca al revés.
  **Además (desviación deliberada del patrón TD, acordada en el bootstrap): el espejo de los mockups.** Volcar a `docs/mockups/` los 4 mockups de **variante A "Claro"** del proyecto `1132e88c-090e-42ad-a121-490714cf7ec5` como HTML autónomos renderizables en `file://` — `field.html` (`FieldClaro`), `history.html` (`HistoryClaro`), `login.html` (`LoginClaro`), `signup.html` (`SignupClaro`) — más `mobile.html` (`variant-mobile.jsx`) como referencia responsive. Rellenar el «Mapa página → mockup» de `docs/mockups/README.md`. **Confirmar** a qué variante corresponde la móvil y anotarlo en «Notas de fidelidad» si no es la A. Motivo de la desviación: la regla 7 exige el mockup local antes de T0.4/T1.5/T2.2, y esta es la primera tarea que tiene `DesignSync` y el DS en la mano.
  ~~**Gotcha `--shadow-*`**: si el DS llama a sus sombras `--shadow-*`, ese namespace lo usa `@theme` y crea un `var()` circular — se vuelcan como `--elevation-*`.~~ **RETIRADO (2026-07-17, en TD.1): la premisa era FALSA.** Verificado contra un build real de Tailwind v4.3.3: `@theme inline` **no emite la variable**, inserta el `var()` en la utilidad (`.shadow-sm { --tw-shadow: var(--shadow-sm) }` resolviendo contra el `:root` del volcado). **Cero circularidad**, así que renombrar a `--elevation-*` habría introducido una desviación de naming para un problema inexistente, violando el «naming 1:1» que es la regla primaria. Y el «es la ÚNICA colisión» también era falso: colisionan **7 namespaces** (`--radius-*`, `--text-*`, `--font-*`, `--leading-*`, `--tracking-*`, `--ease-*`, `--shadow-*`) y **todos conservan el nombre del DS**.
- **Subtareas**:
  - [x] Regenerar espejo `docs/design-system/` con `DesignSync`
  - [x] Volcar tokens verbatim a los 3 bloques de `globals.css` (ojo al gotcha `--shadow-*`)
  - [x] Fuentes self-hosted
  - [x] `/design-system` con specimens + switcher de tema (acento/densidad retirados: el DS no los define — ver corrección de alcance)
  - [x] Espejo de mockups en `docs/mockups/` + catálogo en su README
- **Verificación**: `/design-system` en el navegador muestra los specimens de fundaciones; el switcher cambia el tema en vivo; comparación visual contra `guidelines/` del espejo sin desviaciones perceptibles; los 5 HTML de `docs/mockups/` abren en el navegador y se parecen a lo que muestra el canvas de Claude Design; ninguna petición a CDNs externos en la pestaña de red.

#### TD.2 · Primitivas de formulario [x] 2026-07-18 — PASS, ver docs/verifications/TD.2/
- **Depende de**: TD.1
  **Desviación (2026-07-18)**: la Entrega decía «generadas con shadcn sobre **Base UI**», pero las 6 primitivas del espejo son **controles nativos** (incluido `<select>` nativo), así que ninguna consume una primitiva de Base UI. Instalar `@base-ui-components/react` ahora sería una dep huérfana que knip rechaza; se difiere a **TD.4** (primera primitiva portalizada: dialog/tooltip/toast). Se instaló el toolchain shadcn (`components.json` + cva/clsx/tailwind-merge). Sancionado por `frontend/design-system.md §4`.
- **Entrega**: `Button`, `Input`, `Textarea`, `Select`, `Field`, `IconButton` en `apps/web/src/components/ui/` — generadas con shadcn sobre **Base UI** y ajustadas 1:1 al espejo `components/forms/`: variantes cva con **los MISMOS nombres de variante que el DS** (`Button.jsx` es la spec; `Button.prompt.md` la intención), clases semánticas de token, `data-slot` conservado, a11y de la primitiva intacta, ~~**glifos Unicode en lugar de librerías de iconos**~~. Secciones nuevas en `/design-system`.
  **Corrección de alcance (2026-07-18, en TD.2)**: la Entrega mandaba «glifos Unicode en lugar de librerías de iconos». Se cambia a **usar el `Icon` SVG del propio DS** (`docs/design-system/components/display/Icon.jsx`: paths lucide **inline**, cero dependencia de `lucide-react`). Motivo: los glifos Unicode fallaron el VERIFY —`copy` (⧉ U+29C9) y otros salen tofu (□) porque Geist no cubre esos code points, y **no existe un glifo Unicode fiel de "copiar"**— y además un carácter Unicode nunca es 1:1 con el SVG del specimen, rompiendo la fidelidad que la propia Verificación exige. El principio vinculante de la fase manda obedecer al DS, cuyo sistema de iconos ES SVG-inline. Esto **adelanta a TD.2 la construcción del componente `Icon`** (que el inventario del DS ubica en `display/`); **TD.4** ya no lo lista, y la sección de showcase del `Icon` y el resto de `display/` siguen en **TD.3**. El intento literal de la Entrega («glifos Unicode») era arrastre incompatible con el DS: se corrige aquí, no se fuerza.
- **Verificación**: comparación en navegador contra los specimens del espejo en **ambos temas**: variantes y estados hover/focus/disabled fieles; todos los controles operables por rol y accessible name.

#### TD.3 · Primitivas de display y feedback [x] 2026-07-18 — PASS, ver docs/verifications/TD.3/
- **Depende de**: TD.2
- **Entrega**: `Badge`, `Card`, `CodeBlock`, `ConfidenceBar`, `CopyButton`, `Icon`, `Kbd` (espejo `components/display/`) y `Callout`, `EmptyState`, `Spinner` (espejo `components/feedback/`), mismo estándar que TD.2. Secciones en `/design-system`.
- **Verificación**: comparación contra sus specimens en ambos temas; `CopyButton` y `Kbd` operables por teclado; `ConfidenceBar` legible sin depender solo del color (requisito de §7 O5: la ambigüedad se comunica, no se insinúa).

#### TD.4 · Gaps: primitivas fuera del DS + subida a Claude Design [x] 2026-07-18 — PASS, ver docs/verifications/TD.4/
- **Depende de**: TD.3
- **Entrega**: las primitivas que el producto necesita y el DS **no** define, creadas siguiendo las **foundations** del DS (hairlines, radios, focus ring único, glifos Unicode, sin gradientes ni glassmorphism). Candidatas detectadas al leer los mockups: `Wordmark` (existe como guideline `brand-wordmark.html`, no como componente), y las que el producto hará inevitables — confirmación de borrado del historial (dialog), aviso de "copiado" (toast), `Tooltip` y `Skeleton`. **La lista definitiva se cierra en la tarea**: se crea solo lo que T1.5/T1.6/T2.2 vayan a consumir, nada especulativo. Secciones en `/design-system` + **subida de todas al proyecto de Claude Design vía `DesignSync`** en su formato (`.jsx` + `.prompt.md` + card), regenerando el espejo después — el DS sigue siendo inventario completo. Solo se suben **tokens y componentes**, no mecanismos de compilación propios (`@utility`, keyframes wrapper): eso sería contenido muerto para el DS.
- **Verificación**: revisión en navegador de las secciones nuevas en ambos temas (coherencia con las foundations); `DesignSync list_files` muestra los ficheros nuevos y el espejo regenerado los incluye.

#### TD.5 · Composites de producto (presentacionales puros) [x] 2026-07-18 — PASS, ver docs/verifications/TD.5/
- **Depende de**: TD.3
- **Entrega**: `StepCard` y `ChainSummary` (espejo `components/chain/`) y `HistoryRow` (espejo `components/history/`) como presentacionales **PUROS**: props planas, **prohibido importar tipos de dominio de `packages/core`** — los wrappers de dominio llegan con las features (T1.5, T2.2). Fieles a sus specs del espejo. Secciones en `/design-system` con los datos de ejemplo del propio DS.
- **Verificación**: comparación contra sus specimens en ambos temas; animaciones apagadas bajo `prefers-reduced-motion` sin perder el estado visible; un test de lint/typecheck falla si un composite importa de `packages/core` (control negativo de la pureza).

#### TD.6 · Lint de adherencia al DS [x] 2026-07-18 — PASS, ver docs/verifications/TD.6/
- **Depende de**: TD.5
- **Entrega**: reglas de lint (scope `apps/web`, dentro de `pnpm gate`) adaptando las ideas de `_adherence.oxlintrc.json` del proyecto de Claude Design al flat config del repo. **Prohíben**: paleta cruda de Tailwind (`bg-blue-500`…), valores arbitrarios crudos en `className` (`bg-[#…]`, `rounded-[10px]`) fuera de `globals.css`, e imports de `@radix-ui/*`, `lucide-react` o cualquier librería de iconos. **NO prohíben**: spacing fraccionario (`size-4.5` — es el mecanismo de fidelidad al px) ni token-vía-var (`[--x:var(--warning)]`).
- **Verificación**: un fichero de prueba con una violación de cada tipo hace fallar `pnpm lint` **nombrando la regla**; al retirarlo, `pnpm gate` queda verde (el control negativo muerde).

#### TD.7 · Cierre: skill frontend contra la realidad + OK humano [x] 2026-07-18 — PASS (OK visual humano dado), ver docs/verifications/TD.7/
- **Depende de**: TD.4, TD.6
- **Entrega**: skill `frontend` actualizada **contra el código real committeado** (no contra el espejo): inventario definitivo de `components/ui/` con variantes y props leídas de los `.tsx`, desviaciones deliberadas documentadas (incluida la de `--shadow-*` si aplicó), obligatoriedad explícita («si existe el componente del DS, usarlo es obligatorio; HTML crudo estilado equivalente = error de review») y ajustes descubiertos en la fase anotados en el journal.
- **Verificación (E2E de fase)**: recorrido completo de `/design-system` — ambos temas (los acentos conmutables se retiraron en TD.1: el DS define un solo acento) — con evidencia visual en `docs/verifications/TD.7/`; `pnpm gate` verde; y **revisión humana final del showcase** (parada de fin de fase: el usuario da el OK visual).

---

## F1 — El motor y el campo

El primer hito de valor real. Al cerrar F1 se pega algo en `/` y se ve la cadena desenredada, sin cuenta y sin historial. El motor (§6) se construye entero en `packages/core` **antes** de que exista una sola línea de UI que lo consuma: es lógica pura, determinista y barata de testear, y es el sitio donde el banco de pruebas gana más.

#### T1.1 · Contratos del motor y detectores [x] 2026-07-18 — PASS, ver docs/verifications/T1.1/
- **Depende de**: T0.1
- **Entrega**: en `packages/core`, los contratos de §6.1 (`DataKind`, `Detection`, `Transform`, `TransformResult`, `ChainStep`, `Chain`) como tipos TS **y** esquemas Zod, y los 8 detectores de §6.2 (`jwt`, `json`, `base64`, `unix_timestamp`, `url`, `uuid`, `hash`, `text`) como funciones puras que devuelven `Detection[]` ordenadas por confianza descendente.
- **Subtareas**:
  - [x] Contratos + esquemas Zod
  - [x] Los 8 detectores, cada uno con su regla de §6.2
  - [x] `base64` solo detecta si el decodificado es **texto imprimible o JSON** (§6.2, riesgo R4)
  - [x] `jwt` tolera el prefijo `Bearer ` (CU1)
  - [x] `text` siempre presente como último recurso con confianza 0.01 (I6)
- **Verificación**: `pnpm test` con el corpus de casos: cada detector acierta sobre sus positivos y **no dispara sobre los negativos** — en particular, una cadena alfanumérica arbitraria (`"holaquetalestamos"`) NO se detecta como base64 pese a ser base64 válido (R4), y `1752624000` produce `[unix_timestamp, text]` con la alternativa presente (I8). Los tests son parte del gate desde esta tarea (regla 8).

#### T1.2 · Transformaciones [x] 2026-07-18 — PASS, ver docs/verifications/T1.2/
- **Depende de**: T1.1
- **Entrega**: las 11 transformaciones de §6.3 (`base64.decode`, `jwt.decode`, `json.format`, `json.minify`, `json.sort_keys`, `timestamp.to_iso`, `timestamp.to_relative`, `url.decode`, `url.split_query`, `uuid.describe`, `hash.identify`) como funciones **puras y totales** (I1: nunca lanzan; un fallo es `{ok:false,error}`), con el registro de cuál es la transformación por defecto de cada kind (§6.3). El tiempo se inyecta: `timestamp.to_relative` y la expiración del JWT reciben `now: Date` como parámetro explícito (I4).
- **Verificación**: `pnpm test` — cada transformación sobre entradas válidas produce la salida esperada y sobre entradas rotas devuelve `{ok:false}` **sin lanzar** (control negativo: un test que envuelve cada `apply` en try/catch y falla si algo lanza); `timestamp.to_relative` con el mismo `now` fijado produce el mismo texto en dos ejecuciones (I5); ninguna función del motor referencia `Date.now()` (control negativo: un lint/test que hace grep sobre `packages/core` y falla si aparece).

#### T1.3 · Motor de cadena [x] 2026-07-18 — PASS, ver docs/verifications/T1.3/
- **Depende de**: T1.2
- **Entrega**: `analyze(input, { now })` en `packages/core` que construye la `Chain` completa de §6.1: detecta → aplica la transformación por defecto → **re-detecta sobre el resultado** → repite. Implementa los invariantes I1–I6: pureza y totalidad, profundidad máxima 8 (`terminal:'max_depth'`), detección de ciclos (`terminal:'cycle'`), tiempo inyectado, determinismo, `text` terminal. Incluye la regla de §6.5 que el implementer no debe adivinar: **una transformación no se re-aplica si su salida es idéntica a su entrada** (`terminal:'no_transform'`). Corpus de golden files.
- **Subtareas**:
  - [x] Bucle de encadenado + los 5 finales de `terminal`
  - [x] Detección de ciclos por output ya visto como input previo (I3)
  - [x] Golden files del corpus (incluido el ejemplo trabajado de §6.5)
- **Verificación**: `pnpm test` — el ejemplo de §6.5 produce **exactamente** la cadena documentada (jwt → json → terminal `no_transform`, con la nota de expiración); ninguna entrada del corpus supera 8 pasos ni entra en bucle (criterio 14.7); dos ejecuciones con el mismo `now` producen `Chain` idéntica byte a byte (criterio 14.6, I5); el guard I3 corta un grafo de transformaciones construido para auto-alimentarse a `terminal:'cycle'` conservando los pasos previos (verificado inyectando las hojas detect/índice sobre el bucle real `runChain` + control negativo que muerde; el ciclo es inalcanzable con las transformaciones reales de v1 — ver §6.4 I3).

#### T1.4 · `POST /api/analyze` [x] 2026-07-18 — PASS, ver docs/verifications/T1.4/
- **Depende de**: T1.3, T0.1
- **Entrega**: route handler en `apps/web` (§8 módulo `analyze`) que valida la entrada con Zod, aplica el **límite de 128 KB → 413 sin procesar** (I7), invoca `analyze()` con `now` explícito y devuelve la `Chain` validada contra su esquema. Rate limit por IP (§11; el trust boundary de `x-forwarded-for` se resuelve en T3.1). **Público, sin auth** (D6). Logging de §11: se registran `input_kind`, longitud en bytes, número de pasos y duración — **nunca el input**.
- **Verificación**: `curl -X POST /api/analyze` con el JWT del ejemplo de §6.5 devuelve la `Chain` esperada sin sesión iniciada (D6); un cuerpo de 200 KB devuelve **413** y los logs muestran que no se procesó (criterio 14.5); superar el rate limit devuelve 429; `grep` del input de prueba sobre los logs de la web **no devuelve ninguna coincidencia** (criterio 14.9, control negativo que protege §11).

#### T1.5 · La pantalla `/` — el campo y la cadena [x] 2026-07-18 — PASS, ver docs/verifications/T1.5/
- **Depende de**: T1.4, TD.7, TD.5
- **Entrega**: la pantalla principal (§7) construida desde su mockup con las primitivas del DS: textarea grande con **foco automático**, análisis disparado **al pegar o tras 300 ms de inactividad** al escribir (sin botón de "analizar"), y la cadena desplegada debajo — un `StepCard` por paso con su tipo detectado, la transformación aplicada, el valor resultante y `CopyButton`. `ChainSummary` con los kinds de la cadena. `Callout` de seguridad de §11 ("devtools procesa lo que pegas en el servidor…"). Si no se detecta nada (`text`), se dice explícitamente con qué se intentó — nunca pantalla vacía (§7). Wrappers de dominio: los composites de TD.5 siguen siendo puros; la traducción `Chain` → props vive aquí.
- **Mockup**: `docs/mockups/field.html` (referencia responsive: `docs/mockups/mobile.html`)
- **Playwright permanente**: `apps/web/e2e/field.spec.ts` — protege: pegar un JWT despliega la cadena `jwt → json` sin tocar ningún botón; el foco está en el campo al cargar; cada paso intermedio se copia; el `Callout` de seguridad es visible; entrada no reconocida muestra el mensaje explícito y no una pantalla vacía; en viewport móvil la cadena se apila (no hay scroll horizontal del body).
- **Verificación**: en el navegador, pegar `Bearer <JWT>` real → en < 1 s aparece la cadena `jwt → json` con el payload formateado y la expiración en lenguaje natural, sin que el usuario elija nada (criterio 14.1); pegar un base64 que contiene JSON → 3 pasos visibles y el valor de cualquier paso intermedio se copia con un clic (criterio 14.2); comparación visual contra `docs/mockups/field.html` sin desviaciones no acordadas (regla 7).

#### T1.6 · Alternativas de detección y desvío de la cadena [x] 2026-07-18 — PASS, ver docs/verifications/T1.6/
- **Depende de**: T1.5
- **Entrega**: la interacción que cierra O4 y O5 sobre la pantalla de T1.5: cada paso muestra las **detecciones descartadas** con su `ConfidenceBar` cuando hay alguna con confianza ≥ 0.3 (I8: la ambigüedad nunca se oculta), y permite **elegir una transformación alternativa** a la propuesta; al hacerlo, la cadena se **recalcula desde ese paso** dejando intactos los anteriores.
- **Mockup**: `docs/mockups/field.html`
- **Playwright permanente**: `apps/web/e2e/field-alternatives.spec.ts` — protege: `1752624000` muestra la alternativa `text`; cambiar a la alternativa recalcula la cadena; elegir otra transformación en el paso N deja intactos los pasos < N y recalcula los > N.
- **Verificación**: en el navegador, pegar `1752624000` → la UI muestra la lectura como timestamp **y** deja ver que existe la alternativa `text`; cambiar a la alternativa recalcula la cadena (criterio 14.3); en cualquier paso, elegir una transformación distinta de la propuesta recalcula desde ese punto y deja los pasos anteriores intactos (criterio 14.4, CU4).

#### T1.7 · E2E de fase F1 [x] 2026-07-18 — PASS, ver docs/verifications/T1.7/
- **Depende de**: T1.6
- **Entrega**: spec de fase en `apps/web/e2e/phases/f1.spec.ts` con tags `@f1 @phase` que recorre el journey completo de la fase contra el sistema real.
- **Playwright permanente**: `apps/web/e2e/phases/f1.spec.ts` — recorrido: los 5 casos de uso de §3 que no necesitan cuenta (CU1 token opaco, CU2 log ilegible, CU3 ambigüedad, CU4 desvío, CU5 URL con parámetros).
- **Verificación (E2E de fase)**: **cierra los criterios 14.1, 14.2, 14.3, 14.4, 14.5, 14.6 y 14.7 del PRD**, cada uno ejecutado literalmente y con evidencia en `docs/verifications/T1.7/`; `pnpm gate` y `pnpm test:e2e` en verde; sin regresión del E2E de F0 ni del showcase de TD. Parada de fin de fase: resumen al usuario y esperar OK.

### Deploy temprano de F1 (adelanto de la mitad «servir en público» de 14.10)

> **Motivo del adelanto**: directiva del usuario (2026-07-18) de encaminar el deploy «cuando sea oportuno, sin retrasarlo ni forzarlo». F1 es la porción de valor desplegable del PRD (`/` pública, sin cuenta). Se separa en dos tareas por la costura autónomo/gated-por-usuario: **T1.8** (todo automatizable, hasta una imagen de prod que sirve en local en el VPS) y **T1.9** (go-live, que gatea en el DNS/SSL del usuario). La infra que construye T1.8 (`Dockerfile` + `docker-compose.prod.yml`) es LA infra de producción; los deploys posteriores (auth, historial) la reutilizan añadiendo migraciones. **T3.1 deja de construir la infra desde cero**: pasa a re-desplegar el producto completo sobre esta base + el endurecimiento de rate-limit por `CF-Connecting-IP` (§10).

#### T1.8 · Infra de producción + imagen que sirve F1 en local (VPS) [x] 2026-07-18 — PASS, ver docs/verifications/T1.8/
- **Depende de**: T1.7
- **Entrega**: `Dockerfile` (Next standalone — requiere `output: 'standalone'` en `next.config.ts`) y `docker-compose.prod.yml` (web en `127.0.0.1:3110` + `postgres:16` con volumen persistente, **sin worker** §5.2, sin TLS/proxy — el Caddy central termina el TLS) según la topología de §10 y `~/AGENTS.md`. Postgres se incluye vacío (F1 no lo consulta; `/api/health` da `db:true`) para fijar la topología real una sola vez. No romper el patrón de migraciones-on-boot de la skill `deploy` (aún no hay migraciones; T0.3 las añade). **Todo automatizable, sin tocar DNS/Caddy/vecinos.**
- **Verificación**: en el VPS, `docker compose -f docker-compose.prod.yml up -d --build` (proyecto `devtools`, con el compose de dev abajo) levanta `web` **healthy** en `127.0.0.1:3110`; `curl 127.0.0.1:3110/` sirve la app y el recorrido de 14.1 (pegar el JWT de §6.5 → cadena `jwt → json`) funciona contra la imagen de PROD (no `next dev` — gotcha de `next start`); `/api/health` = `{ok:true, db:true}`. Controles negativos: `ss -ltn` muestra el 3110 **solo en loopback** y desde fuera `http://80.190.75.149:3110` no responde; los vecinos `ugc-factory-*` + `edge-caddy` intactos; entorno restaurado al bajar.

#### T1.9 · Go-live de F1 (Caddy central + dominio) ⚠ [x] 2026-07-18 — PASS (F1 LIVE en https://devtools.carlosvillu.dev), ver docs/verifications/T1.9/
- **Depende de**: T1.8; ⚠ **el usuario aporta**: confirmación en Cloudflare de que `devtools.carlosvillu.dev` apunta al origen `80.190.75.149` y de que el modo SSL es **Full (strict)** (el DNS ya resuelve por Cloudflare — IPs de borde —, pero desde el VPS no se ve el origen), y el **OK explícito para publicar** (acción outward-facing e irreversible).
- **Entrega**: publicar F1 vía la skill `deploy` (`redeploy.sh`, autodetecta modo local: el bucle corre EN el VPS) — crea el site block del Caddy central para `devtools.carlosvillu.dev` → `127.0.0.1:3110` y verifica desde fuera. Sin worker.
- **Verificación**: **cierra la mitad «servir en público» del criterio 14.10**: desde **fuera** del VPS, `https://devtools.carlosvillu.dev` sirve F1 con certificado válido y el recorrido de 14.1 (pegar un JWT → cadena) funciona en producción; `verify.sh` (5 capas) en verde. (El login, el backup y el rate-limit por `CF-Connecting-IP` cierran en F3/T3.1–T3.3 sobre esta misma infra.)

---

## F2 — El historial

La cuenta deja de ser decorado: lo que analizas queda registrado —redactado (D7)— y se puede revisar. La regla que gobierna la fase es que **el dato crudo no se persiste ni se loguea**: si esta fase se implementa mal, el producto se convierte en el pasivo que el PRD describe en R2.

#### T2.1 · Registro de historial redactado [x] 2026-07-19 — PASS, ver docs/verifications/T2.1/
- **Depende de**: T0.4, T1.4
- **Deuda anotada al cerrar (no bloquea, para T2.2/T3.1)**: el registro se hace con `await` ANTES de responder, así que con la BD **congelada** (que acepta TCP y no responde — no «caída», que falla en 21 ms) una petición **con cookie** tarda ~5 s, y **la dispara un anónimo** mandando `devtools_session=x` contra un endpoint público. Antes del arreglo de T2.1 se colgaba **>25 s indefinidamente**; ahora está ACOTADO por los timeouts de cliente del pool (`connectionTimeoutMillis` + `query_timeout` en `packages/db/src/client.ts`) y es auto-recuperable. El arreglo de fondo, que lleva el residuo a cero, es **sacar el registro del camino de respuesta** (responder primero, persistir después); encaja mejor con la carga de `/history` ya presente.
- **Entrega**: `POST /api/analyze` pasa a registrar una fila de `history_entry` **cuando hay sesión** (§8): `preview` calculado en el servidor antes de persistir — truncado a 120 caracteres y, si el kind es `jwt`, con payload y firma sustituidos por `…`; `input_kind` del paso 0; `chain` con el resumen `[{kind, transform_id}]` **sin valores intermedios** (D7). Sin sesión no se registra nada. Repo tipado en `packages/db`.
- **Playwright permanente**: no aplica (sin superficie de navegador propia; la cubre T2.2).
- **Verificación**: con sesión iniciada, analizar el JWT del ejemplo de §6.5 → en `psql`, la fila de `history_entry` existe y su `preview` **no contiene el token completo** ni el payload, y `chain` no contiene ningún valor (control negativo literal: `grep` del token en el dump de la fila no devuelve nada — criterio 14.8); sin sesión, analizar lo mismo **no crea ninguna fila** (control negativo de D6).

#### T2.2 · La pantalla `/history` [x] 2026-07-19 — PASS, ver docs/verifications/T2.2/
- **Depende de**: T2.1, TD.7, TD.5
- **Deuda anotada al cerrar (no bloquea; decidir en T2.3/T3.1)**:
  1. **La rama de «no se pudo cargar el historial» es inalcanzable por caída de BD**, que es el modo de fallo MÁS probable en producción: `getServerSession()` es no-fatal por diseño (T0.4) y con la BD caída devuelve `null`, así que `/history` **redirige a `/login`** — se le dice al usuario que su sesión caducó cuando sigue viva. El estado de error solo se alcanza si falla la API con la BD sana. Distinguir «no hay sesión» de «no se pudo comprobar» toca `getServerSession` (T0.4), por eso no se hizo aquí.
  2. **El 401 de `/api/history` SIN cookie sale sin `request_id`**: lo emite el middleware de Edge (`proxy.ts`), que corta antes de `withSession`. Con cookie presente (malformada o forjada) sí lo lleva. Hueco de observabilidad, no de seguridad: ese 401 no se puede correlacionar en los logs.
  3. **La redacción del `preview` es solo para `jwt`** (política nacida y verificada en T2.1): un base64 de ≤120 chars se persiste verbatim y puede descodificar a texto legible. Conviene que conste en la foto de privacidad aunque 14.8 se cierre con el JWT.
- **Entrega**: `/history` (§7) construida desde su mockup con `HistoryRow`: lista de las últimas 50 entradas del usuario (vista previa redactada, tipo detectado, cadena aplicada, fecha relativa), con **reabrir** (restaura la cadena, no el dato — D7, y la UI lo dice) y **borrar** (una entrada / todas, con confirmación). `GET/DELETE /api/history` paginado y **solo del usuario de la sesión**. `EmptyState` cuando no hay entradas.
- 🔴 **REQUISITO DE SEGURIDAD, NO NEGOCIABLE (anotado al cerrar T0.4, 2026-07-19)**: **cada handler y cada página protegida DEBE llamar a `validateSession` en el servidor.** El middleware de Edge (`proxy.ts`) solo comprueba que la cookie **EXISTE** (`Boolean(valor)`) — NO la valida: no mira la BD, no comprueba expiración ni revocación. Una cookie forjada (`devtools_session=x`) o una **revocada tras el logout** (el navegador no la borra si el atacante la reenvía) **atraviesa el middleware**. Hoy no hay bug porque no existe ninguna ruta protegida; en el momento en que `/history` y `/api/history` existan, confiar en el middleware = **bypass de autenticación trivial**. El middleware es un atajo de UX (redirigir pronto), jamás autenticación.
- **Mockup**: `docs/mockups/history.html`
- **Playwright permanente**: `apps/web/e2e/history.spec.ts` — protege: analizar algo con sesión lo hace aparecer en `/history`; reabrir restaura la cadena y muestra el aviso de D7; borrar una entrada la quita; borrar todas deja el `EmptyState`; `/history` sin sesión redirige a `/login`; **un usuario no ve las entradas de otro** (control negativo de aislamiento, con dos cuentas).
- **Verificación**: en el navegador con sesión, analizar algo → aparece en `/history` con la vista previa redactada (criterio 14.8); reabrir muestra la cadena y el aviso de que el dato no se restaura; borrar funciona; con una segunda cuenta, `/history` está vacío y un `GET /api/history` manipulando el id de usuario **no devuelve entradas ajenas**; comparación visual contra `docs/mockups/history.html` (regla 7).

#### T2.3 · E2E de fase F2 [x] 2026-07-19 — PASS, ver docs/verifications/T2.3/
- **Depende de**: T2.2
- **Entrega**: spec de fase en `apps/web/e2e/phases/f2.spec.ts` con tags `@f2 @phase`.
- **Playwright permanente**: `apps/web/e2e/phases/f2.spec.ts` — recorrido: CU6 (el regreso) completo — signup → analizar dos entradas → `/history` → reabrir → borrar; más el guardián de D6: todo `/` sigue funcionando sin cuenta.
- **Verificación (E2E de fase)**: **cierra los criterios 14.8 y 14.9 del PRD**, ejecutados literalmente con evidencia en `docs/verifications/T2.3/` (incluido el `grep` sobre los logs y el `psql` sobre la fila); `pnpm gate` y `pnpm test:e2e` en verde; sin regresión de los E2E de F0 y F1. Parada de fin de fase.

#### T2.4 · Ampliar la redacción del `preview` más allá de `jwt` [x] 2026-07-19 — PASS (tras un FAIL), ver docs/verifications/T2.4/
> **CAMBIO DE ALCANCE aprobado por el usuario (2026-07-19)**, en la parada de fin de fase F2. Reabre F2 a propósito: es un cambio de PRODUCTO sobre la lógica de T2.1, y esconderlo en F3 (que es despliegue) lo haría invisible. El PRD queda anotado en §8 «Redacción (D7)».
- **Depende de**: T2.1, T2.3
- **Motivo (observado, no teórico)**: al verificar T2.3 se confirmó **en la fila cruda** que la redacción es **solo para `jwt`**; el resto se persiste **verbatim** hasta 120 chars (evidencia: `preview | 1700000000`). Un `base64` corto se guarda tal cual y **puede descodificar a texto legible**, así que la promesa de R2 estaba cumplida **para JWT, no para toda entrada**.
- **Entrega**: extender `redactInput` (`packages/core/src/history/redact.ts`) para redactar también los kinds que con más probabilidad transportan secretos — **al menos `base64` y `json`** —, decidiendo y **dejando escrita la regla por kind** (qué se conserva y qué se sustituye por `…`). Criterios: (a) se conserva lo justo para que la entrada siga siendo **reconocible** en la lista (el historial debe seguir sirviendo para algo); (b) **nunca** se conserva algo que pueda descodificar a texto legible; (c) la regla es **pura y unit-testable**, como la actual; (d) se mantiene el orden **redactar ANTES de truncar**. Actualizar el aviso de `/history` si la vista previa cambia de forma perceptible.
- **Playwright permanente**: ampliar `apps/web/e2e/history.spec.ts` con un caso de **base64 que descodifica a texto reconocible**, afirmando que ese texto **no aparece** ni en la pantalla ni en la fila.
- **Verificación**: analizar con sesión un **base64 cuyo contenido decodificado sea un literal inconfundible** (p. ej. `SGVsbG8gV29ybGQgc2VjcmV0`→`Hello World secret`) → en `psql`, la fila **no contiene ese literal decodificado ni el base64 completo**, con **control positivo** (algo del preview sí aparece, para probar que el grep apunta bien); lo mismo para un `json` con un valor sensible. Sin regresión del caso `jwt` de 14.8 ni del recorrido de fase F2. `pnpm gate` y `pnpm test:e2e` en verde.

---

## F3 — Producción

El producto existe para el mundo o no existe. Se despliega en el VPS —**donde el propio bucle se está ejecutando**, así que la skill `deploy` autodetecta modo VPS— bajo `devtools.carlosvillu.dev`. Toda la operación va por la skill `deploy` (configuración en `deploy.env`); nada de SSH a mano ni tocar el Caddy central por libre.

#### T3.1 · Producción del producto COMPLETO sobre la infra de T1.8 ⚠ [x] 2026-07-20 — PASS, ver docs/verifications/T3.1/ (coste $0)
> **Nota (2026-07-18)**: la infra base (`docker-compose.prod.yml` + `Dockerfile` + site file del Caddy + registro en `~/AGENTS.md`) y el primer go-live YA se hicieron temprano en **T1.8/T1.9** (adelanto de deploy por directiva del usuario). Esta tarea deja de construir desde cero: **re-despliega el producto COMPLETO** (auth de T0.4 + historial de T2.2) sobre esa base y cierra lo que F1 no tenía — sobre todo el **trust boundary / rate-limit por `CF-Connecting-IP`** y la verificación de login en producción.
- **Depende de**: T2.2, T0.4, T1.9; ⚠ **el usuario aporta**: confirmación en el panel de Cloudflare de que `devtools.carlosvillu.dev` apunta al origen `80.190.75.149` y de que el modo SSL es **Full (strict)** — el DNS ya resuelve por Cloudflare, pero desde el VPS no se puede ver a qué origen apunta (si ya se confirmó en T1.9, se reutiliza)
- **Entrega**: re-deploy vía la skill `deploy` con el producto completo; añadir a `docker-compose.prod.yml` lo que auth/historial necesiten (migraciones on-boot de T0.3 aplicadas), `DEPLOY.md`. Todo según la topología real de §10 y el `~/AGENTS.md` del VPS:
  - **La web publica solo en `127.0.0.1:$WEB_PORT`** (3110, ya en `deploy.env`), nunca en `0.0.0.0` — un puerto abierto por Docker se salta UFW. Bloque de devtools: 3110–3119.
  - Site file `~/infra/caddy/sites/devtools.carlosvillu.dev.caddy` con `reverse_proxy 127.0.0.1:3110`, siguiendo el patrón ya probado del vecino (`ugc.carlosvillu.dev.caddy`); validate + reload del Caddy central. **devtools no lleva reverse proxy propio ni gestiona TLS.**
  - **Registrar devtools en el registro de puertos de `~/AGENTS.md` §3 en este mismo cambio** — ese fichero lo exige para cualquier cambio estructural (un puerto, un sitio, una convención).
  - **Trust boundary** (§10, §11): `header_up X-Forwarded-For {client_ip}` en el site file + `TRUST_PROXY=1` en la app; y como Cloudflare va en proxy naranja, la IP real del cliente es **`CF-Connecting-IP`**, no la del socket ni la de XFF. Al cerrar la tarea se revisan contra esta decisión los **tres** rate limits ya construidos: login (T0.4), signup (T0.4) y `/api/analyze` (T1.4).
    **Dos defectos CONCRETOS que hereda esta tarea** (observados al verificar T0.4, 2026-07-19 — no son teóricos):
    1. **La clave es spoofeable**: rotando `X-Forwarded-For` por petición, el muro de 5 fallos/15 min de login **nunca salta** (se observaron 6 intentos → 401, con la clave real ya bloqueada). El control que T0.4 introduce es hoy esquivable.
    2. **Sin XFF, todos comparten un único bucket**: `clientIp()` NO lee la IP del socket — devuelve la cadena literal `'unknown'`. Es decir, la subtarea de T0.4 que dice «hasta entonces, IP directa» **no se cumple literalmente**. Consecuencia: 5 fallos de cualquiera bloquean el login de **todo el mundo** 15 min (DoS trivial). En producción hoy NO es explotable porque el Caddy central siempre fija XFF, pero cualquier acceso que no pase por Caddy cae en ese bucket. **Al pasar a `CF-Connecting-IP` hay que definir también el fallback** (IP del socket, no `'unknown'`).
  - Se ejecuta la decisión de T0.3 sobre migración on-boot vs paso de deploy.
  - La skill `deploy` ya genera el site file correcto (loopback + `header_up`) y exige `WEB_PORT`: se corrigió en el template el 2026-07-17 y se sincronizó aquí (ver journal). Si algo no encaja con el VPS, **el bug es de la skill**, no una excusa para improvisar comandos a mano.
- **Verificación**: desde **fuera** del VPS, `https://devtools.carlosvillu.dev` sirve la app con certificado válido; login funciona; pegar el JWT del ejemplo de §6.5 devuelve la cadena. **Gotcha conocido y de verificación obligatoria**: `next start` no resuelve rutas como `next dev` — la verificación ejercita `docker compose up` REAL, no el modo dev. Controles negativos: (a) `ss -ltn` en el VPS muestra el 3110 escuchando **solo en loopback** y desde fuera `http://80.190.75.149:3110` no responde; (b) el rate limit distingue dos clientes con `CF-Connecting-IP` distinta, en vez de contar a todo Cloudflare como uno solo.

#### T3.2 · Backup diario y restore verificado [x] 2026-07-20 — PASS, ver docs/verifications/T3.2/ (coste $0)
- **Depende de**: T3.1
- **Entrega**: cron de `pg_dump` diario con retención, según la skill `deploy`.
- **Verificación**: forzar el backup produce un dump legible por `pg_restore --list` (criterio 14.10); restaurarlo sobre una BD vacía de prueba reproduce las 3 tablas con sus filas (el control que convierte un backup en un backup de verdad).

#### T3.3 · E2E de fase F3 [x] 2026-07-20 — PASS (tras un FAIL: el criterio 14.1 estaba roto en producción), ver docs/verifications/T3.3/ (coste $0)
- **Depende de**: T3.2
- **Entrega**: recorrido completo en producción con evidencia en `docs/verifications/T3.3/`.
- **Verificación (E2E de fase)**: **cierra el criterio 14.10 del PRD**: desde fuera del VPS, `https://devtools.carlosvillu.dev` con certificado válido, el recorrido de 14.1 (pegar un JWT → cadena) funciona en producción, y el backup produce un dump restaurable. Además, sin regresión: `pnpm test:e2e` completo en verde contra el entorno local. Parada de fin de fase y cierre del proyecto v1.

---

## F4 — Post-v1 (v1.1)

> **Alcance añadido tras el cierre de v1** (2026-07-20, directiva del usuario en la parada de fin de fase F3). No es deuda opcional: T3.3 destapó que la redacción del preview **incumple D7 y el criterio 14.8 tal como están escritos** en un camino real y frecuente.

#### T4.1 · Redacción defensiva del preview: ningún payload de JWT sobrevive, sea cual sea el kind [x] 2026-07-20 — PASS (tras DOS bloqueos: 4 fugas + un ReDoS), ver docs/verifications/T4.1/ (coste $0)
- **Depende de**: T3.3
- **Contexto (verificado en T3.3, no heredado)**: `redactInput` hace `if (kind !== 'jwt') return trimmed`, así que un input de kind `text` se persiste VERBATIM (truncado a 120). Pegar una **petición HTTP entera** —el gesto que el propio arreglo de 14.1 cita como motivador: copiar del panel Network— cae en `text` en cuanto una línea trae un punto (`Host: api.example.com`), porque el split por `.` da 4+ segmentos. Resultado: **el payload del JWT se guarda en claro en la BD**.
- **La contradicción que cierra**: **D7** (§ decisiones) promete «Nunca el token entero, nunca el payload completo» y el **criterio 14.8** exige que «en `psql` la fila NO contiene el token completo»; pero la regla concreta de §298 dice «para el resto, conservar los primeros 120 caracteres». D7 y §298 no pueden ser ambos ciertos. **Manda D7** (es la promesa al usuario): §298 se corrige en esta tarea para describir la redacción defensiva.
- **Entrega**: la redacción deja de confiar en el kind detectado como única defensa. Antes de persistir, el preview se barre en busca de subcadenas con forma de JWT (tres segmentos base64url separados por `.`, con header decodificable) y se redactan payload y firma **aunque el kind sea `text`**. Actualizar §298 del PRD y el copy de `/history` si la regla que describe cambia.
- **Subtareas**:
  - [ ] Barrido defensivo en `redactInput` para cualquier kind, reusando `JWT_PREFIX_RE` y el troceado ya existentes (no duplicar el parser: ver deuda (2) del journal de T3.3).
  - [ ] Decidir y DOCUMENTAR el criterio de sobre-redacción: qué se hace con un texto que contiene algo con forma de JWT pero no lo es. Fallar hacia el lado seguro, y escribir la asimetría asumida como se hizo en T2.4.
  - [ ] Actualizar §298 del PRD y, si cambia lo que se promete, el copy de `history-panel.tsx` y el README (ambos describen hoy la regla por kind).
- **Verificación**: con cuenta iniciada, pegar en `/` una **petición HTTP completa** que contenga `Authorization: Bearer <JWT canario>` más una cabecera con punto (`Host: api.example.com`); después, `pg_dump --data-only` de la BD **completa** grepeado por los marcadores del canario **y** por el segmento base64 crudo del payload → **0 coincidencias** (mismo método que cerró la fuga en T3.3). **Control negativo obligatorio**: revertir el barrido y comprobar que ese mismo grep **encuentra** el payload (si no lo encuentra, el test no prueba nada). Sin regresión: los kinds ya cubiertos (`jwt`, `json`, `base64`, `url`) mantienen su redacción actual, y `hash`/`uuid`/`unix_timestamp` siguen verbatim a propósito.
- **Coste estimado**: $0 (sin APIs de pago).

---

## F5 — La landing

> **Alcance añadido tras el cierre de F4** (2026-07-21, directiva del usuario). Cambio de producto: `/` deja de ser la superficie de análisis y pasa a ser una **landing** estilo Google. El análisis se muda a `/analyze`, que es la home de hoy **sin cambios visuales**. Mockup de referencia: `docs/mockups/home-google.jsx` (proyecto Claude Design «DevTools Mockups», fichero «Home estilo Google.html»), importado a este repo. **Decisiones de producto ya cerradas con el usuario** (no re-abrir en el brief):
> - **Sin botón «Analizar»**: se conserva el disparo actual (pegar → inmediato, teclear → 300 ms) y el criterio **14.1** («sin que el usuario elija nada») intacto. La pista «⌘V pega y analiza — sin botón» se queda.
> - **Transporte del input por `sessionStorage`, JAMÁS por la URL** (§11 del PRD: el input nunca se loguea; un query param lo filtraría a barra, historial del navegador, `Referer`, logs de Caddy y de Cloudflare — es la clase de fuga que F3/F4 cerraron). Clave sugerida: `devtools:pending-input`.
> - **`/analyze` = la home de hoy tal cual** (SiteHeader + FieldAnalyzer + cadena + aviso de privacidad COMPLETO, las dos frases). Entrar directo a `/analyze` sin nada pendiente → campo vacío y funcional.
> - **Footer solo con GitHub** (blog y privacidad no existen como rutas; un enlace a 404 en la portada es peor que no tenerlo).
> - **Aviso de privacidad completo**, no la versión corta del mockup.
> - **La adherencia al DS es obligatoria**: el mockup trae marcado crudo e inline styles; la implementación usa las primitivas (`Button`, `Textarea`, `Wordmark`, `Badge`, `Kbd`, `Icon`) y tokens del proyecto. `ds-reviewer` corre en las tareas que tocan `apps/web/**`.

#### T5.1 · Mudar la experiencia de análisis a `/analyze` (sin cambio visual)
- **Depende de**: T4.1
- **Entrega**: nueva ruta `/analyze` que renderiza **exactamente** la home actual (`SiteHeader` + `FieldAnalyzer` + cadena + `Callout` de privacidad). Al montar, `/analyze` **lee y consume** (borra) un input pendiente de `sessionStorage['devtools:pending-input']` y lo analiza como si se hubiera pegado (usando el disparo inmediato ya existente); recargar `/analyze` NO re-analiza (la clave ya se consumió). Mientras F5 no termina, `/` **redirige a `/analyze`** para no dejar la app rota entre tareas (esa redirección la retira T5.2).
- **Subtareas**:
  - [ ] Crear `apps/web/src/app/analyze/page.tsx` moviendo el contenido de la home actual; `apps/web/src/app/page.tsx` pasa a redirigir a `/analyze` (temporal).
  - [ ] `FieldAnalyzer` (o un wrapper cliente en `/analyze`) lee+consume `sessionStorage['devtools:pending-input']` al montar y dispara el análisis inmediato; sin pending, campo vacío. **El input jamás toca la URL.**
  - [ ] Reapuntar los enlaces «ir al campo» a `/analyze`: `history-panel.tsx:171` (EmptyState «Ir al campo»). **El Wordmark del header sigue a `/`** (inicio = landing). **«Reabrir» NO cambia**: es un diálogo in situ que no navega (verificado en el código, no heredado).
  - [ ] Actualizar los E2E que apuntan a `/` para el campo → `/analyze`: `e2e/phases/f1.spec.ts`, `e2e/field.spec.ts`, `e2e/field-alternatives.spec.ts`, y el aserto del h1 «pega algo» de `e2e/phases/f0.spec.ts` (Playwright sigue la redirección, pero mejor apuntar explícito).
- **Verificación**: `/analyze` sirve la experiencia de hoy y pegar un JWT produce la cadena `jwt → json` (14.1 intacto). Entrar directo a `/analyze` sin pending → campo vacío funcional. Escribir un JWT bajo `sessionStorage['devtools:pending-input']`, navegar a `/analyze`: se auto-analiza y la clave queda **borrada** (recargar no re-analiza). **Control negativo de privacidad**: tras el flujo, la URL de `/analyze` no contiene el input (ni query ni fragment). `pnpm gate` + `pnpm test:e2e` verdes.
- **Coste estimado**: $0.

#### T5.2 · La landing en `/` (mockup «Home estilo Google»)
- **Depende de**: T5.1
- **Mockup**: `docs/mockups/home-google.jsx` (vara visual del estado vacío).
- **Entrega**: `/` deja de redirigir y pasa a ser la landing, con primitivas del DS: `Wordmark` centrado grande, tagline «Pega algo. Lo desenreda.», el campo píldora (`Textarea` del DS dentro del contenedor con foco), fila de badges de los 7 kinds (`Badge kind=…`), header mínimo (enlace «historial» a `/history` + «Entrar» como **enlace** `role=link` estilado con `buttonVariants`, para no romper `f0.spec.ts`), y footer con **solo** GitHub + el aviso de privacidad COMPLETO. Comportamiento del campo:
  - **Pegar** → guarda el valor en `sessionStorage['devtools:pending-input']` y navega a `/analyze` (donde T5.1 lo consume y analiza).
  - **Enter** (sin Shift) → igual que pegar, con lo tecleado.
  - **Teclear sin Enter** → no navega (espera). Pista visible: «⌘V pega y analiza · Enter para analizar».
  - **«Pega un ejemplo»** → carga un JWT de juguete en `sessionStorage` y navega a `/analyze`. El literal del ejemplo es un JWT de juguete evidente (no un secreto), fijado en el árbol.
  - La landing **nunca muestra la cadena** ni analiza en `/`.
- **Subtareas**:
  - [ ] `apps/web/src/app/page.tsx` = landing (client component para el campo, o server + isla cliente). Retirar la redirección de T5.1.
  - [ ] Componente de campo de landing que hace paste/Enter → sessionStorage + `router.push('/analyze')`. **Nunca** pone el input en la URL.
  - [ ] Footer nuevo (¿`components/layout/site-footer.tsx`?) solo con GitHub; aviso de privacidad con las dos frases actuales.
  - [ ] Responsive (el mockup es desktop) y adherencia al DS (pasa `ds-reviewer`).
- **Verificación**: en `/`, se ve el wordmark, el campo, los badges y el footer; NO se ve ninguna cadena. **Pegar** un JWT navega a `/analyze` y allí aparece la cadena, **con la URL de `/analyze` sin el input** (control negativo §11). **Enter** con un JWT tecleado hace lo mismo. Teclear sin Enter no navega. **«Pega un ejemplo»** lleva a `/analyze` con su cadena. El enlace «Entrar» es `role=link`. `pnpm gate` + `pnpm test:e2e` verdes; `ds-reviewer` sin hallazgos mecánicos.
- **Coste estimado**: $0.

#### T5.3 · E2E de fase F5
- **Depende de**: T5.2
- **Entrega**: recorrido completo con evidencia en `docs/verifications/T5.3/`.
- **Verificación (E2E de fase)**: un usuario llega a `/` (landing), pega un JWT y aterriza en `/analyze` con la cadena `jwt → json`, **sin que el input aparezca nunca en la URL** en ningún punto del recorrido (control negativo dispositivo de §11, verificado sobre la barra real). El botón «Pega un ejemplo» produce el mismo aterrizaje. Sin regresión: `pnpm test:e2e` completo en verde, y el recorrido de 14.1 sigue funcionando en `/analyze`. Parada de fin de fase.
- **Coste estimado**: $0.

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
