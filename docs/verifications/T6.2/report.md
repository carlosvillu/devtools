# T6.2 — Espejo: `Segmented` en el DS y el mockup `compose.html`

- **Veredicto**: **PASS**, con una **corrección obligatoria antes del commit** (H1, un `get_file`)
- **Fecha**: 2026-07-22
- **Verificador**: subagente `verifier` (contexto fresco)
- **Coste real**: **$0** (sin APIs de pago). Estimado: $0. Desviación: 0 %.

## Sistema verificado

Verificación de **ficheros estáticos**, no de app levantada: `compose.html` es un mockup en
`file://`, no la ruta `/compose` (esa la construyen T6.6–T6.8). No procede `docker compose` +
`pnpm dev`. El "sistema" es el árbol de trabajo + `pnpm gate`.

- **HEAD**: `7ba0c8d` (`T6.1: close the PRD amendment after the human OK`)
- **Árbol**: sucio con el diff de T6.2 (es el código bajo verificación): `D forms/forms.card.html`;
  `M` journal, `docs/mockups/README.md`, `assets/_ds_bundle.js`, `planning.md`; `??`
  `display/Image.{jsx,d.ts,prompt.md}`, `forms/Segmented.{jsx,d.ts,prompt.md,card.html}`,
  `forms/{Button,Field,IconButton,Input,Select,Textarea}.card.html`, `docs/mockups/compose.html`,
  `compose-mobile.html`, `assets/variant-compose.{jsx,js}`.
- **Navegador**: `agent-browser` con `--args "--no-sandbox"`, sesiones `t6.2` / `t62-<pagina>`.

---

## Resultado por cláusula

| # | Cláusula de la Verificación (literal) | Esperado | Observado | |
|---|---|---|---|---|
| 1 | `DesignSync list_files` y el espejo local **coinciden en `components/forms/`** | diff vacío en ambos sentidos | 28 arriba, 28 abajo, `comm` vacío en las dos direcciones; `forms.card.html` **dado de baja** en ambos | OK |
| 2 | `compose.html` abre en `file://` mostrando **fuente** | visible | textbox con el JSON de `carlos` (`@e4`), «entrada», badge «reconocido json» | OK |
| 3 | …**2 pasos** | exactamente 2 | paso 1 `json.minify`; paso 2 `jwt.sign` (+ algoritmo + secreto). Ni uno más | OK |
| 4 | …**paleta abierta** | desplegada | «añade un paso — se aplica sobre la salida anterior» + 8 chips en 4 grupos | OK |
| 5 | …**barra de resultado** | visible | «resultado · 2 pasos · jwt listo para compartir» + «Copiar» + token | OK |
| 6 | …**callout** | visible | «Compón sin miedo, pero no con secretos vivos.» + cuerpo | OK |
| 7 | **0 errores de consola** | cero | **1 sola línea, `[info]`** (React DevTools). 0 error, 0 warning. `errors` vacío | OK |
| 8 | **0 hosts externos en la pestaña de red** | cero | 17 peticiones: **16 `file:` + 1 `data:`**. 0 targets `http(s)://` | OK |
| 9 | El README **lista la nueva página** | fila en el mapa | filas de `compose.html` y `compose-mobile.html` presentes | OK |
| 10 | …**y las desviaciones** | las de F6, fechadas | las **6** están, todas fechadas 2026-07-22 (+1 propia) | OK |
| — | *(gate)* `pnpm gate` verde | verde | **exit 0**, 61 ficheros / **679 tests**, sin flake de `redact.test.ts` | OK |
| — | *(control extra)* `Segmented` **monta de verdad** | no `undefined` | `tab "decodificar"` + `tab "codificar" [selected]` | OK |
| — | *(control extra)* regresión de los 5 mockups previos | 0 errores / 0 externos | los 6 idénticos: 1 `[info]`, 16 `file:` + 1 `data:` | OK |
| — | *(control extra)* el `.js` es su `.jsx` y nada más | diff vacío salvo `\n` final | reproducido en `variant-compose.js` **y** `variant-claro.js` | OK |
| — | *(Entrega, no Verificación)* «`docs/design-system/` **regenerado** con `DesignSync`» | espejo = salida de `DesignSync` | **`docs/design-system/readme.md` NO se regeneró y diverge de upstream** | H1 |

**Las 10 cláusulas literales de la Verificación pasan**, más los 4 controles extra que pidió el
bucle. El veredicto es **PASS**.

**Por qué H1 no bloquea, y por qué eso no es rebajar la Verificación.** H1 es un defecto real y se
reporta con severidad completa; lo que se dictamina es su **alcance**, que es justo lo que el
encargo delegó en el verificador («dictamina si eso incumple alguna cláusula de ESTA tarea o es
seguimiento legítimo»). Recorriendo las cláusulas: la 1 dice «coinciden en `components/forms/`» y
`readme.md` está en la **raíz** del espejo, no en ese directorio — además `list_files` devuelve
**rutas**, no contenido; y «el README lista la nueva página» es `docs/mockups/README.md`, que pasa.
Ninguna cláusula cubre el contenido de `docs/design-system/readme.md`. El único anclaje sería la
frase de **Entrega** «regenerado con `DesignSync`», que es una afirmación de **método**, no el gate.

