# T6.5 — Hashes puros y `jwt.sign` (HS256) · VERIFICACIÓN

- **Veredicto**: **PASS**
- **Fecha**: 2026-07-22
- **Sistema**: `packages/core` sobre el árbol de trabajo, HEAD `9bfbe09` + el diff de T6.5 sin
  commitear (`hash.ts` y `hash.test.ts` nuevos; `encode-transforms.{ts,test.ts}`, `contracts.ts`,
  `index.ts`, `client-only.test.ts`, `redact.test.ts` modificados). No hay superficie UI ni
  servicios: la Verificación de T6.5 es literalmente `pnpm test` sobre el motor, así que la
  superficie verificada es **el motor real importado desde su código fuente** (`cua.md` paso 0,
  rama «solo backend»). Nada se verificó contra mocks.
- **Coste real**: **$0** (estimado $0). Ninguna API de pago.

## Resultado por cláusula de la Verificación

| # | Cláusula (literal) | Esperado | Observado | OK |
|---|---|---|---|---|
| 1 | «los tres vectores conocidos de SHA-256 y de MD5 pasan **exactamente**» | Vectores publicados bien transcritos | **26 vectores recalculados por el verifier con `node:crypto` a partir del input: 0 discrepancias.** SHA-256 5/5 (vacía, `abc` B.1, 448 bits B.2, 896 bits, el millón de `a`), MD5 7/7 (suite entera de RFC 1321 §A.5), + 7 repetidos por el camino de producción en `encode-transforms.test.ts` | OK |
| 2 | «el HMAC coincide con los vectores de la RFC 4231» | Casos 1–7 | **7/7 recalculados y coincidentes**, incluido el 5 (comparado sobre el prefijo de 32 hex, que es lo que la RFC publica: salida truncada a 128 bits) y los 6/7 de clave de 131 bytes, los que separan una HMAC correcta de una que se salta el «hash the key first» | OK |
| 3 | JWT con `test-signing-secret-not-a-secret` **byte-idéntico** al de `node:crypto` | Tokens iguales | **Iguales** (ver §2). El oráculo lo construyó el verifier de punta a punta: header + claims + `iat` calculado por mí + base64url + HMAC; no re-firma el signing input del motor | OK |
| 4 | «`jwt.decode` de §6.3 lo vuelve a abrir (ida y vuelta sobre el motor real)» | Payload recuperado | `{"header":{"alg":"HS256","typ":"JWT"},"payload":{"sub":"1","name":"carlos","role":"admin","iat":1752537600},"signature":"R5tywynsx8i88VpEuavZMGbmuKq0OKwDrsjWTkl3ubc"}`. Además el detector de §6.2 lo clasifica `jwt:0.95` (I10) | OK |
| 5 | «mismo `now` ⇒ mismo token dos veces (I5)» | Idénticos | Idénticos con dos catálogos construidos por separado; con otro `now`, otro `iat` y otro token (el reloj se inyecta de verdad) | OK |
| 6 | «ninguna función nueva referencia `Date.now()`, `node:crypto` ni `crypto.subtle` (control negativo por grep)» | 0 coincidencias **y el guard muerde** | 0 coincidencias en los 3 ficheros de producción (también `Buffer` y `new Date()`); las **tres inyecciones aisladas ponen el guard ROJO**, cada una nombrando su patrón | OK |
| + | I1 — ningún `apply` lanza, tampoco con `options` | Ninguna excepción | **3.120 llamadas hostiles** (2.160 a `jwt.sign` + 960 al catálogo entero): **0 excepciones, 0 resultados malformados** | OK |
| + | Canario del secreto (§11) | El secreto no sale por ningún campo | Ausente literal, por prefijo, y en base64url/base64/hex; también en el error posterior. Con control positivo del canal | OK |
| + | `pnpm gate` verde en aislamiento | Verde | **66 ficheros de test, 939 tests, exit 0** (dos pasadas: `01-gate.txt` y `07-gate-final.txt`) | OK |

## 1. Los vectores son de verdad (`02-vectors.txt`, script `vectors-recheck.mjs`)

