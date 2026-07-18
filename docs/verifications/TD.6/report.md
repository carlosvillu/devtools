# TD.6 · Lint de adherencia al DS — Report de verificación

**Veredicto: PASS**
**Fecha:** 2026-07-18 · **Verifier:** contexto fresco, escéptico
**Diff verificado:** `eslint.config.ts` (bloque 5c) + `apps/web/src/components/ui/badge.tsx` (2 disables). HEAD `7c068ec`. Árbol limpio salvo esos dos ficheros al empezar.

## Verificación literal (planning.md:140)
> un fichero de prueba con una violación de cada tipo hace fallar `pnpm lint` **nombrando la regla**; al retirarlo, `pnpm gate` queda verde (el control negativo muerde).

## Resultado por punto

| Punto | Esperado | Observado | OK |
|---|---|---|---|
| Baseline gate | `pnpm gate` verde con las 3 reglas activas | lint(`eslint .`)+typecheck+format+knip+readme+test → 187 tests / 28 files, EXIT=0 | OK |
| Reglas DENTRO de `pnpm lint` | no un check aparte | bloque 5c en el único `eslint.config.ts`; gate = `pnpm lint && …`; lint = `eslint .` | OK |
| Rampa cruda (aislado) | `bg-blue-500` → FAIL nombrando regla | `[DS adherencia · rampa cruda]` `no-restricted-syntax`, EXIT=1 | OK |
| Rampa vía template literal | `${on?'text-red-600':''}` → FAIL | `[DS adherencia · rampa cruda]` (TemplateElement), EXIT=1 | OK |
| Arbitrario crudo px | `rounded-[10px]` → FAIL | `[DS adherencia · arbitrario crudo]` `no-restricted-syntax`, EXIT=1 | OK |
| Arbitrario crudo color-func | `bg-[oklch(...)]` → FAIL | `[DS adherencia · arbitrario crudo]`, EXIT=1 | OK |
| Arbitrario crudo hex | `bg-[#1e40af]` → FAIL | `[DS adherencia · arbitrario crudo]`, EXIT=1 | OK |
| Import iconos | `import {X} from 'lucide-react'` → FAIL | `[DS adherencia · iconos]` `no-restricted-imports`, EXIT=1 | OK |
| Combinado (1 de cada) | las 3 categorías disparan a la vez | ramp + arbitrario + iconos en un fichero, EXIT=1 | OK |
| Allowances NO se flaggean | `size-4.5 gap-1.75 max-w-80` + `[--x:var(--warning)]` + `transition-[border-color,box-shadow]` → LIMPIO | EXIT=0, 0 problemas | OK |
| `pnpm lint` repo-wide con fixtures | EXIT!=0 | EXIT=1, 12 problemas (incl. los DS) | OK |
| Retirar fixture → gate verde, tree limpio | EXIT=0 | GATE_EXIT=0, `git status` sin rastro de fixtures | OK |
| Cero falsos positivos árbol TD.1–TD.5 | `eslint .` EXIT=0 | baseline verde sin fixtures | OK |
| Excepción `badge.tsx` auditable | disables con razón; regla NO desactivada en `components/ui`; sin disable → rojo | quitado disable línea 62 → `[DS adherencia · rampa cruda]` sobre `text-violet-700`, EXIT=1; restaurado byte-idéntico (md5 igual) | OK |

## Notas
- Cada regla probada EN AISLADO (un fixture con una sola violación): ninguna está muerta ni escondida tras otra.
- El fixture de iconos genera además `import-x/no-unresolved` y `no-unsafe-assignment` (lucide-react no instalado); irrelevante — la regla DS dispara y se nombra. Ninguna librería de iconos aparece en los manifests: la regla protege sin dependencia real.
- Sin disables, la rampa `text-violet-700` de `badge.tsx` SÍ dispara: la excepción es una supresión real y auditable línea a línea, no la regla apagada.
- Árbol devuelto EXACTAMENTE como se encontró: fixtures eliminados, `badge.tsx` restaurado (md5 idéntico). Solo se añadió `docs/verifications/TD.6/`.

## Evidencia
- `01-baseline-gate.txt` — gate verde baseline (187 tests).
- `02-isolated-rules.txt` — cada regla en aislado + allowances limpias.
- `03-combined-and-hex.txt` — fixture combinado (1 de cada) + hex arbitrario.

## Coste real
$0 (solo lint/gate local, sin APIs de pago).