El argumento que **descarté explícitamente** para no engañarme: «el espejo queda internamente
contradictorio». No sostiene un FAIL, porque es **simétrico con `Image`** — tras arreglar
`Segmented`, el espejo seguirá conteniendo `Image.jsx` con un índice que no lo nombra, y eso lo
clasifico (con razón) como seguimiento legítimo, porque **upstream mismo** está así. Dos
situaciones estructuralmente iguales no pueden ser una FAIL y otra seguimiento. Lo que sí distingue
a `Segmented` es que **upstream cambió y el espejo no se trajo**: regeneración parcial. Defecto de
Entrega, no incumplimiento de cláusula.

Tampoco se activa la trampa que el encargo señalaba como FAIL de principio de fase: **ningún
fichero del espejo se editó a mano** (control byte a byte en §3). `readme.md` no está manipulado;
es una copia fiel **antigua**.

**Contrapartida, y por eso la corrección es obligatoria y no una rareza**: un PASS cierra la tarea
y una nota de seguimiento se pierde. H1 se arregla con **un solo `get_file`** y el implementer
sigue en el ciclo, así que se exige **dentro del commit de T6.2**, no como deuda diferida.

---

## H1 · CORRECCIÓN OBLIGATORIA (no bloqueante del gate) — el espejo del DS no se regeneró entero: `readme.md` quedó atrás

El implementer reportó que «la prosa de `docs/design-system/readme.md` está desfasada (no nombra
`Segmented` ni `Image`)» y lo presentó como **staleness de upstream**, o sea seguimiento legítimo
ajeno a esta tarea. **Es falso para `Segmented`.** Contrastado con la fuente:

```
# Espejo local, docs/design-system/readme.md linea 16
**forms/** — `Button`, `IconButton`, `Input`, `Textarea`, `Field`, `Select`

# DesignSync get_file readme.md (proyecto 9d6b478a-..., leido hoy)
**forms/** — `Button`, `IconButton`, `Input`, `Textarea`, `Field`, `Select`, `Segmented`
```

Upstream **sí** nombra `Segmented`. El espejo local no, porque el fichero **no se trajo**:

```
$ git log --oneline -1 -- docs/design-system/readme.md
ecef976 TD.4: add Dialog + Wordmark primitives and push them to Claude Design
$ git status --porcelain docs/design-system/readme.md
(vacio — intacto en todo el ciclo de T6.2)
```

Por qué exige corrección en este mismo ciclo (aunque no bloquee el gate — ver el dictamen de
alcance más arriba):

1. **Incumple la Entrega textual** de T6.2 («`docs/design-system/` regenerado con `DesignSync`»).
   No se regeneró: se copiaron los ficheros que el implementer sabía que faltaban. Es el modo de
   fallo que el propio Contexto de la tarea nombra («el espejo es **solo-lectura y se regenera con
   `DesignSync`**»): un espejo curado fichero a fichero no es un espejo, aunque cada fichero
   individual sea correcto.
2. **La causa fue mal atribuida en el resumen del implementer**, y esa es la parte cara. Presentado
   como deuda de upstream, habría acabado en un ticket de seguimiento en vez de en un `get_file`
   de un fichero. Es exactamente la clase de desliz que este gate existe para cazar: no el error,
   sino el diagnóstico que lo saca del alcance de quien puede arreglarlo en 60 segundos.
3. **T6.3 lee este espejo como spec** («`Segmented.jsx` es la spec; `Segmented.prompt.md` la
   intención») y su `readme.md` es la puerta de entrada. Conviene que no mienta sobre el inventario
   justo en la tarea siguiente. *(Este punto acompaña, no sostiene: es simétrico con `Image` — ver
   el dictamen de alcance.)*

**Qué debe arreglar el implementer** (un minuto, sin tocar upstream):

```
DesignSync get_file  projectId=9d6b478a-191a-4d6c-8071-441488dd195f  path=readme.md
-> volcar el contenido tal cual sobre docs/design-system/readme.md
```

Y en el mismo paso **re-contrastar el contenido del resto del espejo** contra `DesignSync` (no
solo la lista de rutas): esta verificación probó el contenido de `Segmented.jsx` y de `readme.md`;
uno de los dos ya estaba mal, así que el muestreo no autoriza a suponer los demás.

`Image` sí es staleness real de upstream: el `readme.md` **de upstream** tampoco lo nombra en
`display/`. Eso es seguimiento legítimo, ajeno a T6.2.

## H2 · La exclusión `uploads/` NO es el criterio escrito de TD.1

El implementer declara **5 exclusiones** y las atribuye al «criterio de TD.1, escrito en
`docs/design-system/readme.md`». El readme escribe **4**, en «Deliberately excluded from this
mirror», literalmente:

