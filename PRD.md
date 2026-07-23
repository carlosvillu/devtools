# PRD — devtools

> **Pega cualquier cosa. devtools averigua qué es y te la desenreda paso a paso.**
> Un único campo de entrada acepta cualquier cadena que un desarrollador tenga en el portapapeles (un JWT, un base64, un timestamp, un JSON ilegible, una URL con parámetros). El producto detecta qué es, aplica la transformación pertinente y **vuelve a detectar sobre el resultado**, encadenando pasos hasta llegar a algo legible. La cadena se muestra completa y se puede recorrer. Corre en web, sobre VPS propio.
>
> **Versión:** 1.2 (aprobado) · **Fecha:** 2026-07-16 · **Aprobado:** 2026-07-16 · **Autor:** carlosvillu + Claude
>
> **v1.1 (2026-07-17)** — sin cambio de alcance: §10 y §11 se corrigen contra la topología REAL del VPS, inspeccionada en el cierre del bootstrap (Cloudflare + Caddy central en modo host + puerto 3110; la IP real del cliente llega en `CF-Connecting-IP`). El §10 anterior daba el VPS y el DNS por pendientes, y ambos existen ya.
>
> **v1.3 (2026-07-23)** — **cambio de alcance**, pedido por el usuario tras cerrar F6: el producto gana **compartir una receta por enlace**. Una composición se comparte con un link `/compose?r=<receta>` que lleva **solo la receta** —los ids de las transformaciones, lo mismo que `/history` ya guarda (§9)—, **nunca el fuente ni el secreto de firma**. Quien abre el enlace ve los pasos precargados y aporta su propio valor: el dato sensible sigue sin salir de ningún navegador, así que **§11 y R2 quedan idénticos**. La receta va en la **query** (no en el fragmento) a propósito: es dato del motor, no sensible, y así el servidor puede generar una **imagen OG dinámica** que muestre los pasos —el preview rico es el mecanismo de la feature—. Entra el objetivo **O9** (§2.1), la decisión **D11** (§4) que precisa el no-objetivo de «compartir resultados» sin borrarlo, la afordancia de compartir y la lectura de `?r=` en `/compose` (§7), la imagen OG por receta, y los criterios **14.17–14.19** (§14). Lo que NO cambia: no se aloja ningún dato de terceros (el enlace es autocontenido y sin estado, sin tabla ni endpoint de escritura nuevo), el fuente y el secreto nunca viajan en la URL, y las direcciones de decodificar y componer siguen exactamente como están.
>
> **v1.2 (2026-07-22)** — **cambio de alcance**, pedido por el usuario tras cerrar F5: el producto gana la **dirección inversa**. Hasta aquí devtools solo sabía ir hacia atrás (quitar capas: detectar → transformar → re-detectar). Ahora también va **hacia delante**: escribo un valor y le pongo capas que **yo** elijo —`json.minify`, `base64.encode`, `url.encode`, `hash.sha256`, `jwt.sign`— hasta obtener lo que voy a pegar en un `curl`, un test o un ticket. Entra el objetivo **O8** (§2.1), la decisión **D10** (§4) que reconcilia a D2 sin borrarla, el motor de composición (**§6.6**, invariantes **I9–I12**), la ruta `/compose` (§7), `POST /api/history` para la receta (§8), la columna `direction` (§9), la fila de seguridad de componer (§11) y los criterios **14.14–14.16** (§14). La decisión estructural nueva: **el motor de composición corre en el navegador** (§5.3) — ni el texto fuente ni el secreto de firma salen de la máquina del usuario. Lo que NO cambia: D2 sigue prohibiendo el catálogo navegable de utilidades sueltas (§2.2), y la dirección de decodificar (F1–F5) se queda **exactamente** como está.

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
| O8 | **Dada una fuente escrita por el usuario, permitir encadenar transformaciones de codificación elegidas por él hasta un resultado copiable, mostrando cada paso.** _(añadido en v1.2, 2026-07-22; ver D10 y §6.6. Es la dirección inversa de O2: allí el motor elige y se auto-conduce; aquí manda el usuario y el motor no decide nada.)_ |
| O9 | **Dada una composición, generar un enlace que la comparta llevando solo la receta (los pasos), nunca el dato ni el secreto; quien lo abre ve los pasos precargados y aporta su propio valor.** _(añadido en v1.3, 2026-07-23; ver D11 y §7. La receta es el artefacto que O8/§9 ya aíslan del dato; el enlace es autocontenido y sin estado, con preview social generado por el servidor.)_ |

### 2.2 No-objetivos (v1)

- **Catálogo de herramientas independientes.** No habrá una rejilla de utilidades navegables. Si el usuario quiere una transformación, la obtiene pegando el dato. Esta es la decisión estructural del producto (D2).
  - **PRECISADO en v1.2 (2026-07-22), por D10.** Este no-objetivo **sigue vigente y no se relaja**: no habrá rejilla de utilidades, ni buscador de herramientas, ni una página por transformación. Lo que v1.2 añade (§6.6, `/compose`) **no es un menú de herramientas: es la misma cadena recorrida en el otro sentido** — una sola pantalla de trabajo con dos direcciones, en la que el usuario aporta la fuente y encadena pasos sobre la salida anterior. La prueba de que no es catálogo: no se llega a una transformación **desde** un índice de utilidades; se llega desde un dato en curso. Si algún día apareciera un índice navegable de transformaciones sueltas, ese sí violaría D2. Ver **D10**.
