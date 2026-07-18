# Design system: de Claude Design a código

Cómo se traduce el design system de devtools (que vive en Claude Design) a tokens Tailwind v4 y componentes en `apps/web/src/components/ui/`. Este documento gobierna TODO valor visual del proyecto: colores, tipografía, radios, variantes, iconografía. La anatomía de componentes (props, composición, ubicación) vive en `references/components.md`. El DS se construye en la **fase TD** del planning (patrón en `bootstrap/references/fd-design-system.md`).

## Índice

1. [Fuente de verdad: Claude Design y su espejo en el repo](#1-fuente-de-verdad-claude-design-y-su-espejo-en-el-repo)
2. [Tokens en Tailwind v4 CSS-first](#2-tokens-en-tailwind-v4-css-first)
3. [Reglas de uso](#3-reglas-de-uso)
4. [components/ui como espejo del DS](#4-componentsui-como-espejo-del-ds)
5. [Mockups de página: el layout NO se inventa](#5-mockups-de-página-el-layout-no-se-inventa)
6. [Gotcha monorepo: @source](#6-gotcha-monorepo-source)
7. [Flujo de traducción DS→código](#7-flujo-de-traducción-dscódigo)
8. [Qué NO va aquí](#8-qué-no-va-aquí)

---

## 1. Fuente de verdad: Claude Design y su espejo en el repo

El design system vive en **Claude Design**: https://claude.ai/design/p/9d6b478a-191a-4d6c-8071-441488dd195f. El código lo OBEDECE, nunca al revés. Para que el bucle no dependa de la sesión autenticada, el proyecto está **espejado en `docs/design-system/`** (solo lectura; se regenera con la tool `DesignSync` — `list_files` + `get_file` — y JAMÁS se edita a mano).

Qué es cada cosa dentro del espejo:

| Ruta | Qué es y para qué se usa |
|---|---|
| `tokens/*.css` | Los valores crudos (colores, tipo, spacing, radios/sombras, motion). Se VUELCAN a `globals.css` (§2) |
| `components/<grupo>/<X>.jsx` | Spec de estructura/variantes/estados del componente. **No se copia tal cual** (usa estilos inline; nosotros Tailwind + cva): se lee como especificación |
| `components/<grupo>/<X>.prompt.md` | Intención y uso del componente — leerlo antes de implementarlo |
| `components/**/*.card.html` y `guidelines/*.card.html` | Specimens visuales: la referencia contra la que compara el gate CUA |
| `readme.md` | Fundamentos de contenido y voz del DS — leerlo antes de escribir copy nuevo |
| `_adherence.oxlintrc.json` | Ideas de lint de adherencia (base de la tarea de lint de la fase TD) |

Reglas de dirección:

- **Ningún valor visual se inventa en código.** Si falta un color, radio, tamaño o variante: (1) se añade al DS, (2) se vuelca como token, (3) se usa. Un valor "provisional" en un `className` es invisible para el DS y se fosiliza.
- **Si falta un componente entero** (el DS no define dialog, toast…): se diseña siguiendo las foundations del DS (las que su `readme.md` y tokens establezcan: hairlines, radios, focus ring único, sistema de iconos…) y **se sube a Claude Design vía `DesignSync` en la misma tarea**, regenerando el espejo después. Así el DS sigue siendo inventario completo.
- **Un cambio visual empieza en Claude Design**; el commit de código es la traducción, no la decisión.

## 2. Tokens en Tailwind v4 CSS-first

Tailwind v4 se configura en CSS (no existe `tailwind.config.js`). TODO valor visual vive en **un único fichero**: `apps/web/src/app/globals.css`, con tres bloques:

1. **Valores crudos, copiados VERBATIM del espejo** (`docs/design-system/tokens/*.css`): los valores tal cual — NO se convierten a otro espacio de color; la fidelidad literal hace los diffs contra el espejo triviales. El tema por defecto (dark o light), los temas alternativos y los acentos conmutables los dicta el DS: el default va en `:root`; cada alternativa es un override completo por atributo (`[data-theme=…]`, `[data-accent=…]`). Los tokens semánticos de estado (success/warning/danger/info…) son FIJOS: no cambian con tema ni acento. Si el DS define densidades, viven como var de escala (p. ej. `--ui-fs`) redefinida por `[data-density=…]`.
2. **`@theme inline {}`**: mapea cada token a Tailwind con **naming 1:1 con el DS** — genera las clases semánticas (`bg-surface`, `text-text-2`, `border-border-strong`, `rounded-md`, `shadow-sm`, `font-mono`… las que el DS del proyecto defina).
3. **`@layer base {}`**: defaults mínimos (fondo, texto, escala tipográfica base).

```css
/* apps/web/src/app/globals.css — ÚNICO fichero del repo con valores visuales.
   ESQUEMA: los nombres y valores concretos los dicta el espejo del proyecto. */
@import 'tailwindcss';

/* tema alternativo por atributo (el toggle escribe data-theme en <html>).
   Variante `light:`/`dark:` solo para lo no tokenizable (p. ej. invertir un bitmap). */
@custom-variant light (&:is([data-theme='light'] *));

/* ── 1) Valores crudos: VERBATIM de docs/design-system/tokens/*.css ─────────── */
:root {
  /* superficies, texto, bordes — de colors.css, tal cual */
  --bg: …;  --surface: …;  --surface-2: …;
  --border: …;  --border-strong: …;
  --text: …;  --text-2: …;  --text-3: …;

  /* elevación — el DS los llama --shadow-*; se conservan con ESE nombre 1:1 (ver nota
     abajo: `@theme inline` NO crea var() circular, así que NO hace falta renombrar a
     --elevation-*). */
  --shadow-sm: …;  --shadow-md: …;

  /* acento (default) */
  --accent: …;  --accent-hover: …;  --accent-soft: …;  --ring: …;

  /* semánticos FIJOS */
  --success: …; --success-soft: …; --success-border: …;
  --warning: …; --danger: …; --info: …;

  /* radios, escala tipográfica, motion — de sus tokens/*.css */
  --r-sm: …;  --r-md: …;  --r-lg: …;
}

[data-theme='light'] {
  /* override COMPLETO de superficies/texto/bordes/elevación — del espejo.
     Un token de tema sin par en el tema alternativo es un bug del volcado. */
}
[data-accent='…'] { /* --accent/--accent-hover/--accent-soft/--ring por acento */ }

/* ── 2) Mapeo a Tailwind: naming 1:1 con el DS ──────────────────────────────── */
@theme inline {
  --color-bg: var(--bg);                    /* → bg-bg */
  --color-surface: var(--surface);          /* → bg-surface */
  --color-border: var(--border);            /* → border-border */
  --color-text: var(--text);                /* → text-text */
  --color-text-2: var(--text-2);            /* → text-text-2 */
  --color-accent: var(--accent);            /* → bg-accent, text-accent */
  --color-success: var(--success);  --color-success-soft: var(--success-soft);
  /* …un mapeo por token del DS… */

  --radius-sm: var(--r-sm);   --radius-md: var(--r-md);   --radius-lg: var(--r-lg);
  /* elevación 1:1: el nombre del DS se conserva. `@theme inline` INSERTA el `var()` en
     la utilidad (no emite la variable), así que `--shadow-sm: var(--shadow-sm)` resuelve
     contra `:root` sin referencia circular — verificado contra un build real de Tailwind
     v4 (así lo hace globals.css del proyecto). El renombrado a --elevation-* que versiones
     anteriores de esta skill prescribían NO es necesario. */
  --shadow-sm: var(--shadow-sm);  --shadow-md: var(--shadow-md);

  /* fuentes: las que el DS fije, self-hosted (inyectadas en layout.tsx) */
  --font-sans: var(--font-app-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-app-mono), ui-monospace, monospace;

  /* motion: animaciones del DS (de motion.css) */
}

/* prefers-reduced-motion: toda animación de atención se apaga; el estado sigue
   visible por color/badge (nunca solo por movimiento) */

/* ── 3) Base mínima ─────────────────────────────────────────────────────────── */
@layer base {
  * { @apply border-border; }
  body { @apply bg-bg text-text font-sans; }
}
```

Lo de arriba es el ESQUEMA; la lista completa y exacta la dicta el espejo — el volcado literal es la primera tarea de la fase TD. Si Claude Design gana un token nuevo, se añade en los dos bloques (`:root`/overrides Y `@theme inline`) en el mismo commit.

## 3. Reglas de uso

> **Nota de proyecto (devtools): un solo acento.** TD.1 retiró los acentos conmutables — el DS de devtools define UN acento fijo. En la práctica **no existe `[data-accent=…]`** ni toggle de acento; solo conmuta el tema (`data-theme` claro/oscuro). Las menciones a "`data-accent`" y "≥2 acentos conmutables" de §2/§3/§7 son la maquinaria genérica de la skill, condicional a "si son conmutables": aquí NO se dispara. `--accent` sigue siendo marca/acción primaria, nunca estado (regla 3).

1. **Solo clases semánticas de token.** Las que emite el mapeo de §2 (`bg-surface`, `text-text-2`, `rounded-md`, `shadow-sm`, `font-mono`…). Prohibido fuera de `globals.css`: paletas crudas de Tailwind (`bg-blue-500`, `text-zinc-400`), hex/rgb inline (`bg-[#1e40af]`), valores arbitrarios crudos con corchetes (`rounded-[10px]`, `[color:#fff]`, `[--gap:16px]`). Por qué: un color crudo se salta el DS, no reacciona a tema/acento y hace imposible el retheme. El lint de adherencia de la fase TD lo bloquea; el pase `ds-reviewer` lo caza en el diff.
   - **Excepción sancionada: inyectar un token vía var** — `[--pulse-color:var(--warning)]` está PERMITIDO (mete un token existente en una custom property que otra clase consume); lo que se veta es el VALOR crudo (`[--gap:16px]`, `[color:#fff]`). La distinción es "token-vía-var (ok)" vs "valor literal (error)".
   - **Escape hatch para valores runtime/no-tokenizables: `style` inline, NO corchetes.** Anchos/porcentajes calculados en runtime (el `width` de una barra de progreso, insets `%` de un overlay) y los pocos valores px sin token que el espejo exija literales van por `style={{…}}` inline con los colores SIEMPRE tokenizados. Tailwind no puede emitir esos valores como clase y el lint prohíbe el corchete arbitrario, así que un `style` inline con un número/porcentaje runtime es correcto y el reviewer NO debe confundirlo con un color crudo. Un caller `style` siempre gana sobre el default.
2. **Temas y acento por atributo, nunca por media query.** El toggle escribe `data-theme`/`data-accent` en `<html>`; los componentes NO usan prefijos `dark:`/`light:` para colores — los tokens cambian solos. El prefijo de tema queda para lo no tokenizable.
3. **El acento JAMÁS significa estado.** `--accent` = marca/acción primaria (y puede ser conmutable). Los estados usan los semánticos FIJOS `success/warning/danger/info` (más los que el DS reserve para significados propios). Un botón de éxito pintado con accent o un error pintado con accent es un bug de DS.
4. **Los estados del dominio se mapean a los semánticos en UNA función pura** (con test unitario — `testing/references/frontend.md`):

```ts
// apps/web/src/components/<dominio>/status-class.ts
import type { ItemStatus } from '@app/core/contracts';

// Clases LITERALES: Tailwind solo genera clases escritas tal cual.
const STATUS_CLASS: Record<ItemStatus, string> = {
  draft: 'bg-text-4',
  active: 'bg-info',
  needs_review: 'bg-warning',
  done: 'bg-success',
  failed: 'bg-danger',
  archived: 'bg-border-strong',
};

export function statusClass(status: ItemStatus): string {
  return STATUS_CLASS[status];
}
```

   Hay exactamente **dos mecanismos sancionados**, ambos sobre los MISMOS tokens semánticos: (a) `statusClass()` — la agrupación estado→token vive SOLO ahí; (b) un componente que estila varias propiedades por estado usa `data-status={status}` + variantes literales `data-[status=…]:`. Un tercer mecanismo es un error de revisión.
5. **Nunca construyas clases por concatenación** (`bg-${color}`): Tailwind no las ve. Strings literales completos, elegidos por lookup o condicional.
6. **Espaciado**: si la escala del DS es la de 4 px, ES la escala estándar de Tailwind (`p-4`, `gap-2`). **El spacing FRACCIONARIO es el mecanismo de fidelidad al px, no el corchete arbitrario**: `size-4.5`=18px, `py-3.25`=13px… usan el `--spacing` de 4px de Tailwind v4 (`n × 4px`), son lint-limpios y casan el px del espejo EXACTO. Regla dura: cuando el espejo pide un valor entre pasos enteros, se usa el paso fraccionario (`size-4.5`), NUNCA se redondea a la escala entera (`size-5`) NI se escribe un arbitrario (`size-[18px]`). Solo font-size sin paso fraccionario cercano se "snapea" al token nombrado más próximo — anotado en el propio componente.
7. **Iconografía: un solo sistema, el que dicte el DS.** El sistema de iconos (glifos Unicode, una librería concreta, sprites propios) es una decisión del DS, no de cada componente; mezclar dos sistemas es un error de review. Si el DS no sanciona `lucide-react`, los imports que genere shadcn se sustituyen como parte del ajuste (§7). Emojis en la UI: nunca.
8. **Efectos (gradientes, blur, texturas): solo los que el DS defina explícitamente.** Ninguno se improvisa "para que luzca"; una excepción existe solo si el espejo la contiene como primitiva.
9. **El copy también es DS**: idioma, casing, qué va en `font-mono` (regla útil heredada: si un valor se puede pegar en un terminal o spreadsheet — costes, ids, timestamps — es mono) y cualquier patrón de presentación de datos que el `readme.md` del espejo establezca. Leerlo antes de escribir copy nuevo.

## 4. components/ui como espejo del DS

`apps/web/src/components/ui/` es el espejo 1:1 del inventario de Claude Design: un fichero kebab-case por componente. **El inventario de componentes lo define el espejo de cada proyecto** (`docs/design-system/components/`), no esta skill: la fase TD lo materializa y mantiene una tabla componente↔variantes leída del `.tsx` real (no del espejo — donde difieran, gana el código Y se señala la desviación). Si el código cambia, esa tabla se actualiza en la misma tarea; nunca en silencio.

> **OBLIGATORIEDAD (vinculante, aplica a F0 y en adelante).** Si existe el componente del DS (`components/ui/<x>`), **usarlo es OBLIGATORIO**. Escribir HTML crudo estilado equivalente —un `<button>` con clases, un `<div role="dialog">` a mano, una tabla de `<div>`s, un `<input>` suelto— **es un error de review, y el `ds-reviewer` DEBE rechazarlo**. No es una recomendación: la primitiva del DS ya trae los tokens correctos, la a11y de la primitiva Base UI y el `data-slot` que testing/CUA consultan; reimplementarla a mano rompe las tres cosas a la vez. Si el componente que necesitas NO existe, se crea siguiendo las foundations del DS y se sube a Claude Design (§1, §7) ANTES de usarlo — no se improvisa HTML crudo «provisional». **Antes de escribir HTML crudo, comprueba el inventario real de §4.1**: hay 18 primitivas (`Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Field`, `Badge`, `Card`, `CodeBlock`, `ConfidenceBar`, `CopyButton`, `Icon`, `Kbd`, `Wordmark`, `Callout`, `EmptyState`, `Spinner`, `Dialog`) — si una cubre tu caso, usarla es OBLIGATORIO y reimplementarla a mano la rechaza `ds-reviewer`.

Reglas del inventario:

- **Origen de cada componente**: los que el DS define se generan con `npx shadcn add <x>` (shadcn/ui sobre **Base UI** — Radix es opt-in que NO usamos) o a mano para los que shadcn no trae, y se ajustan al DS (variantes `cva` con los MISMOS nombres del espejo, clases semánticas de token, sistema de iconos del DS, `data-slot` conservado, a11y de la primitiva intacta).
- **Primitivas que el DS no definía** (dialog, toast, skeleton…): se crean desde las foundations del DS y se **suben a Claude Design** en la misma tarea (protocolo en §7.8), regenerando el espejo — el DS sigue siendo inventario completo.
- **Los componentes de producto y presentacionales de `ui/` son PUROS**: props planas, prohibido importar tipos de dominio de `@app/core` (regla de dependencia de SKILL.md). El wrapper de dominio (que conoce los contratos) vive en su carpeta de dominio y se construye en la tarea de la feature.
- **Desviaciones deliberadas del espejo se documentan**: si la traducción fiel choca con la a11y (p. ej. un grid-of-divs del espejo que debe ser `<table>` semántica) o con la plataforma (p. ej. un `<select>` nativo más fiel y accesible que un listbox portalizado), gana la a11y/plataforma, se anota la desviación en la tabla del inventario y se flaggea en el report de la tarea.
- **Utilidades locales de compilación NO se suben al DS**: `@utility` de Tailwind, custom properties puente y demás mecanismos que solo existen para que NUESTRO código Tailwind reproduzca patrones que las specs del DS ya expresan inline con primitivas existentes, se quedan en `globals.css`. Al DS solo suben **tokens y componentes** que sus specs puedan consumir; subir mecanismos de compilación inyecta contenido muerto. Un valor NUEVO (un color de scrim que el DS no tenía) sí es token y sí se sube.

### 4.1 Inventario real de `components/ui/` (leído de los `.tsx`, tras TD.2–TD.6)

**Esta tabla es la fuente de verdad del inventario: se lee del CÓDIGO, no del espejo.** Quien desarrolle sabe qué primitiva existe y con qué API SIN abrir cada fichero. Cada componente vive en `apps/web/src/components/ui/<fichero>.tsx`, expone su `data-slot`, y usa SOLO clases semánticas de token del DS. Al cambiar un componente, esta tabla se actualiza en la MISMA tarea (regla de §4). Son **18 primitivas**; las desviaciones deliberadas del espejo 1:1 van marcadas con `→ §4.2`.

| Componente | Fichero | Variantes (props de variante) | Props públicas clave | Notas |
|---|---|---|---|---|
| `Button` | `button.tsx` | cva: `variant` primary·secondary·ghost·danger · `size` sm(30px)·md(36px)·lg(44px) · `block` | `icon`, `iconRight` (IconName) + `ComponentProps<'button'>` | hover `danger`→`--danger-hover` (`→ §4.2`) |
| `IconButton` | `icon-button.tsx` | cva: `variant` ghost·secondary · `size` sm(28)·md(32)·lg(40) · `active` | `icon` (req), `label` (req → aria-label + title) | icon-only; `label` es el nombre accesible |
| `Input` | `input.tsx` | cva: `size` sm·md·lg · `invalid` · `mono` · (`withIcon` interno) | `icon` (IconName) + `ComponentProps<'input'>` (sin `size`) | `invalid` gana sobre focus; wrapper `data-slot="input-wrapper"` |
| `Textarea` | `textarea.tsx` | cva: `invalid` · `mono` (**default TRUE**) | `rows` (default 6) + `ComponentProps<'textarea'>` | campo de pegado principal; `invalid` gana sobre focus |
| `Select` | `select.tsx` | cva: `size` sm·md·lg · `invalid` · `mono` | `options` (`(string \| {value,label})[]`), `placeholder` | `<select>` **NATIVO** estilado (`→ §4.2`) |
| `Field` | `field.tsx` | — (sin cva) | `label`, `htmlFor`, `hint`, `error` (reemplaza hint), `required`, `style` | inyecta `aria-describedby` en el control vía `cloneElement` |
| `Badge` | `badge.tsx` | `tone` neutral·accent·success·warning·danger·violet·cyan · `size` sm·md · `outline` | `kind` (DataKind → tono+icono+label mono), `icon`, `mono`; exporta `KIND_META`, `DataKind`, `BadgeTone` | lookup `TONE` + color-mix inline, no cva (`→ §4.2`); violet/cyan usan `subtle-fg` (`→ §4.2`) |
| `Card` | `card.tsx` | cva: `padding` sm·md·lg · `inset` · `hover` | `ComponentProps<'div'>` | Server Component; hover por clase Tailwind, no `useState` (`→ §4.2`) |
| `CodeBlock` | `code-block.tsx` | — (sin cva) | `value`, `title`, `kind`, `wrap`, `copyable` (default true), `maxHeight` (default 320) | superficie **siempre oscura** (`--code-*`); compone `CopyButton` (`→ §4.2`) |
| `ConfidenceBar` | `confidence-bar.tsx` | — (sin cva) | `value` (0..1), `showValue` (default true), `width` (default 64) | O5: longitud + valor numérico, nunca solo color |
| `CopyButton` | `copy-button.tsx` | — (sin cva) | `value`, `label`, `size` sm·md, `withLabel`, `onCopy` | `'use client'`; aria-label conmuta a «Copiado» (`→ §4.2`) |
| `Icon` | `icon.tsx` | — (sin cva) | `name` (IconName, 26 glifos), `size` (default 16), `strokeWidth` (default 2); exporta `IconName`, `iconNames` | SVG-inline (paths lucide curados), decorativo `aria-hidden` (`→ §4.2`) |
| `Kbd` | `kbd.tsx` | — (sin cva) | `ComponentProps<'kbd'>` | `<kbd>` semántico presentacional (sin interacción) |
| `Wordmark` | `wordmark.tsx` | — (sin cva) | `size` sm·md·lg, `blink` (default true) | Server Component; px por `style` inline, blink para bajo reduced-motion (`→ §4.2`) |
| `Callout` | `callout.tsx` | `tone` info·warning·danger·success·security | `title`, `icon`, `children` | `role="note"`; lookup `TONE` + borde color-mix inline, no cva (`→ §4.2`) |
| `EmptyState` | `empty-state.tsx` | — (sin cva) | `icon` (default search), `title`, `description`, `action` (nodo) | estado cero centrado |
| `Spinner` | `spinner.tsx` | — (sin cva) | `size` (default 16), `label` | `role="status"`; keyframe propia `dtds-spin` 0.7s (`→ §4.2`) |
| `Dialog` | `dialog.tsx` | `confirmTone` primary·danger | `open`, `onOpenChange`, `onConfirm`, `title`, `description`, `confirmLabel`, `cancelLabel`, `children` | `'use client'`; `<dialog>` **NATIVO** de confirmación (`→ §4.2`) |

> **Iconos disponibles** (`IconName`, 26 glifos SVG-inline en `icon.tsx`): `copy`, `check`, `chevron-down`, `chevron-right`, `chevron-up`, `x`, `trash`, `clock`, `arrow-down`, `corner-down-right`, `alert-triangle`, `info`, `shield`, `loader`, `terminal`, `key`, `braces`, `link`, `hash`, `calendar`, `type`, `eye`, `eye-off`, `reopen`, `search`, `git-branch`. Ningún otro sistema de iconos está sancionado (§3.7): añadir un glifo = añadir su path a `icon.tsx` (y al espejo).

### 4.2 Desviaciones deliberadas del espejo 1:1 (referencia única del «por qué el código se aparta»)

El código de `components/ui/` es espejo 1:1 del inventario de Claude Design **salvo** en los puntos de abajo, donde la a11y, la plataforma o la fidelidad AA ganan sobre la copia literal del specimen (regla de §4, cuarto bullet). Cada uno está DOCUMENTADO en la cabecera del `.tsx` correspondiente; esta lista es el índice.

- **`Select` — `<select>` NATIVO** (no el listbox portalizado de Base UI). El propio spec del DS es un `<select>` nativo con prop `options`; a11y + plataforma apuntan al control nativo (foco, teclado, sin portal ni mocks de `matchMedia`/`ResizeObserver` en jsdom). `appearance-none` + chevron `Icon`. Patrón sancionado por §4.
- **`Dialog` — `<dialog>` NATIVO** (`showModal()`/`close()`), no una primitiva portalizada ni `@radix-ui/*` (vetada por TD.6, sin instalar). El nativo da gratis foco atrapado, Escape, `::backdrop`, `aria-modal` y restauración de foco. `m-auto` restaura el centrado nativo que el reset `margin:0` de Tailwind anula. Scrim `backdrop:bg-code-bg/70`: el DS **no** define token de scrim, se reutiliza la superficie «terminal» siempre-oscura al 70% (deuda: un token de scrim debería añadirse al DS en un DesignSync posterior). `max-w-105` = 420px por la rejilla de 4px. Foco inicial en «Cancelar».
- **`Icon` — SVG-inline** (paths lucide curados, ISC, 24×24, stroke-based), NO una librería de iconos NI glifos Unicode. Decisión del usuario en el VERIFY de TD.2: Geist no cubría varios code points (`copy` U+29C9, info, shield, key… salían tofu) y un carácter Unicode nunca es 1:1 con el SVG del specimen. El componente `Icon` YA existe en el espejo; solo se porta a TSX. Es OBEDECER al DS, no inventar.
- **`Badge` y `Callout` — sin `cva`.** El ejemplo de la convención (`references/components.md` §3, ilustrativo) usa `cva` con Badge como muestra; el código real usa un **lookup `TONE` (Record) + `color-mix(...)` inline** para fondos/bordes por tono (per-tono sobre `--surface`, sin clase de token para el color-mix — excepción sancionada de §3.1 para un color que no tiene utilidad de clase). Es una desviación del patrón `cva`, no de los tokens: cero rampas crudas, cero hex. La convención `cva` de §3 sigue vigente para el resto; no se reescribe (es "patrón, no contrato").
- **`Badge` violet/cyan — alias `--violet-subtle-fg` / `--cyan-subtle-fg`.** Los hues secundarios de data-kind (json=violet, base64/uuid=cyan) usan alias semánticos theme-aware de TEXTO (clases `text-violet-subtle-fg`/`text-cyan-subtle-fg`): step -700 en claro, -100 en oscuro, para pasar WCAG AA en AMBOS temas (la rampa fija `--violet-700`/`--cyan-700` fallaba AA en oscuro, ~2.1/2.5:1). Remediado en la tanda de deudas de DS previa a TD.7; retiró los `eslint-disable` que Badge arrastraba.
- **`Button` danger-hover — token `--danger-hover`.** El spec usaba `var(--red-700)` directo (rampa cruda, sin semántico). Se añadió el token semántico `--danger-hover` (= red-700, espeja a `--accent-hover`) en TD.2 y se remedió el drift de la fuente en la tanda de deudas; contraste AA verificado (blanco/red-700 = 7.36).
- **`Card` — hover por clase, no `useState`.** El spec conmuta `borderColor`/`boxShadow` con `React.useState` (`onMouseEnter/Leave`); aquí se hace con `hover:border-border-strong hover:shadow-md` de Tailwind — resultado idéntico y SIN estado, así Card se queda como **Server Component**.
- **`CopyButton` — hover por clase + a11y enriquecida.** Mismo cambio de `useState`→clase que Card; además el `aria-label` conmuta a «Copiado» al copiar (el spec lo dejaba fijo, invisible para lector de pantalla). El color de hover se puede recolorear desde fuera sobrescribiendo `--surface-2` inline (lo hace `CodeBlock` sobre su cabecera oscura, con `rgba(255,255,255,.08)` — hardcode menor documentado, el DS no define token de hover para superficie de código).
- **`Wordmark` — `text-text` + px inline.** El specimen usa `--gray-0` (blanco-sobre-oscuro, solo para la card); aquí `text-text` (adaptativo al tema). Los tamaños (font 22/34/44, cursor 7×14…11×28, radio 1px, tracking -0.01em) no tienen token → van por `style` inline (excepción §3.1 para px no tokenizables), con los colores SIEMPRE en clase. El blink para bajo `prefers-reduced-motion` conservando visibilidad.
- **`Spinner` — keyframe propia.** El giro es una keyframe `dtds-spin` a 0.7s lineal (no `animate-spin` de Tailwind, que gira a 1s) para no desviarse del spec; el SVG del anillo se porta verbatim (irreducible a clases, misma excepción que `Icon`). Se apaga con `prefers-reduced-motion`.

## 5. Mockups de página: el layout NO se inventa (vinculante, F0 en adelante)

Cada página con pantalla propia tiene un **mockup aprobado por el usuario** en `docs/mockups/` (catálogo en `docs/mockups/README.md`): HTML+PNG construidos sobre los tokens del DS. La tarea de planning que desarrolla la página lo nombra en su línea `- **Mockup**: docs/mockups/<x>.html`.

> **OBLIGATORIEDAD.** Al desarrollar una página, **se parte de su mockup**: se reproduce ESE layout (estructura, jerarquía, secciones, densidad) con los componentes `components/ui/` del DS. **NO** se inventa una página desde cero, **NO** se copia el HTML crudo del mockup (el mockup es la *intención visual*, no código de producción: sus `<div>` estilados a mano se traducen a los componentes reales del DS — §4). Una página que se desvíe del mockup sin acuerdo explícito con el usuario **es un error de review, y el reviewer DEBE rechazarla** — igual que rechaza HTML crudo en vez de un componente del DS. El implementer LEE el mockup (`docs/mockups/<x>.html` y su `.png`) ANTES de escribir la página. Si el mockup y el DS entran en conflicto (un patrón del mockup que ningún componente cubre), se resuelve como en §1/§7: se crea el componente en el DS, no se improvisa. Páginas sin mockup en `docs/mockups/`: se acuerda el layout con el usuario antes de implementar.

Corolario: **manda el mockup sobre lo que esta skill esboce** (jerarquía PRD/planning > skills). Si un mockup contradice un patrón de layout descrito aquí, se sigue el mockup y se actualiza la skill deliberadamente — nunca se publica un layout que nadie va a construir.

## 6. Gotcha monorepo: @source

Tailwind v4 escanea el source del propio app, pero **no ve los paquetes del workspace**. Mientras toda la UI viva en `apps/web` (decisión por defecto del template: no hay `packages/ui`) no aplica. Si algún día un paquete exporta JSX con clases Tailwind, declararlo en `globals.css` (`@source "../../../../packages/ui/src/**/*.{ts,tsx}"`) es parte de la MISMA tarea que crea el paquete — el síntoma del olvido es traicionero: componentes SIN estilos y ningún error.

## 7. Flujo de traducción DS→código

1. **Leer el espejo**: `docs/design-system/components/<grupo>/<X>.jsx` (estructura, variantes, medidas exactas), `<X>.prompt.md` (intención) y el `*.card.html` correspondiente (referencia visual del gate CUA). Si el espejo parece desactualizado respecto a Claude Design, regenerarlo ANTES (vía `DesignSync`).
2. **Auditar tokens**: ¿todo lo que usa el componente existe ya en `globals.css`? Lo que falte se vuelca primero (valor en `:root` Y sus overrides de tema/acento + `@theme inline`). Si el componente necesita un valor que el DS no define, PARA: se añade al DS antes (§1).
3. **Generar la base**: `npx shadcn add <componente>` → fichero kebab-case en `components/ui/` sobre Base UI. Para componentes sin equivalente shadcn, se escriben a mano con el mismo patrón (cva + `data-slot`).
4. **Ajustar al DS**: variantes cva con los nombres exactos del DS; sustituir clases no semánticas e imports de iconos ajenos al sistema del DS (§3.7); conservar `data-slot` y la a11y de la primitiva (SKILL.md, principio 4).
5. **Verificar API real**: Base UI evoluciona — ante duda de prop/composición, la doc actualizada (Context7 si está configurado) antes que la memoria.
6. **Showcase**: añadir la sección del componente a `/design-system` (todas las variantes × estados) — es lo que el verifier compara contra el `*.card.html`.
7. **Verificación visual**: `next-dev-loop` + `web-design-guidelines` (contraste, hover/focus/disabled, todos los temas y ≥2 acentos si son conmutables); si cierra tarea del planning, gate CUA con evidencia (`testing/references/cua.md`). Lo visual NO se cubre con unit tests.
8. **Si el componente es nuevo para el DS** (no existía en Claude Design): convertirlo al formato del proyecto (`.jsx` + `.d.ts` + `.prompt.md` + card) y subirlo vía `DesignSync` (`finalize_plan` → `write_files`), regenerando el espejo local después.

## 8. Qué NO va aquí

- **Anatomía de componentes** (props, composición server/client, dónde vive un componente de dominio, naming) → `references/components.md`.
- **Formularios** (react-hook-form + zodResolver, aunque usen componentes del DS) → `references/forms.md`.
- **Tests de componentes** → `testing/references/frontend.md`; el gate de cierre → `testing/references/cua.md`.
- **Rutas, layouts y consumo de la API** → `references/architecture.md`.
- **El patrón de tareas de la fase TD** → `bootstrap/references/fd-design-system.md`.
