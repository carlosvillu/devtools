# Verificación T1.1 — Contratos del motor y detectores

- **Tarea**: T1.1 · Contratos del motor (§6.1) + 8 detectores (§6.2) en `packages/core`, subpath `@app/core/engine`.
- **Fecha**: 2026-07-18
- **Veredicto**: **PASS**
- **HEAD bajo prueba**: b840c58 (diff de T1.1 sin commitear: `packages/core/src/engine/`, `packages/test-utils/src/factories.ts`, exports/package.json). El código ejecutado es el del diff.
- **Coste real**: $0 (verificación puramente local, sin APIs de pago).

## 1. Gate + suite (regla 8)

`pnpm gate` completo → **VERDE** (`gate-output.txt`):
lint OK · typecheck OK · format:check OK · knip OK · readme:status:check OK · test **260 passed / 30 files**.

Los tests del motor están DENTRO del gate: el proyecto vitest se llama `core:unit` (incluye `src/**/*.test.ts`) y el gate corre `--project '*:unit'`. Ejecutados en aislamiento: `packages/core/src/engine/detectors.test.ts` -> **43 tests passed**. Sin skip/only/todo en los tests del motor. Regla 8 satisfecha.

## 2. Probe independiente del verifier (funcion real detect())

No me fie del corpus del implementer: escribi mi propio `probe.test.ts` (config `vitest.probe.config.ts`, alias directo a `packages/core/src/engine/index.ts`) que llama a la funcion real. **17/17 passed** (`probe-output.txt`). Outputs crudos en `detect-raw.txt`.

### Controles duros (clausula literal)

| Caso | Esperado | Observado | OK |
|---|---|---|---|
| "holaquetalestamos" (R4) | sin base64, cae a text | [text] | OK |
| "1752624000" (I8) | exactamente [unix_timestamp, text], desc, text presente | [{unix_timestamp,0.6,{unit:seconds}},{text,0.01}] | OK |
| "3q2+7wAAAAAAAAAA" (R4, base64 valido -> binario) | sin base64 | [text] | OK |
| "AAAAAAAA" (long. multiplo de 4, decodifica a binario) | sin base64 | [text] | OK |
| "aG9sYQ==" (base64 -> hola, contraste positivo) | base64 presente | [base64,text] | OK |

El guard R4 muerde por CONTENIDO, no por longitud: `AAAAAAAA` tiene longitud coherente (multiplo de 4) y alfabeto valido pero decodifica a bytes no imprimibles -> no dispara.

### Positivos/negativos por detector

| Detector | Positivo | Negativo | OK |
|---|---|---|---|
| jwt | JWT real -> jwt (alg HS256); con `Bearer ` -> jwt (CU1) | aaa.bbb.ccc (header no-JSON) -> [text] | OK |
| json | {"a":1}, [1,2] -> json | 123, "x" escalares desnudos -> [text] (load-bearing I8) | OK |
| url | https://x.com/a?b=1 -> url hasQuery:true | ftp://x, hola -> sin url | OK |
| uuid | UUID canonico -> uuid version 4 | 32 hex sin guiones -> sin uuid, es hash | OK |
| hash | 32/40/64 hex -> hash (md5/sha1/sha256) | 31 hex y g x32 -> sin hash | OK |
| unix_timestamp | 10 y 13 digitos -> unix_timestamp | 9 (175262400) y 11 (17526240000) -> [text] | OK |
| text | presente exactamente 1 vez, en ultimo lugar, conf 0.01 en 8 entradas | - | OK |
| orden | Detection[] siempre desc por confianza, text al final | verificado en 8 entradas | OK |

## 3. Determinismo (I5)

- Dos llamadas a detect() con el mismo input dan JSON identico (probe, 3 inputs).
- grep de Date.now/new Date/Math.random/performance.now/process.hrtime sobre packages/core/src/engine/*.ts (sin tests) -> unica coincidencia es un COMENTARIO; cero usos reales de reloj/aleatorio. I5 OK.

## 4. Contratos Zod (§6.1)

- Los schemas existen y se derivan por z.infer (fuente unica): DataKindSchema, DetectionSchema, TransformResultSchema, TransformSchema, ChainStepSchema, ChainSchema (+ ChainTerminalSchema).
- Cada Detection producido por detect() VALIDA contra DetectionSchema (probe, 4 inputs x todas sus detecciones).
- DetectionSchema RECHAZA confidence 1.5 y -0.1, y kind invalido ("nope"); DataKindSchema rechaza "nope". Validacion real.

## Evidencia
- gate-output.txt — salida completa de pnpm gate (260 tests verdes).
- probe.test.ts + vitest.probe.config.ts — probe independiente del verifier.
- probe-output.txt — 17/17 passed.
- detect-raw.txt — outputs crudos de detect() por caso.

## Rarezas
- El enum DATA_KINDS ordena base64 antes que jwt; comentario aclara que es orden de declaracion, no de prioridad (la prioridad la da la confianza). No afecta a la Verificacion.
- Confianzas cualitativas de §6.2 fijadas a valores numericos concretos respetando la jerarquia del PRD. Coherente.