El riesgo que esta cláusula cubre es que un vector mal transcrito convierta el test en una
tautología. Mi script copia del fichero de test los pares **(input, esperado)** y **recalcula el
esperado con `node:crypto` a partir del input**; además comprueba que cada literal aparece de
verdad en el fichero de test, para que no se pueda «verificar» un vector que el test no usa.

    RESUMEN: 26 vectores comprobados, 0 discrepancias.

Desglose: 5 SHA-256 + 7 MD5 + 7 HMAC-SHA256 en `hash.test.ts`; 3 SHA-256 + 4 MD5 en
`encode-transforms.test.ts`. **Ninguno cuadró mal.**

## 2. Control cruzado del JWT (`03-engine-probe.txt`, script `engine-probe.ts`)

Payload del PRD §6.6, secreto `test-signing-secret-not-a-secret`, `now = 2025-07-15T00:00:00Z`.
El `iat` lo calculó el verifier (`Date.parse(...) / 1000` = `1752537600`), no se copió del PRD.

    TOKEN node:crypto    = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjUzNzYwMH0.R5tywynsx8i88VpEuavZMGbmuKq0OKwDrsjWTkl3ubc
    TOKEN motor devtools = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjUzNzYwMH0.R5tywynsx8i88VpEuavZMGbmuKq0OKwDrsjWTkl3ubc
    → byte-idénticos

Segundo segmento decodificado: `{"sub":"1","name":"carlos","role":"admin","iat":1752537600}`.
Controles de que el cross-check muerde: con otro secreto el token cambia; con otro `now` cambian
`iat` y token.

## 3. I1 con `options` (el hueco que se acababa de cerrar)

Mi corpus ataca `jwt.sign` **siempre con `options` presentes** — que es justo lo que la primera
guarda de `applyJwtSign` impedía ejercitar cuando el corpus iba sin ellas. Producto cartesiano de
10 payloads × 12 `alg` × 6 secretos × 3 `now` = **2.160 llamadas**. Los `alg` incluyen `BigInt`,
símbolo, función, objeto circular, objeto con `toJSON` que lanza y un `Proxy` que lanza al leer
cualquier propiedad; los secretos incluyen un objeto cuyo `toString` lanza; los `now` incluyen una
`Date` inválida y una fuera de rango.

    2.160 llamadas a jwt.sign con options hostiles → 0 excepciones, 0 TransformResult malformados
    960 llamadas al catálogo entero (las 8) con options hostiles → 0 excepciones

## 4. Control negativo del grep (`04-grep-negcontrol.txt`, `06-grep-directo.txt`)

Las tres inyecciones se hicieron **una a una** y **como código ejecutable** (no en comentario: el
guard pasa por `stripComments`, así que una violación comentada NO debe morder — y `hash.ts` está
lleno de prosa que menciona `node:crypto` y `crypto.subtle`).

| Inyección en `hash.ts` | Guard | Resultado |
|---|---|---|
| — (baseline) | ambos | 17 tests verdes |
| `const __probe1 = Date.now();` | `no-clock.test.ts` | **ROJO**: `hash.ts contiene Date.now(: expected true to be false` |
| `import { createHash } from 'node:crypto';` | `client-only.test.ts` | **ROJO**: `hash.ts contiene /\bnode:[a-z]/` |
| `const __probe3 = crypto.subtle;` | `client-only.test.ts` | **ROJO**: `hash.ts contiene /crypto\s*\.\s*subtle\|webcrypto/` |

Nota de cobertura: `Date.now()` **no** está en el array `FORBIDDEN` de `client-only.test.ts`; quien
lo cubre es `no-clock.test.ts`, que escanea con `readdirSync` **todos** los `*.ts` de producción de
`engine/` y por tanto recogió `hash.ts` automáticamente. Comprobado empíricamente, no por lectura.

