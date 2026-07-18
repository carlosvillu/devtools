# Verificación T1.5 — La pantalla `/` — el campo y la cadena

- **Tarea**: T1.5 · La pantalla `/` — el campo y la cadena (`planning.md`)
- **Fecha**: 2026-07-18
- **Ejecutor**: verifier (agente) · agent-browser (npx -y, core skill cargada) · sesión `t1.5` · Chrome `--no-sandbox`
- **Sistema**: commit de trabajo `0506554` + diff SIN commitear de T1.5 (esperado: el implementer no commitea). Árbol: `apps/web/{e2e,scripts,src/components/field,src/components/layout,src/lib/api-client*}` nuevos + `page.tsx` modificado. Build de PRODUCCIÓN (`next build && next start`) servido en `localhost:3117` (bloque devtools 3110–3119; NO se tocó el 3100 del vecino). Sin Postgres (F0 pendiente): `/` y `/api/analyze` son públicos y no tocan BD; `/api/health` → `{ok:true}`.

## Verificación esperada (literal de planning.md)
> en el navegador, pegar `Bearer <JWT>` real → en < 1 s aparece la cadena `jwt → json` con el payload formateado y la expiración en lenguaje natural, sin que el usuario elija nada (criterio 14.1); pegar un base64 que contiene JSON → 3 pasos visibles y el valor de cualquier paso intermedio se copia con un clic (criterio 14.2); comparación visual contra `docs/mockups/field.html` sin desviaciones no acordadas (regla 7).

Playwright permanente `apps/web/e2e/field.spec.ts` protege: pegar JWT despliega `jwt→json` sin botón; foco en el campo al cargar; cada paso intermedio se copia; el `Callout` de seguridad visible; entrada no reconocida → mensaje explícito (no pantalla vacía); en móvil la cadena se apila sin scroll horizontal del body.

## Pasos ejecutados
1. `pnpm gate` → VERDE. 41 files / 406 tests passed (lint, typecheck, format, knip, readme:status, test). Ver `gate.log`.
2. `pnpm test:e2e` → VERDE. 5/5 passed en `field.spec.ts` sobre `next start` (build prod, puerto 3118). Log confirma `analyze_completed` con solo métricas. Ver `e2e.log`.
3. Levanté build de producción propio en 3117; `/api/health` → `{ok:true}`. Logs capturados en `server.log`.
4. CUA (agent-browser, sesión t1.5, `--no-sandbox`): flujo humano en `/`.
   - Foco automático: `document.activeElement` = `TEXTAREA` (aria-label "Pega algo para analizar") al cargar, sin tocar nada.
   - Sin botón «analizar»: snapshot interactivo solo muestra el textarea, los CopyButton y el botón "Entrar" (deshabilitado, header). No hay disparador manual.
   - **14.1 JWT** (evento paste REAL vía Ctrl+V; clipboard escrito por CDP `Runtime.evaluate` userGesture porque la Async Clipboard API se bloquea sin foco de documento en CDP): pegué `Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc` (payload `{sub:1, exp:1752624000}`, SIN campo `name` → descarta hardcode al fixture `carlos` del e2e). Apareció SIN pulsar nada: `ChainSummary` = `jwt → json`; 3 StepCards; payload **formateado/indentado** en `json.format`; **expiración en lenguaje natural**: `exp: 2025-07-16T00:00:00Z (caducó hace 1 año)`. Latencia real del análisis ~5 ms (server.log); percibido < 1 s.
   - **14.2 base64→JSON** (MI base64, no el del mockup): `eyJhIjoxLCJiIjpbMiwzXX0=` = `btoa('{"a":1,"b":[2,3]}')`. Cadena `base64 → json`, **3 pasos** (base64.decode → json.format → terminal). Clic en el CopyButton del paso 0 (INTERMEDIO). Verifiqué el contenido copiado pegándolo de vuelta al campo y leyéndolo por DOM (`get value`): `{"a":1,"b":[2,3]}` — exactamente el output del paso intermedio, distinto del final formateado.
   - No reconocido: pegué `holaquetalestamos` → mensaje EXPLÍCITO "No se reconoció ningún formato conocido" + "Se intentó detectar jwt, json, base64, timestamp, url, uuid y hash. …texto plano…". No pantalla vacía. `Callout` de seguridad visible en todos los estados.
   - Móvil (390×844): cadena apilada en vertical; `scrollWidth - clientWidth = 0` (sin scroll horizontal del body); header colapsa a Wordmark + IconButton.
   - Comparación con `docs/mockups/field.html`: estructura/jerarquía/tono coherentes; datos siempre en oscuro (CodeBlock). Desviaciones = SOLO las acordadas (ver Notas).