- **Utilidades descartadas de v1:** cifrado/descifrado, tester de regex, parser de cron, conversión de colores, formateo de SQL, diff de textos, generación de datos falsos, conversión de imágenes. Candidatas a fases posteriores.
- **Edición del dato.** No es un editor: la entrada se pega, no se escribe ni se guarda como documento.
- **Compartir resultados por URL pública.** Sin superficie pública que aloje datos de terceros.
  - **PRECISADO en v1.3 (2026-07-23), por D11.** Este no-objetivo **sigue vigente y no se relaja**: no se comparte ni se aloja un **resultado**, ni el **dato** de nadie, ni el **secreto** de nadie. Lo que v1.3 añade (§7, `/compose?r=…`) es compartir la **receta** —los ids de las transformaciones, el mismo artefacto **no sensible** que `/history` ya persiste (§9)—, nunca el fuente, el resultado ni el secreto de firma. Y **no se aloja nada**: el enlace es autocontenido y sin estado (la receta viaja en la propia URL; el servidor la lee para dibujar el preview y la olvida — ni tabla, ni fila, ni endpoint de escritura nuevo). La distinción receta ≠ dato es exactamente la que D7/D10 ya hacen. Compartir el resultado decodificado o el valor compuesto **seguiría violando** este no-objetivo. Ver **D11**.
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
| CU4 | **El desvío.** Pega algo y ve que, en un paso, quiere una lectura distinta de la propuesta por defecto; elige manualmente otra transformación en ese paso y la cadena se recalcula desde ahí (O4, criterio 14.4). _(Reconciliado en T1.7: la ilustración original —«un base64 decodifica a texto y el usuario elige hash a mano»— quedó superada por el motor real, que **auto-detecta `hash`** para cualquier hex de 32/40/64, de modo que un hash nunca se queda en `text`. El desvío manual es el mecanismo O4 sobre un paso con >1 transformación; no existe asignación de un kind arbitrario que el detector no haya propuesto.)_ |
| CU5 | **La URL con parámetros.** Pega una URL de callback con `?state=…&code=…` URL-encoded y obtiene los parámetros desglosados en tabla, con los valores decodificados. |
| CU6 | **El regreso.** Con cuenta iniciada, abre el historial, reconoce por la vista previa la entrada de ayer y la reabre para copiar un valor intermedio. |

## 4. Decisiones de producto ya tomadas

Vinculantes para el resto del PRD y para el bucle (los agentes citan "decisión D3").

| # | Decisión | Detalle |
|---|---|---|
| D1 | **El proyecto es un banco de pruebas del arnés** | El objetivo declarado es ejercitar el bucle `dev-loop` con un producto real. No se busca tracción ni monetización, y no se hizo deep research de mercado (por eso las tesis 1-2 de §1 quedan `[verificar]` y así se quedan). No degrada el listón de calidad: el producto debe funcionar de verdad. |
| D2 | **Una sola feature: el campo que autodetecta** | Explícitamente NO es una suite de utilidades independientes. Todo lo que no sea detectar → transformar → re-detectar → mostrar es no-objetivo. **MATIZADA por D10 (2026-07-22, v1.2)**: la frase «una sola feature» hay que leerla como **una sola idea** —el dato entra y la cadena lo lleva a donde el usuario quiere—, no como «una sola dirección». Lo que D2 protege sigue intacto: no hay suite de utilidades independientes ni catálogo navegable (§2.2). Lo que D10 añade es el **sentido inverso de la misma cadena** (§6.6), no una segunda feature suelta. No se reescribe la decisión: se anota su evolución. |
| D3 | **Encadenamiento automático visible** | La cadena se construye sola y se muestra entera, paso a paso, no solo el resultado final. Es el ángulo diferencial del producto. |
| D4 | **Licencia AGPL-3.0, repositorio público** | Los README se escriben de cara al público. |
| D5 | **Historial en servidor con cuenta** | Exige Postgres + Drizzle + auth multi-usuario. Elegido a sabiendas de que es más producto del estrictamente necesario: la razón es D1 (ejercitar la capa de datos del arnés). |
| D6 | **La herramienta es anónima y pública; la cuenta es opcional** | Se usa sin registro. Registrarse solo añade historial. **Esto contradice el default del módulo de auth del template** (que protege todo salvo login/health): aquí el middleware protege ÚNICAMENTE `/history` y la API de historial. |
| D7 | **El historial no guarda el input crudo** | Guarda: vista previa truncada (máx. 120 caracteres) con redacción de la parte sensible, tipo detectado, y la lista de transformaciones aplicadas. Nunca el token entero, nunca el payload completo. Consecuencia asumida: "reabrir" una entrada del historial restaura la cadena, no el dato original — el usuario debe volver a pegarlo. |
| D8 | **Sin APIs externas de pago** | Todo el procesamiento es propio. No hay ledger de gasto ni credenciales de terceros. |
| D9 | **Autenticación por email + contraseña** | Sin OAuth: un OAuth app de GitHub sería un prerequisito externo (⚠) que bloquearía F0 sin aportar nada al banco de pruebas. |
| D10 | **Dos direcciones, una sola idea** _(nueva en v1.2, 2026-07-22)_ | El producto recorre la cadena en **los dos sentidos**: `/analyze` la deshace (el motor decide, O1–O5) y `/compose` la construye (decide el usuario, O8). **Reconcilia D2 sin borrarla**: D2 existía para impedir que devtools degenerase en una rejilla de utilidades donde el usuario tiene que saber de antemano qué herramienta necesita, y **eso sigue prohibido** (§2.2). Componer no es esa rejilla: es la misma cadena, los mismos contratos (§6.1) y los mismos detectores (§6.2), recorridos al revés sobre un dato que el usuario ya tiene delante. Son **la misma pantalla de trabajo en dos modos**, con un conmutador arriba y dos URLs (§7). Consecuencia estructural, no negociable: **el motor de composición corre en el navegador** (§5.3) — el paso `jwt.sign` necesita un secreto de firma, y mandarlo al servidor estrenaría justo el pasivo que D7, §11 y R2 llevan todo el producto evitando. Con cuenta, el historial guarda **la receta** (los pasos), nunca los valores (§9). |
| D11 | **Compartir la receta, nunca el dato** _(nueva en v1.3, 2026-07-23)_ | Una composición se comparte con un enlace `/compose?r=<receta>` que lleva **exclusivamente la receta** —los ids de transformación, lo mismo que `/history` guarda (§9)—, validada al leerse contra el catálogo del motor (§6.6) con el **mismo Zod estricto** que `POST /api/history` (§8): un `?r=` con cualquier cosa que no sea `{transform_id, kind}` de un id del catálogo **se ignora**, no se ejecuta a medias. **El fuente y el secreto de firma NUNCA van en la URL** (ni query ni fragmento): los teclea quien abre el enlace, en su propio navegador, así que §11 y R2 quedan **idénticos**. La receta va en la **query** (no en el fragmento) a propósito: es dato del motor, no sensible, y así el **servidor puede generar una imagen OG** que muestre los pasos —el preview rico es el mecanismo de la feature—. **No se aloja nada**: el enlace es autocontenido y sin estado; no hay tabla, ni fila, ni endpoint de escritura nuevo. Reconcilia el no-objetivo de §2.2 sin borrarlo: compartir la receta no es compartir el dato. |

