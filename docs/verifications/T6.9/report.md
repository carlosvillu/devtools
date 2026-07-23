# Verificación T6.9 — Componer, alcanzable desde la landing

- **Tarea**: T6.9 · Componer, alcanzable desde la landing (`planning.md`, fase F6)
- **Fecha**: 2026-07-23
- **Ejecutor**: agente `verifier` · agent-browser (npx `-y`, Chrome `--no-sandbox`) · sesión `t6.9`
- **Sistema**: working tree con el diff sin commitear (base `fe56d68`) · docker compose dev (Postgres 16) + `pnpm db:migrate` + `pnpm dev` en `localhost:3000` · healthcheck `{"ok":true,"db":true}` · sin seeds (flujo anónimo)
- **Diff verificado**: `apps/web/src/components/landing/landing-field.tsx`, `apps/web/e2e/landing.spec.ts` (git status confirma solo estos dos + `docs/verifications/T6.9/`)

## Verificación esperada (literal de planning.md)
> en el navegador, `/` muestra el enlace sin robarle protagonismo al campo (juicio visual del usuario: **parada de juicio humano**, con captura preparada); pulsarlo abre `/compose` en modo componer; pegar en el campo de la landing sigue llevando a `/analyze` con la cadena y **sin el input en la URL** (control negativo §11 de F5, sin regresión); `pnpm gate` + `pnpm test:e2e` verdes.

## Pasos ejecutados
1. `pnpm gate` (raíz) → exit 0: lint + typecheck + prettier + knip + readme:status + **1093 tests** (70 files) verdes. Ver `gate.txt`.
2. Levantado el sistema: docker compose dev (Postgres running), `pnpm db:migrate` OK, `pnpm dev` fresco en `:3000` (maté un `next dev` obsoleto que ocupaba `:3000` para garantizar que corre el working tree). Healthcheck `{"ok":true,"db":true}`.
3. CUA en `/` → snapshot: existe `link "¿al revés?compón algoy lo empaqueta" [url=http://localhost:3000/compose]`, visible, role=link, `href=/compose`. Captura `01-landing-con-enlace.png` (enlace terciario bajo el campo y bajo «Pega un ejemplo», discreto — captura para el juicio VISUAL ya concedido por el usuario).
4. **Contraste WCAG del enlace** (aserción obligatoria de UI) medido con `getComputedStyle` + conversión a sRGB por canvas, en light Y dark, esperando a que asiente el `transition-colors`. Todos ≥ 4.5:1 (tabla abajo).
5. Clic en el enlace → `wait --url **/compose` → `get url` = `http://localhost:3000/compose`; snapshot muestra `heading "Compón algo. Lo empaqueta." [level=1]` y la pestaña **`codificar` [selected]** (modo componer, no solo URL). Captura `02-compose-tras-clic.png`.
6. No-regresión F5 (control negativo §11): en `/`, **pegado REAL con Ctrl+V** (clipboard concedido y JWT escrito vía CDP `Browser.grantPermissions` + `Input.dispatchKeyEvent`, porque el `clipboard write` por defecto de agent-browser está bloqueado en este entorno headless; el `onPaste→onChange→handoff` de la app se ejecuta idéntico a un ⌘V humano). Resultado: navega a `/analyze`, el JWT viaja al campo, y la URL queda `http://localhost:3000/analyze` — `search=""`, `hash=""`, sin `Bearer`, sin el marcador de payload `eyJzdWIiOiIx`. Cadena `jwt.decode` + `json.format` presentes. Captura `03-analyze-url-limpia.png`, consola en `browser-console.txt` (sin errores), `errors` vacío.
7. `pnpm test:e2e` → **50 passed** (incluye el nuevo `landing.spec.ts:116 "el enlace «compón algo» abre /compose en modo componer"` y el control negativo `:82 "…URL LIMPIA"`). Ver `e2e.txt`.

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | Enlace visible en `/`, role=link, → `/compose` | `link` visible, `href=/compose` | 01-…png, snapshot | OK |
| 2 | Discreto, no roba protagonismo (juicio humano YA concedido) | Terciario bajo el campo y bajo «Pega un ejemplo» — captura preparada | 01-…png | OK (juicio ya dado) |
| 3 | Contraste texto/fondo ≥ 4.5:1 (light+dark) | wrapper 4.62/5.57 · span 7.25/7.45 | eval getComputedStyle | OK |
| 4 | Pulsar → `/compose` en modo componer (heading, no solo URL) | URL `/compose` + heading «Compón algo. Lo empaqueta.» + tab `codificar` selected | 02-…png, snapshot | OK |
| 5 | Pegar en landing → `/analyze` con la cadena | Ctrl+V real → `/analyze`, JWT en campo, `jwt.decode`+`json.format` | 03-…png | OK |
| 6 | §11: input JAMÁS en la URL de `/analyze` | pathname `/analyze`, search/hash vacíos, sin `Bearer` ni payload marker | eval URL | OK |
| 7 | Consola/JS limpios | solo logs dev (React DevTools/HMR/Fast Refresh); `errors` vacío | browser-console.txt | OK |
| 8 | `pnpm gate` verde | exit 0, 1093 tests | gate.txt | OK |
| 9 | `pnpm test:e2e` verde | 50 passed (+1 nuevo compose) | e2e.txt | OK |

