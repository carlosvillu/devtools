# Verificación T0.4 — Auth email + contraseña

- **Tarea**: T0.4 · Auth email + contraseña (`planning.md`)
- **Fecha**: 2026-07-19
- **Ejecutor**: agente `verifier` · agent-browser 0.32.1 · sesión `t0.4` · Chrome 151 headless (`--no-sandbox`)
- **Sistema**: commit base `0190e72` **+ el diff de T0.4 sin commitear** (35 entradas en `git status`: `src/app/api/auth/`, `src/app/{login,signup}/`, `src/components/auth/`, `src/server/{auth,session,session-cookie,current-user,client-ip,db}.ts`, `src/proxy.ts`, `src/instrumentation.ts`, `packages/core/src/auth/`, …). Ese árbol de trabajo ES el sistema bajo prueba.
- **Entorno**: `docker compose -f docker-compose.dev.yml` (proyecto `devtools-dev`, Postgres 16 en `127.0.0.1:5433`) + `pnpm dev` en el host (puerto 3000). Migraciones aplicadas on-boot por `instrumentation.ts` (`migraciones on-boot aplicadas (intento 1)`). `/api/health` → `{"ok":true,"db":true}`.
- **No se tocó producción**: los contenedores `devtools-web-1`/`devtools-postgres-1` (prod), `ugc-factory-*` y `edge-caddy` quedaron intactos.

## Verificación esperada (literal de planning.md)

> en el navegador, registrarse con un email nuevo → queda la sesión iniciada y sobrevive a un refresh; contraseña incorrecta repetida → el rate limit se hace visible; el mensaje de error es idéntico para email inexistente y para contraseña mal (se comparan literalmente); `/history` sin sesión redirige a `/login` y `/` sin sesión carga con normalidad.

## Gate previo

`pnpm gate` ejecutado por mí desde la raíz: **exit 0** — lint + typecheck + format:check + knip + readme:status:check + **501 tests / 50 ficheros passed**. Evidencia: `23-gate.log`.

## Datos de prueba (elegidos por el verifier, no reutilizados del implementer)

- Email nuevo: `verifier-t04-1784415844@example.com` (sufijo epoch, garantizado inexistente).
- Contraseña: `Verific4dor-T04-clave`.
- Email inexistente para el caso negativo: `no-existe-jamas-t04@example.com`.

## Pasos ejecutados

1. Levantado el stack; `/api/health` → `{"ok":true,"db":true}`.
2. **Sin sesión**: abierto `/` en el navegador → carga y se usa de verdad (pegado un JWT → cadena decodificada en pantalla).
3. **Sin sesión**: abierto `/history` → el navegador acaba en `/login?next=%2Fhistory`.
4. **Signup** desde el formulario de `/signup` con el email nuevo → redirige a `/`, la cabecera pasa a mostrar el email + «Salir».
5. **Refresh (reload)** → la sesión sigue iniciada; corroborado en BD (fila en `session` con `expires_at` futuro).
6. Cerrada la sesión en viewport móvil 375×667 y comprobado el guard de `next`.
7. **Secuencia ininterrumpida de fallos de login** en el navegador: 1 email inexistente + 1 contraseña mala (mensajes capturados del DOM) + 3 fallos más → el intento **6** muestra el muro.
8. Comparados los dos mensajes byte a byte (hexdump + sha256).

## Resultado observado vs esperado

| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | Signup con email nuevo → sesión iniciada, sobrevive a un refresh | Redirige a `/`; cabecera con email + «Salir»; tras `reload` sigue igual. Fila en `user` (hash scrypt) y en `session` con `expires_at` en BD | `03`, `04`, `05-db-evidencia.txt` | ✅ |
| 2 | Contraseña incorrecta repetida → rate limit VISIBLE | Fallos 1–5: «Email o contraseña incorrectos.»; intento **6**: «Demasiados intentos. Inténtalo de nuevo en unos minutos.» renderizado en el `[role=alert]` de la página (no solo un 429 de red) | `14`, `15`, `06` | ✅ |
| 3 | Mensaje IDÉNTICO para email inexistente y contraseña mal (comparación literal) | **Idénticos byte a byte**: hexdump igual, `sha256 = fadfb523…50dc0a` en ambos, 35 bytes cada uno. También idénticos en la API: mismo `code`, mismo `message`, mismo status **401** (solo difiere el `request_id`, UUID de correlación aleatorio por petición) | `13-comparacion-literal-mensajes.txt`, `06`, `07` | ✅ |
| 4 | `/history` sin sesión redirige a `/login` | `307` → `location: /login?next=%2Fhistory`; en el navegador la URL final es `/login?next=%2Fhistory` | `00`, `02` | ✅ |
| 5 | `/` sin sesión carga con normalidad | `200` y **usable**: pegado un JWT, se decodifica y se pinta la cadena completa sin cuenta. `/api/analyze` sin sesión → `200` (D6 respetado) | `00`, `01-home-sin-sesion-usable.png` | ✅ |