## 5. Arquitectura general

### 5.1 Diagrama

```
                         ┌─────────────────────────────────────┐
   navegador ───────────►│  apps/web  (Next.js App Router)     │
                         │                                     │
                         │   /            landing (pública)    │
                         │   /analyze     la cadena (pública)  │
                         │   /compose     componer (pública)   │
                         │   /history     historial (con auth) │
                         │   /login /signup                    │
                         │                                     │
                         │   route handlers:                   │
                         │     POST /api/analyze               │
                         │     GET/POST/DELETE /api/history    │
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

_(Rutas actualizadas en v1.2, 2026-07-22: `/` es la landing desde F5 y la pantalla de trabajo vive en `/analyze`; `/compose` la abre en modo componer. Fíjate en que **`/compose` no tiene route handler propio**: no existe `POST /api/compose` porque el motor de composición corre en el navegador — D10, §5.3. Lo único que puede viajar al servidor desde componer es la receta, por `POST /api/history`.)_

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

**El motor de composición corre en el CLIENTE** _(D10, v1.2, 2026-07-22)_. La dirección inversa (§6.6) **no tiene endpoint**: no existe `POST /api/compose`, y componer no dispara ni una petición de red. El disparador de la decisión es `jwt.sign`: necesita un **secreto de firma** del usuario, y mandarlo al servidor estrenaría exactamente el pasivo que D7 (no persistir el crudo), §11 (no loguear el input) y **R2** llevan todo el producto evitando. R2 ya nombraba «mover el análisis al cliente» como la mitigación natural del riesgo y la declaraba viable por el isomorfismo: F6 la ejecuta para la mitad nueva del producto. La mitad de decodificar **no cambia**: `POST /api/analyze` sigue corriendo en el servidor.

Esto impone una restricción dura sobre las transformaciones de codificación, y es **causa, no preferencia de estilo**: deben ser **puras y SÍNCRONAS**, sin `node:*` (no existen en el navegador) y **sin Web Crypto** (`crypto.subtle` es **asíncrono**, devuelve promesas, y rompería la firma `apply(input): TransformResult` del contrato `Transform` de §6.1 — cambiarla obligaría a asincronizar también `analyze()`, que hoy es puro y síncrono). Por eso SHA-256, MD5 y el HMAC de `jwt.sign` se implementan en **TypeScript puro** dentro de `packages/core`, verificados contra vectores de prueba publicados (FIPS 180-4, RFC 1321, RFC 4231) y no contra la propia implementación.

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
  notes?: string[]          // notas legibles del paso (p. ej. la expiración del JWT, §6.5); provienen del TransformResult
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
| I3 | **Detección de ciclos.** Si el output de un paso ya apareció como input de un paso anterior de la misma cadena, se corta con `terminal: 'cycle'` conservando los pasos previos. Es un guard **defensivo**: con las transformaciones por defecto de v1 el ciclo es de hecho inalcanzable (`base64.decode`/`url.decode` acortan siempre y no hay par inverso entre los defaults, así que un base64 anidado satura en `max_depth` vía I2, no en `cycle`) — el guard existe para proteger ante futuras transformaciones que sí puedan formar un par inverso. Se verifica inyectando un grafo auto-alimentado sobre el bucle real (T1.3). |
| I4 | **El tiempo se inyecta.** `timestamp.to_relative` y la expiración del JWT reciben el instante actual como parámetro explícito (`now: Date`). El motor NUNCA lee el reloj del sistema. Sin esto los tests son irreproducibles. |
| I5 | **Determinismo.** Misma entrada + mismo `now` ⇒ misma cadena, byte a byte. Es la base de los golden files de test. |
| I6 | **`text` es terminal.** No hay transformación desde `text`: es el suelo de la cadena. |
| I7 | **Límite de entrada: 128 KB.** Por encima, la API rechaza con 413 sin procesar. Protege de un DoS trivial en una superficie pública sin auth. |
| I8 | **La ambigüedad nunca se oculta.** Si hay más de una detección con confianza ≥ 0.3, la UI debe mostrar que existe alternativa (O5). **Regla de visualización (ratificada en T1.6):** se muestran las detecciones descartadas con confianza ≥ 0.3, **más `text`** cuando el kind elegido es uno que §6.2 marca como «convive siempre con text» (`unix_timestamp`, `hash`) — su confianza de `text` (0.01, el suelo I6) queda bajo el umbral pero su ambigüedad con texto es intrínseca, no umbral-dependiente. Sin esta regla `1752624000` no ofrecería `text` (criterio 14.3). El conjunto de kinds que conviven con text vive en el motor (`KINDS_COEXISTING_WITH_TEXT`, junto a los detectores que lo producen), no en la capa de presentación. |

### 6.5 Ejemplo trabajado (contrato de comportamiento)

Entrada: `Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc`

```
paso 0: input="Bearer eyJ…"  detections=[jwt 0.95, text 0.01]  applied=jwt.decode
paso 1: input='{"header":…}' detections=[json 0.99, text 0.01]  applied=json.format
paso 2: input='{\n  "header"…' detections=[json 0.99, text 0.01] applied=null
terminal: 'no_transform'   (json.format sobre JSON ya formateado no aporta: no se re-aplica)
notes del paso 0: ["exp: 2025-07-16T00:00:00Z (caducó hace 4 horas)"]
```

Nota de diseño que el implementer no debe adivinar: **una transformación no se aplica dos veces seguidas sobre el mismo kind si su salida es idéntica a su entrada** — eso es lo que hace que el paso 2 sea terminal en vez de un bucle cortado por I2.

### 6.6 El motor de composición (dirección inversa)

_(Nuevo en v1.2, 2026-07-22 — D10, O8.)_ Vive también en `packages/core`, junto al de detección, y **corre en el navegador** (§5.3). Es **otro motor, no una lista nueva de transformaciones**: `analyze()` se auto-conduce (detecta → transforma → re-detecta) y `compose()` **no decide nada** — el usuario elige cada paso y el motor los aplica en orden, encadenando la salida de cada uno a la entrada del siguiente.

#### Contrato

```ts
// Lo que el usuario elige: la RECETA. Es lo único que se persiste (§9).
interface ComposeStepSpec {
  transform: string                   // Transform.id del catálogo de codificación
  options?: Record<string, unknown>   // parámetros del paso; jwt.sign: { secret, alg: 'HS256' }
}

