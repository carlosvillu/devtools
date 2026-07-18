# Verificación T1.2 — Las 11 transformaciones del motor (packages/core)

- **Veredicto: PASS**
- **Fecha:** 2026-07-18
- **SHA base:** 06a8154f2e3f87f39e2252353659a6e953bef98e (branch main)
- **Superficie:** backend puro (@app/core/engine), sin navegador.
- **Coste real:** $0 (sin APIs de pago; solo ejecución local + npx tsx transitorio).

## Verificación literal (planning.md)
> `pnpm test` — cada transformación sobre entradas válidas produce la salida esperada y sobre
> entradas rotas devuelve `{ok:false}` **sin lanzar** (control negativo: un test que envuelve
> cada `apply` en try/catch y falla si algo lanza); `timestamp.to_relative` con el mismo `now`
> fijado produce el mismo texto en dos ejecuciones (I5); **ninguna función del motor referencia
> `Date.now()`** (control negativo: un lint/test que hace grep sobre `packages/core` y falla si aparece).

## Método
1. git status limpio de mi actividad al empezar y al terminar (transforms.ts sha f9bbc4b3... idéntico
   antes/después de la inyección temporal — ver más abajo).
2. Gate completo (pnpm gate) -> VERDE. Evidencia: gate.txt.
3. Script propio del verifier (verify.mts), independiente de los tests del implementer, importando
   el código REAL por ruta relativa y ejerciendo cada apply. Evidencia: verify.out.txt.
4. Revisión de los tests del implementer (transforms.test.ts, no-clock.test.ts): asserts cubren la Verificación.
5. Mutación destructiva del guard de reloj (inyección real de Date.now()) -> confirmar que muerde.

## Resultado por punto

| # | Cláusula | Esperado | Observado | OK |
|---|---|---|---|---|
| 1 | Gate incluye transforms.test.ts y no-clock.test.ts | dentro de pnpm test | 313 tests verdes; ambos ficheros corren (53 tests) | OK |
| 2 | Salidas válidas EXACTAS (11 transf.) | ver §6.3/§6.5 | todas exactas (script propio, 0 fallos) | OK |
| 3 | jwt.decode §6.5 output COMPACTO + nota exp | {"header"...} sin saltos + "exp: 2025-07-16T00:00:00Z (caducó hace 4 horas)" | idéntico byte a byte, sin \n | OK |
| 4 | Entradas rotas -> {ok:false} sin lanzar (I1) | apply sobre basura no lanza | 11x11 inputs basura, 0 excepciones; forma {ok:false,error} | OK |
| 5 | Control negativo de totalidad presente | test que falla si algo lanza | transforms.test.ts:259-294 usa expect(()=>apply()).not.toThrow() sobre las 11 | OK |
| 6 | to_relative determinista con now fijo (I5) | mismo texto en 2 ejecuciones | "hace 4 horas" idéntico en dos buildTransforms(NOW) | OK |
| 7 | Tiempo INYECTADO — sin default de producción | buildTransforms(now: Date) obligatorio | firma exige now; typecheck del gate lo garantiza | OK |
| 8 | Guard Date.now()/new Date() sin arg en el gate | grep sobre engine/, falla si aparece | no-clock.test.ts dentro del gate; verde con código real | OK |
| 9 | Guard MUERDE de verdad | rojo al inyectar reloj | inyectado Date.now() en applyBase64Decode -> RED nombrando transforms.ts -> revertido | OK |
| 10 | Guard NO falso positivo por comentarios | Date.now() en comentarios no dispara | detectors.ts:127 tiene Date.now() en comentario; guard verde (stripComments funciona) | OK |
| 11 | Registro por defecto (§6.3) defaultTransformId | id correcto por kind + regla url + null para text | 10 casos correctos (incl. url con/sin query y url malformada->decode) | OK |

## Detalle de salidas válidas verificadas (script propio)
- base64.decode estándar (hola mundo) y base64url ({"a":1}) -> texto exacto.
- jwt.decode (§6.5): {"header":{"alg":"HS256"},"payload":{"sub":"1","exp":1752624000},"signature":"abc"}
  COMPACTO + nota "exp: 2025-07-16T00:00:00Z (caducó hace 4 horas)".
- json.format (indent 2), json.minify (compacto), json.sort_keys (recursivo en objetos anidados
  y objetos dentro de arrays; arrays NO reordenados: [3,1,2] se conserva).
- timestamp.to_iso -> 2025-07-16T00:00:00.000Z (conserva ms); timestamp.to_relative -> "hace 4 horas"
  (pasado) y "en 2 días" (futuro).
- url.decode (a%20b%2Bc%3Dd -> "a b+c=d"); url.split_query (JSON con valores decodificados).
- uuid.describe (v4 + RFC 4122); hash.identify (32->md5, 40->sha1, 64->sha256).

## Nota sobre totalidad (no es un defecto)
Algunas basuras devuelven {ok:true} en transformaciones cuyo dominio las acepta:
url.decode("nope") -> "nope" (percent-decoding identidad) y base64.decode sobre cadenas que sí
son base64 válido. Es correcto: la Verificación exige NO lanzar (I1) y {ok:false} para entradas
ROTAS de esa transformación; una entrada que la transformación acepta legítimamente no es "rota".
Ninguna apply lanzó en ningún caso. La disciplina "solo texto imprimible cuenta como base64" (R4)
vive en la capa detector, no en la transform (que es total).

## Control negativo del reloj (mutación)
- Inyectado `const _injected = Date.now();` en applyBase64Decode (código real, no comentario).
- pnpm vitest run no-clock.test.ts -> FAIL: "transforms.ts contiene Date.now(: expected true to be false" (línea 43).
- Revertido por copia; sha256sum transforms.ts == f9bbc4b3... (idéntico al original). Guard vuelve a VERDE.

## Evidencia (ficheros en este directorio)
- gate.txt — salida del pnpm gate completo (313 tests verdes).
- verify.mts + verify.out.txt — script propio del verifier y su salida (0 fallos).
- report.md — este documento.

## Rarezas
- El PRD §6.5 traía 2026-07-16 (corregido por el bucle a 2025-07-16, coherente con el epoch
  1752624000); el implementer deriva la fecha del exp, no la hardcodea. Correcto.
- El control de totalidad del implementer usa .not.toThrow() en vez de un try/catch literal; es el
  equivalente idiomático de vitest y cumple la intención de la Verificación (falla si algo lanza).