### Tabla de contraste WCAG (canvas sRGB, threshold 4.5:1 — texto 12px, no grande)
| Elemento | Tema | fg (rgb) | bg (rgb) | Ratio | >=4.5 |
|---|---|---|---|---|---|
| wrapper «¿al revés?…» (`text-subtle`, 400) | light | 110,114,122 | 249,250,251 | 4.62 | OK |
| wrapper «¿al revés?…» (`text-subtle`, 400) | dark | 133,137,145 | 11,12,15 | 5.57 | OK |
| span «compón algo» (`text-muted`, 500) | light | 81,84,92 | 249,250,251 | 7.25 | OK |
| span «compón algo» (`text-muted`, 500) | dark | 156,160,167 | 11,12,15 | 7.45 | OK |

## Coste real
$0 — sin APIs de pago (todo local: motor puro en cliente/servidor, sin red externa). Estimado planning: $0.

## Veredicto
**PASS** — el enlace terciario a `/compose` existe, es visible, role=link y apunta a `/compose`; pulsarlo abre `/compose` en modo componer (heading + tab `codificar`); el flujo de pegar de F5 sigue llevando a `/analyze` con la cadena y la URL LIMPIA (control negativo §11 intacto). `pnpm gate` (1093) y `pnpm test:e2e` (50) verdes.

Notas:
- **Razonamiento del header validado**: la nav de la landing (`historial`, `Entrar`) y la de la pantalla de trabajo (`el campo`, `historial`, `Entrar`) nombran destinos, no el par decodificar/componer; ese par lo expresa el `Segmented` de `/analyze`+`/compose`, que la landing no tiene. Ninguna superficie nombra las direcciones en su nav → no hay incoherencia que arreglar. Coherente con la Entrega.
- **Falso positivo descartado**: una primera medición de contraste dio 4.05 en dark porque leyó el `color` a mitad del `transition-colors` del enlace; tras asentar la transición el valor real es 5.57. Documentado para que no se lea como regresión.
- **Método de pegado**: clipboard `write` por defecto bloqueado en el entorno headless (permiso denegado); se concedió `clipboardReadWrite` vía CDP y se envió un Ctrl+V real por `Input.dispatchKeyEvent` — es un pegado de teclado genuino que dispara el `onPaste` de la app, no un atajo por API que salte la UI. El e2e (`landing.spec.ts:82`) ejercita además el pegado real con el clipboard que Playwright concede.
- **Rareza (no bloqueante)**: el contraste del wrapper `text-subtle` en LIGHT es 4.62:1 — solo 0.12 por encima del suelo AA de 4.5. Pasa, pero es un token del DS (`text-subtle` sobre `--color-bg`) al borde; un futuro ajuste de cualquiera de los dos valores lo dejaría por debajo de AA en silencio. Queda anotado el margen.
