# Verificación T6.7 — La pantalla: `/compose` y el conmutador de dirección

- **Tarea**: T6.7 · La pantalla: `/compose` y el conmutador de dirección (`planning.md`, fase F6)
- **Fecha**: 2026-07-23
- **Ejecutor**: verifier · agent-browser (npx) · sesión `t6.7`
- **Sistema**: working tree sin commitear (diff de T6.7 sobre `eca6dcb`) · docker compose dev (Postgres) + `pnpm db:migrate` + `pnpm dev` · healthcheck `{ok:true,db:true}`. `git status` confirma que el código corriendo es exactamente el diff bajo verificación.

## Verificación esperada (literal de planning.md)
> en el navegador, en `/compose`, escribir el JSON del ejemplo, añadir `json.minify` y luego `base64url.encode` → se ven los dos pasos con sus `Badge` detectados y la barra de resultado copiable; **con la pestaña de red abierta y filtro «todo», la sesión completa de composición registra CERO peticiones** (el control que prueba D10 en la superficie real); pulsar «decodificar» lleva a `/analyze` y el recorrido de **14.1 sigue intacto** (pegar el JWT de §6.5 → cadena `jwt → json`); comparación visual contra `docs/mockups/compose.html` sin desviaciones no acordadas (regla 7); `pnpm gate` + `pnpm test:e2e` verdes; `ds-reviewer` sin hallazgos mecánicos.

## Pasos ejecutados
1. `pnpm gate` desde la raíz → exit 0 (70 ficheros / 1093 tests). Evidencia: `gate.txt`.
2. `/compose` en limpio (navegación directa): campo vacío, sin pasos, sin barra de resultado, SIN badge «reconocido». Chrome = `SiteHeader` real (desviación acordada), `Segmented` marcando «codificar». `01-compose-clean.png`.
3. Escrito el JSON del ejemplo del artboard (`{"sub":"1","name":"carlos","role":"admin"}` con saltos) → aparece «reconocido {} json». Paleta abierta: grupos json / binario / hash / firma, ids con naming §6.3 (`hash.sha256`, `hash.md5`), SIN chip de kind por item (decisión explícita tomada y escrita en `compose-builder.tsx`). `02-palette.png`.
4. Añadido `json.minify` → paso 1 con Badge «produce {} json» y salida minificada exacta. Añadido `base64url.encode` → paso 2 con Badge «produce base64», salida `eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiJ9` (base64url de la SALIDA del paso 1, no de la fuente: encadena). Barra de resultado: «· 2 pasos · base64 listo para compartir» + «Copiar el resultado». `03-two-steps-result.png`.
5. **Cláusula de red (D10)**: HAR iniciado + buffer de requests limpiado ANTES de la sesión de composición. Toda la sesión (teclear fuente + 2 pasos + resultado) → `network requests` = «No requests captured». `network-requests.txt`.
6. **Control positivo de la cláusula de red**: buffer limpiado, recargado `/compose` → el capturador SÍ registra 28 GET (document + fuentes + css + scripts). Prueba que el canal está vivo y el cero del paso 5 es real, no un assert que no puede casar. `network-positive-control.txt`, `compose-session.har`.
7. **Grep de fuga sobre el HAR ENTERO** (incluyendo `_rsc`/`_next`): 0 hits para `carlos`, `sub`, `admin`, la salida base64url; 0 peticiones no-GET; 0 a `/api/`. Ni el tráfico del framework lleva un byte del usuario.
8. **Conmutador → `/analyze` SIN recargar**: marcador vivo `window.__t67NoReload='vivo'`, clic en «decodificar» → URL `/analyze`, marcador SIGUE `'vivo'` (no hubo reload).
9. **No-regresión 14.1**: pegado el JWT de §6.5 en `/analyze` → cadena `jwt → json` (paso 0 `jwt.decode`, paso 1/2 `json.format`), copy de privacidad ORIGINAL (server-side), único cambio visible = el `Segmented`. URL sin query ni hash (§11). `04-analyze-jwt-chain.png`.
10. **Consola / errores**: solo ruido dev-only (React DevTools info, HMR, Fast Refresh). Cero `console.error`, cero page errors. `browser-console.txt`.
11. **Contraste WCAG** (getComputedStyle → sRGB vía canvas, ambos temas) sobre todas las superficies de acento/semánticas nuevas. Todas ≥ 4.5:1. `contrast.txt` (light), `contrast-dark.txt`.
12. **Dark mode**: render correcto de la cadena completa. `05-compose-dark.png`.
13. **Responsive 390px**: header apilado, pasos apilados, paleta agrupada envuelta, barra de resultado; overflow horizontal del body = 0 con la paleta (lo más ancho) abierta. `06-mobile-palette.png`.
14. **Gate del paso fallido** (trampa T6.6 `terminal==='error'`): fuente no-JSON + `json.minify` → callout de error «La entrada no es JSON válido.» y NINGUNA barra de resultado. `07-failing-step.png`.
15. `pnpm test:e2e` → `e2e.txt` (48 passed, 12 con tag `@f6`). `ds-reviewer` fresco → LIMPIO (0 hallazgos mecánicos; solo confirma la deuda ya declarada del `IndexPill`).

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | `/compose` limpio, modo componer | Campo vacío, Segmented «codificar», sin badge reconocido | 01 | OK |
| 2 | Escribir ejemplo → 2 pasos con Badges detectados | json.minify «produce json», base64url.encode «produce base64», encadena sobre la salida | 02,03 | OK |
| 3 | Barra de resultado copiable | «· 2 pasos · base64 listo para compartir» + Copiar el resultado | 03 | OK |
| 4 | Sesión de composición = CERO peticiones | `network requests` = No requests captured; control positivo prueba el canal vivo; grep del HAR entero sin fuga | network-*.txt, .har | OK |
| 5 | «decodificar» → `/analyze` sin recargar | Marcador vivo sobrevive, URL /analyze | (log) | OK |
| 6 | 14.1 intacto: JWT → `jwt → json` | Cadena jwt.decode → json.format, solo cambia el Segmented | 04 | OK |
| 7 | Visual vs `compose.html` sin desviaciones no acordadas | Coincide (SiteHeader/HS256/copy privacidad/ids §6.3 = desviaciones acordadas de F6) | 01-06 | OK |
| 8 | Contraste AA en superficies de acento (light+dark) | Todas ≥ 4.5:1 en ambos temas | contrast*.txt | OK |
| 9 | Sin scroll horizontal móvil | overflow = 0 @390px con paleta abierta | 06 | OK |
| 10 | `pnpm gate` verde | exit 0, 1093 tests | gate.txt | OK |
| 11 | `pnpm test:e2e` verde | 48 passed | e2e.txt | OK |
| 12 | `ds-reviewer` sin hallazgos mecánicos | LIMPIO | (agente) | OK |