> «- `_ds_bundle.js` — the compiled runtime bundle ... It is a build output, not design source.
> - `_ds_manifest.json` — the panel's generated card index.
> - `.thumbnail` / `thumbnail.html` — the panel's generated homepage tile.»

`uploads/` no aparece ahí ni en ninguna otra parte del repo. Y upstream **sí** lo tiene, con
contenido: `uploads/Segmented.{jsx,d.ts,prompt.md}` + `uploads/pasted-1784706180276-0.png` +
`uploads/pasted-1784706356932-0.png`. Se descartan 5 ficheros reales de upstream bajo un criterio
**inventado en esta tarea y no documentado en ningún sitio**.

No rompe la cláusula 1 (nada de eso cae en `components/forms/`) y el criterio en sí es defendible
(`uploads/` es el buffer de subida del panel y sus 3 ficheros son copias de los de
`components/forms/`), pero **la afirmación de que ya estaba escrito es incorrecta**.

Nota de arnés: `docs/design-system/readme.md` **es un fichero espejado**, así que ampliar ahí la
lista implicaría editar el proyecto de Claude Design o romper la regla de solo-lectura. La
exclusión `uploads/` conviene documentarla donde sí es nuestra.

## H3 · La orden de recompilación que documenta el README no corre tal cual está escrita

`docs/mockups/README.md` documenta:

```bash
pnpm dlx --package=@babel/core@7.29.7 --package=@babel/cli@7 --package=@babel/preset-react@7 \
  babel --presets @babel/preset-react assets/<modulo>.jsx -o assets/<modulo>.js
```

Ejecutada literalmente desde `docs/mockups/`, **falla**:

```
Error: Cannot find package '@babel/preset-react' imported from
  /home/developer/projects/devtools/docs/mockups/babel-virtual-resolve-base.js
... code: 'ERR_MODULE_NOT_FOUND'
```

Babel resuelve el preset con `import.meta.resolve` desde el cwd del fuente, y `pnpm dlx` instala
en un temporal fuera de esa cadena. Se reprodujo pasando el preset por **ruta absoluta** al
`node_modules` del dlx; con eso el resultado es exacto. Defecto de la **documentación del
procedimiento**, no del artefacto.

---

## Evidencia

### 1 · Paridad del espejo en `components/forms/` — coincidencia exacta

`parity-forms-upstream.txt` (`DesignSync list_files` filtrado) y `parity-forms-local.txt`
(`find docs/design-system/components/forms -type f`), ordenadas. **28 = 28, `comm` vacío en ambos
sentidos.**

```
components/forms/Button.card.html      components/forms/Segmented.card.html
components/forms/Button.d.ts           components/forms/Segmented.d.ts
components/forms/Button.jsx            components/forms/Segmented.jsx
components/forms/Button.prompt.md      components/forms/Segmented.prompt.md
components/forms/Field.card.html       components/forms/Select.card.html
components/forms/Field.d.ts            components/forms/Select.d.ts
components/forms/Field.jsx             components/forms/Select.jsx
components/forms/Field.prompt.md       components/forms/Select.prompt.md
components/forms/IconButton.card.html  components/forms/Textarea.card.html
components/forms/IconButton.d.ts       components/forms/Textarea.d.ts
components/forms/IconButton.jsx        components/forms/Textarea.jsx
components/forms/IconButton.prompt.md  components/forms/Textarea.prompt.md
components/forms/Input.card.html
components/forms/Input.d.ts
components/forms/Input.jsx
components/forms/Input.prompt.md
```

```
$ comm -23 parity-forms-upstream.txt parity-forms-local.txt   # solo en upstream
(vacio)
$ comm -13 parity-forms-upstream.txt parity-forms-local.txt   # solo en local
(vacio)
```

**La baja se hizo**: `forms.card.html` no está ni arriba (0 coincidencias en `list_files`) ni
abajo (`ls` -> *No such file*), y el diff lo registra como `D`. El espejo resta, no solo suma.

### 2 · Espejo completo — diferencias fuera de `components/forms/`

```
Solo en upstream:  _ds_bundle.js  _ds_manifest.json  .thumbnail  thumbnail.html   <- 4 exclusiones ESCRITAS
                   uploads/Segmented.{jsx,d.ts,prompt.md}  uploads/*.png          <- H2: exclusion NO escrita
Solo en local:     .gitkeep                                                        <- andamiaje del repo, preexistente
```

Ningún otro delta de ruta: `_adherence.oxlintrc.json`, `SKILL.md`, `styles.css`, `tokens/*`,
`guidelines/*` y el resto de `components/*` coinciden. Y `readme.md` coincide en **ruta** pero
**no en contenido** -> H1.

### 3 · Control anti-edición-a-mano

`DesignSync get_file components/forms/Segmented.jsx` vs el fichero local:

```
$ diff remote-Segmented.jsx docs/design-system/components/forms/Segmented.jsx
IDENTICAL (byte for byte)
b8434451310ae8ac250c05586f6925ff  remote-Segmented.jsx
b8434451310ae8ac250c05586f6925ff  docs/design-system/components/forms/Segmented.jsx
```

