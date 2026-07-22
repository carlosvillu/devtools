# Verificación T6.4 — Transformaciones de codificación sin secreto (`packages/core`)

- **Tarea**: T6.4 · Transformaciones de codificación sin secreto (`packages/core`) (`planning.md`)
- **Fecha**: 2026-07-22
- **Ejecutor**: subagente `verifier` (contexto fresco) · sin agent-browser (tarea sin superficie web, ver «Superficie»)
- **Sistema**: HEAD `ac21618` + el diff de T6.4 en el árbol de trabajo (`contracts.ts`, `index.ts`, `transforms.ts` modificados; `encode-transforms.ts`, `encode-transforms.test.ts`, `client-only.test.ts` nuevos). No hay docker compose ni `pnpm dev`: el código verificado es lógica pura de `packages/core`, se ejerce importando los módulos **reales** del árbol (nunca mocks).
- **Superficie** (cua.md paso 0): **solo backend/librería**. La Verificación dice literalmente «`pnpm test`» y «el grep sobre el módulo nuevo»: no menciona navegador, página ni click. `pnpm test:e2e` **NO APLICA** (T6.4 no toca `apps/web`; queda trazado aquí a propósito).

## Verificación esperada (literal de planning.md)

> **Verificación**: `pnpm test` — cada transformación sobre entradas válidas produce la salida esperada (incluidos **no-ASCII y emoji**, que es donde `btoa` se rompe) y sobre entradas rotas devuelve `{ok:false}` **sin lanzar** (control negativo que envuelve cada `apply` en try/catch); **ida y vuelta**: `base64.encode` → `base64.decode` (la de §6.3) devuelve el original byte a byte para todo el corpus, y lo mismo `url.encode`/`url.decode`; el grep de `node:`/`crypto.subtle`/`Buffer` sobre el módulo nuevo **no devuelve nada** (control negativo del requisito de cliente: se rompe a propósito y el test muerde).

## Pasos ejecutados

1. **Gate completo del proyecto**, corrido por el verifier y en solitario (sin otro vitest concurrente, por el flake conocido de `redact.test.ts`): `pnpm gate` → **verde**, 65 ficheros / 799 tests. Evidencia: `gate.txt`.
2. **Auditoría del corpus del implementer** (lectura, no ejecución ciega) de `encode-transforms.test.ts` y `client-only.test.ts`: se comprueba qué assertan de verdad y qué NO.
3. **Referencia externa independiente**: script de un solo uso escrito por el verifier, **fuera del árbol del proyecto**, que importa las funciones **reales** de `packages/core/src/engine/index.ts` y las contrasta contra `Buffer.toString('base64'|'base64url')` y contra un percent-encoder propio construido sobre bytes UTF-8 de `Buffer`. Inputs elegidos **por el verifier**, no reutilizados del implementer: longitudes de **0 a 8 bytes**, acentos, CJK, emoji (incl. secuencia ZWJ), bytes altos Latin-1, y una entrada de ~600.000 unidades de código. Salida: `verifier-reference-check.txt`.
4. **Totalidad**: corpus adversarial **propio** (21 entradas) × las 5 transformaciones, cada `apply` envuelto en `try/catch` por el verifier.
5. **Ida y vuelta** contra las transformaciones **reales de §6.3** (`buildTransformIndex` → `base64.decode`, `url.decode`), no contra una reimplementación del test.
6. **Control negativo del guard de cliente**: inyección de código Node **real** (no comentado) en `encode-transforms.ts`, comprobación de que el test se pone **rojo**, restauración y verificación por `md5sum` de que el fichero queda **byte-idéntico**. Salida literal: `guard-negative-control.txt`.

## Resultado observado vs esperado

