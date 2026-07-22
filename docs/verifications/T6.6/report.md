# Verificación T6.6 — `compose()`, el motor que dirige el usuario

- **Tarea**: T6.6 · `compose()` — el motor que dirige el usuario (`planning.md`)
- **Fecha**: 2026-07-22
- **Ejecutor**: subagente `verifier` (contexto fresco). **Sin agent-browser**: T6.6 es núcleo puro (`packages/core`), sin superficie web. `pnpm test:e2e` **no aplica** (no hay página, componente ni endpoint nuevo; la pantalla `/compose` es T6.7).
- **Sistema**: árbol de trabajo sobre `8b29c41` (T6.5) con el diff **no committeado** de T6.6 (`compose.ts`, `base64.ts`, `contracts.ts`, `detectors.ts`, `transforms.ts`, `encode-transforms.ts`, `index.ts`, `client-only.test.ts`, `redact.ts` + 3 ficheros de test nuevos). Sin docker/`pnpm dev`: el código verificado no toca Postgres ni HTTP. Node 22, vitest 4.1.10.

## Verificación esperada (literal de planning.md)

> **Verificación**: `pnpm test` — el ejemplo del mockup reproducido literalmente: fuente = el JSON de `carlos` → `json.minify` → `jwt.sign` (HS256, secreto de test) produce **exactamente** el `MINIFIED` del artboard y un JWT cuyo header y payload son los del mockup y cuya firma coincide con la de `node:crypto` (control cruzado de T6.5 — **no** con el literal decorativo `SIGNED` del artboard, ver desviaciones de la fase), con kinds detectados `json` y `jwt` (I10); **ida y vuelta contra el otro motor**: para todo el corpus, `analyze(compose(x).output)` vuelve a `x` — el test que solo existe porque ahora hay dos direcciones; un paso imposible (p. ej. `json.minify` sobre `no soy json`) devuelve `{ok:false}` **conservando los pasos previos** (I9, control negativo); una lista de 9 pasos se rechaza en el borde; dos ejecuciones con el mismo `now` dan el mismo resultado byte a byte (I11).

Entrega adicional verificada aquí: la **deuda heredada bloqueante del `Buffer`** (`detectors.ts`, `transforms.ts`) y la ampliación del guard `client-only.test.ts` al **cono real de imports**.

## Evidencia persistida

| Fichero | Qué es |
|---|---|
| `gate.txt` | `pnpm gate` completo (6 pasos) |
| `verify-compose.ts` + `out-compose.txt` | **Mi** script de verificación del motor (literales leídos del artboard, firma calculada con `node:crypto`, corpus de ida y vuelta propio) |
| `verify-buffer-oracle.ts` + `out-buffer-oracle.txt` | Diferencial contra el oráculo **viejo con `Buffer`** (`git show HEAD:`) + contrafactual del BOM |
| `verify-redact-oracle.ts` + `out-redact-oracle.txt` | Diferencial de la redacción de privacidad de F4 sobre detectores nuevos vs viejos |
| `out-control-bytes.txt` | El único caso de mi corpus que no da ida y vuelta, contrastado contra el código viejo |
| `oracle-old/` | Árbol del oráculo: `engine/` con `detectors.ts`/`transforms.ts` de HEAD (con `Buffer`) + `redact.ts` repuntado |

Los scripts **no** son los del implementer: se escribieron aquí, con inputs, secreto y corpus elegidos por el verifier.

## Pasos ejecutados

1. **`pnpm gate` en aislamiento** → verde: lint, typecheck, format:check, knip, readme:status:check y `vitest run` con **68 ficheros / 1077 tests pasando**. Repetido al final con la evidencia ya en el árbol (`docs/` está ignorado por prettier/knip/eslint): sigue verde.
2. **El ejemplo del mockup, reproducido por mí.** Leí `SOURCE`, `MINIFIED` y `SIGNED` directamente de `docs/mockups/assets/variant-compose.js` (no de los tests), decodifiqué el payload del artboard para sacar su `iat` (**1752537600**) y de ahí derivé el `now` a inyectar (`2025-07-15T00:00:00Z`) — es decir, el `NOW`/`IAT` del test **sale del artboard**, no está elegido para cuadrar. Secreto propio: `verifier-hs256-secret-not-a-secret`.
3. **Firma calculada con `node:crypto`** sobre `header.payload` y comparada con el tercer segmento del token. Comprobado además que **no** coincide con el `SIGNED` decorativo, y `grep` de que ningún test asserta contra ese literal.
4. **I9 / I11 / I12 / cap**: paso imposible a mitad de receta, receta vacía, dos ejecuciones con el mismo `now`, 8 y 9 pasos.
5. **Ida y vuelta** con corpus propio de 18 textos (emoji ZWJ, árabe, CJK, saltos CRLF, 300 caracteres, bytes altos Latin-1, reservados de URL, bytes de control) × `base64.encode` y `base64url.encode`.
6. **Auditoría ejecutada de las exclusiones** (`url.encode`, base64url de 1–2 bytes, JSON, hashes).
7. **Oráculo del `Buffer`**: copia del `engine/` con `detectors.ts` y `transforms.ts` de `HEAD` (los que usan `Buffer`) y diff old-vs-new sobre 97 entradas × 8 sondas (`detect`, `detectBase64`, `detectJwt`, `decodeSegmentJson`, `decodeJwtHeader`, `base64.decode`, `jwt.decode`, `analyze`).
8. **Redacción de privacidad (F4)**: suite `redact.test.ts` (52 tests) verde + diferencial de comportamiento `redactInput`/`buildPreview` con detectores nuevos vs viejos.
9. **Mordida del guard**: `Buffer` inyectado como código en un módulo **intermedio** del cono (`hash.ts`, alcanzado solo transitivamente) y, en una segunda pasada, en un **módulo nuevo** importado desde `transforms.ts`. Rojo en ambos casos, restaurado byte-idéntico (sha256 y `git status` verificados).