### Mensajes comparados (literal)

```
A (email inexistente)     : "Email o contraseña incorrectos."
B (contraseña incorrecta) : "Email o contraseña incorrectos."
hexdump A == hexdump B    : sí (0x2245 6d61 … 2e22 0a, 35 bytes)
sha256 A == sha256 B      : fadfb523ee164b661e74e01d5eb3455c3200050cf5b061587b786a298750dc0a
cmp A B                   : exit 0 (sin diferencias)
```

## Comprobaciones adicionales sobre los arreglos post-review

| Punto | Observado | Veredicto |
|---|---|---|
| Guard de `next` (open redirect por backslash) | `next=/history` → aterriza en `/history`. `next=/\evil.com`, `next=//evil.com`, `next=https://evil.com` → caen a `/`, `location.host` sigue siendo `localhost:3000` | ✅ el fix funciona sin romper el caso legítimo |
| Rate limit de signup (falso positivo) | El alta normal NO se bloqueó (límite 10/15 min, holgado) | ✅ |
| «Salir» en móvil (<640px) con sesión | Botón presente y **clicable** a 375×667; al pulsarlo la sesión se cierra y `/history` vuelve a redirigir a `/login` | ✅ |
| Cabecera móvil sin sesión | No se rompe | ✅ (pero ver hallazgo 3) |
| `verifyPassword` captura fallos de scrypt | **Verificado en comportamiento**: corrompido a propósito el `password_hash` de un usuario desechable (`hash-corrupto-no-parseable`) → el login devuelve **401** con el mismo mensaje genérico «Email o contraseña incorrectos.», **no un 500**. Usuario desechable borrado después. Evidencia: `25-verifypassword-scrypt-corrupto.txt` | ✅ |

## Comprobaciones de seguridad extra (no exigidas, hechas por escepticismo)

- **Cookie de sesión**: `HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`, alineada con `expires_at` en BD. `Secure` está gateado a HTTPS (`session-cookie.ts`), correctamente ausente en dev sobre http. `document.cookie` desde JS devuelve `""` → confirmado httpOnly.
- **Contraseña nunca en claro**: `password_hash` = `scrypt$ln=16384,r=8,p=1$…` (137 bytes); `select count(*) … like '%Verific4dor%'` → `0`.
- **Logout invalida en servidor**: la fila de `session` pasa de 1 a 0 tras `POST /api/auth/logout` (no es solo borrar la cookie).
- **Enumeración por tiempo**: `auth.ts` ejecuta un scrypt **dummy** cuando el email no existe. Medido: inexistente ~0,08–0,10 s vs existente ~0,08 s en régimen estable → sin señal explotable. Defensa correcta.
- **Consola del navegador limpia**: 88 líneas, todas `[info]` de React DevTools y `[log]` de HMR/Fast Refresh (dev-only, del framework). **Cero** errores/warnings de código propio.
- **Contraste WCAG** (medido con `getComputedStyle` + resolución real de color vía canvas, porque el DS usa `lab()`): **todos los elementos de `/login` y `/signup` pasan**. Botón primario 5,69:1 (blanco sobre `rgb(0,97,215)`), alert de error 5,41:1, textos secundarios 4,62–7,57:1, títulos 17:1. Umbrales 4,5:1 / 3:1 respetados.

## Hallazgos, rarezas y deuda (ninguno bloquea las 5 comprobaciones)