// Lo que el motor devuelve por cada paso ejecutado, tal y como lo consume la UI.
interface ComposeStep {
  index: number                       // 1..8 (la fuente es el paso 0, no es un ComposeStep)
  transform: string
  input: string
  ok: boolean
  output: string | null               // null si ok === false
  kind: DataKind | null               // DETECTADO sobre la salida (I10), nunca declarado
  error?: string                      // presente si ok === false
  notes?: string[]                    // del TransformResult (§6.1)
}

interface ComposeResult {
  source: string
  sourceKind: DataKind                // detectado sobre la fuente con los detectores de §6.2
  steps: ComposeStep[]                // solo los ejecutados; se corta en el primero que falla
  output: string | null               // salida del último paso ok; === source si steps está vacío
  outputKind: DataKind | null
  terminal: 'ok' | 'error'
}

function compose(
  source: string,
  steps: ComposeStepSpec[],           // máx. 8; una lista mayor se RECHAZA en el borde
  ctx: { now: Date },                 // el tiempo se inyecta (I4): el iat de jwt.sign sale de aquí
): ComposeResult
```

Como los de §6.1, estos contratos se expresan además como esquemas Zod en `packages/core`. El cap de 8 pasos es una regla del **esquema**, no del cuerpo de `compose()`: una receta de 9 pasos no se ejecuta a medias, se rechaza. `Transform` **no gana un campo `to: DataKind`** (I10): el tipo de cada salida se obtiene re-ejecutando los detectores de §6.2, de modo que los dos motores comparten una única verdad sobre los tipos.

#### Catálogo de transformaciones de codificación

Registro **separado** del de §6.3 y sin «transformación por defecto»: componer no elige sola, así que el concepto de default no existe aquí. Los grupos son los que agrupan la paleta de la pantalla (§7).

| Transform.id | grupo | Hace |
|---|---|---|
| `json.minify` | json | **Reutilizada de §6.3**, no duplicada: compacta el JSON. |
| `json.stringify` | json | Envuelve el texto como string JSON escapado. |
| `base64.encode` | binario | UTF-8 → base64 estándar (con padding). |
| `base64url.encode` | binario | base64url (sin padding, alfabeto `-_`). |
| `url.encode` | binario | Percent-encoding. |
| `hash.sha256` | hash | SHA-256 en hex. Implementación **TS pura** (§5.3). |
| `hash.md5` | hash | MD5 en hex. Implementación **TS pura** (§5.3). |
| `jwt.sign` | firma | JWT HS256: header `{alg:'HS256',typ:'JWT'}` + payload (la entrada del paso) + firma HMAC-SHA256 en base64url. Añade `iat` automáticamente a partir del `now` inyectado. El **secreto** llega como opción del paso; nunca se loguea, nunca se serializa en el resultado y nunca se persiste (§11). |

**Solo `HS256`** en v1: RS256 exigiría RSA en el cliente y HS384/HS512 exigirían SHA-384/512 puros que ninguna otra pieza usa. Ida y vuelta garantizada con la dirección de decodificar: `base64.decode`, `url.decode` y `jwt.decode` de §6.3 reabren lo que estas producen — es el test que solo puede existir ahora que hay dos direcciones.

#### Invariantes

I1–I8 siguen valiendo para el motor de detección. Los de composición se numeran a continuación y **no reetiquetan** lo que ya existe: I9 e I11 **heredan** I1 e I5 en vez de duplicarlos con otro número.

| # | Invariante |
|---|---|
| I9 | **Pureza y totalidad (hereda I1).** Ningún paso lanza ni hace I/O. Un fallo devuelve `{ ok: false, error }` **en ese paso**, se conservan todos los anteriores con su salida, y la cadena termina ahí con `terminal: 'error'`. Un paso roto no borra el trabajo del usuario. |
| I10 | **El kind de cada salida se DETECTA, no se declara.** Tras cada paso se re-ejecutan los detectores de §6.2 sobre la salida y se toma la detección de mayor confianza. Por eso `Transform` (§6.1) no necesita `to: DataKind`. |
| I11 | **Determinismo (hereda I5).** Mismo `source` + mismos `steps` (con las mismas `options`) + mismo `now` ⇒ mismo `ComposeResult` byte a byte. Es la base de los golden files. |
| I12 | **Sin auto-conducción.** `compose()` **nunca** añade, quita ni reordena pasos, ni aplica nada «por defecto». Con la lista de pasos vacía, el resultado es la fuente tal cual (`output === source`). |

Límite de **8 pasos**, el mismo de I2 y por la misma razón; además, así la UI no puede construir una cadena que el motor rechace. El motor es **síncrono** por la causa de §5.3 (Web Crypto es asíncrono y rompería `apply(input): TransformResult`), no por preferencia de estilo.

#### Ejemplo trabajado (contrato de comportamiento)

Datos del mockup (`ComposeClaro`), con `now` = `2025-07-15T00:00:00Z` (de donde sale el `iat`):

```
fuente:  {\n  "sub": "1",\n  "name": "carlos",\n  "role": "admin"\n}
         sourceKind = json                       (detectado, §6.2)