## Lo que yo calculé (los valores del veredicto)

```
MINIFIED (artboard, byte a byte)
{"sub":"1","name":"carlos","role":"admin"}

TOKEN producido por compose() con MI secreto y el now del artboard
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjUzNzYwMH0.6BOvmZSUPtW0FjYZVFs9gamE33s-EfC6LMt48fpqHtA

firma independiente (node:crypto, HMAC-SHA256 base64url sobre header.payload)
6BOvmZSUPtW0FjYZVFs9gamE33s-EfC6LMt48fpqHtA          <- coincide

literal decorativo del artboard (NO usado como golden por nadie)
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c          <- distinto, como debe ser
```

## Resultado observado vs esperado

| # | Esperado (cláusula) | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | `json.minify` produce **exactamente** el `MINIFIED` del artboard | Idéntico byte a byte al literal leído del artboard | `out-compose.txt` | OK |
| 2 | Header y payload del JWT = los del mockup | `seg[0]`/`seg[1]` idénticos a los del `SIGNED` del artboard; decodifican a `{alg:HS256,typ:JWT}` y `{sub,name,role,iat:1752537600}` | `out-compose.txt` | OK |
| 3 | Firma = la de `node:crypto`, **no** el `SIGNED` decorativo | Coincide con mi HMAC; distinta del literal del artboard; ningún test asserta contra `SflKx…` | `out-compose.txt` | OK |
| 4 | Kinds detectados `json` y `jwt` (I10) | `sourceKind=json`, `steps[0].kind=json`, `steps[1].kind=jwt=outputKind`; `analyze()` detecta el mismo `jwt` | `out-compose.txt` | OK |
| 5 | Ida y vuelta: `analyze(compose(x).output)` vuelve a `x` para todo el corpus | 36/36 combinaciones de **mi** corpus vuelven exactas (emoji ZWJ, árabe, CJK, CRLF, 300 chars, Latin-1 alto). 1 caso no vuelve: texto con **bytes de control no imprimibles** — ver Rarezas | `out-compose.txt` | OK (con nota) |
| 6 | Paso imposible → `{ok:false}` conservando los previos (I9) | `json.minify` tras `base64.encode`: 3 pasos (2 ok + el fallido), 4.º no ejecutado, `output` = salida del último ok, resultado sigue **validando contra `ComposeResultSchema`**; `json.minify` sobre `no soy json` → `ok:false`, `source` intacto | `out-compose.txt` | OK |
| 7 | 9 pasos se rechazan en el borde | 8 pasos ejecutan; 9 lanzan `ZodError` **antes** de tocar el catálogo; `safeCompose` lo devuelve como dato | `out-compose.txt` | OK |
| 8 | Mismo `now` ⇒ mismo resultado byte a byte (I11) | `JSON.stringify` idéntico en dos ejecuciones | `out-compose.txt` | OK |
| 9 | I12: receta vacía ⇒ `output === source` | Idéntico, 0 pasos, `outputKind === sourceKind`; y `analyze()` sobre el mismo input **sí** lo transforma (contraste real) | `out-compose.txt` | OK |
| 10 | Deuda del `Buffer` saldada sin cambiar comportamiento | **776 comparaciones old-vs-new, 0 divergencias** sobre 97 entradas (base64 estándar/url, padding raro `Q`/`QQ=`/`====`/`QU=JD`, fuera de alfabeto, UTF-8 inválido, BOM, JWTs deformes, 1000 chars) | `out-buffer-oracle.txt` | OK |
| 11 | El BOM: `{ignoreBOM:true}` es lo que sostiene la equivalencia | Contrafactual: `Buffer`→U+FEFF conservado (`JSON.parse` **falla**); `TextDecoder` por defecto→BOM **comido** (`JSON.parse` **pasa**, cambio de detección); `{ignoreBOM:true}`→igual que `Buffer` | `out-buffer-oracle.txt` | OK |
| 12 | La redacción de privacidad de F4 da el mismo veredicto | `redact.test.ts` 52/52 verde + 36 comparaciones `redactInput`/`buildPreview` con detectores viejos vs nuevos: **0 divergencias** (incluidos header con BOM y segmento con UTF-8 inválido) | `out-redact-oracle.txt` | OK |
| 13 | El guard del cono **muerde de verdad** | `Buffer` en `hash.ts` (intermedio, 2 saltos desde la raíz) → rojo. `Buffer` en un módulo **nuevo** importado por `transforms.ts` → rojo: el cono lo descubre solo (30 tests en vez de 27). Restaurado byte-idéntico (sha256 igual, `git status` limpio) | abajo | OK |
| 14 | `pnpm gate` verde | 6 pasos verdes, 1077 tests | `gate.txt` | OK |

