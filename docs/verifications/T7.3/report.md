# Verificación T7.3 — `/compose` compartible: botón de compartir + lectura de `?r=`

- **Tarea**: T7.3 · `/compose` compartible: botón de compartir + lectura de `?r=` (`planning.md`, F7)
- **Fecha**: 2026-07-23
- **Ejecutor**: verifier · agent-browser 0.32.1 · sesiones `t7.3`, `t7.3rt`, `t7.3inv`, `t7.3mal`
- **Sistema**: working tree (T7.3 sin commitear) sobre commit `a99bcee` · docker compose dev (Postgres 16) + `pnpm db:migrate` + `pnpm dev` · health `{ok:true,db:true}`. `git status` = exactamente los 6 ficheros del diff T7.3. Sin sesión (flujo anónimo, D6).

## Verificación esperada (literal de planning.md)
> en el navegador, componer `json.minify` + `jwt.sign` con secreto canario, compartir, abrir el enlace en otra pestaña -> mismos pasos, campos vacíos, aviso presente; **grep de la URL compartida por el secreto y el fuente -> 0**, y por los ids -> presentes (14.17). Un `?r=` con id inventado -> pantalla limpia, sin paso ejecutado (14.19). `ds-reviewer` sin hallazgos mecánicos. **Parada de juicio humano**: ubicación del botón de compartir (captura preparada, OK del usuario). `pnpm gate` + `pnpm test:e2e` verdes.

## Pasos ejecutados
1. `/compose` recién abierto, sin pasos -> NO existe el botón «Copiar enlace». -> `01-empty-no-share.png`
2. Fuente `{"sub":"1","name":"carlos","role":"admin"}` + `json.minify` + `jwt.sign` con secreto canario **`t73-verifier-canary-not-a-secret`**. Aparece «Copiar enlace». -> `02-recipe-json-minify-jwt-sign.png`
3. Click «Copiar enlace». URL capturada del valor REAL escrito al portapapeles (intercepción de `navigator.clipboard.writeText`, no reconstruida): `http://localhost:3000/compose?r=json.minify-json~jwt.sign-jwt`
4. Grep de esa URL (14.17): secreto/fuente -> 0; ids -> presentes. -> `privacy-grep.txt`
5. Abrir la URL en sesión fresca (`t7.3rt`) -> mismos 2 pasos, fuente y secreto VACÍOS, aviso presente, consola limpia. -> `03-shared-link-opened.png`, `console-roundtrip.txt`
6. `?r=jwt.forge-jwt` (id fuera del catálogo) -> pantalla limpia (14.19). -> `04-invented-id-clean.png`
7. `?r=basura%ZZ` (percent-encoding MALFORMADO, NO cubierto por el e2e) -> HTTP 200, pantalla limpia, sin 500. -> `05-malformed-zz-clean.png`
8. Contraste WCAG (canvas-normalizado a sRGB) del botón y del Callout en light y dark.
9. `pnpm gate` (1185) y `pnpm test:e2e` (59, con los 4 @f7) verdes.

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | Sin pasos, sin botón de compartir | «Copiar enlace» ausente (count 0) | 01 | OK |
| 2 | Componer json.minify+jwt.sign con canario | 2 pasos, botón presente | 02 | OK |
| 3 | URL compartida capturada real | `.../compose?r=json.minify-json~jwt.sign-jwt` | privacy-grep.txt | OK |
| 4 | **14.17** grep secreto/fuente -> 0 | canario->0, `not-a-secret`->0, `carlos`->0, `admin`->0, `"sub"`->0 | privacy-grep.txt | OK |
| 5 | 14.17 grep ids -> presentes (control +) | `json.minify`->1, `jwt.sign`->1 | privacy-grep.txt | OK |
| 6 | Canario URL-safe (fugaría verbatim) | solo `[A-Za-z0-9._~-]` -> sobreviviría; no aparece | privacy-grep.txt | OK |
| 7 | Round-trip: mismos pasos | paso1=json.minify, paso2=jwt.sign | 03 | OK |
| 8 | Fuente VACÍO tras abrir | textarea value="" | 03 | OK |
| 9 | Secreto VACÍO tras abrir | input password value="" | 03 | OK |
| 10 | Aviso presente y veraz | «Abriste una receta compartida.» + «El enlace trae los pasos de la cadena -no los datos-...» | 03 | OK |
| 11 | RSC solo lleva ids+kinds | `sharedRecipe:[{json.minify,json},{jwt.sign,jwt}]`, `signedIn:false` | 03 | OK |
| 12 | **14.19** id inventado -> limpia | steps=0, sin aviso, fuente vacío, «añadir paso» presente, sin 500 | 04 | OK |
| 13 | 14.19 `%ZZ` malformado -> limpia | HTTP 200, steps=0, sin aviso, sin 500 | 05 | OK |
| 14 | Consola sin errores propios | solo React DevTools info + HMR; errors vacío | console-roundtrip.txt | OK |
| 15 | Contraste >=4.5 texto normal | ver tabla abajo | eval | OK |
| 16 | `ds-reviewer` sin hallazgos mecánicos | LIMPIO (0 hallazgos) | subagente ds-reviewer | OK |
| 17 | `pnpm gate` verde | 1185 passed, lint/typecheck/format/knip/readme OK | gate | OK |
| 18 | `pnpm test:e2e` verde | 59 passed; 4 @f7 ejecutados (no skipped) | e2e-output.txt | OK |