| # | Esperado (cláusula literal) | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | `pnpm test` verde | `pnpm gate` completo verde: lint + typecheck + format + knip + readme:status + **799 tests / 65 ficheros** | `gate.txt` | ✅ |
| 2 | Cada transformación produce la salida esperada (no-ASCII y emoji) | **302 comparaciones contra referencia externa, 0 desajustes.** `base64.encode`/`base64url.encode` coinciden con `Buffer` en las longitudes de 0 a 8 bytes y en todo el corpus no-ASCII; `url.encode` coincide con el percent-encoder independiente; `json.stringify` cierra `JSON.parse(salida) === entrada` | `verifier-reference-check.txt` §1–1c | ✅ |
| 3 | Entradas rotas → `{ok:false}` **sin lanzar**, con `try/catch` por `apply` | 21 entradas adversariales × 5 transformaciones = **105 llamadas, 0 excepciones**, todas devuelven un `TransformResult` bien formado. `json.minify` → `{ok:false}` en 19 de 21; `url.encode` → `{ok:false}` en las 4 con surrogate suelto | `verifier-reference-check.txt` §2 | ✅ |
| 4 | Ida y vuelta `base64.encode → base64.decode` byte a byte, todo el corpus | 30 valores del corpus del verifier, **todos** vuelven idénticos (incl. emoji ZWJ, CJK, `ÿþý`, `\r\n`, ~600 kB) | `verifier-reference-check.txt` §3 | ✅ |
| 5 | Lo mismo para `url.encode`/`url.decode` | 30/30 idénticos | `verifier-reference-check.txt` §3 | ✅ |
| 6 | `base64url.encode → base64.decode` (afirmado por §6.6) | OK para toda entrada de **≥3 bytes**; las de 1–2 bytes las rechaza `base64.decode` por su guard `length < 4`. **Exclusión escrita**, no escondida | `verifier-reference-check.txt` §3 | ✅ |
| 7 | Grep de `node:`/`crypto.subtle`/`Buffer` sobre el módulo nuevo: nada | **Sobre el código, nada** (0 coincidencias de los 3 patrones tras quitar comentarios). Sobre el texto crudo hay 5 líneas, **todas comentarios** que explican por qué NO se usan | `guard-negative-control.txt` | ✅ |
| 8 | «se rompe a propósito y el test muerde» | Inyectado `import { Buffer } from 'node:buffer'` + `Buffer.from(...)` + `crypto.subtle.digest(...)` como **código**: **3 de 5 tests en ROJO** (uno por patrón). Restaurado: md5 idéntico y 5/5 verde | `guard-negative-control.txt` | ✅ |
| 9 | Subtarea: catálogo como dato de `core`, no de presentación | `ENCODE_SPECS` + `encodeCatalogByGroup()` viven en `packages/core/src/engine/encode-transforms.ts`; `apps/web` no se toca en el diff | diff | ✅ |
| 10 | Subtarea: **sin transformación por defecto** (I12) | No existe ningún `DEFAULT_*` para codificación; la única mención de «default» son comentarios que explican que aquí el concepto NO existe. Registro separado de `DEFAULT_TRANSFORM_BY_KIND` | `encode-transforms.ts` | ✅ |
| 11 | Subtarea: reutiliza `json.minify`, no lo duplica | `applyJsonMinify` se extrae y exporta desde `transforms.ts` y se importa; el test lo prueba por **identidad referencial** (`expect(enCodificacion?.apply).toBe(enDecodificacion?.apply)`, línea 130), **no** por igualdad de salidas | `encode-transforms.test.ts:130` | ✅ |

## La referencia externa, con valores

Instrumento: `Buffer.from(s,'utf8').toString('base64'|'base64url')` (independiente del motor, que tiene prohibido `Buffer`). Muestra representativa de las **302** comparaciones (todas coincidieron):

