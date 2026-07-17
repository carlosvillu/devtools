# PRD — devtools

> **Pega cualquier cosa. devtools averigua qué es y te la desenreda paso a paso.**
> Un único campo de entrada acepta cualquier cadena que un desarrollador tenga en el portapapeles (un JWT, un base64, un timestamp, un JSON ilegible, una URL con parámetros). El producto detecta qué es, aplica la transformación pertinente y **vuelve a detectar sobre el resultado**, encadenando pasos hasta llegar a algo legible. La cadena se muestra completa y se puede recorrer. Corre en web, sobre VPS propio.
>
> **Versión:** 1.1 (aprobado) · **Fecha:** 2026-07-16 · **Aprobado:** 2026-07-16 · **Autor:** carlosvillu + Claude
>
> **v1.1 (2026-07-17)** — sin cambio de alcance: §10 y §11 se corrigen contra la topología REAL del VPS, inspeccionada en el cierre del bootstrap (Cloudflare + Caddy central en modo host + puerto 3110; la IP real del cliente llega en `CF-Connecting-IP`). El §10 anterior daba el VPS y el DNS por pendientes, y ambos existen ya.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Objetivos y no-objetivos](#2-objetivos-y-no-objetivos)
3. [Usuario y casos de uso](#3-usuario-y-casos-de-uso)
4. [Decisiones de producto ya tomadas](#4-decisiones-de-producto-ya-tomadas)
5. [Arquitectura general](#5-arquitectura-general)
6. [El motor de detección y cadena](#6-el-motor-de-detección-y-cadena)
7. [Cliente: UX y rutas](#7-cliente-ux-y-rutas)
8. [Módulos del servidor](#8-módulos-del-servidor)
9. [Modelo de datos](#9-modelo-de-datos)
10. [Despliegue y operación](#10-despliegue-y-operación)
11. [Observabilidad y seguridad](#11-observabilidad-y-seguridad)
12. [Riesgos y mitigaciones](#12-riesgos-y-mitigaciones)
13. [Roadmap de fases](#13-roadmap-de-fases)
14. [Criterios de éxito](#14-criterios-de-éxito)

---

## 1. Resumen ejecutivo

devtools es una utilidad web de un solo campo. El usuario pega una cadena cualquiera y el producto responde con la cadena **desenredada**: identifica el tipo de dato, aplica la transformación que corresponde y repite el proceso sobre el resultado hasta que no queda nada que decodificar. En lugar de un catálogo de herramientas donde el usuario debe saber de antemano cuál necesita, la herramienta lo deduce.

```
  entrada cruda                    cadena de pasos                      salida
 ┌──────────────┐    ┌──────────────────────────────────────┐    ┌──────────────┐
 │ "ZXlKaGJHY2  │───►│ 1 base64      ──decode──►  eyJhbGci…  │───►│  JSON         │
 │  iOiJIUzI1N  │    │ 2 jwt         ──decode──►  {"alg":…}  │    │  formateado   │
 │  iJ9…"       │    │ 3 json        ──format──►  { … }      │    │  + exp legible│
 └──────────────┘    └──────────────────────────────────────┘    └──────────────┘
        cada paso es reversible, inspeccionable y se puede desviar a otra transformación
```

**Tesis del producto**

1. **El cuello de botella de un devtools no es la transformación, es la elección.** Decodificar base64 es trivial; lo que cuesta es abrir la pestaña correcta entre veinte. Eliminar la elección es el valor. `[verificar]` — supuesto de producto no validado con usuarios; para este proyecto no se considera bloqueante (ver decisión D1).
2. **El encadenamiento automático es lo que no existe hecho.** Las suites actuales (IT-Tools, CyberChef, DevUtils) tratan cada utilidad como una isla: el usuario copia la salida de una y la pega en la siguiente. `[verificar]` — comparativa no investigada formalmente; se descartó el deep research por decisión D1.
3. **El producto es, ante todo, un banco de pruebas del arnés de desarrollo autónomo.** Es una tesis declarada, no una excusa: condiciona el alcance (nada de APIs de pago, nada de features que no se puedan verificar de forma observable) y los criterios de éxito (§14 incluye criterios sobre el propio bucle).

**Stack:** monorepo TS (pnpm workspaces) · Next.js App Router + Tailwind v4 · packages/core con Zod · Postgres + Drizzle · Vitest + Playwright · Base UI/shadcn · pino · VPS propio.

## 2. Objetivos y no-objetivos

### 2.1 Objetivos

| # | Objetivo (capacidad observable del producto completo) |
|---|---|
| O1 | Dada una cadena arbitraria pegada en un único campo, identificar su tipo entre los soportados (§6.2) y mostrar la identificación con su grado de confianza. |
| O2 | Aplicar automáticamente la transformación pertinente y **re-detectar sobre el resultado**, construyendo una cadena de pasos hasta un dato terminal o hasta el límite de profundidad. |
| O3 | Mostrar la cadena completa paso a paso, permitiendo inspeccionar cualquier paso intermedio y copiar su valor. |
| O4 | Permitir desviar la cadena en cualquier paso: elegir una transformación alternativa a la propuesta y recalcular desde ahí. |
| O5 | Resolver la ambigüedad de forma explícita: cuando una entrada encaja en varios tipos, ofrecer las alternativas ordenadas por confianza en vez de adivinar en silencio. |
| O6 | Ofrecer, a quien tenga cuenta, el historial de sus últimas entradas procesadas —con la entrada redactada (D7)— y la posibilidad de reabrir una de ellas. |
| O7 | Funcionar completamente sin cuenta: registrarse solo desbloquea el historial (D6). |

### 2.2 No-objetivos (v1)

- **Catálogo de herramientas independientes.** No habrá una rejilla de utilidades navegables. Si el usuario quiere una transformación, la obtiene pegando el dato. Esta es la decisión estructural del producto (D2).
- **Utilidades descartadas de v1:** cifrado/descifrado, tester de regex, parser de cron, conversión de colores, formateo de SQL, diff de textos, generación de datos falsos, conversión de imágenes. Candidatas a fases posteriores.
- **Edición del dato.** No es un editor: la entrada se pega, no se escribe ni se guarda como documento.
- **Compartir resultados por URL pública.** Sin superficie pública que aloje datos de terceros en v1.
- **Multi-tenancy, organizaciones, roles.** Cuentas individuales y nada más.
- **Monetización.** Sin billing, sin planes, sin límites de uso de pago (D1).
- **Apps móviles o de escritorio.** Solo web responsive.
- **Extensión de navegador / CLI.** Fuera de v1.
- **APIs externas de pago.** El producto no llama a ningún tercero: todo el procesamiento es local al servidor (o al cliente). Esto es deliberado: sin coste variable, el cap de gasto del bucle solo cubre el coste de los agentes.
- **Detección de secretos / alertas de seguridad.** No se analiza si lo pegado es una credencial viva.

## 3. Usuario y casos de uso

**El usuario** es un desarrollador con algo raro en el portapapeles y prisa. En v1, realistamente, el autor del proyecto y quien llegue por el repo público. No se asume conocimiento previo de la herramienta: el primer uso debe ser evidente sin leer nada.

| # | Caso de uso |
|---|---|
| CU1 | **El token opaco.** Está depurando una petición fallida y tiene un `Authorization: Bearer …`. Lo pega entero (con el prefijo `Bearer`) y obtiene el payload del JWT formateado y la fecha de expiración en lenguaje natural ("caducó hace 3 horas"). |
| CU2 | **El log ilegible.** Copia de un log un blob base64 que resulta contener JSON. Lo pega y obtiene la cadena base64 → JSON formateado sin haber elegido nada. |
| CU3 | **La ambigüedad.** Pega `1752624000`. Puede ser un timestamp Unix o simplemente un número. El producto propone la lectura como timestamp (confianza alta por el rango de fechas plausible) pero muestra que hay alternativas y deja cambiar. |
| CU4 | **El desvío.** Pega un base64 que el producto decodifica y detecta como texto plano. El usuario ve que en realidad es un hash y elige manualmente la transformación "identificar hash" en ese paso. |
| CU5 | **La URL con parámetros.** Pega una URL de callback con `?state=…&code=…` URL-encoded y obtiene los parámetros desglosados en tabla, con los valores decodificados. |
| CU6 | **El regreso.** Con cuenta iniciada, abre el historial, reconoce por la vista previa la entrada de ayer y la reabre para copiar un valor intermedio. |

## 4. Decisiones de producto ya tomadas

Vinculantes para el resto del PRD y para el bucle (los agentes citan "decisión D3").

| # | Decisión | Detalle |
|---|---|---|
| D1 | **El proyecto es un banco de pruebas del arnés** | El objetivo declarado es ejercitar el bucle `dev-loop` con un producto real. No se busca tracción ni monetización, y no se hizo deep research de mercado (por eso las tesis 1-2 de §1 quedan `[verificar]` y así se quedan). No degrada el listón de calidad: el producto debe funcionar de verdad. |
| D2 | **Una sola feature: el campo que autodetecta** | Explícitamente NO es una suite de utilidades independientes. Todo lo que no sea detectar → transformar → re-detectar → mostrar es no-objetivo. |
| D3 | **Encadenamiento automático visible** | La cadena se construye sola y se muestra entera, paso a paso, no solo el resultado final. Es el ángulo diferencial del producto. |
| D4 | **Licencia AGPL-3.0, repositorio público** | Los README se escriben de cara al público. |
| D5 | **Historial en servidor con cuenta** | Exige Postgres + Drizzle + auth multi-usuario. Elegido a sabiendas de que es más producto del estrictamente necesario: la razón es D1 (ejercitar la capa de datos del arnés). |
| D6 | **La herramienta es anónima y pública; la cuenta es opcional** | Se usa sin registro. Registrarse solo añade historial. **Esto contradice el default del módulo de auth del template** (que protege todo salvo login/health): aquí el middleware protege ÚNICAMENTE `/history` y la API de historial. |
| D7 | **El historial no guarda el input crudo** | Guarda: vista previa truncada (máx. 120 caracteres) con redacción de la parte sensible, tipo detectado, y la lista de transformaciones aplicadas. Nunca el token entero, nunca el payload completo. Consecuencia asumida: "reabrir" una entrada del historial restaura la cadena, no el dato original — el usuario debe volver a pegarlo. |
| D8 | **Sin APIs externas de pago** | Todo el procesamiento es propio. No hay ledger de gasto ni credenciales de terceros. |
| D9 | **Autenticación por email + contraseña** | Sin OAuth: un OAuth app de GitHub sería un prerequisito externo (⚠) que bloquearía F0 sin aportar nada al banco de pruebas. |

## 5. Arquitectura general

### 5.1 Diagrama

```
                         ┌─────────────────────────────────────┐
   navegador ───────────►│  apps/web  (Next.js App Router)     │
                         │                                     │
                         │   /            campo único (público)│
                         │   /history     historial (con auth) │
                         │   /login /signup                    │
                         │                                     │
                         │   route handlers:                   │
                         │     POST /api/analyze               │
                         │     GET/DELETE /api/history         │
                         │     POST /api/auth/*                │
                         │     GET  /api/health                │
                         └───────┬───────────────────┬─────────┘
                                 │                   │
                    importa      │                   │  repos tipados
                                 ▼                   ▼
                    ┌────────────────────┐   ┌────────────────┐      ┌──────────────┐
                    │  packages/core     │   │  packages/db   │─────►│  Postgres 16 │
                    │                    │   │  Drizzle       │      │              │
                    │  contratos Zod     │   │  migraciones   │      │  user        │
                    │  detectores        │   │  repos         │      │  session     │
                    │  transformadores   │   └────────────────┘      │  history_… │
                    │  motor de cadena   │                           └──────────────┘
                    │  (lógica PURA)     │
                    └────────────────────┘
                     sin I/O, sin red, sin fecha del sistema inyectada implícitamente
```

Sin `apps/worker`, sin colas, sin SSE: todo el trabajo del producto cabe en un request/response de milisegundos (§5.2).

### 5.2 Justificación de lo variable

| Pieza | Decisión | Por qué |
|---|---|---|
| `packages/core` | **Sí**, y es el corazón | Detectores, transformadores y motor de cadena son lógica pura: sin I/O, deterministas, con entrada y salida de texto. Es el sitio natural y da una superficie de test unitario densa y barata. |
| `packages/db` + Postgres + Drizzle | **Sí** | D5: usuarios, sesiones e historial. |
| Auth multi-usuario | **Sí**, parcial (D6) | Cuentas para el historial; el resto de la app es anónima. |
| `apps/worker` + pg-boss | **No** | No hay trabajo asíncrono ni de larga duración. Una cadena completa se resuelve en milisegundos de CPU. Meter una cola sería esqueleto muerto (regla de F0: si el PRD no lo exige, fuera). |
| Máquina de estados / checkpoints / sweeper | **No** | La "cadena" es una estructura de datos calculada en memoria, no un proceso con estados persistidos ni pausas de aprobación. |
| SSE realtime | **No** | No hay progreso de servidor que reflejar en vivo. |
| StorageAdapter | **No** | No hay ficheros. |
| Spend ledger / credenciales cifradas | **No** | D8: sin APIs de pago ni keys de terceros. |
| Deploy VPS + Caddy | **Sí** ⚠ | El producto es web y público; sin deploy no hay producto. Prerequisito externo del usuario: VPS y dominio. |

### 5.3 Dónde corre el motor

El motor vive en `packages/core` y es **isomorfo**: la misma función corre en el servidor (route handler `POST /api/analyze`) y podría correr en el cliente. v1 lo ejecuta **en el servidor** por coherencia con el historial y para que la lógica se verifique en un solo sitio. Consecuencia asumida y declarada en §11: el input viaja al servidor.

## 6. El motor de detección y cadena

El corazón del producto. Todo lo de esta sección vive en `packages/core` y no debe adivinarse en la implementación.

### 6.1 Contratos

```ts
// Tipos de dato que el motor sabe reconocer.
type DataKind =
  | 'base64' | 'jwt' | 'json' | 'unix_timestamp'
  | 'url' | 'uuid' | 'hash' | 'text'

// Un detector responde: "esto podría ser X, con esta confianza".
interface Detection {
  kind: DataKind
  confidence: number        // 0..1
  meta?: Record<string, unknown>  // p.ej. { algo: 'sha256' }, { version: 4 }
}

// Una transformación aplicable a un kind concreto.
interface Transform {
  id: string                // 'base64.decode', 'jwt.decode', 'json.format'
  from: DataKind
  label: string             // texto en español para la UI
  apply(input: string): TransformResult   // pura, total: nunca lanza
}

type TransformResult =
  | { ok: true; output: string; notes?: string[] }
  | { ok: false; error: string }

// Un paso de la cadena, tal y como lo consume la UI.
interface ChainStep {
  index: number
  input: string
  detections: Detection[]   // ordenadas por confianza desc; [0] es la elegida
  applied: string | null    // Transform.id aplicado, o null si es terminal
  output: string | null
}

interface Chain {
  steps: ChainStep[]
  terminal: 'text' | 'no_transform' | 'max_depth' | 'cycle' | 'error'
}
```

Todos los contratos se expresan además como esquemas Zod en `packages/core`, y `POST /api/analyze` valida entrada y salida contra ellos.

### 6.2 Detectores de v1

| Kind | Cómo se reconoce (guía, no implementación) | Confianza |
|---|---|---|
| `jwt` | Tres segmentos base64url separados por `.`; el primero decodifica a JSON con campo `alg`. Tolera el prefijo `Bearer `. | Alta si el header decodifica; el formato es muy específico. |
| `json` | Parsea como JSON y el resultado no es un escalar desnudo (un `123` suelto no es JSON a efectos del producto). | Alta. |
| `base64` | Alfabeto base64/base64url válido, longitud coherente, y **el resultado de decodificar es texto imprimible o JSON**. Este último requisito es clave: sin él, media Internet parece base64. | Media-alta; baja si el decodificado es binario. |
| `unix_timestamp` | Entero de 10 o 13 dígitos cuya lectura como segundos/milisegundos cae en un rango plausible (ver invariante I4). | Media: siempre convive con la alternativa `text`. |
| `url` | Parsea con `URL` y tiene esquema http/https. Detecta si hay query string o partes URL-encoded. | Alta. |
| `uuid` | Formato canónico 8-4-4-4-12; extrae la versión del nibble correspondiente. | Alta. |
| `hash` | Cadena hex pura de longitud 32/40/64 → candidatos md5 / sha1 / sha256. | Baja-media: solo identifica, y la longitud no prueba nada. Convive siempre con `text`. |
| `text` | Siempre presente como último recurso, confianza mínima. Es el kind terminal. | Mínima (0.01). |

### 6.3 Transformaciones de v1

| Transform.id | from | Hace |
|---|---|---|
| `base64.decode` | base64 | Decodifica a UTF-8 (base64 y base64url). |
| `jwt.decode` | jwt | Produce un JSON con `{ header, payload, signature }` y anota en `notes` la expiración legible. |
| `json.format` | json | Indenta a 2 espacios. |
| `json.minify` | json | Compacta. |
| `json.sort_keys` | json | Ordena claves recursivamente. |
| `timestamp.to_iso` | unix_timestamp | ISO 8601 UTC. |
| `timestamp.to_relative` | unix_timestamp | "hace 3 horas", "en 2 días" (español). |
| `url.decode` | url | Decodifica percent-encoding. |
| `url.split_query` | url | JSON con los parámetros de la query, valores decodificados. |
| `uuid.describe` | uuid | JSON con versión y variante. |
| `hash.identify` | hash | JSON con los algoritmos candidatos según longitud. |

La transformación **por defecto** de cada kind (la que el motor aplica sola) es la primera de su grupo: `base64.decode`, `jwt.decode`, `json.format`, `timestamp.to_iso`, `url.split_query` si hay query y `url.decode` si no, `uuid.describe`, `hash.identify`.

### 6.4 Invariantes

| # | Invariante |
|---|---|
| I1 | **El motor es puro y total.** Ninguna función del motor lanza excepciones ni hace I/O. Un fallo de transformación es un `{ ok: false, error }`, y la cadena termina con `terminal: 'error'` conservando los pasos previos. |
| I2 | **Profundidad máxima 8 pasos.** Al alcanzarla la cadena termina con `terminal: 'max_depth'`. Nunca es un error visible: es un final legítimo. |
| I3 | **Detección de ciclos.** Si el output de un paso ya apareció como input de un paso anterior de la misma cadena, se corta con `terminal: 'cycle'`. Sin esto, `base64.decode` sobre ciertas entradas se auto-alimenta. |
| I4 | **El tiempo se inyecta.** `timestamp.to_relative` y la expiración del JWT reciben el instante actual como parámetro explícito (`now: Date`). El motor NUNCA lee el reloj del sistema. Sin esto los tests son irreproducibles. |
| I5 | **Determinismo.** Misma entrada + mismo `now` ⇒ misma cadena, byte a byte. Es la base de los golden files de test. |
| I6 | **`text` es terminal.** No hay transformación desde `text`: es el suelo de la cadena. |
| I7 | **Límite de entrada: 128 KB.** Por encima, la API rechaza con 413 sin procesar. Protege de un DoS trivial en una superficie pública sin auth. |
| I8 | **La ambigüedad nunca se oculta.** Si hay más de una detección con confianza ≥ 0.3, la UI debe mostrar que existe alternativa (O5). |

### 6.5 Ejemplo trabajado (contrato de comportamiento)

Entrada: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc`

```
paso 0: input="Bearer eyJ…"  detections=[jwt 0.95, text 0.01]  applied=jwt.decode
paso 1: input='{"header":…}' detections=[json 0.99, text 0.01]  applied=json.format
paso 2: input='{\n  "header"…' detections=[json 0.99]           applied=null
terminal: 'no_transform'   (json.format sobre JSON ya formateado no aporta: no se re-aplica)
notes del paso 0: ["exp: 2026-07-16T00:00:00Z (caducó hace 4 horas)"]
```

Nota de diseño que el implementer no debe adivinar: **una transformación no se aplica dos veces seguidas sobre el mismo kind si su salida es idéntica a su entrada** — eso es lo que hace que el paso 2 sea terminal en vez de un bucle cortado por I2.

## 7. Cliente: UX y rutas

| Ruta | Pantalla | Auth |
|---|---|---|
| `/` | **El campo.** Un textarea grande y vacío, con foco automático. Al pegar (o al escribir y parar), analiza y despliega la cadena debajo: un bloque por paso con su tipo detectado, la transformación aplicada, el valor resultante y botón de copiar. Cada paso permite abrir un selector de transformación alternativa (O4) y ver las detecciones descartadas (O5). | No |
| `/login` | Email + contraseña. | No |
| `/signup` | Email + contraseña. | No |
| `/history` | Lista de las últimas 50 entradas del usuario: vista previa redactada, tipo detectado, cadena aplicada y fecha relativa. Cada una se puede reabrir (restaura la cadena, no el dato — D7) o borrar. | **Sí** |

**Requisitos UX no negociables**

- **Pegar y ya.** Sin botón de "analizar": el análisis se dispara al pegar o tras 300 ms de inactividad al escribir.
- **La cadena es el producto.** No se muestra solo el resultado final: se muestran todos los pasos, y el intermedio es tan copiable como el último.
- **Nada de callejones sin salida.** Si no se detecta nada (`text`), se dice explícitamente y con qué se intentó, nunca una pantalla vacía.
- **Sin cuenta, sin fricción.** Ni modal de registro, ni banner, ni "regístrate para continuar" en `/`. Un enlace discreto al historial y nada más (D6).
- **Teclado primero.** Foco en el campo al cargar; copiar cualquier paso sin ratón.
- **Responsive real**: la cadena en móvil se apila; no es una tabla horizontal.

Cada pantalla tendrá su mockup aprobado en `docs/mockups/` antes de implementarse (regla 7 del planning).

## 8. Módulos del servidor

| Módulo | Responsabilidad | Entrada → salida |
|---|---|---|
| `analyze` | Route handler que valida la entrada (I7), invoca el motor de `core` con `now` explícito y devuelve la `Chain`. Si hay sesión, registra la entrada de historial (D7). | `POST { input: string }` → `Chain` |
| `auth` | Signup, login, logout. Hash de contraseña con scrypt, sesión en cookie httpOnly + tabla `session`. Rate limit por IP en login. | `POST /api/auth/{signup,login,logout}` |
| `history` | Listar (paginado, máx 50), borrar una entrada, borrar todas. Solo del usuario de la sesión. | `GET/DELETE /api/history` |
| `health` | `{ ok, db }`. Público. | `GET /api/health` |

**Redacción (D7)**: la vista previa se calcula en el servidor antes de persistir. Regla: truncar a 120 caracteres y, si el kind detectado es `jwt`, sustituir payload y firma por `…`; para el resto, conservar los primeros 120 caracteres. El input crudo no se escribe en la BD **ni en los logs** (§11).

## 9. Modelo de datos

```
user                                  session
├─ id            uuid pk              ├─ id          uuid pk
├─ email         text unique not null ├─ user_id     uuid fk→user on delete cascade
├─ password_hash text not null        ├─ expires_at  timestamptz not null
└─ created_at    timestamptz default now()  └─ created_at timestamptz default now()
                                      idx: (user_id), (expires_at)

history_entry
├─ id           uuid pk
├─ user_id      uuid fk→user on delete cascade
├─ preview      text not null          -- truncado + redactado (D7), máx 120 chars
├─ input_kind   text not null          -- DataKind del paso 0
├─ chain        jsonb not null         -- [{ kind, transform_id }] resumen, sin valores
├─ created_at   timestamptz default now()
idx: (user_id, created_at desc)  -- sirve la query del historial
```

- `email` es `citext` o se normaliza a minúsculas en la aplicación antes de insertar; el índice único debe ser insensible a mayúsculas. Decidir en la tarea de auth y anotarlo.
- `chain` guarda **solo** el resumen de tipos y transformaciones aplicadas, nunca los valores intermedios (D7).
- Sin tabla de detectores/transformaciones: viven en el código, no en datos.
- Retención: sin política de purga automática en v1 (el límite de 50 es de vista, no de almacenamiento). Anotado como riesgo R5.

## 10. Despliegue y operación

VPS propio (Ubuntu 24.04) bajo `devtools.carlosvillu.dev`. `docker-compose.prod.yml` con web (Next standalone) y postgres con volumen persistente; sin worker. Deploy por `git pull && docker compose up -d --build` **vía la skill `deploy`** (config en `deploy.env`). Backup: `pg_dump` diario por cron.

**Topología real**, verificada en el bootstrap contra el propio VPS —que es donde corre el bucle de desarrollo— y contra `~/AGENTS.md`, su fuente de verdad operativa:

```
Internet → Cloudflare (DNS + proxy naranja, SSL Full strict)
         → Caddy central (contenedor edge-caddy, ~/infra/caddy, network_mode: host, TLS automático)
         → 127.0.0.1:3110   (bloque de puertos de devtools: 3110–3119)
```

- El Caddy central es el único proceso en 80/443 y sirve a todos los proyectos del VPS: **devtools no lleva su propio reverse proxy ni gestiona TLS**. Se añade con un fichero `~/infra/caddy/sites/devtools.carlosvillu.dev.caddy` + reload.
- **La app publica su HTTP solo en `127.0.0.1:3110`, nunca en `0.0.0.0`**: un puerto publicado en abierto por Docker **se salta UFW** (Docker escribe sus propias reglas de iptables por debajo del firewall) y además saca la app de detrás de Caddy.
- Sin prerequisitos externos pendientes de contratar: el VPS existe, el DNS de `devtools.carlosvillu.dev` ya resuelve por Cloudflare y el Caddy central ya corre. El ⚠ de F3 se reduce a confirmar que el DNS apunta al origen correcto en el momento de desplegar.

**Trust boundary** (§11 depende de esto): hay **dos** proxies delante —Cloudflare y Caddy—, así que la IP del socket nunca es la del cliente. El patrón ya probado en este VPS: el site file de Caddy fija `header_up X-Forwarded-For {client_ip}`, sobrescribiendo el header para que deje de ser controlable por el cliente, y la app corre con `TRUST_PROXY=1` tomando la última entrada. Pero con el proxy naranja de Cloudflare activo **eso da la IP de Cloudflare, no la del usuario**: la real llega en `CF-Connecting-IP`. Se resuelve en la tarea de deploy y se revisan contra esa decisión los dos rate limits (login y `/api/analyze`): sin ello, el rate limit o es trivialmente evitable o bloquea a todo el mundo a la vez.

## 11. Observabilidad y seguridad

**Logging**: pino estructurado con `request_id` de correlación desde T0.1. **El input del usuario nunca se loguea**, ni entero ni truncado: solo `input_kind`, longitud en bytes, número de pasos y duración. Un log de errores que incluya la entrada convertiría los logs en el mismo pasivo que D7 evita en la BD.

**Modelo de seguridad**

| Superficie | Protección |
|---|---|
| `POST /api/analyze` | **Pública y sin auth** (D6). Riesgo real de abuso: mitigado con el límite de 128 KB (I7) y rate limit por IP (la IP real es la de `CF-Connecting-IP`, no la del socket — §10). Es el punto más expuesto del producto. |
| `/history`, `/api/history` | Sesión obligatoria. Middleware que protege **solo** estas rutas (D6). |
| Contraseñas | scrypt (`node:crypto`), sin dependencia externa. Nunca en logs. |
| Sesiones | Cookie httpOnly, secure, sameSite=lax; expiración en BD, no solo en la cookie. |
| Login | Rate limit por IP (misma salvedad de `CF-Connecting-IP` que `/api/analyze` — §10); respuestas indistinguibles entre "email no existe" y "contraseña mal". |
| Entrada | Toda la entrada validada con Zod en el borde (I7 incluida). |
| Secretos | Solo en `.env` (gitignored) y en el `.env` del VPS. |

**Advertencia de producto que el README debe llevar**: devtools procesa lo que pegas en el servidor. No está pensado para secretos de producción vivos. Es honesto decirlo en vez de dejar que el usuario lo asuma.

## 12. Riesgos y mitigaciones

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | **Detección ambigua molesta.** `hash` vs `text`, `unix_timestamp` vs número suelto: si el motor adivina mal y en silencio, el producto parece tonto. | Alto: es EL valor del producto. | I8 + O5: la alternativa siempre visible y a un clic. Confianzas calibradas con golden files (§6.2). |
| R2 | **El input viaja al servidor.** Un devtools que ve tus tokens. | Alto reputacional en repo público. | D7 (no se persiste crudo), §11 (no se loguea), advertencia explícita en README y en `/`. El motor es isomorfo (§5.3): mover el análisis al cliente es una fase futura viable, no un rediseño. |
| R3 | **`/api/analyze` público es superficie de abuso.** | Medio: es CPU, no coste variable (D8). | I7 (128 KB) + rate limit por IP + sin llamadas externas que amplifiquen el coste. |
| R4 | **Falsos positivos de base64.** Casi cualquier cadena alfanumérica "es" base64 válido. | Medio: cadenas absurdas. | Regla de §6.2: solo cuenta como base64 si el decodificado es texto imprimible o JSON. |
| R5 | **Historial sin purga.** Crecimiento indefinido. | Bajo en v1 (usuarios contados). | Aceptado conscientemente. Si el proyecto sobrevive, purga por antigüedad en fase posterior. |
| R6 | **El banco de pruebas se traga al producto** (D1): tentación de meter módulos que el PRD no exige solo por ejercitar el arnés. | Medio: esqueleto muerto que el gate mantiene para nadie. | §5.2 justifica cada exclusión. Cualquier módulo nuevo exige cambio de PRD, no un atajo en el planning. |

## 13. Roadmap de fases

| Fase | Entrega observable |
|---|---|
| **F0 — Cimientos** | Monorepo con gate verde, Postgres en Docker, Drizzle con la migración inicial (user, session, history_entry), y auth email+contraseña funcionando en el navegador. Sin producto todavía, pero con suelo verificable. |
| **TD — Design system** | Las primitivas visuales del producto en código, espejo del proyecto de Claude Design. Se intercala tras T0.1 porque toda UI posterior depende de ella. |
| **F1 — El motor y el campo** | **El primer hito de valor real**: pegas algo en `/` y ves la cadena desenredada. Motor completo en `core` (detectores, transformaciones, encadenado, invariantes I1-I8), `POST /api/analyze` y la pantalla principal. Al cerrar F1 el producto ya sirve para algo, sin cuenta y sin historial. |
| **F2 — El historial** | Cuenta opcional que registra lo que analizas (redactado, D7), con `/history` para revisarlo, reabrirlo y borrarlo. |
| **F3 — Producción** ⚠ | El producto en el VPS, con dominio, TLS, backup diario y el recorrido completo verificado desde fuera. Bloqueada por prerequisitos externos (§10). |

Cada fase deja el producto más útil que la anterior. F1 es el corte importante: si solo se construyera hasta ahí, seguiría siendo un producto defendible.

## 14. Criterios de éxito

Numerados: los E2E de fase del planning citan "criterio 14.3".

**Del producto**

| # | Criterio (medible y observable) |
|---|---|
| 14.1 | Pegado en `/` un `Authorization: Bearer <JWT>` real, el navegador muestra en < 1 s la cadena `jwt → json` con el payload formateado y la expiración en lenguaje natural, sin que el usuario elija nada (CU1). |
| 14.2 | Pegado un base64 que contiene JSON, la cadena muestra los 3 pasos (base64 → json → formateado) y el valor de cualquier paso intermedio se copia con un clic (CU2, O3). |
| 14.3 | Pegado `1752624000`, la UI muestra la lectura como timestamp **y** deja ver que existe la alternativa `text`; cambiar a la alternativa recalcula la cadena (CU3, O5, I8). |
| 14.4 | En cualquier paso, elegir una transformación distinta de la propuesta recalcula la cadena desde ese punto y deja los pasos anteriores intactos (CU4, O4). |
| 14.5 | Una entrada de 200 KB recibe 413 sin que el servidor la procese (I7). |
| 14.6 | Sobre el corpus de golden files del motor, misma entrada + mismo `now` produce la misma `Chain` byte a byte en dos ejecuciones separadas (I5). |
| 14.7 | Ninguna cadena, para ninguna entrada del corpus, excede 8 pasos ni entra en bucle (I2, I3). |
| 14.8 | Sin sesión: `/` es plenamente funcional y `/history` redirige a login. Con sesión: analizar algo lo hace aparecer en `/history` con la vista previa **redactada**, y en `psql` la fila NO contiene el token completo (D6, D7). |
| 14.9 | Con la app corriendo, un `grep` del input de prueba sobre los logs de la web no devuelve ninguna coincidencia (§11). |
| 14.10 | Desde fuera del VPS, `https://devtools.carlosvillu.dev` sirve la app con certificado válido y el recorrido de 14.1 funciona en producción. Forzar el backup produce un dump legible por `pg_restore --list` (F3). |

**Del banco de pruebas (D1)**

| # | Criterio |
|---|---|
| 14.11 | El bucle `dev-loop` cierra la fase F1 completa sin más intervención humana que las paradas previstas por el protocolo (fin de fase, juicio humano explícito, prerequisito ⚠). |
| 14.12 | Toda tarea cerrada tiene su `docs/verifications/<ID>/report.md` con veredicto PASS y evidencia reproducible; ninguna se marcó `[x]` sin él. |
| 14.13 | El coste real por tarea queda registrado en el journal, y ninguna tarea supera su cap (estimado ×3) sin parada explícita. |
