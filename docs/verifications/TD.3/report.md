# Verificación TD.3 — Primitivas de display + feedback (Badge · Card · CodeBlock · ConfidenceBar · CopyButton · Icon · Kbd + Callout · EmptyState · Spinner)

- **Tarea**: TD.3 · Primitivas de display/feedback del design system (`planning.md`, línea 125)
- **Fecha**: 2026-07-18
- **Ejecutor**: agente `verifier` · agent-browser (npx `-y`, Chrome `--no-sandbox`) · sesión `ttd3`
- **Sistema**: diff TD.3 SIN commitear sobre HEAD `8326593` · `pnpm --filter @app/web dev` (Next 16 + Turbopack) · `http://localhost:3000/design-system` HTTP 200. Sin BD/seeds (superficie 100% frontend estático). `git status` confirma que el código que corre es el del diff bajo verificación.

## Verificación esperada (literal de planning.md)
> comparación contra sus specimens en ambos temas; `CopyButton` y `Kbd` operables por teclado; `ConfidenceBar` legible sin depender solo del color (requisito de §7 O5: la ambigüedad se comunica, no se insinúa).

## Gate previo
`pnpm gate` desde la raíz → **verde** (exit 0). Suite: **164 tests en 25 ficheros passed** (ver `gate-output.txt`). Protocolo cumplido: CUA tras gate verde.