| entrada | bytes | `base64.encode` (motor = ref) | `base64url.encode` (motor = ref) |
|---|---|---|---|
| `""` | 0 | `""` | `""` |
| `"a"` | 1 | `YQ==` | `YQ` |
| `"aa"` | 2 | `YWE=` | `YWE` |
| `"aaa"` | 3 | `YWFh` | `YWFh` |
| `"aaaa"` | 4 | `YWFhYQ==` | `YWFhYQ` |
| `"aaaaa"` | 5 | `YWFhYWE=` | `YWFhYWE` |
| `"aaaaaa"` | 6 | `YWFhYWFh` | `YWFhYWFh` |
| `"aaaaaaa"` | 7 | `YWFhYWFhYQ==` | `YWFhYWFhYQ` |
| `"aaaaaaaa"` | 8 | `YWFhYWFhYWE=` | `YWFhYWFhYWE` |
| `"ñ"` | 2 | `w7E=` | `w7E` |
| `"año"` | 4 | `YcOxbw==` | `YcOxbw` |
| `"🙂"` (emoji) | 4 | `8J+Zgg==` | `8J-Zgg` (`-` donde el estándar da `+`) |
| `"日本語のテキスト"` | 24 | coincide | coincide |
| `"ÿþý"` (Latin-1 alto) | 6 | coincide | coincide |
| `"🙂🎉👩‍👩‍👧‍👦"` (ZWJ) | 33 | coincide | coincide |
| `'ñ🙂'.repeat(1000)` | 6000 | coincide | coincide |

`url.encode` se contrastó contra un percent-encoder escrito por el verifier sobre bytes UTF-8 (`Buffer`), con el conjunto no-reservado de `encodeURIComponent`: **30/30 coincidencias**, incluidas `🙂` → `%F0%9F%99%82`, `año` → `a%C3%B1o` y la entrada de ~600 kB.

Que estas coincidencias existan es la prueba positiva de la cláusula «donde `btoa` se rompe»: `btoa('🙂')` lanza `InvalidCharacterError`, y el motor devuelve el base64 correcto sin `btoa` ni `Buffer`.

## Totalidad: el corpus adversarial del verifier (y juicio sobre el del implementer)

Corpus **propio** (no reutilizado): cadena vacía, NUL solo y entre texto, secuencia ANSI de control, **surrogate alto suelto**, **surrogate bajo suelto**, **par invertido**, surrogate tras un JSON válido, solo espacios/tabs, BOM, JSON truncado, `{"a":NaN}`, 200 niveles de anidamiento, texto plano, **texto ya codificado** (`eyJhIjoxfQ==`), **ya percent-encoded** (`%20%C3%B1%zz`), `%` suelto, **entrada enorme (~600.000 code units)**, emoji ZWJ, `"""`, barra invertida final. Resultado: **0 excepciones**, 105/105 devuelven `TransformResult` válido.

Juicio sobre el corpus del implementer (`encode-transforms.test.ts`): **cubre lo que de verdad rompe** — incluye surrogate suelto (el único input que hace lanzar a `encodeURIComponent`), cadena vacía, bytes de control, percent malformado, texto ya codificado y una entrada larga. No es benigno. Además su assert es doble (no lanza **y** valida contra `TransformResultSchema`), y separa explícitamente las tres transformaciones **totales** de las dos que pueden fallar, en vez de inventarles un error imposible. El corpus del verifier lo extiende (surrogate bajo, par invertido, BOM, anidamiento profundo, 600 kB) y **no encuentra ningún caso nuevo que rompa nada**.

## Ida y vuelta: se usan las transformaciones reales de §6.3

Confirmado: el test del implementer construye el índice de decodificación con `buildTransformIndex(NOW)` (el registro real de `transforms.ts`) y aplica `base64.decode`/`url.decode` desde él — no hay reimplementación local que probaría el test contra sí mismo. El script del verifier hace lo mismo por su cuenta.

**Exclusiones documentadas** (comprobadas, ambas por escrito en el corpus del test, no escondidas):

- **(a) Cadena vacía**: `base64.encode('') === ''` y `base64.decode('')` → `{ok:false,"La entrada es demasiado corta para ser base64."}`. Anotada en el comentario del corpus `ROUND_TRIP`.
- **(b) Entradas de 1–2 bytes en `base64url`**: sin padding producen 2–3 caracteres y `base64.decode` los rechaza por su guard `length < 4` (`YQ`, `YWI`, `w7E`). Está **escrita** en el comentario de `ROUND_TRIP_B64URL` con su motivo, el filtro se calcula por **bytes reales** (`TextEncoder`) y no por `.length`, hay un test que asserta que las excluidas son exactamente `['una letra','dos letras']`, y otro que **fija el comportamiento actual de `base64.decode`**: si T6.6 relaja ese guard, ese test se pone rojo y obliga a revisar la exclusión. El hueco queda **atribuido a T6.6** en el propio comentario.

