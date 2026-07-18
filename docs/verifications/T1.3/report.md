# T1.3 — Verificación del motor de cadena `analyze()` (packages/core)

- **Veredicto**: **PASS**
- **SHA verificado**: `574bed10dd625d2b80c12fee93095b6e3248b2ee` (árbol de trabajo; T1.3 sin commitear aún)
- **Coste real**: $0 (todo local, sin APIs de pago)
- **Fecha**: 2026-07-18

## Evidencia (ficheros en este directorio)
- `gate.txt` — salida completa de `pnpm gate`
- `vrf-console.txt` — salida cruda de mi script de verificación (§6.5 en vivo, corpus, ataque de ciclos)
- `golden-before.txt` / `golden-after.txt` — md5 de los golden antes/después de regenerar con `UPDATE_GOLDEN=1`
- `negctrl.txt` — control negativo del guard I3 (con guard vs. guard eliminado)
- `sha.txt` — SHA base

## 1. Gate + suite (VERDE)
`pnpm gate` completo en verde: lint + typecheck + format:check + knip + readme:status:check + test.
**354 tests / 33 ficheros pasan** (`gate.txt`). `git status` limpio salvo los ficheros de T1.3 y este directorio de evidencia.

## 2. §6.5 byte a byte (cláusula dura) — OK
`analyze("Bearer eyJ…", { now: new Date('2025-07-16T04:00:00Z') })` en vivo contra `@app/core/engine`:

| Comprobación | Esperado (§6.5) | Observado | OK |
|---|---|---|---|
| nº pasos | 3 | 3 | si |
| `applied` por paso | `jwt.decode` / `json.format` / `null` | idéntico | si |
| `terminal` | `no_transform` | `no_transform` | si |
| `notes` paso 0 | `["exp: 2025-07-16T00:00:00Z (caducó hace 4 horas)"]` | idéntico | si |
| output paso 0 | JSON compacto | `{"header":{"alg":"HS256"},...}` compacto | si |
| output paso 1 | JSON indentado | `{\n  "header": {\n    ...` indent 2 | si |
| paso 2 `notes` | ausente | ausente | si |

**Golden generado de la salida REAL**: regenerado con `UPDATE_GOLDEN=1`; md5 byte-idénticos a los versionados (`golden-before.txt` == `golden-after.txt`). `jwt-6.5.json` no fue escrito a mano.

## 3. ≤8 pasos, determinismo, no lee reloj, no lanza (I1/I2/I4/I5)
- **Corpus (8 entradas)**: todas `steps.length ≤ 8`, índices consecutivos desde 0, terminal válido, `ChainSchema.safeParse` OK, ninguna `cycle`.
- **Determinismo (I5/14.6)**: dos ejecuciones con el mismo `now` dan `JSON.stringify(chain)` idéntico byte a byte en las 8 entradas.
- **No lee el reloj (I4)**: guard estático `no-clock.test.ts` (en el gate) escanea `analyze.ts` y falla si hay `Date.now(` o `new Date()` sin argumento. Verde. `analyze` solo usa el `now` inyectado.
- **No lanza (I1)**: fuzz de 24 entradas basura/límite → 0 excepciones, todas producen `Chain` válida.

## 4. Ataque adversarial a la cláusula de ciclo (I3) — el núcleo
**146 candidatos** construidos para auto-alimentarse (base64 anidado 0–10 niveles sobre 10 semillas, base64^3, percent nesting `%2525252525`, JSON auto-contenido, base64 de JSON formateado, base64 de URL, `'QUFB'.repeat(n)`) ejecutados contra `analyze()` real → **0 ciclos**. Distribución: text(62), no_transform(56), max_depth(27), error(1).

### Prueba de imposibilidad (rigurosa)
`runChain` evalúa `output === current` (→ `no_transform`) ANTES del guard de ciclos, así que un auto-retorno de periodo 1 es `no_transform`. Un `cycle` exige periodo ≥ 2 (A→B→A). Lema (leído en `transforms.ts` + confirmado empíricamente):
- Solo `base64.decode` y `url.decode` encadenan a otro paso productivo, y ambas son **estrictamente reductoras de longitud** en forma productiva (una `url.decode` que no encoge es `output===input` → `no_transform`).
- Las que crecen/mantienen longitud mueren al paso siguiente: `json.format` idempotente → `no_transform`; `jwt.decode`/`url.split_query`/`uuid.describe`/`hash.identify` emiten JSON → `json.format` → `no_transform`; `timestamp.to_iso` → ISO → `text`.

El único camino productivo sostenido tiene `.length` estrictamente decreciente ⇒ volver a un input previo (longitud ≥) es imposible. **Ninguna entrada real de v1 puede ciclar** (vía (b) del veredicto).

### El guard I3 está implementado y ejercitado sobre `runChain` real
- **Control positivo**: grafo A↔B inyectado contra el `runChain` real → `cycle`, 2 pasos, último `output:'A'`, previos intactos. El test del implementer importa `runChain` de `./analyze` (bucle de producción), inyectando solo las hojas.
- **Control negativo (MUERDE)**: copia de `analyze.ts` con el bloque del guard I3 eliminado, mismo grafo:

  | Variante | terminal | pasos |
  |---|---|---|
  | con guard (`runChain` real) | `cycle` | 2 |
  | guard eliminado | `max_depth` | 8 |

  Sin el guard el assert `cycle` se pondría ROJO. El harness no es más cómodo que la realidad.

## 5. Los cinco terminales con entradas reales
| terminal | entrada | observado | previos OK | safeParse |
|---|---|---|---|---|
| `text` | `holaquetalestamos` | text, 1 paso | — | si |
| `no_transform` | `{\n  "a": 1\n}` / §6.5 | no_transform | si | si |
| `max_depth` | base64 anidado ×8 | max_depth, 8 pasos (último con applied/output reales) | si | si |
| `error` | `aHR0cDovL2V4YW1wbGUuY29tLyV6eg==` (base64→URL `%zz` → `url.decode` falla) | error, 2 pasos | si | si |
| `cycle` | inalcanzable con v1 (probado imposible); verificado con grafo inyectado sobre `runChain` real | cycle, 2 pasos | si | si |

## Huecos de contrato conocidos (ANOTAR, no FAIL) — confirmados en ejecución real
- **(i)** La justificación de I3 en PRD §6.4 ("base64.decode se auto-alimenta") es FALSA para v1: base64.decode encoge → satura a `max_depth`, nunca cicla. La cláusula "entrada base64 auto-alimentada termina en `cycle`" es insatisfacible con entradas reales de v1; la sustancia de I3 se verifica por el medio más fuerte (grafo inyectado sobre `runChain` + control negativo que muerde). No es FAIL.
- **(ii)** §6.5 documenta `detections=[json]` en el paso 2, pero `detect()` siempre añade el suelo `text`: real `[json 0.99, text 0.01]` (`detect('{"a":1}') → ["json","text"]`). El golden refleja lo real.
- **(iii)** `ChainStep` gana un campo `notes?` que §6.1 no listaba (necesario para la nota `exp` del §6.5 / criterio 14.1). Extensión mínima opcional, documentada en `contracts.ts`.

## Rarezas
Ninguna más allá de los tres huecos anotados. El orden `no_transform` antes de `cycle` es intencional y correcto.

## Limpieza
Ficheros efímeros (2 tests de verificación + copia mutada de `analyze.ts`) eliminados. Árbol idéntico al inicial salvo `docs/verifications/T1.3/`. Golden intactos (md5 == estado inicial). No se tocó código de producto, tests ni `planning.md`.