1. **El rate limit se evade rotando `X-Forwarded-For`** (`16-hallazgo-bypass-xff.txt`). `clientIp()` toma el primer valor de un header controlable por el cliente: con la clave real bloqueada (429), seis peticiones con XFF distintos devuelven **401, no 429**. Está documentado en el código y el planning lo difiere a T3.1 — pero conviene registrarlo: **hoy el muro de 5 fallos no acota a un atacante**, solo al usuario honesto.
2. **Matiz no contemplado en el planning**: la subtarea dice «hasta entonces, **IP directa**», pero `clientIp()` **no lee la IP del socket**: sin XFF devuelve la cadena literal `'unknown'`. Es decir, en el despliegue actual **todos los clientes sin proxy comparten un único bucket**: 5 fallos de cualquiera bloquean el login **a todo el mundo** durante 15 min (DoS trivial). Recomendado subirlo a T3.1 explícitamente o leer la IP del socket ya.
3. **En móvil (<640px) sin sesión no hay forma de llegar a `/login` desde la cabecera**: el bloque con «Entrar» es `hidden sm:flex`, y la rama móvil sin sesión solo pinta el `IconButton` de historial **deshabilitado** (`site-header.tsx`). Un visitante en móvil no puede iniciar sesión desde la cabecera. No afecta a la Verificación (que no lo pide) pero es un agujero de UX real.
4. **El proxy solo comprueba PRESENCIA de la cookie**, y hoy no hay ninguna página/handler protegido que ejecute la validación real: `/history` y `/api/history` **no existen todavía** (son F2) — con cookie presente devuelven 404, con cookie ausente redirigen/401. Es coherente con el diseño documentado (defensa en profundidad) y con el alcance de fases, pero **cuando F2 construya `/history` debe llamar a `validateSession`**; si no, cualquier valor de cookie no vacío bastaría.
5. **`instrumentation.ts` ensucia el arranque**: en cada boot Next intenta compilarlo para el runtime **Edge** y emite 5 bloques `A Node.js module is loaded ('node:fs'/'node:path')` + `Ecmascript file had an error`. El guard `NEXT_RUNTIME !== 'nodejs'` es de **runtime**, no de compilación, así que los imports top-level de `node:*` se evalúan igual en el grafo Edge. Funcionalmente inocuo (las migraciones se aplican), pero es ruido de código propio en cada arranque; se evita con `await import('node:fs')` dentro de la rama Node.
6. **Rareza de tooling (no del producto)**: durante la verificación el servidor de `pnpm dev` moría en silencio (`exit 0`, sin panic ni OOM, con 5,4 GB libres) **al compilar la primera página**, dejando `/api/health` en pie. Se reprodujo 4 veces. **Causa: caché de Turbopack corrupta en `apps/web/.next`**; tras `rm -rf apps/web/.next` el arranque es estable y no volvió a ocurrir. Lo dejo anotado porque cuesta media hora de diagnóstico si le pasa a otro agente. No es un defecto de T0.4 (`pnpm gate` y `pnpm test:e2e` usan `next build`/`next start` y nunca lo tocan).
7. **Modo oscuro**: `set media dark` produce exactamente los mismos colores que `light`. Coherente con el planning (los mockups son `LoginClaro`/`SignupClaro`, DS claro), pero conviene confirmarlo como decisión y no como olvido.

## Coste real

**$0** — la verificación no llamó a ninguna API de pago (estimado: $0). Sin desviación.

## Veredicto

**PASS** — las cinco comprobaciones de la Verificación se ejecutaron literalmente en el navegador contra el sistema real levantado y todas se cumplen; los dos mensajes de error son idénticos byte a byte (mismo sha256) y el rate limit se hace visible al usuario en el intento 6.

Ninguno de los 7 hallazgos contradice la Verificación. Los más relevantes para el bucle son el **1/2** (el rate limit por IP no acota a un atacante y, peor, comparte un único bucket `'unknown'` que permite bloquear el login de todos los usuarios) y el **3** (sin sesión, en móvil no se puede llegar a `/login` desde la cabecera). Se recomienda anotarlos como deuda dirigida a T3.1 y a la tarea de UI móvil correspondiente.

---

# Addendum — re-verificación de dos deltas posteriores al veredicto

- **Fecha**: 2026-07-19
- **Motivo**: tras el PASS, el coordinador aplicó dos cambios que actúan sobre mis rarezas 3 y 5. El cuerpo del report describe el código anterior; este addendum re-verifica **solo esos dos deltas** y fija el veredicto final.
- **Gate tras los deltas** (ejecutado por mí): `pnpm gate` **exit 0** — 501 tests / 50 ficheros. Evidencia: `35-gate-tras-deltas.log`.
- **Seguridad**: solo se tocó `devtools-dev-postgres-1` (project `devtools-dev`, 127.0.0.1:5433, volumen `devtools-pg-data`). **NO** se tocaron `devtools-postgres-1`/`devtools-web-1` (producción viva, volumen `devtools-pg-prod-data`), ni `ugc-factory-*`, ni `edge-caddy`.

## Delta 1 — cabecera móvil (`site-header.tsx`) → **CORRECTO, cierra mi rareza 3**

Medido con `getBoundingClientRect` + `getComputedStyle` contando solo elementos **visibles** (ambas ramas coexisten en el DOM, así que contar nodos a secas daría falsos duplicados).

| Punto pedido | Observado | OK |
|---|---|---|
| (a) 375×667 sin sesión: «Entrar» visible y clicable → `/login` | «Entrar» presente en el snapshot; click → `http://localhost:3000/login` | ✅ |
| (b) 375×667 con sesión: «Salir» visible y cierra sesión | «Salir» presente; click → vuelve a «Entrar» + historial deshabilitado, y `/history` redirige de nuevo a `/login?next=%2Fhistory` | ✅ |
| (c) Sin desbordamiento ni scroll horizontal a 375px | `scrollWidth == clientWidth == 375` en `documentElement` **y** en `<header>`, con y sin sesión → `hayScrollHorizontal: false` | ✅ |
| (d) Desktop ≥640px sin cambios ni duplicados | 1280 sin sesión: `el campo`, `historial`, `Entrar` → **nEntrar=1, nSalir=0**. 1280 con sesión: `el campo`, `historial`, email, `Salir` → **nEntrar=0, nSalir=1**. Móvil 375: mismos conteos (1 y 0 / 0 y 1) | ✅ |