5. **§11 (input nunca se loguea)**: analicé el centinela `SENTINEL-t15-do-not-log` por la UI; `grep` sobre TODO `server.log` → **0 coincidencias**. `analyze_completed` emite solo métricas (`input_kind:"text"`, `input_bytes:23`, `steps:1`, `duration_ms`), nunca el texto.
6. Consola del navegador: `console` y `errors` VACÍOS (build prod). Ver `browser-console.txt`, `browser-errors.txt`.
7. Contraste WCAG (canvas→sRGB, fondo efectivo) en tema claro y oscuro (`data-theme`, el mecanismo real; NO `prefers-color-scheme`). Ver `contrast.txt`.

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | Foco automático en el campo al cargar | `activeElement`=TEXTAREA sin tocar nada | 01-inicial.png | ✅ |
| 2 | Sin botón «analizar» (dispara al pegar/300 ms) | Ningún disparador manual; solo textarea + Copiar + Entrar(disabled) | snapshot | ✅ |
| 3 | 14.1: JWT → `jwt → json` en <1 s sin elegir nada | ChainSummary `jwt → json`, 3 pasos, ~5 ms server | 02-jwt-desplegado.png, 07-jwt-* | ✅ |
| 4 | 14.1: payload formateado (indentado) | `json.format` con JSON indentado 2 esp. | 02, 07-jwt-* | ✅ |
| 5 | 14.1: expiración en lenguaje natural | `exp: … (caducó hace 1 año)` | 02, 07-jwt-* | ✅ |
| 6 | 14.2: base64-con-JSON → 3 pasos visibles | `base64 → json`, 3 StepCards | 03-base64-desplegado.png | ✅ |
| 7 | 14.2: valor de paso intermedio se copia con 1 clic | Copiado=`{"a":1,"b":[2,3]}` (output paso 0), distinto del final | 04-copiado-intermedio.png | ✅ |
| 8 | No reconocido → mensaje explícito, no vacío | "No se reconoció… Se intentó detectar jwt,json,base64,…" | 05, 09-*-dark.png | ✅ |
| 9 | `Callout` de seguridad §11 visible siempre | Visible en JWT/base64/no-reconocido, claro y oscuro | todas | ✅ |
| 10 | Móvil: cadena apilada, sin scroll horizontal body | overflow=0 a 390px, apilado vertical | 06-movil-apilado.png | ✅ |
| 11 | Coherencia con mockup (regla 7), ambos temas | Estructura/jerarquía/tono fieles; solo desviaciones acordadas | 07-jwt-light/dark, 08-mockup-field.png | ✅ |
| 12 | §11: input nunca en logs | grep centinela=0; `analyze_completed` solo métricas | server.log | ✅ |
| 13 | Consola limpia (sin errores JS) | console/errors vacíos (prod) | browser-console.txt, browser-errors.txt | ✅ |
| 14 | Contraste WCAG accents (dark+light) | Callouts security/info ✓ ambos; chip-success claro 3.93<4.5 (ver Hallazgo) | contrast.txt | ⚠️ |

## Coste real
n/a — sin APIs de pago. $0 (motor puro, sin red externa). vs estimado: $0.

## Veredicto
**PASS** — todos los criterios funcionales de T1.5 se cumplen en el sistema real (gate + e2e verdes; 14.1 y 14.2 completos con paste real y copia de intermedio verificada por contenido; no-reconocido explícito; foco automático; sin botón; móvil sin scroll horizontal; §11 con grep de centinela = 0; consola limpia; coherencia con el mockup en claro y oscuro).

### Hallazgo a rutear (no bloquea, cua.md §113 — color del design system)
- **chip-success "N pasos · terminal" en tema CLARO: contraste 3.93 : 1 (< 4.5 AA para texto normal 12px)**. fg `#0c904d` (token DS `--success` = `var(--green-600)`) sobre bg `#f9fafb`. En tema OSCURO pasa (4.76). Como el color proviene del design system, se REPORTA con la tabla (`contrast.txt`) y se ruta al usuario/DS; no es un hard-FAIL de T1.5. Es texto de estado decorativo, redundante con la cadena ya visible. Decisión del usuario: subir `--success` (p. ej. green-700) para texto pequeño sobre fondo claro, o restringir su uso a icono/texto grande.

### Notas / desviaciones acordadas
- El mockup muestra "También podría ser: …" y el picker "Transformación: json.format/json.minify/json.sort_keys" — son features de **T1.6** (alternativas y desvío de la cadena), correctamente AUSENTES en T1.5 (confirmado en `chain-to-step-cards.ts`). Acordado.
- El mockup pinta "2 pasos"; el motor emite **3 pasos** (json.format re-detecta json → paso terminal). Desviación acordada en el brief (el motor manda).
- Header: `historial` y `Entrar` se pintan deshabilitados (destinos de F0/F2 aún no construidos) — patrón documentado en `site-header.tsx`, coherente con el mockup.
- Limitación de entorno (no afecta al veredicto): la Async Clipboard API (`writeText`/`readText`) se bloquea bajo CDP por falta de foco de documento; se preparó el portapapeles vía CDP `Runtime.evaluate` con `userGesture:true` (writeText auto-concedido con gesto) y la lectura del intermedio se validó pegando el valor de vuelta al campo (lectura por DOM), no por `navigator.clipboard.readText`. El paste sigue siendo un evento `paste` real (Ctrl+V); el valor final del textarea confirma el contenido.
