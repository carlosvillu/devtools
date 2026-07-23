# Verificación T7.2 · El codec de la receta en la URL (core, puro)

- **Fecha**: 2026-07-23
- **Verifier**: contexto fresco, mandato escéptico
- **SHA base**: e4334f58060f493b9d15993d5a1db9d4b77e4fc3 (T7.2 sin commitear)
- **Superficie**: core puro, sin web (no CUA, no e2e). Verificación unitaria ejecutada contra las funciones REALES.

## Texto literal de la Verificación

> tests de core: round-trip sobre recetas del catálogo; token con id inventado → `ok:false`; kind inválido → `ok:false`; >8 pasos → `ok:false`; basura → `ok:false` **sin lanzar** (control adversarial); determinismo (misma receta ⇒ mismo string, dos ejecuciones). `pnpm gate` verde. Sin superficie web.

## Método

1. Leído el módulo real (`packages/core/src/recipe/{url-codec.ts,index.ts}`) y su test.
2. Confirmado el reuso real de la fuente de verdad:
   - `HistoryComposeStepSchema` (`history/contracts.ts:55-62`) es `.strict()`, con `transform_id` refinado contra `ENCODE_TRANSFORM_IDS` (catálogo vivo del motor, `encode-transforms.ts:352`) y `kind` contra `DataKindSchema` (`engine/contracts.ts:19`).
   - `RecipeSchema = z.array(HistoryComposeStepSchema).min(1).max(MAX_COMPOSE_STEPS)` con `MAX_COMPOSE_STEPS = 8` (`engine/contracts.ts:222`) — la constante, no un `8` hardcodeado.
   - El codec importa ese schema, NO una copia laxa. Una receta compartible = una receta persistible.
3. Golden del formato de cable: los asserts de estabilidad son literales fijos (`'json.minify-json~base64.encode-base64~jwt.sign-jwt'`), no `encodeRecipe(...)` comparado consigo mismo. El arnés no se autovalida.
4. Ejecutada la suite del módulo (evidencia: `module-tests.txt`).
5. Escrito y ejecutado un script adversarial INDEPENDIENTE con mis propios casos (evidencia: `adversarial-run.txt`, script en el scratchpad, fuera del árbol).
6. Ejecutado `pnpm gate` completo (evidencia: `gate.txt`).

## Resultado por punto

| Punto de la Verificación | Esperado | Observado | OK |
|---|---|---|---|
| round-trip sobre recetas del catálogo | recupera x byte a byte | `json.minify`+`jwt.sign` y 3 pasos: exacto | OK |
| id inventado → ok:false | ok:false | `jwt.forge-jwt`, `nope.invent-json` → ok:false | OK |
| kind inválido → ok:false | ok:false | `json.minify-banana` → ok:false | OK |
| >8 pasos → ok:false | ok:false | 9 pasos → ok:false; 8 (límite) → ok:true | OK |
| basura → ok:false SIN lanzar | 0 excepciones | 34 inputs adversariales (incl. null/undefined/número/objeto/array/Symbol/control chars/100 KB/unicode) → todos ok:false, 0 throws | OK |
| determinismo | mismo string 2+ veces | 5 runs → 1 string distinto | OK |
| receta vacía / string vacío | ok:false | `encodeRecipe([])===""`, `decodeRecipe("")` → ok:false | OK |
| `pnpm gate` verde | verde | ver gate.txt | OK |
| isomorfismo (sin node:/Buffer) | client-safe | guard estructural del test sigue imports; solo Zod puro | OK |

## Evidencia

- `module-tests.txt` — suite del módulo: 62 tests, 1 fichero, PASS.
- `adversarial-run.txt` — mi script independiente: ALL PASS, corpus de 34 inputs con 0 excepciones.
- `gate.txt` — salida de `pnpm gate`.

## Coste real

$0 (sin APIs de pago; todo local).

## Veredicto

**PASS** — `pnpm gate` exit 0: 1185 tests / 72 ficheros, lint + typecheck + prettier + knip + readme:status:check verdes.