## Juicio sobre el guard de cliente (`client-only.test.ts`)

**El grep literal, matizado con honestidad**: sobre el texto crudo del módulo nuevo, `grep -E "node:|crypto\.subtle|Buffer"` devuelve **5 líneas, todas comentarios** que documentan por qué esas APIs no se usan. Sobre el **código** (aplicando el mismo `stripComments` que el guard) los tres patrones devuelven **cero**. Se acepta como cumplimiento de la cláusula: el requisito es de ejecución (qué corre en el navegador), la prosa no ejecuta, y la técnica es la **misma que el guard preexistente `no-clock.test.ts`** del proyecto (T1.2), que la propia Verificación cita como modelo. Se anota con sus dos lecturas para que nadie lo lea al revés.

**Control negativo (salida literal, `guard-negative-control.txt`)**: se inyectó en `encode-transforms.ts`, **como código y no como comentario** (que el `stripComments` habría neutralizado, dando un falso verde):

```ts
import { Buffer } from 'node:buffer';
export const _probe = Buffer.from('x').toString('base64');
export const _probe2 = async (d: Uint8Array) => crypto.subtle.digest('SHA-256', d);
```

```
 FAIL  |core:unit| src/engine/client-only.test.ts > ... > encode-transforms.ts no contiene `Buffer` (no existe en el navegador)
AssertionError: encode-transforms.ts contiene /\bBuffer\b/: expected true to be false

 FAIL  |core:unit| src/engine/client-only.test.ts > ... > encode-transforms.ts no contiene Web Crypto (asíncrono y no garantizado, §5.3)
AssertionError: encode-transforms.ts contiene /crypto\s*\.\s*subtle|webcrypto/: expected true to be false

 Test Files  1 failed (1)
      Tests  3 failed | 2 passed (5)
```

(el tercer rojo es el del patrón `node:`; los dos verdes son el «la lista no está vacía» y el «los patrones muerden»). **Restauración verificada**: `md5sum` antes `07fc83423319cdd07dbb5f6af35f9da3`, después `07fc83423319cdd07dbb5f6af35f9da3` (el fichero es *untracked*, así que la comparación byte a byte es por hash; `git diff --stat` del resto del árbol queda idéntico al del diff del implementer), y el guard vuelve a **5/5 verde**.

**¿Es honesta la cabecera «QUÉ NO COMPRUEBA»?** Sí, y se juzga con dureza porque es la clase de test que apaga alarmas. Verificado punto por punto:

- Lo que afirma: que grepea **ficheros, no el grafo de imports**; que `encode-transforms.ts` importa `transforms.ts`, que **usa `Buffer`**; que por tanto está **verde con el cono de composición todavía NO client-safe**; que hoy no revienta porque esos `Buffer` viven **dentro de cuerpos de función**, no en el top level; y que **cerrarlo es trabajo de T6.6**.
- Comprobado por el verifier: los usos son `detectors.ts:122,150,152` y `transforms.ts:130`, **los cuatro dentro de cuerpos de función** — la afirmación es exacta, no una excusa. El `describe` del guard **no promete** cobertura de grafo: su nombre literal es `client-only guard — estos FICHEROS no contienen APIs de Node (D10, §5.3; sin seguir imports, ver T6.6)`, y ningún assert afirma más de lo que hace. La deuda está además **escrita en `planning.md` como bloqueante de T6.6**.
- Veredicto de la cláusula: el test **dice exactamente lo que verifica y nada más** → **no es FAIL**. Queda registrado como limitación conocida con cierre asignado.

## La trampa: `json.stringify` como texto opaco