### Contraste WCAG (sRGB, ratio texto/fondo)
| Elemento | Light | Dark | Umbral | OK |
|---|---|---|---|---|
| Callout headline «Abriste...» (13px/600) | 6.97 | 10.16 | 4.5 | OK |
| Callout detalle (13px/400) | 16.56 | 13.53 | 4.5 | OK |
| Botón «Copiar enlace» (13px/500) | 6.99 | 5.67 | 4.5 | OK |

## Cobertura del Playwright permanente (@f7, 4 tests, todos verdes)
Protege: 2 pasos -> `?r=`; round-trip con campos vacíos + aviso; `?r=` basura -> limpia; id inventado -> limpia; control negativo de privacidad con ancla estructural `/^json\.minify-\w+~jwt\.sign-\w+$/` + control positivo de ids. **Hueco cubierto solo por este CUA (no por el e2e)**: (a) el `%ZZ` MALFORMADO -el e2e usa `%25%25basura`, percent-encoding VÁLIDO-; (b) el campo secreto vacío tras round-trip de `jwt.sign` -el round-trip del e2e usa `base64url.encode`, sin secreto-. Ambos verificados aquí en el navegador real.

## Coste real
$0 -- sin APIs de pago (motor en cliente, D10). Estimado $0. OK

## Veredicto
**PASS** -- el sistema real hace lo que la Verificación describe: el fuente y el secreto NUNCA viajan en la URL compartida (canario URL-safe con grep=0 y control positivo de ids), el round-trip precarga los mismos pasos con los campos vacíos y el aviso veraz, y tanto un id inventado como un `?r=` malformado dan pantalla limpia y funcional sin 500. Gate (1185) y e2e (59, 4 @f7) verdes. ds-reviewer LIMPIO. Juicio humano de ubicación del botón: YA concedido por el usuario.

Notas:
- El juicio humano (ubicación de «Copiar enlace» + icono) fue concedido por el usuario antes de esta verificación; no se re-juzga. El doble icono de copiar queda como deuda de DS aprobada.
- Sha `a99bcee` porque T7.3 está SIN COMMITEAR; se verificó el working tree (git status = los 6 ficheros del diff).
- Rareza menor (no bloquea): el fondo medido tras el botón «Copiar enlace» y el del Callout coinciden (rgb(238,247,255) light / rgb(26,40,59) dark); la barra de resultado tiene un tinte info sutil. Contraste sobrado en ambos casos.