### Mordida del guard (salida literal)

```
× hash.ts no contiene `Buffer` (no existe en el navegador)
AssertionError: hash.ts contiene /\bBuffer\b/: expected true to be false
      Tests  1 failed | 26 passed (27)

× verifier-probe.ts no contiene `Buffer` (no existe en el navegador)
AssertionError: verifier-probe.ts contiene /\bBuffer\b/: expected true to be false
      Tests  1 failed | 29 passed (30)

# tras restaurar
3bdef7e594dbba4ff32384940ea37c5b32f60a9ccaa87efa5ae4e1a868704234  packages/core/src/engine/hash.ts
f0fc616464cab68ab20b56e082f972cd8daaf9160b8e8e7c4eff8fd1f3fc261e  packages/core/src/engine/transforms.ts
 Test Files  1 passed (1)   Tests  27 passed (27)
```

**¿El guard afirma más de lo que comprueba?** No. Su cabecera declara por escrito los tres huecos reales (solo imports estáticos y relativos, no entra en paquetes externos, detección por texto y no por semántica) y sus asserts se corresponden con lo que hace: el cono se **calcula** (mis dos mordidas lo prueban, incluida la de un módulo que no existía), y `EXPECTED_IN_CONE` impide el fallo silencioso del cono vacío. Comprobé además a mano, sin el test, que los 7 módulos del cono no contienen `Buffer`, `node:`, `process.`, `crypto.subtle`, `require(` ni `import(`.

### Auditoría de las exclusiones de la ida y vuelta (ejecutadas, no leídas)

| Exclusión | Ejecutada | Veredicto |
|---|---|---|
| `url.encode` | `url.encode('Hola, mundo')` → `Hola%2C%20mundo`, kind detectado **`text`**; `analyze()` lo deja intacto. Con una URL real (`https://a.b/c?d=1%20x`) `detectUrl` sí da `url` (0.9) | **Legítima**. El límite está en §6.2 (`detectUrl` exige esquema http/https), no en `compose()`. Aceptarlo exigiría que cualquier texto percent-encoded fuera `url`, degradando la detección de F1 |
| base64url de 1–2 bytes | `base64url.encode('a')`→`YQ` y `('ab')`→`YWI`; `analyze()` los deja como `text` | **Legítima**. Es el guard `length < 4` de §6.2/§6.3, intacto desde F1. Relajarlo haría que `QQ` se detectara como base64 |
| JSON | `{"a":1}` → base64 → `analyze()` devuelve `{\n  "a": 1\n}` | **Legítima**. `analyze()` se auto-conduce y encadena `json.format`: la desigualdad es *formato*, no pérdida |
| Hashes | `hash.sha256('hola')` → kind `hash` | **Legítima** por definición (función de un solo sentido) |

## Coste real

**$0** — D8: el proyecto no usa APIs de pago y esta verificación no llamó a ninguna (todo local: vitest, tsx, `node:crypto`). Estimado del planning: $0. Coste de agentes: no instrumentado en este repo (no hay ledger de gasto).

## Veredicto

**PASS** — las cinco cláusulas de la Verificación se cumplen con instrumentos propios del verifier, y la deuda del `Buffer` está saldada sin un solo cambio de comportamiento observable (776 + 36 comparaciones contra el código viejo, 0 divergencias), con el guard del cono demostrado mordiendo sobre ficheros reales.

### Rarezas (aunque el veredicto sea PASS)

1. **Una clase de exclusión de la ida y vuelta que el implementer no documentó**: un texto que contiene **bytes de control no imprimibles** (`\x00`, `\x01`, `\x7f`) es suelo de la cadena, pero su base64 **no** vuelve — `detectBase64` exige por R4 (§6.2) que lo decodificado sea texto imprimible o JSON, así que la cadena se queda en `text`. Contrastado contra el código de HEAD (`out-control-bytes.txt`): **el comportamiento es idéntico al de antes de T6.6**, es política de F1 y no una regresión de esta tarea. Lo que falta es la línea `(e)` en la lista de exclusiones de `compose.test.ts`, que hoy dice «para todo el corpus» con cuatro exclusiones cuando en rigor son cinco. Deuda de documentación menor.
2. `compose()` tiene **dos canales de fallo** (lanza `ZodError` si la receta no valida; `terminal:'error'` si un paso falla). Está documentado en el módulo y `safeCompose` existe justo para eso, pero T6.7 y T6.10 deben usar `safeCompose`. Verificado que `safeCompose` no lanza en ninguno de los 5 bordes que probé.
3. El guard del cono no ve **paquetes externos** (`zod`) ni imports dinámicos. Está escrito en su cabecera; lo repito porque es el hueco que un futuro `await import()` en `packages/core` reabriría en silencio.