Restauración: `sha256(hash.ts)` = `3bdef7e594dbba4ff32384940ea37c5b32f60a9ccaa87efa5ae4e1a868704234`
antes y después de cada una de las tres inyecciones. `hash.ts` es **untracked**, así que la prueba
de identidad byte a byte es el checksum, no `git diff`; `git status` confirma que no quedó ninguna
modificación colateral.

Grep directo del verifier sobre los 3 ficheros de producción (tras quitar comentarios):
`Date.now(`, `new Date()`, `node:`, `crypto.subtle`, `webcrypto` y `Buffer` → **0 coincidencias en
todos**.

## 5. Canario del secreto (§11)

Canario del verifier: `VERIFIER-CANARIO-T65-9c4e1f` (distinto del que usa el test del implementer,
a propósito).

    TransformResult completo = {"ok":true,"output":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjUzNzYwMH0.rWCMi2MXIIf-7J-CDN_v4hMTIALjLunKebWiojaVLyk","notes":["iat: 1752537600 (añadido a partir del instante inyectado)"]}

Ausente literal, por prefijo de 10 chars, y codificado en base64url / base64 / hex. También ausente
del `{ok:false,error:…}` del camino de fallo posterior a leer el secreto. **Control positivo**: el
canal lleva 253 chars de datos reales y el mismo grep SÍ detecta el canario cuando se inyecta a
mano en un resultado de mentira.

## 6. LA TRAMPA: ¿se debilitó `redact.test.ts`? (`05-redact-negcontrol.txt`)

**Dictamen: el cambio ENDURECE el test donde el test detecta, y solo afloja donde el test nunca
detectó nada. NO es un test debilitado.** Las tres comprobaciones:

### (a) `redact.ts` (lógica de privacidad de F4) no se tocó

`packages/core/src/history/redact.ts` **no aparece en el diff de la tarea**; solo está
`redact.test.ts`. Reconfirmado con `git diff` vacío tras mi propio experimento.

### (b) La medida muerde: control negativo reproducido por el verifier

Desactivada la cota (`const MIN_JWT_HEADER_CHARS = 12;` → `= 0;`), el test se puso **ROJO**:

    × procesa 128 KB de «segmentos de 1 char» dentro de su presupuesto de CPU  1011ms
    AssertionError: expected 1032.367 to be less than 200
    Test Files  1 failed (1) · Tests  1 failed | 51 passed (52)

Restaurado con `git checkout` → `git diff packages/core/src/history/redact.ts` **vacío**
(byte-idéntico) y el test vuelve a verde (52/52).

### (c) La aritmética de los presupuestos, medida por mí (los 5 casos, ambas columnas)

| caso | CPU actual | CPU sin la cota | presupuesto nuevo | ¿detecta la regresión? |
|---|---|---|---|---|
| `'a'` (sin puntos) | 2,0 ms | 1,0 ms | 200 ms | no la toca |
| `'='` (padding) | 1,2 ms | 0,4 ms | 200 ms | no la toca |
| `'.'` (solo puntos) | 13,0 ms | 8,9 ms | 200 ms | no la toca |
| **`'a.'` (segmentos de 1)** | **13,6 ms** | **1.032–1.167 ms** | **200 ms** | **SÍ — es LA que caza** |
| `'aaaaaaaaaaaa.'` (12) | 194,3 ms | 187,5 ms | 1.500 ms | **no puede**: la versión rota es *más rápida* |

Punto por punto sobre lo que afirmaba el implementer:

- **El caso que detecta se hizo MÁS ESTRICTO.** `'a.'` pasa de 500 ms a 200 ms de presupuesto. Con
  la cota puesta gasta 13,6 ms (margen ×14,7: se acabó el flake); sin la cota gasta ~1.032 ms, es
  decir **×5,2 por encima de su presupuesto**. Detecta con más margen que antes (con 500 ms el
  margen de detección era ×2,1).
- **La afirmación de que un presupuesto único de 1.500 ms habría dejado de cazar la regresión es
  CIERTA**: 1.032 ms < 1.500 ms → verde con el bug delante. Confirmado con mis propias medidas.
- **La única «relajación» (500 → 1.500 ms) recae sobre `'aaaaaaaaaaaa.'`, que no detecta nada**: su
  trabajo es real y lineal (~10.000 segmentos que sí hay que mirar) y con la cota desactivada es
  incluso **más rápido** (187,5 vs 194,3 ms). Un presupuesto sobre ese caso no puede cazar la
  regresión de la cota ni con 500 ni con 1.500 ms; lo único que hacía con 500 ms era flakear
  (×2,06 de margen). Ahora tiene ×7,7. Se cambia ruido por señal, no señal por ruido.
- **El cambio de instrumento (reloj de pared → CPU) es la causa raíz correcta.** El coste que se
  acota es de CPU (`Buffer.from` + `JSON.parse` en bucle); el reloj de pared incluía tiempo en el
  que el proceso ni siquiera corría, que es el ruido que disparó el flake tres veces. La versión
  rota quema su tiempo **en CPU**, así que el cambio de métrica no le regala margen.
- **Se añadió un control positivo del canal que antes no existía**: un `it` que comprueba que
  `cpuMillisOf` registra un bucle costoso (>0 ms). Sin él, una medida muerta habría hecho pasar los
  cinco asserts en vacío. Eso es endurecer, no debilitar.
- La regresión cuadrática original (~27.000 ms) revienta cualquiera de los cinco presupuestos.

Comparación honesta de métricas: reloj de pared y CPU no son directamente comparables, así que el
juicio se hace **dentro de la métrica de CPU**: el presupuesto del caso detector (200 ms) queda
encajado entre 13,6 ms de coste legítimo (×15 por debajo) y 1.032 ms de coste roto (×5 por encima).
Ventana ancha por los dos lados: ni flakea ni deja pasar la regresión.

## Rarezas anotadas (no bloquean)

1. **El guard `client-only.test.ts` sigue siendo por FICHERO, no por cono de imports.** Ya está
   documentado en su cabecera y `planning.md` lo asigna a T6.6 como deuda bloqueante:
   `encode-transforms.ts` importa `applyJsonMinify` de `transforms.ts`, que usa `Buffer`. No es un
   fallo de T6.5 (su alcance es el fichero nuevo), pero el verde de este guard **no** prueba que el
   cono de composición sea client-safe.
2. **`JSON.parse` → `JSON.stringify` no es la identidad sobre el payload** (enteros > 2^53 pierden
   precisión, claves duplicadas colapsan, claves numéricas se reordenan). Está documentado íntegro
   junto a `applyJwtSign` y es coherente con `json.minify` de §6.3, así que no se corrige aquí.
   Anotado, no escondido — pero es un comportamiento que la UI de T6.7/T6.8 debería poder explicar
   si alguna vez se re-firma un token existente.
3. **El `EXIT=` de `01-gate.txt` salió vacío** por cómo zsh expande `PIPESTATUS` en ese contexto; el
   código de salida real (0) consta en la notificación del proceso y se reconfirma en
   `07-gate-final.txt`, corrido sin tuberías.

## Evidencia persistida

| Fichero | Qué contiene |
|---|---|
| `01-gate.txt` | `pnpm gate` completo, primera pasada (66 ficheros, 939 tests) |
| `02-vectors.txt` | Salida del recálculo de los 26 vectores publicados |
| `vectors-recheck.mjs` | Script del verifier que recalcula los vectores con `node:crypto` |
| `03-engine-probe.txt` | Control cruzado del JWT, ida y vuelta, I5, corpus hostil con `options`, canario |
| `engine-probe.ts` | Sonda del verifier contra el motor real |
| `04-grep-negcontrol.txt` | Las tres inyecciones aisladas en `hash.ts` y sus rojos |
| `05-redact-negcontrol.txt` | CPU de los 5 casos con y sin la cota + el rojo del test + restauración |
| `redact-cpu-probe.ts` | Script de medida de CPU del verifier |
| `06-grep-directo.txt` | Grep del verifier sobre los 3 ficheros de producción |
| `07-gate-final.txt` | `pnpm gate` final, en aislamiento, con todo restaurado |