## Subtareas / trampas verificadas en código Y en UI
- **Decisión del chip de kind de la paleta**: TOMADA y ESCRITA (`compose-builder.tsx` L68-80: se QUITA el chip, con razones). En la UI la paleta no pinta chip por item; el kind real aparece detectado en el Badge «produce» del paso. OK
- **`safeCompose` (no `compose`)**: importado (L7) y usado (L184). OK
- **Barra gateada con `terminal==='ok'` Y `steps.length>0`** (no `output!=null`): `compose-view.ts` `showResultBar`; observado en UI (vacío→sin barra, error→sin barra). OK
- **Badge «reconocido» suprimido con campo vacío**: `recognizedSourceKind` devuelve null con fuente vacía; observado en pantalla limpia. OK
- **Bug del code-review (borrador sincronizado por `useEffect` sobre `input`, no en `onChange`)**: verificado en `field-analyzer.tsx`; los 3 caminos (tecleo, relevo pending-input, restauración) quedan cubiertos. Los E2E `@f6` incluyen los controles de «conmutar no tira lo pegado desde la portada» y «borrador viejo no resucita». OK

## Contraste medido (peor caso por superficie)
| Superficie | Light | Dark |
|---|---|---|
| barra resultado (accent-subtle-fg / accent-subtle-bg) | 6.97:1 | 10.16:1 |
| IndexPill acento | 6.97:1 | 10.16:1 |
| «listo para compartir» / contador | 6.99:1 | 5.67:1 |
| Badge json | 6.25:1 | 12.58:1 |
| Badge base64 | 5.12:1 | 12.22:1 |
| eyebrow «la construyes tú» | 4.62:1 | 5.57:1 |
| Callout security | 16.3:1 | 13.6:1 |
| Segmented (sel/no-sel) | 17.9 / 6.9:1 | 16.3 / 5.7:1 |

Umbral 4.5:1 (texto normal). Todo por encima en ambos temas.

## Coste real
$0 — sin APIs de pago (el motor de composición corre en el navegador; no hay servidor que gaste). Estimado del planning: $0.

## Veredicto
**PASS** — el flujo literal de la Verificación se reproduce en el sistema real: componer el ejemplo con `json.minify` + `base64url.encode` muestra los dos pasos con Badge detectado y una barra de resultado copiable, la sesión completa de composición registra CERO peticiones (con control positivo que prueba el canal vivo y grep del HAR entero sin fuga del dato), el conmutador lleva a `/analyze` sin recargar y 14.1 sigue intacto, y la comparación visual contra el mockup no muestra desviaciones fuera de las ya acordadas en la cabecera de F6.

**Rarezas / notas (aunque PASS):**
- El bundle de cliente de `/compose` incluye `crypto-browserify` (visible en los chunks del control positivo). Es un SHIM DE NAVEGADOR, no código de servidor: es la consecuencia esperada de D10 (el motor con hashing/HMAC hecho a mano corre en el cliente). `knip` + typecheck en verde. No es fuga de servidor; se anota por completitud del aviso «vigilar que el import no arrastre nada de servidor».
- El resumen de cadena arriba a la derecha es DINÁMICO (`text` en limpio, `json → json → base64` con la receta), no el `text → json → jwt` estático del artboard. Correcto: el kind se detecta sobre la salida (I10), no se promete.
- Deuda de journal ya declarada: `IndexPill` local duplica el className del rail de `step-card.tsx` (espejo 1:1 del DS, sin primitiva `IndexPill`). Justificada.