paso 1:  transform=json.minify
         output = {"sub":"1","name":"carlos","role":"admin"}
         kind   = json                           (detectado, I10)

paso 2:  transform=jwt.sign  options={ alg:'HS256', secret:<secreto del usuario> }
         output = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
                  .eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjUzNzYwMH0
                  .<firma HMAC-SHA256 en base64url>
         kind   = jwt                            (detectado, I10)

terminal: 'ok'   ·   outputKind = jwt   ·   2 pasos
```

Los dos primeros segmentos del JWT sí son literales exactos y reproducibles: el header es `{"alg":"HS256","typ":"JWT"}` y el payload es la salida del paso 1 **con `iat` añadido** (`1752537600` = el `now` inyectado). **La firma se deja como hueco a propósito**: el literal que trae el artboard del mockup es **decorativo** —es la firma canónica de `jwt.io`, el HMAC de `your-256-bit-secret` sobre el payload de «John Doe», pegada bajo el header y el payload de `carlos`—, así que **no se puede reproducir con ningún secreto** y no se copia aquí para no meter un dato falso en el PRD.

**De dónde sale el golden de la firma** (para que el implementer no vuelva a caer en la trampa): la firma se verifica contra los **vectores publicados** de SHA-256 (FIPS 180-4), MD5 (RFC 1321) y HMAC-SHA256 (RFC 4231), **más un control cruzado con `node:crypto`** en el test —que puede usarse en el test aunque el motor no pueda usarlo en producción (§5.3)—, **nunca contra el literal del mockup**, que es decorativo (ver las desviaciones de F6 en `planning.md`). Y la prueba de comportamiento que cierra el círculo: la **ida y vuelta**, `jwt.decode` (§6.3) reabre el token y devuelve el payload del paso 1.

## 7. Cliente: UX y rutas

| Ruta | Pantalla | Auth |
|---|---|---|
| `/` | **El campo.** Un textarea grande y vacío, con foco automático. Al pegar (o al escribir y parar), analiza y despliega la cadena debajo: un bloque por paso con su tipo detectado, la transformación aplicada, el valor resultante y botón de copiar. Cada paso permite abrir un selector de transformación alternativa (O4) y ver las detecciones descartadas (O5). | No |
| `/login` | Email + contraseña. | No |
| `/signup` | Email + contraseña. | No |
| `/history` | Lista de las últimas 50 entradas del usuario: vista previa redactada, tipo detectado, cadena aplicada y fecha relativa. Cada una se puede reabrir (restaura la cadena, no el dato — D7) o borrar. Desde v1.2 muestra también las **recetas** de composición, con su dirección visible; reabrir una receta restaura **los pasos**, nunca el dato (§9). | **Sí** |
| `/compose` | **Componer** (nueva en v1.2 — D10, O8). La pantalla de trabajo en modo codificar: un campo para la fuente (con el tipo reconocido de lo escrito), los pasos añadidos por el usuario con su selector de transformación, su salida y su botón de copiar, la afordancia de **añadir paso** con la paleta agrupada del catálogo de §6.6 (json / binario / hash / firma), la barra de resultado final copiable y el aviso de seguridad. Todo el cálculo ocurre **en el navegador**: componer no dispara ni una petición (§5.3, §11). | No |

> **Nota de ruteo (v1.2, 2026-07-22).** `/analyze` y `/compose` son **la misma pantalla en dos modos**, no dos pantallas: comparten cabecera, layout y marco, y un conmutador segmentado arriba alterna decodificar ⇄ codificar **cambiando la URL sin recargar**. `/analyze` es exactamente la experiencia de hoy, sin un cambio de comportamiento más allá de la aparición del conmutador; entrar directo a `/compose` da una pantalla limpia y funcional. Ambas son públicas: componer funciona entero sin cuenta (D6), que solo añade el registro de la receta.
>
> _(Precisión de la tabla, misma fecha: desde F5 `/` es la **landing** y la pantalla de trabajo se sirve en `/analyze` — la fila `/` de arriba describe esa pantalla de trabajo, que ya no vive en la raíz. Se anota aquí para no reescribir la historia del documento.)_
>
> **Compartir una receta (v1.3, 2026-07-23 — D11, O9).** `/compose` gana una afordancia de **compartir**: genera un enlace `/compose?r=<receta>` con los pasos actuales (nunca el fuente ni el secreto) y lo copia al portapapeles, con el patrón del `CopyButton` ya existente. Al abrir un enlace con `?r=`, la pantalla **precarga los pasos** —validados contra el catálogo de §6.6; un `?r=` inválido o con un id desconocido **se ignora** y da una pantalla limpia y funcional, no un error— y muestra un aviso de que es una receta compartida en la que el usuario aporta su propio valor: el campo fuente y el secreto arrancan **vacíos**. El servidor genera una **imagen OG dinámica** a partir de la receta (extendiendo la og:image de F5) para que el enlace tenga preview rico al pegarlo en Slack o en un PR. **No hay endpoint nuevo ni nada que se persista**: el enlace es autocontenido; lo único que el servidor hace con la receta es leerla para dibujar el preview.

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
| `analyze` | Route handler que valida la entrada (I7), invoca el motor de `core` con `now` explícito y devuelve la `Chain`. Si hay sesión, registra la entrada de historial (D7). Acepta desvíos de O4/O5 (ratificado en T1.6): `overrides?` reencamina pasos concretos del REPLAY del motor (`analyze(input, { now, overrides })`) para recalcular la cadena desde un paso dejando los previos intactos — un mecanismo único, replay-con-overrides desde el inicio (no recorte en cliente), así I2/I3/I5 se conservan. Cada override lleva índice + `transform` (id de O4) o `kind` (alternativa de O5; `kind:'text'` ⇒ terminal); nunca el input, así que §11 se mantiene. Acotado a 8 (I2). | `POST { input: string, overrides?: {step, transform\|kind}[] }` → `Chain` |
| `auth` | Signup, login, logout. Hash de contraseña con scrypt, sesión en cookie httpOnly + tabla `session`. Rate limit por IP en login. | `POST /api/auth/{signup,login,logout}` |
| `history` | Listar (paginado, máx 50), borrar una entrada, borrar todas. Solo del usuario de la sesión. **Desde v1.2 (D10) acepta además CREAR una entrada de receta**: `POST /api/history` recibe **exclusivamente** la receta de una composición —`steps: [{ transform_id, kind }]`, máx. 8, con los ids validados **contra el catálogo del motor** (§6.6), no contra una lista suelta— y **nada más**. **Zod estricto**: un cuerpo con cualquier campo que no sea receta (`source`, `output`, `secret`, `preview`…) se **rechaza con 400**; no se «ignoran extras» en silencio, porque un cliente que mande de más debe fallar ruidosamente y no colar dato del usuario por la puerta de atrás. Sesión obligatoria; sin sesión no se registra nada (D6). Es el **único** endpoint que existe para la dirección inversa: no hay `POST /api/compose` (§5.3). | `GET/POST/DELETE /api/history` |
| `health` | `{ ok, db }`. Público. | `GET /api/health` |

**Redacción (D7)**: la vista previa se calcula en el servidor antes de persistir, y siempre en el orden **redactar primero, truncar a 120 caracteres después** (al revés, un truncado «afortunado» dejaría pasar medio payload). El input crudo no se escribe en la BD **ni en los logs** (§11). La redacción tiene **dos capas**:

1. **Por kind detectado** (regla fijada en T2.4): `jwt` → solo el header, payload y firma a `…`; `json` → estructura y claves, todo valor a `…`; `base64` → ni un carácter del contenido, solo su longitud; `url` → `esquema://host` y `/…` si había path, query o fragment; `text` que empieza por `{`, `[` o `"` → `…` entero. `hash`, `uuid` y `unix_timestamp` se conservan **verbatim a propósito**: son opacos o son justo el dato útil de ver.
2. **Barrido defensivo de JWT, independiente del kind** (T4.1): el resultado de la capa 1 se barre buscando subcadenas con forma de JWT **en cualquier posición**, y de aquellas en las que **algún** segmento decodifica a un JSON con `alg` se conserva ese segmento (el header) y se elide **todo lo que va detrás**. Cubre el JWT no asegurado (`alg:none`, firma vacía), el JWT con un prefijo pegado por punto (`v2.local.<JWT>`), el JWT con padding `=` y —la forma más frecuente— el JWT transportado como **`clave=valor`**: cookie (`access_token=<JWT>`), parámetro de URL (`?id_token=<JWT>`) y cuerpo de formulario. En ese caso lo que decodifica es lo que hay **tras el último `=`** dentro del segmento, y el nombre del parámetro se conserva (no es dato, y hace la entrada reconocible). Así la protección **deja de depender de que el detector acierte con el kind**.