## Pasos ejecutados
1. Abrí `/design-system` con `--no-sandbox` (gotcha apparmor confirmado). Tema por defecto = **claro** (`data-theme`=null, `--surface`=#fff). Título correcto «Design system · devtools».
2. **Ambos temas — comparación vs specimens**: capturé `#display` (Badge/Card/CodeBlock/ConfidenceBar/CopyButton/Kbd/Icon) y `#feedback` (Callout/EmptyState/Spinner) en CLARO y OSCURO. Cambio de tema real vía el `ThemeSwitcher` (botón «Oscuro» e69 / «Claro» e68). **Verifiqué el flip real del atributo**: tras click, `data-theme` pasó a `dark` y `--surface` resolvió a un color oscuro (no fue no-op de clase `.dark`).
3. **CopyButton por teclado (cláusula dura)**: inyecté un espía grabador en `navigator.clipboard.writeText` ANTES de pulsar. Foco al botón (`data-slot=copy-button`, `activeElement` confirmado), y con `press Enter` y con `press Space` por separado, reseteando el log entre ambos.
4. **Kbd**: confirmé leyendo el specimen `docs/design-system/components/display/Kbd.jsx` que es un `<kbd>` semántico SIN tabIndex ni handlers (no-interactivo por diseño); la implementación `kbd.tsx` lo espeja 1:1.
5. **ConfidenceBar O5**: medí en el DOM ancho renderizado del relleno y texto de la etiqueta para los 5 valores (0.98/0.72/0.50/0.28/0.05).
6. **Contraste**: medí el ratio WCAG real (color pintado → sRGB vía canvas fillStyle, que resuelve `oklch`/`color-mix`/`lab` a bytes sRGB) de los badges de DataKind violet (json) y cyan (base64/uuid) en ambos temas.
7. Capturé la consola del navegador y cerré la sesión.

## Resultado observado vs esperado

| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | 10 primitivas fieles al specimen en AMBOS temas; sin tofu; iconos SVG nítidos; CodeBlock oscuro en ambos | Render fiel en claro y oscuro. Iconos SVG (26 glifos) nítidos, **cero tofu**. CodeBlock con superficie terminal oscura en claro Y oscuro | `display-{light,dark}-{1,2,3}.png`, `feedback-{light,dark}-{1,2}.png` | OK |
| 2 | CopyButton operable por teclado: Enter Y Espacio COPIAN de verdad + estado accesible conmuta | `writeText` invocado con `"valor-a-copiar"` con **Enter** (`__copyLog=["valor-a-copiar"]`, aria->"Copiado") y con **Espacio** (idem, sin scroll de página). Foco confirmado antes de cada pulsación | eval + `copybutton-copied-state.png` (foco visible + «check Copiado») | OK |
| 3 | Kbd operable por teclado | Spec no-interactivo (sin tabIndex/handlers); `<kbd>` semántico correcto -> cláusula satisfecha por ser el elemento semántico, no por operarlo (**pase explícito por vacuidad**) | `Kbd.jsx` + `kbd.tsx` | OK |
| 4 | ConfidenceBar legible sin depender solo del color (O5) | DOS canales no cromáticos cambian con el valor: **longitud** (98%->60.8px … 5%->3.1px) y **etiqueta numérica** (0.98…0.05, `toFixed(2)`). 0.98 vs 0.05 distinguibles sin color | eval + `display-*-2.png` | OK |
| 5 | Contraste texto/fondo de badges (regla cua.md) | Ver tabla abajo. Claro: todos AA. Oscuro: violet/cyan sub-AA -> **hallazgo de paleta del DS, no FAIL de TD.3** | eval canvas WCAG | routed |

## Tabla de ratios de contraste (medición independiente, canvas -> sRGB -> WCAG)

| Badge (texto/fondo) | Claro | Oscuro | Umbral | Notas |
|---|---|---|---|---|
| jwt (accent) | 6.97 OK | — | 4.5 | — |
| **json — violet** (text-violet-700 / color-mix violet-500 14% surface) | **6.25 OK** | **2.11 FALLA** | 4.5 | texto 11–12px -> NO "large", aplica 4.5 |
| **base64 / uuid — cyan** (text-cyan-700 / color-mix cyan-500 15% surface) | **5.12 OK** | **2.49 FALLA** | 4.5 | idem |
| url (success) | 5.14 OK | — | 4.5 | — |
| hash (danger) | 6.60 OK | — | 4.5 | — |
| timestamp (warning) | 4.70 OK | — | 4.5 | — |

**Confirmación del journal**: la entrada `2026-07-18 · DECISIÓN PENDIENTE` reporta violet 6.24/2.11 y cyan 5.17/2.49. Mi medición independiente da 6.25/2.11 y 5.12/2.49 — **confirmada (no refutada)**, dentro de redondeo.

**Ruteo del sub-AA oscuro (regla cua.md aplicada por mí, no por instrucción externa)**: el par sub-AA en oscuro proviene de valores del **DS**, no inventados por TD.3. `badge.tsx` es espejo **byte-a-byte** de `docs/design-system/components/display/Badge.jsx` (tono violet: fg `--violet-700`, bg `color-mix(in oklab, --violet-500 14%, --surface)`; tono cyan: fg `--cyan-700`, bg `color-mix … 15%`). Los hues secundarios violet/cyan solo tienen steps 100/500/700 y su texto oscuro no cambia con el tema -> 700 sobre superficie oscura cae a 2.x. Por cua.md, un sub-AA cuyo color viene del DS y cuyo componente reproduce fielmente el specimen es **hallazgo a rutear como decisión de paleta del DS, NO un FAIL de la tarea**. No hay consumidor de producto hasta F1, así que no hay daño en vivo. Si el valor lo hubiera inventado TD.3, sería FAIL — no es el caso (todo color traza a token/specimen).

## Consola del navegador
Limpia: solo `[info] React DevTools` (dev-only de terceros, muere en prod) y `[log] [HMR] connected`. **Cero errores/warnings de código propio** (`browser-console.txt`).

## Coste real
$0 — sin APIs de pago (superficie frontend estática). vs estimado: solo agentes.

## Veredicto
**PASS** — Las 10 primitivas de display+feedback renderizan fielmente al specimen en ambos temas (sin tofu, iconos SVG nítidos, CodeBlock terminal oscuro en claro y oscuro); CopyButton copia de verdad con Enter y con Espacio (espía confirmado, no solo el vire del icono) y conmuta el nombre accesible; Kbd satisface «operable por teclado» por ser el `<kbd>` semántico no-interactivo del spec; ConfidenceBar comunica la confianza por longitud + etiqueta numérica además del color (O5).

**Rarezas / hallazgo ruteado (no bloquea)**: badges DataKind violet (json) y cyan (base64/uuid) caen sub-AA en tema OSCURO (2.11 / 2.49; medición independiente confirma el journal). Es un defecto de la **paleta del DS** (Badge es espejo 1:1 del specimen), decisión de identidad de producto pendiente del usuario — reportado con la tabla de ratios, no un FAIL de TD.3. En tema claro todos los badges pasan AA.

## Evidencia (ficheros en docs/verifications/TD.3/)
- `gate-output.txt` — gate verde, 164 tests
- `display-light-{1,2,3}.png`, `display-dark-{1,2,3}.png` — #display ambos temas
- `feedback-light-{1,2}.png`, `feedback-dark-{1,2}.png` — #feedback ambos temas
- `01-display-light.png` (full), `copybutton-copied-state.png` — foco + «check Copiado»
- `browser-console.txt` — consola limpia

## Barrido de contraste AMPLIADO — TODA superficie que TD.3 introduce (cua.md: cada acento, dark Y light)

Medición independiente (canvas -> sRGB -> WCAG), fondo efectivo resuelto subiendo el árbol.

**Callouts (5 tonos) — título / cuerpo:**

| Callout | Claro (título/cuerpo) | Oscuro (título/cuerpo) | AA |
|---|---|---|---|
| info | 6.97 / 16.56 | 10.16 / 13.53 | OK |
| warning | 4.70 / 16.42 | 11.21 / 12.53 | OK |
| danger | 6.60 / 16.08 | 11.60 / 13.71 | OK |
| success | 5.14 / 16.32 | 11.91 / 13.25 | OK |
| security | 16.31 / 16.31 | 13.61 / 13.61 | OK |

**CodeBlock — colores de sintaxis sobre code-bg (terminal, oscuro en ambos temas):**

| Token | Claro | Oscuro | AA |
|---|---|---|---|
| code-key | 6.76 | 6.99 | OK |
| code-string | 6.70 | 6.93 | OK |
| code-number | 9.93 | 10.28 | OK |
| code-punc | 7.45 | 7.71 | OK |

**Badges de tono semántico en OSCURO** (complemento de la tabla en claro): accent 10.16 · success 11.91 · warning 11.21 · danger 11.60 — todos AA.

**Conclusión del barrido**: TODA superficie de acento que TD.3 introduce pasa AA en ambos temas — Callout (título+cuerpo), CodeBlock (sintaxis), y badges semánticos accent/success/warning/danger. La ÚNICA excepción sub-AA es violet/cyan de DataKind en oscuro (2.11/2.49), que traza al specimen del DS (Badge.jsx 1:1) -> hallazgo de paleta ruteado, no FAIL. Con esto la afirmación «todo color traza a token/specimen» queda **verificada por medición**, no asumida: nada sub-AA proviene de un valor inventado por TD.3. El «se ve dim» de los títulos danger/warning en oscuro era engañoso (miden 11.60/11.21 real).