§6.6 y el planning dicen «envuelve el texto como string JSON escapado». El implementer lo lee como **texto opaco**: `{"a":1}` → `"{\"a\":1}"`, sin parsear ni reformatear. **Juicio: es fiel a §6.6.** «String JSON escapado» describe un *literal de string* JSON (comillas + escapes), que es exactamente `JSON.stringify(texto)`; la lectura alternativa (parsear y reformatear) produciría un *documento* JSON, no un string escapado, y sería un duplicado de `json.format`/`json.minify`, que ya existen en §6.3 y en el mismo catálogo. Además la decisión está **documentada junto al código** (comentario `DECISIÓN (§6.6 …)` sobre `applyJsonStringify`, líneas 84–89) y fijada por tests con el caso explícito «JSON de entrada: se ESCAPA, no se reformatea». **No hay desviación de spec.**

## Coste real

**$0** — D8: el proyecto no llama a ninguna API externa de pago y no existe ledger de gasto. La verificación se ejecutó íntegra en local (gate + 2 corridas puntuales de vitest + un script `tsx`). Estimado del planning: $0. Sin desviación.

## Veredicto

**PASS** — las cinco transformaciones coinciden byte a byte con una referencia externa independiente en las 302 comparaciones del verifier (0–8 bytes, no-ASCII, CJK, emoji y ZWJ, Latin-1 alto, ~600 kB), ninguna lanza sobre un corpus adversarial propio de 21 entradas, las tres parejas de ida y vuelta cierran contra las transformaciones **reales** de §6.3 con sus dos exclusiones **escritas y atribuidas**, el grep del requisito de cliente no devuelve nada sobre el código y el guard **muerde** cuando se rompe a propósito, y `pnpm gate` está verde (799 tests).

**Rarezas / notas (no bloquean el PASS):**

1. **El guard de cliente no sigue el grafo de imports** y el cono real de la composición (`transforms.ts`, `detectors.ts`) todavía usa `Buffer`. No es un defecto de T6.4 porque está **declarado sin adornos** en la cabecera del test y **asignado a T6.6** como deuda bloqueante en `planning.md`. Riesgo residual mientras tanto: alguien puede añadir `Buffer` a un módulo importado y el guard seguirá verde.
2. **`base64url.encode` de 1–2 bytes no lo reabre `base64.decode`** (guard `length < 4`), pese a que §6.6 afirma que la dirección de decodificar reabre lo que esta produce. El desajuste es del §6.3, está fijado por test y atribuido a T6.6; si T6.6 no lo cierra, la afirmación del PRD queda sin cumplir.
3. **`base64.encode` mutila en silencio un surrogate suelto** (`TextEncoder` → U+FFFD) mientras `url.encode` devuelve `{ok:false}`. Asimetría deliberada, documentada y fijada por test; hereda el comportamiento de cada primitiva estándar. Se anota porque en la UI de `/compose` (T6.7) significará que un paso puede «tener éxito» habiendo perdido datos — merece una decisión de producto ahí, no aquí.
4. **`planning.md` aparece modificado en el árbol** (notas nuevas en T6.6 y T6.7 descubiertas durante T6.4). No afecta a la entrada de T6.4 ni a ninguna casilla `[x]`, así que no es auto-evaluación; se deja constancia porque la regla del proyecto es que el implementer no toca `planning.md`.
5. `pnpm test:e2e` **no aplica** (T6.4 no toca `apps/web`); `ds-reviewer` tampoco, por lo mismo.

## Evidencia en este directorio

- `report.md` — este documento.
- `gate.txt` — salida completa de `pnpm gate` (verde, 799 tests).
- `verifier-reference-check.txt` — salida cruda del script del verifier: referencia externa, totalidad y ida y vuelta.
- `verifier-reference-check.ts.txt` — el script del verifier (escrito fuera del árbol, copiado aquí como evidencia; **no** es código de producto ni entra en el gate).
- `guard-negative-control.txt` — baseline verde, inyección, rojo literal, restauración con md5 y verde final.