Ese fichero **no** se editó a mano. (El mismo control sobre `readme.md` es el que destapó H1: allí
el contenido sí diverge — por defecto de regeneración, no por edición.)

Dato útil para **T6.3**: la spec usa `role="tablist"` / `role="tab"` + `aria-selected`, **no**
`radiogroup`/`radio`. Se obedece al espejo.

### 4 · `compose.html` en el navegador — las 5 piezas

Capturas: `01-compose-completa.png` (cabecera + conmutador), `02-fuente-y-paso-1.png`,
`03-paso-2-jwt-sign.png`, `04-paleta-abierta.png`, `05-barra-resultado-y-callout.png`.
Texto renderizado en `text-compose.txt`; árbol de accesibilidad en `snapshot-compose.txt`.

| Pieza | Evidencia observada |
|---|---|
| **fuente** | `textbox @e4` con `{"sub":"1","name":"carlos","role":"admin"}`; «entrada · escribe o pega lo que quieras codificar»; badge «reconocido json» |
| **2 pasos** | `1 · transforma con` -> `json.minify` -> produce json; `2 · transforma con` -> `jwt.sign` -> produce jwt + algoritmo + secreto. Dos «Quitar paso» (`@e5`, `@e7`) — exactamente 2 |
| **paleta ABIERTA** | «añade un paso — se aplica sobre la salida anterior» + 8 chips (`@e9`–`@e16`) agrupados JSON / BINARIO / HASH / FIRMA. Visible sin interactuar |
| **barra de resultado** | «resultado · 2 pasos · jwt listo para compartir» + `Copiar` (`@e17`) + bloque oscuro con el token |
| **callout** | «Compón sin miedo, pero no con secretos vivos. / Lo que escribes y el secreto de firma se procesan en el servidor...» |

**Control pedido: `Segmented` monta de verdad (no `undefined`).** El árbol de accesibilidad lo
prueba y la captura lo confirma (píldora blanca con sombra + icono):

```
- tab "decodificar" [ref=e20]
- tab "codificar" [selected, ref=e21]
```

Dos opciones, **«codificar» seleccionada** (`aria-selected`, no mera presencia). Si el
`_ds_bundle.js` no se hubiera refrescado, `variant-compose.js` desestructura `Segmented` en su
primera línea y el artboard habría reventado al pintar el conmutador. No ocurrió.

**Verificación cruzada de las desviaciones** (lo que el artboard renderiza de verdad, contra lo
que el README declara): el `Select` ofrece `HS256/HS384/HS512/RS256` (desv. 1 OK), la nav es la del
artboard «el campo / historial / Entrar» (desv. 2 OK), el callout dice «se procesan en el
servidor» (desv. 6 OK), los chips se etiquetan `sha256` / `md5` (desv. 5 OK) y el token es el
canónico de jwt.io `SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c` (desv. 4 OK). Las 6 desviaciones
describen la pantalla real, no una recordada.

### 5 · Consola de `compose.html` — enumeración literal y completa

`console-compose.txt` (y `console-compose-final.txt`, tras recorrer la página entera):

```
[info] %cDownload the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
You might need to use a local HTTP server (instead of file://): https://reactjs.org/link/react-devtools-faq font-weight:bold
```

`agent-browser errors` -> **vacío** (`errors-compose.txt`).

**Total: 1 mensaje. 0 `error`, 0 `warn`.** El único es de severidad `[info]`, lo emite
`react-dom.development.js` (dependencia de terceros fijada, `assets/vendor/`) y su contenido es
publicidad de la extensión React DevTools. **Se confirma la línea `[info]` que reportó el
implementer**: existe, es la única y está bien clasificada. Es texto, no una petición: la URL de
reactjs.org aparece en el mensaje, **no** en la pestaña de red.

Nota: la petición `.design-canvas.state.json` falla (fichero inexistente) y **no** genera error de
consola — está capturada en el código del canvas.

### 6 · Red de `compose.html` — lista completa (`net-compose.txt`)

17 peticiones, todas:

```
[Document]   file://.../docs/mockups/compose.html                          200
[Stylesheet] file://.../docs/mockups/assets/fonts.css                      200
[Stylesheet] file://.../docs/design-system/tokens/colors.css               200
[Stylesheet] file://.../docs/design-system/tokens/typography.css           200
[Stylesheet] file://.../docs/design-system/tokens/spacing.css              200
[Stylesheet] file://.../docs/design-system/tokens/effects.css              200
[Stylesheet] file://.../docs/design-system/tokens/base.css                 200
[Script]     file://.../docs/mockups/assets/vendor/react.development.js    200
[Script]     file://.../docs/mockups/assets/vendor/react-dom.development.js 200
[Script]     file://.../docs/mockups/assets/_ds_bundle.js                  200
[Script]     file://.../docs/mockups/assets/design-canvas.js               200
[Script]     file://.../docs/mockups/assets/ui-shared.js                   200
[Script]     file://.../docs/mockups/assets/variant-compose.js             200
[Image]      data:image/svg+xml,... (grid del canvas, inline)              200
[Fetch]      file://.../docs/mockups/.design-canvas.state.json             (falla, inocuo)
[Font]       file://.../docs/mockups/assets/fonts/Geist-Variable.woff2     200
[Font]       file://.../docs/mockups/assets/fonts/GeistMono-Variable.woff2 200
```