Evidencia: `27`–`32`, `29-delta1-header-movil.txt`, `31-delta1-desktop-sin-duplicados.txt`.

## Delta 2 — `instrumentation.ts` con `await import('node:*')` → **objetivo (a) NO cumplido; (b) intacto**

### (a) El ruido «Ecmascript file had an error» **NO desaparece**

Comparación por **ventana de arranque** (de `Ready in` a la primera petición servida), misma máquina y versión de Next, caché `.next` borrada en ambos casos:

| | líneas | bloques `Ecmascript file had an error` | avisos `A Node.js API/module` |
|---|---|---|---|
| ANTES (`clean1.log`) | 58 | **5** | 5 |
| DESPUÉS (`delta.log`) | 58 | **5** | 5 |

Idéntico. Lo único que cambia son las líneas señaladas: antes `instrumentation.ts:25,26,31,32,33`; ahora `:31,34,35,36`.

**Causa**: Turbopack analiza **estáticamente** el cuerpo de la función. Que el import sea dinámico y la función `async` no saca `node:fs`/`node:path` del grafo Edge (2 avisos), y los tres `process.cwd()` siguen exactamente igual de presentes (3 avisos). 2 + 3 = los mismos 5 bloques.

**Recomendación**: el delta no compra nada a cambio de volver `resolveMigrationsFolder` asíncrona. O se revierte, o se ataca la causa real — que Next **no** compile `instrumentation.ts` para Edge, o mover la resolución de carpeta a un módulo aparte que el grafo Edge nunca alcance. Decisión del coordinador; no bloquea.

### (b) Las migraciones on-boot **siguen aplicándose** (lo importante)

Probado contra una BD **vacía de verdad**, y aquí hay un matiz que casi produce un falso resultado:

> `drop schema public cascade` **no basta**: el journal `drizzle.__drizzle_migrations` vive en el esquema `drizzle` y **sobrevive**. Con él intacto la migración se considera ya aplicada, no crea ninguna tabla y el arranque parece correcto. Verifiqué que seguía ahí tras el drop de `public` y borré **también** el esquema `drizzle`.

Con ambos esquemas borrados (0 tablas), arranque de `pnpm dev`:

- log: `instrumentation: migraciones on-boot aplicadas (intento 1)`, 0 errores de instrumentation;
- tablas creadas solas: `public.user`, `public.session`, `public.history_entry` (+ `drizzle.__drizzle_migrations`);
- `/api/health` → `{"ok":true,"db":true}`;
- **signup posterior funciona**: `200`, cookie `HttpOnly; SameSite=Lax; Max-Age=604800`, fila en `user` con hash `scrypt$ln=16384,r=8,p=1$…` y sesión vigente en `session`.

El gotcha del namespace del import dinámico **no se materializa**: `path.resolve`/`path.join` funcionan (de lo contrario la carpeta no se habría resuelto y no existiría ninguna tabla). Evidencia: `26-delta2-instrumentation.txt`.

## Regresión de las 5 comprobaciones tras ambos deltas

`site-header.tsx` afecta a todas las páginas e `instrumentation.ts` al arranque, así que se re-comprobó lo observable: `/` `200`, `/login` `200`, `/signup` `200`, `/api/health` `200`, `/history` sin sesión → `location: /login?next=%2Fhistory`, `/api/analyze` sin sesión `200` (D6). Consola del navegador: **0** líneas con error/warning. Evidencia: `33-regresion-tras-deltas.txt`, `34-console-deltas.txt`.

## Veredicto final

**PASS** (se mantiene). Las cinco comprobaciones de la Verificación siguen cumpliéndose tras ambos deltas.

- **Delta 1**: correcto y **cierra mi rareza 3** (en móvil ya se puede llegar a `/login`), sin desbordamiento a 375px ni duplicados en desktop.
- **Delta 2**: **no cumple su objetivo declarado** — el ruido de compilación Edge sigue idéntico (5 bloques por arranque) — pero **no rompe nada**: las migraciones on-boot siguen aplicándose contra una BD vacía. Mi rareza 5 **sigue abierta**. Queda a decisión del coordinador revertirlo o atacar la causa real; no bloquea el cierre de T0.4.
- **Rarezas 1, 2, 4, 6 y 7 del cuerpo del report siguen vigentes** — en particular la 1/2 (el rate limit por IP no acota a un atacante y comparte un único bucket `'unknown'`), dirigida a T3.1.
- **Coste real del addendum**: **$0**.