> **Por qué existe la capa 2 (T4.1, 2026-07-20).** La regla original de este párrafo decía «para el resto, conservar los primeros 120 caracteres», y eso **contradecía a D7** («nunca el payload completo») y al criterio 14.8: pegar una petición HTTP entera cae en kind `text` en cuanto una cabecera trae un punto (`Host: api.example.com`), y el payload del JWT acababa **en claro en la BD**. Manda D7, que es la promesa al usuario, y la regla se corrigió para describir la redacción defensiva.
>
> **Lo que esta regla NO promete** (residuales declarados, no descuidos): el barrido es una **red ancha, no un absoluto**. Un token **opaco** sin forma de JWT —64 hex, `sk-live-…`— se guarda entero si el detector lo llama `hash`; un secreto usado como **clave** de JSON sobrevive; y algo con forma de JWT en el que **ningún** segmento decodifique a un JSON con `alg` (`foo.<b64 de un secreto>.bar`) no se redacta — redactar por forma sola borraría todo nombre de host, porque `api.example.com` **son** tres segmentos base64url. El detalle y la asimetría asumida viven junto al código, en `packages/core/src/history/redact.ts`.

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
├─ direction    text not null default 'decode'  -- 'decode' | 'compose'  (v1.2, D10)
├─ created_at   timestamptz default now()
idx: (user_id, created_at desc)  -- sirve la query del historial
```

- `email` es `citext` o se normaliza a minúsculas en la aplicación antes de insertar; el índice único debe ser insensible a mayúsculas. Decidir en la tarea de auth y anotarlo.
  - **DECIDIDO (T0.3)**: normalización en la aplicación (`trim` + `lowercase` en el repo, escritura y búsqueda) **+ índice único FUNCIONAL sobre `lower(email)`** en la BD; **sin la extensión `citext`**. El índice funcional da la garantía case-insensitive a nivel de BD de forma incondicional (aunque una escritura evitara la normalización, dos emails que difieren solo en capitalización chocan con 23505), satisfaciendo literalmente «el índice único debe ser insensible a mayúsculas» sin depender de una extensión. `createUser` es un INSERT directo (sin `SELECT` de existencia previo): el rechazo lo emite la constraint, de modo que el control negativo prueba la decisión, no la app.
  - **DECIDIDO (T0.3)**: las **migraciones corren ON-BOOT con lock** (`pg_advisory_lock`, `runMigrations()` en `@app/db`), no como paso de deploy — por consistencia con la infra de prod de T1.8 (`docker-compose.prod.yml` + skill `deploy` ya asumen migraciones-on-boot; el `start_period` del healthcheck da margen al primer boot). **Esta decisión condiciona T3.1** (el cableado al arranque de la web). El runner CLI (`pnpm db:migrate`) queda operativo ya.
- `chain` guarda **solo** el resumen de tipos y transformaciones aplicadas, nunca los valores intermedios (D7).
- **`direction` (nueva en v1.2, 2026-07-22 — D10)**: `'decode'` para lo analizado, `'compose'` para una receta. Va `not null default 'decode'` para que las filas ya existentes queden bien tipadas sin backfill, y la migración se aplica **on-boot con lock**, como decidió T0.3 más arriba (esa política no cambia).
- **Qué se guarda de una receta** (`direction = 'compose'`): en `chain`, los pasos elegidos por el usuario —`[{ transform_id, kind }]`—, que son dato **del motor**, no del usuario. En `preview`, **una etiqueta sintética generada en el SERVIDOR a partir de la receta** (p. ej. «compuesto · 2 pasos»): **ni un solo carácter escrito por el usuario**, porque el fuente, el resultado y el secreto de firma nunca salen del navegador (§5.3, §11) — el servidor no podría guardarlos aunque quisiera. `input_kind` es el kind del **primer paso**, también dato del motor. Es la misma honestidad de D7 un grado más fuerte: «reabrir» una receta restaura **los pasos**, y el dato no se restaura porque nunca se guardó.
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
| `/history`, `/api/history` | Sesión obligatoria. Middleware que protege **solo** estas rutas (D6). `POST /api/history` valida con **Zod estricto**: cualquier campo que no sea receta ⇒ 400 (§8). |
| **Componer (`/compose`)** _(v1.2, D10)_ | **El fuente y el secreto de firma NUNCA salen del navegador: no hay endpoint que los reciba.** No existe `POST /api/compose`; el motor de composición se ejecuta en el cliente (§5.3). Lo único que puede viajar al servidor es la **receta** (los ids de las transformaciones), y solo con sesión y solo si el usuario compone. El secreto de firma, además, no se persiste en `sessionStorage`/`localStorage`/URL/cookies ni entra en el estado que se serializa a la receta. Es una promesa **verificable por el usuario**: durante una composición completa, la pestaña de red del navegador registra **cero peticiones**. |
| **Compartir receta (`/compose?r=…`)** _(v1.3, D11)_ | El enlace lleva **solo la receta** (ids de transformación), validada al leerse contra el catálogo (§6.6) con **Zod estricto**: un `?r=` con cualquier cosa que no sea `{transform_id, kind}` de un id del catálogo **se ignora** (pantalla limpia, nunca un paso no reconocido). **El fuente y el secreto de firma nunca van en la URL** —ni query ni fragmento—, así que §11/R2 quedan intactos: los teclea quien abre el enlace, en su navegador. La receta **no es sensible** (es lo que §9 ya persiste), de modo que aparecer en logs/`Referer` no estrena ningún pasivo. **Nada se aloja**: el enlace es sin estado, no hay endpoint de escritura ni fila nueva; el servidor solo la lee para generar la imagen OG. |
| Contraseñas | scrypt (`node:crypto`), sin dependencia externa. Nunca en logs. |
| Sesiones | Cookie httpOnly, secure, sameSite=lax; expiración en BD, no solo en la cookie. |
| Login | Rate limit por IP (misma salvedad de `CF-Connecting-IP` que `/api/analyze` — §10); respuestas indistinguibles entre "email no existe" y "contraseña mal". |
| Entrada | Toda la entrada validada con Zod en el borde (I7 incluida). |
| Secretos | Solo en `.env` (gitignored) y en el `.env` del VPS. |

**Advertencia de producto que el README debe llevar**: devtools procesa lo que pegas en el servidor. No está pensado para secretos de producción vivos. Es honesto decirlo en vez de dejar que el usuario lo asuma.

**Advertencia de la pantalla de componer** _(v1.2, D10)_: `/compose` lleva un aviso visible, y su contenido es **parte del producto, no decoración** — una promesa de privacidad mal redactada es un defecto. Lo que debe afirmar: **lo que compones no sale de tu navegador**; el fuente y el secreto de firma se usan en la máquina del usuario y no viajan a ningún servidor; con cuenta, lo único que se guarda son los pasos. Lo que **no** puede decir: que el secreto «viaja al servidor solo para firmar» — el artboard del mockup arrastra ese copy de un diseño anterior a D10 y **es falso** para nuestra implementación. El aviso de no usar secretos de producción vivos se mantiene: es buena higiene aunque el cálculo sea local.

## 12. Riesgos y mitigaciones

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | **Detección ambigua molesta.** `hash` vs `text`, `unix_timestamp` vs número suelto: si el motor adivina mal y en silencio, el producto parece tonto. | Alto: es EL valor del producto. | I8 + O5: la alternativa siempre visible y a un clic. Confianzas calibradas con golden files (§6.2). |
| R2 | **El input viaja al servidor.** Un devtools que ve tus tokens. | Alto reputacional en repo público. | D7 (no se persiste crudo), §11 (no se loguea), advertencia explícita en README y en `/`. El motor es isomorfo (§5.3): mover el análisis al cliente es una fase futura viable, no un rediseño. **Parcialmente ejecutado en v1.2 (D10)**: la dirección de **componer** ya corre entera en el navegador y no tiene endpoint. La de analizar sigue en el servidor, con este riesgo intacto. |
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
| **F4 — Post-v1 (v1.1)** | Pegar una petición HTTP entera no deja el payload del JWT en la BD: la redacción del preview deja de depender de que el detector acierte con el tipo (§8, capa 2). |
| **F5 — La landing** | `/` pasa a ser una landing (wordmark, campo, badges, footer, `og:image` para compartir) y la pantalla de análisis se muda a `/analyze`. El input viaja por `sessionStorage`, **nunca por la URL**; el header refleja la sesión. |
| **F6 — Componer** | La dirección inversa (D10, O8): `/compose` abre la misma pantalla de trabajo en modo codificar — escribes un valor, encadenas transformaciones que eliges tú y copias el resultado. **El motor corre en el navegador**: ni el fuente ni el secreto de firma salen de la máquina. Con cuenta, el historial guarda la **receta**, nunca los valores. |
| **F7 — Compartir la receta** | Una composición se comparte con un enlace (`/compose?r=…`) que lleva solo la receta —nunca el fuente ni el secreto—; quien lo abre ve los pasos precargados y mete su propio valor. El servidor genera una **imagen OG** con los pasos para que el enlace tenga preview rico en Slack o un PR. El bucle viral fiel a la privacidad: se comparte la receta, no el dato (D11, O9). |

**Estado (2026-07-23)**: F0–F6 y TD **entregadas y vivas en producción**; **F7 en construcción** (esta versión del PRD, v1.3, es su primera tarea). El estado tarea a tarea es el de `planning.md`, que manda: esta tabla es el mapa, no el marcador.

Cada fase deja el producto más útil que la anterior. F1 es el corte importante: si solo se construyera hasta ahí, seguiría siendo un producto defendible.

_(F4–F6 añadidas en v1.2, 2026-07-22: la tabla se había quedado en F3 mientras el desarrollo iba por F6 — justo la clase de desfase que esta versión del documento existe para borrar.)_

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
| 14.14 | _(v1.2)_ Escrito un valor en `/compose` y encadenados `json.minify` + `jwt.sign`, el navegador muestra los dos pasos con su tipo detectado y el resultado copiable, **sin una sola petición de red** durante la composición (D10, §5.3, §6.6). |
| 14.15 | _(v1.2)_ El JWT compuesto en `/compose`, pegado en `/analyze`, se vuelve a abrir hasta el JSON original: **las dos direcciones son inversas la una de la otra** sobre el sistema real. |
| 14.16 | _(v1.2)_ Con sesión, componer crea una entrada en `/history` cuya fila en `psql` contiene la **receta** y **ni el fuente, ni el resultado, ni el secreto** (D10 + D7). |
| 14.17 | _(v1.3)_ Construida una receta en `/compose`, la afordancia de compartir produce un enlace `/compose?r=…` que, abierto en otra pestaña, **precarga los mismos pasos** con el campo fuente y el secreto **vacíos**; y la URL **no contiene** el fuente ni el secreto (control negativo). |
| 14.18 | _(v1.3)_ La petición de la imagen OG de un enlace `/compose?r=…` (como la haría el crawler de Slack, **sin ejecutar JS**) devuelve una imagen que refleja los pasos de la receta, servida por la **imagen de producción** (no `next dev`). |
| 14.19 | _(v1.3)_ Un `?r=` malformado o con un id fuera del catálogo del motor **se ignora** y da una pantalla de componer limpia y funcional (no un error), y nunca ejecuta un paso no reconocido. |

**Del banco de pruebas (D1)**

| # | Criterio |
|---|---|
| 14.11 | El bucle `dev-loop` cierra la fase F1 completa sin más intervención humana que las paradas previstas por el protocolo (fin de fase, juicio humano explícito, prerequisito ⚠). |
| 14.12 | Toda tarea cerrada tiene su `docs/verifications/<ID>/report.md` con veredicto PASS y evidencia reproducible; ninguna se marcó `[x]` sin él. |
| 14.13 | El coste real por tarea queda registrado en el journal, y ninguna tarea supera su cap (estimado ×3) sin parada explícita. |