```
$ grep -oE 'GET [a-z]+:' net-compose.txt | sort | uniq -c
      1 GET data:
     16 GET file:
$ grep -E 'GET https?://' net-compose.txt
(sin coincidencias) -> 0 hosts externos
```

**Control positivo**: la captura no está vacía (17 entradas cubriendo todo el load, fuentes
incluidas), así que «0 externos» es *0 externos*, no *0 capturado*. El único `http://` del fichero
es el namespace XML `http://www.w3.org/2000/svg` **dentro** del `data:` URI del SVG del grid — no
es un target de petición.

**Contraste estático** (segunda fuente, independiente del navegador): `compose.html` y
`compose-mobile.html` enlazan `assets/fonts.css` y los 5 token files, y **no** enlazan
`docs/design-system/styles.css` ni `tokens/fonts.css` — que es donde vive el `@import` de Google
Fonts (línea 4). Los 5 token files enlazados no contienen ningún `@import` ni `http`.
`assets/fonts.css` declara `@font-face` con `url('./fonts/*.woff2')` locales. La cadena de carga
es cerrada por construcción, no solo por observación.

### 7 · Regresión de los 5 mockups previos + `compose-mobile` (`regresion-mockups.txt`)

El bundle compartido se tocó, así que se **abrieron los seis**, uno por sesión aislada. No se
aceptó «recuento de nodos idéntico» como sustituto. Capturas `06-regresion-*.png`.

| Mockup | Nodos | Consola | `errors` | Red |
|---|---|---|---|---|
| `field.html` | 189 | 1 x `[info]` React DevTools | vacío | 16 `file:` + 1 `data:`, 0 externos |
| `history.html` | 263 | 1 x `[info]` | vacío | 16 + 1, 0 externos |
| `login.html` | 87 | 1 x `[info]` | vacío | 16 + 1, 0 externos |
| `signup.html` | 88 | 1 x `[info]` | vacío | 16 + 1, 0 externos |
| `mobile.html` | 484 | 1 x `[info]` | vacío | 16 + 1, 0 externos |
| `compose-mobile.html` | 253 | 1 x `[info]` | vacío | 16 + 1, 0 externos |

Todos renderizan con contenido real y con Geist aplicada (verificado en captura, no solo por
recuento). `compose-mobile.html` monta también el `Segmented` («codificar» seleccionada) y muestra
la paleta **cerrada**, que es la desviación ya declarada en el README — correcto, no es defecto.

Nota metodológica: mis recuentos son `document.querySelectorAll('*').length` y salen **+23
constantes** sobre los del implementer (166/240/64/65/461). El offset idéntico en las cinco
páginas indica distinto ámbito de conteo (probablemente desde la raíz del artboard, sin `<head>`),
no DOM distinto. Sin consecuencias.

### 8 · Recompilación `variant-compose.jsx` -> `.js` (`recompile-diff.txt`)

Compilado **por mí** a un fichero de scratch (jamás sobre el committeado), con el preset resuelto
por ruta absoluta al `node_modules` del dlx (ver H3):

```
$ diff variant-compose.recompiled.js docs/mockups/assets/variant-compose.js
1115c1115
< })();
---
> })();
\ No newline at end of file

$ md5sum <(sed -e '$a\' recompilado) <(sed -e '$a\' committeado)
36c67bacfc15a4f56e913609e7c273b9  ...
36c67bacfc15a4f56e913609e7c273b9  ...
```

**Única diferencia: el salto de línea final.** Normalizado, md5 idéntico -> el `.js` committeado es
exactamente su `.jsx` compilado y nada más. No hay código sin fuente.

**Control cruzado** de la afirmación «reproduce `variant-claro.js` byte a byte» (TD.1): también se
recompiló `variant-claro.jsx` y el resultado es igual de exacto (mismo único delta del `\n` final,
md5 `fba0a932a413a13efe9912b71133a757` en ambos). La afirmación del README se sostiene.

### 9 · `pnpm gate` (`gate.txt`) — corrido por mí

```
$ pnpm lint && pnpm typecheck && pnpm format:check && pnpm knip && pnpm readme:status:check && pnpm test
...
All matched files use Prettier code style!
readme:status — la tabla del README coincide con planning.md OK
 Test Files  61 passed (61)
      Tests  679 passed (679)
   Duration  67.62s
exit code 0
```

Los 6 pasos en verde. Corrido **en aislamiento**, sin otro vitest concurrente: el flake conocido y
ajeno de `redact.test.ts` («barrido lineal < 500 ms») no se manifestó.

### 10 · README de mockups — página y desviaciones

Mapa página -> mockup: fila **`Componer | /compose | compose.html | ComposeClaro
(variant-compose.jsx) | T6.6–T6.8`** y fila **`(referencia responsive) | — | compose-mobile.html |
ComposeClaroM | referencia de T6.6–T6.8`**. Ambas presentes.

«Notas de fidelidad» -> sección nueva «Componer (`compose.html` / `compose-mobile.html`) —
desviaciones acordadas en F6», con **7 viñetas, todas fechadas `2026-07-22`**. Cubren las **6** de
la cabecera de F6:

| Desviación de la cabecera de F6 | ¿En el README? |
|---|---|
| Solo `HS256` | Sí |
| La cabecera del mockup no es la nuestra | Sí |
| **El COPY de privacidad es FALSO y NO se copia** *(añadida al planning HOY)* | Sí (ver nota) |
| El `SIGNED` es decorativo, no es golden | Sí (la más extensa) |
| Ids con el naming de §6.3 | Sí |
| La fila compuesta de `/history` no tiene mockup propio | Sí |

Séptima viñeta propia del implementer (paleta cerrada en `compose-mobile`), correcta y verificada.

**Nota sobre la sexta desviación** (la que el bucle añadió al `planning.md` hoy, `git diff` de una
sola línea): **está cubierta en sustancia y no se penaliza al implementer**. El README dice que el
copy del `Callout` y del aviso de firma «quedará desactualizado» porque «ambos dicen que el
secreto viaja al servidor» y la decisión 1 de F6 es la contraria. Dos matices menores, para
seguimiento y no para bloquear: el README lo enmarca como *desactualización* y el planning como
**copy falso** que sería «una promesa de privacidad peor que la real, y falsa»; y el README delega
en «la tarea que implemente la pantalla» donde el planning nombra **T6.8**. Merece alinearse
cuando se toque el fichero.

---

## Rarezas (no bloquean, pero quedan anotadas)

1. **H2** y **H3**: no incumplen cláusula, pero son afirmaciones del implementer que no se
   sostienen tal cual (exclusión «ya escrita» que no lo está; orden documentada que no corre).
2. **`docs/design-system/readme.md` es un fichero espejado**, así que la lista de exclusiones de
   TD.1 vive en un documento que no podemos editar sin romper la regla de solo-lectura. El criterio
   de exclusión debería vivir en un doc nuestro (`planning.md` o un `MIRROR.md` no espejado), no
   dentro del propio espejo. Deuda de arnés de TD.1.
3. **`Image` en `display/`**: alta real de upstream, espejada correctamente, y el planning pedía
   «si aparece algo más que `Segmented`, se anota — no se implementa aquí». Anotado: **queda sin
   traducir a código y sin tarea**. No es de T6.2, pero nadie lo recogerá si no se apunta.
4. La petición fallida `.design-canvas.state.json` aparece en la red de los 7 mockups. Inocua
   (`file://`, sin consola, sin host externo), pero es ruido permanente en la evidencia de red de
   toda tarea futura que verifique mockups.
5. Las capturas `.png` de la columna «Captura» del README siguen vacías, ya sin impedimento
   técnico. No lo pide ninguna cláusula.

---

## Coste real

**$0.** Ninguna API de pago. `DesignSync` (login de claude.ai), `agent-browser` (Chrome local),
`pnpm dlx` de Babel (registro npm) y `pnpm gate` (local) no facturan. Estimado en planning: **$0**.
Desviación: **0 %**.

## Condición de cierre — qué debe entrar en el commit de T6.2

El gate pasa, pero estas dos cosas **no se difieren**: son minutos y se pierden si se aplazan.

1. **Traer `readme.md` desde `DesignSync` al espejo** (H1) — la línea de `forms/` pasará a nombrar
   `Segmented` y el espejo dejará de contradecirse.
2. **Re-contrastar el contenido** (no solo las rutas) del resto del espejo contra `DesignSync`: el
   muestreo de esta verificación probó 2 ficheros y encontró 1 divergente, así que no autoriza a
   suponer los demás.

Recomendado en el mismo ciclo, sin bloquear: documentar la exclusión `uploads/` donde sea nuestro
(H2) y corregir la orden de Babel del README de mockups (H3).

Nada del mockup `compose.html` hay que tocar: esa mitad de la tarea está verificada y correcta.

## Seguimiento (fuera de T6.2)

- `Image` en `display/`: espejado bien, pero **sin tarea** que lo traduzca a código ni lo nombre.
- El índice de `readme.md` de **upstream** tampoco nombra `Image` — staleness real del proyecto de
  Claude Design, ajena a este repo.

---
---

# Re-verificación — 2026-07-22 (segunda pasada)

Tras el report de arriba, el bucle obligó a **regenerar el espejo por contenido, no por rutas**
(H1). Esta sección verifica ese delta. **No reescribe la primera pasada**: que hiciera falta una
segunda es parte de la evidencia.

- **Veredicto de la re-verificación**: **PASS**, con **una comprobación que NO he podido ejecutar**
  y que dejo abierta y nombrada (ver «Hueco»). No la he sustituido por nada.
- **Coste real acumulado**: **$0**.

## 🔴 Hueco — la paridad por CONTENIDO contra upstream NO está verificada por mí

**`DesignSync` ya no está disponible en esta sesión**: su servidor MCP se desconectó a mitad de
tarea y `ToolSearch select:DesignSync` devuelve *No matching deferred tools found*.

Por tanto **no he ejecutado el muestreo de 6 ficheros contra `get_file`** que pedía el encargo, y
**no lo he sustituido por ningún sucedáneo**. Es exactamente el fallo que esta ronda existía para
evitar (3 subagentes «resolvieron» el bloqueo copiando el espejo sobre sí mismo): una comparación
del espejo consigo mismo siempre pasa, y un PASS apoyado en eso sería un falso PASS perfecto.

**Lo que sí he podido verificar, y por qué es evidencia real y no autocomplaciente**: en la
**primera pasada yo mismo capturé salidas de `DesignSync` con la tool viva**. Esas capturas son
independientes del re-volcado de la ronda 2 y sirven de referencia:

| Comprobación | Referencia usada | Resultado |
|---|---|---|
| **Paridad de rutas de TODO el espejo** (no solo `forms/`) | mi snapshot de `list_files` de la ronda 1 | **106 = 106, `diff` vacío**. Local == upstream menos las 5 exclusiones, exactamente |
| **Contenido de `Segmented.jsx`** | mi fichero `remote-Segmented.jsx`, salida literal de `get_file` (ronda 1) | **idéntico** byte a byte tras el re-volcado |
| **Contenido de `readme.md` (H1)** | la línea de índice que `get_file` devolvió en la ronda 1 | **coincide exactamente**: `**forms/** — Button, IconButton, Input, Textarea, Field, Select, `**`Segmented`** |

**Y un descarte empírico del modo de fallo «autocopia», parcial pero real**: una autocopia es un
**no-op**. En los ficheros que cambiaron apareció contenido que **no existía antes en local**
(54 líneas nuevas en `_adherence.oxlintrc.json`, el `Image` de `display.card.html`, la línea de
`readme.md`). Para esos ficheros la autocopia queda **descartada por imposibilidad física**.

**Lo que queda abierto**: para los ~95 ficheros cuyo contenido **no** cambió, «descarga fiel» y
«autocopia» producen el mismo resultado y **son indistinguibles desde este repo**. No afirmo nada
sobre ellos. Debe cerrarlo quien tenga la tool, muestreando contra `get_file` —en particular
`_adherence.oxlintrc.json` y `Field.jsx`, que el encargo señalaba y yo no he podido cubrir.

## Resultado de las comprobaciones que sí eran ejecutables

| # | Pedido | Observado | |
|---|---|---|---|
| 1 | Paridad por contenido, muestreo de 6 vía `DesignSync` | **NO EJECUTABLE** — tool caída. No sustituida. Cubiertos 2 ficheros contra capturas propias de la ronda 1 | ⚠ |
| 2 | Ningún arreglo nuestro revertido | **los 3 intactos**, verificado en el fichero | OK |
| 3 | Sin regresión visual de los mockups por cambio de tokens | **ningún token cambió de contenido** → comprobación en navegador justificadamente omitida | OK |
| 4 | `pnpm gate` verde en aislamiento | **exit 0**, 61 ficheros / **679 tests**, sin flake de `redact.test.ts` | OK |

### 2 · Los 3 ficheros de riesgo conservan los arreglos AA (`6618d79`)

Verificado **en el árbol**, no en el informe:

```
Badge.jsx:10  fg: "var(--violet-subtle-fg)"
Badge.jsx:11  fg: "var(--cyan-subtle-fg)"
Button.jsx:18 danger: "var(--danger-hover)"
Field.jsx:6   const reactId = React.useId();
Field.jsx:13  const existing = children.props["aria-describedby"];
Field.jsx:15  "aria-describedby": existing ? `${existing} ${messageId}` : messageId,
```

`git status` de los tres: **vacío** → el re-volcado fue efectivamente un no-op sobre ellos.

**Corroboración independiente de que upstream sí los tiene** (no es la palabra del implementer):
el mensaje del commit `6618d79`, escrito el 2026-07-18 y por tanto ajeno a esta tarea, dice
literalmente *«Fixed source-first (mirror source + repo .tsx 1:1) and **pushed to Claude Design via
DesignSync**»*. Si se subieron entonces, que bajarlos hoy sea un no-op es el resultado esperado.

Los 4 tokens que esos arreglos necesitan **existen** en `docs/design-system/tokens/colors.css`
(`--gray-450` L17, `--danger-hover` L92, `--violet-subtle-fg` L101/L149, `--cyan-subtle-fg`
L102/L150, con las variantes de tema). El `_adherence.oxlintrc.json` no referencia tokens fantasma.

### 3 · Sin regresión de los mockups — omisión del navegador, justificada

`git status docs/design-system/tokens/` está **vacío**: los 6 token files se re-volcaron (mtime
13:42) y volvieron **byte-idénticos**. Los mockups los enlazan por ruta relativa, así que **no hay
movimiento visual posible**.

Refuerzo por mtime: los ficheros que los mockups cargan de verdad
(`assets/_ds_bundle.js` 12:55, `assets/variant-compose.js` 12:49, `compose.html` 12:50) **no se han
tocado desde antes** de mi sesión de navegador de la ronda 1 (13:12–13:16). La evidencia de
navegador de la primera pasada sigue aplicando **al mismo byte**. Por eso no reabro el navegador:
no porque sea costoso, sino porque no hay nada distinto que mirar.

### 4 · `pnpm gate` (`gate-reverify.txt`)

```
 Test Files  61 passed (61)
      Tests  679 passed (679)
   Duration  65.22s
exit code 0
```

Los 6 pasos en verde, corrido en aislamiento. El flake de `redact.test.ts` no se manifestó.

## Auditoría del delta re-volcado (los 11 ficheros)

Cuadran: **5 modificados** sobre ficheros trackeados (`_adherence.oxlintrc.json`, `readme.md`,
`display.card.html`, `Button.d.ts`, `Textarea.d.ts`) + **6 cards nuevas de `forms/`** reescritas
(no trackeadas, sin diff visible en git) = **11**.

- **`_adherence.oxlintrc.json`** (+54/-4): entran `Dialog`, `Image` (con sus 3 reglas de enum
  `ratio`/`radius`/`fit`), `SegmentedOption`, `Wordmark`; los grupos `components/brand/**` y
  `components/overlay/**` en `no-restricted-imports`; y los 4 tokens de a11y de TD.6
  (`--danger-hover`, `--violet-subtle-fg`, `--cyan-subtle-fg`, `--gray-450`) tanto en la lista
  `tokens` como en el mapa de tipos. Coincide con lo reportado, y era la laguna más cara: sin esas
  entradas el lint de adherencia **no mordía** sobre 4 componentes ni sobre los tokens AA.
- **`readme.md`**: la línea 16, exactamente el delta que predije en la ronda 1. H1 **cerrado**.
- **`display.card.html`**: añade `Image` al destructuring, al subtítulo y dos demos; sube el
  viewport `700x300 → 700x440`. Coherente con el alta de `Image`.
- **`Button.d.ts` / `Textarea.d.ts`**: upstream retiró las anotaciones `@startingPoint`. El espejo
  las retira también — que es lo correcto: se obedece a la fuente.
- **Las 6 cards de `forms/`**: el helper muerto `ModeSwitch` **ya no aparece** en ninguna de las 6.
  *Matiz verificado*: sí sigue en `Segmented.card.html`, pero **ahí está vivo** (se define en L11 y
  se usa en L15) — es su card. La limpieza fue la correcta, no una de más.

## Hallazgos previos: estado

| | Estado |
|---|---|
| **H1** (`readme.md` sin regenerar) | **CERRADO** — contenido coincide con mi captura de `get_file` de la ronda 1 |
| **H2** (exclusión `uploads/` sin documentar) | **CERRADO y mejor de lo pedido** — `.claude/skills/frontend/references/design-system.md` §1.1 documenta las 5 con su porqué, **en sitio nuestro**, y explica que no puede ir en el `readme.md` del espejo por ser fichero espejado. Añade el aviso al verificador de que las 5 ausencias no son ausencias |
| **H3** (orden de Babel que no corre) | **CERRADO** — la receta del README es ahora entorno efímero + preset por **ruta absoluta**, con la explicación del `ERR_MODULE_NOT_FOUND` y la nota de que se comprobó **en las dos direcciones**. Es la orden que yo ejecuté con éxito |

§1.2 («Regenerar ≠ parchear») y §1.3 («`DesignSync` NO es delegable a subagentes») recogen las dos
lecciones del incidente, incluida la de los 3 subagentes y la regla «exige de dónde salió el
contenido antes de creerte una paridad de espejo». Es la regla que me ha impedido cerrar el hueco
de arriba con un atajo.

## Rarezas nuevas

1. Las `*.card.html` del espejo cargan React desde **`https://unpkg.com/…`** (con `integrity`).
   Siempre fue así y **no afecta** a la cláusula de «0 CDNs», que es sobre `docs/mockups/**` — pero
   ahora hay 7 cards más en el espejo con esa característica: **nadie debe abrir un
   `docs/design-system/**/*.card.html` como evidencia de «0 hosts externos»**.
2. `_adherence.oxlintrc.json` perdió el salto de línea final al re-volcarse (`\ No newline at end of
   file`). Cosmético; y de hecho es coherente con salida directa de `get_file` (misma firma que los
   `.js` de Babel).
3. La deuda heredada a **T6.3** (reconciliar `_adherence.oxlintrc.json` con `eslint.config.ts`) es
   ahora más grande de lo que era cuando se anotó: el re-volcado añadió 4 componentes y 4 tokens al
   config del espejo. Conviene que T6.3 lo sepa antes de estimar.
