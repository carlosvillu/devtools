# devtools — Design System

**devtools** is a single-field web utility for developers. You paste anything on your clipboard — a JWT, a base64 blob, a Unix timestamp, unreadable JSON, a URL with params — and the product figures out what it is, applies the right transformation, and **re-detects on the result**, chaining steps until it reaches something readable. The whole chain is shown and walkable; every intermediate step is inspectable and copyable.

This design system contains the visual foundations and the reusable UI components used across the product's screens (`/` the paste field, `/history`, `/login`, `/signup`). Per the current scope, **only components are built here — not the product pages**.

## Sources

- **PRD:** devtools PRD v1.0 (2026-07-16), author carlosvillu + Claude. Pasted into the project brief; no external link. Stack: monorepo TS · Next.js App Router + Tailwind v4 · packages/core (Zod) · Postgres + Drizzle · Base UI/shadcn · pino · own VPS. AGPL-3.0, public repo.
- **No codebase, Figma, or brand assets were provided.** There is no existing UI to recreate and **no logo** — the brand is rendered as a monospace wordmark (see Iconography / Brand). The visual direction below was chosen from scratch to fit the product: a technical, monospace-forward developer tool in the Next.js / Tailwind / shadcn idiom.

## Component index

Namespace for card/consumer mounting: `window.DevtoolsDesignSystem_9d6b47`.

**forms/** — `Button`, `IconButton`, `Input`, `Textarea`, `Field`, `Select`, `Segmented`
**display/** — `Icon`, `Badge`, `ConfidenceBar`, `CopyButton`, `CodeBlock`, `Kbd`, `Card`
**feedback/** — `Callout`, `Spinner`, `EmptyState`
**overlay/** — `Dialog`
**brand/** — `Wordmark`
**chain/** — `StepCard`, `ChainSummary`
**history/** — `HistoryRow`

`Badge` also exports `KIND_META` (the DataKind → colour/icon map). Every component has a sibling `.d.ts` (props + contract) and `.prompt.md` (usage). See each directory's `*.card.html` for a live demo.

### Intentional additions (no source inventory to mirror)
Because no component library was supplied, the set was authored from the product's own needs (PRD §6–§9):
- **Icon** — wraps a curated Lucide glyph set; the product's single icon system.
- **StepCard / ChainSummary / HistoryRow** — product composites for the chain (O2–O5) and history (D7). They compose the primitives, they don't reimplement them.
- **ConfidenceBar** — visualises detector confidence (I8), central to the ambiguity UX.
- **Dialog** — confirmation modal (delete one / delete all, D7/§9) built on the native `<dialog>` element (focus trap, Escape, `::backdrop`, `aria-modal` with no library); composes `Button`.
- **Wordmark** — the product has no logo; the brand is the monospace `devtools` wordmark with a blinking accent cursor (see `guidelines/brand-wordmark.html`), here as a reusable component.

## Files

- `styles.css` — the single entry point consumers link. `@import`s only.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css`, `fonts.css`.
- `components/<group>/` — the components above (`.jsx` + `.d.ts` + `.prompt.md` + one `*.card.html`).
- `guidelines/` — foundation specimen cards (Type, Colors, Spacing, Brand).
- `SKILL.md` — Agent-Skill wrapper.

### Deliberately excluded from this mirror

This mirror is the **design source** (tokens, component `.jsx`/`.d.ts`/`.prompt.md`, guidelines,
card demos). It **intentionally does not** include the compiled/generated artefacts that the
Claude Design panel builds from that source:

- `_ds_bundle.js` — the compiled runtime bundle that exposes the components on
  `window.DevtoolsDesignSystem_9d6b47`. It is a build output, not design source.
- `_ds_manifest.json` — the panel's generated card index.
- `.thumbnail` / `thumbnail.html` — the panel's generated homepage tile.

Their absence is on purpose — read it as *complete design source, minus generated output*, not as
an incomplete mirror. (Note: `docs/mockups/assets/_ds_bundle.js` is a **separate copy** brought in
so the page mockups can render standalone — see `docs/mockups/README.md`. That copy does not
contradict this exclusion, which is only about the design-source mirror under `docs/design-system/`.)

---

## CONTENT FUNDAMENTALS

**Language: Spanish (es-ES), informal "tú".** The product speaks to a developer in a hurry, plainly and without ceremony. UI copy examples from the PRD: *"caducó hace 3 horas"*, *"También podría ser…"*, *"No se detectó nada"*, *"Pega un JWT, base64, JSON…"*.

- **Tone:** direct, technical, honest. It names what it did (*"base64 → json → formateado"*) rather than selling. It admits uncertainty out loud instead of guessing silently — *"También podría ser un timestamp"* — because surfacing ambiguity is the product's whole value (O5, I8).
- **Casing:** sentence case everywhere. No Title Case buttons, no ALL-CAPS except the small uppercase micro-labels (tracking-wide) used sparingly for section eyebrows. Transform ids and data types stay lowercase and mono: `jwt.decode`, `base64`, `unix_timestamp`.
- **Person:** address the user as *tú* ("lo que pegas", "no lo uses con secretos vivos"). The product refers to itself as "devtools", lowercase.
- **Numbers & values:** always monospace, tabular. Timestamps get a natural-language gloss ("en 2 días"). Confidence is a `0.00` decimal.
- **Honesty over polish:** the required privacy line — *"devtools procesa lo que pegas en el servidor. No está pensado para secretos de producción vivos."* — is stated plainly, not buried.
- **No emoji.** Not part of the brand. Iconography is Lucide (see below).
- **No dead ends:** empty/failure states always explain what was tried, never a blank screen ("no se detectó nada y con qué se intentó").

---

## VISUAL FOUNDATIONS

**Overall vibe:** a precise, quiet developer tool. Light chrome, **dark data**. The signature move is the contrast between a clean light UI and always-dark, monospace "terminal" blocks where values live.

- **Colour:** cool-grey neutrals (hue 265) carry the UI. A single brand hue — **technical blue** (`--accent`, oklch ~0.52/0.20/258) — marks the primary action, focus rings, and links. Semantics: green (success / high confidence), amber (warning / medium), red (danger / error). Max restraint: no gradients, no decorative colour fields. Each **DataKind** gets one fixed hue + icon (jwt=blue, json=violet, base64=cyan, timestamp=amber, url=green, uuid=cyan, hash=red, text=grey) so a type always reads the same everywhere.
- **Type:** **Geist** (UI/prose) + **Geist Mono** (all data, tokens, timestamps, code). Mono is a first-class citizen — this is a developer tool. Display/heading use tight tracking (`-0.02em`) and semibold/bold; body is 15px at 1.55 line-height. See substitution note below.
- **Backgrounds:** flat surfaces only. App background is `--gray-50`; cards are white. Data/code blocks are always `--gray-950` regardless of theme (the terminal motif). No images, patterns, textures, or gradients — the content is the texture. A dark theme (`.dark` scope) inverts the UI.
- **Spacing & layout:** 4px base grid. Comfortable but efficient density. On mobile the chain stacks vertically — never a horizontal table.
- **Corner radii:** crisp, not soft. 6px default (buttons, inputs, badges → 4px), 8px code blocks, 12px cards, full for pills/step indices.
- **Borders:** 1px `--border` (`--gray-200`) is the default separator; `--border-strong` for interactive controls. Borders do more work than shadows here.
- **Shadows / elevation:** low and functional. `--shadow-sm` on resting cards, `--shadow-md` on hover, `--shadow-lg` for overlays. No dramatic elevation.
- **Cards:** white surface, 1px border, `--shadow-sm`, 12px radius. Not colour-accented, no coloured left-border trope.
- **Hover states:** solid buttons darken (`--accent` → `--accent-hover`); bordered/ghost controls tint to `--surface-2`; history-row actions fade in from ~35% to full opacity. Links darken + underline.
- **Press / focus:** focus shows a 3px translucent-blue ring (`--focus-ring`); no shrink/scale animations.
- **Motion:** quick and functional — 100–250ms, `cubic-bezier(0.2,0,0,1)`. Fades and width/opacity transitions (confidence bar fill, row hover). **No bounce, no spring, no attention-seeking animation.** The only looping motion is a terminal cursor blink on the wordmark.
- **Transparency / blur:** minimal. Subtle colour-mix tints for badge/callout backgrounds; no glassmorphism or backdrop blur.
- **Imagery:** none. The product has no photography or illustration; its imagery *is* code.

---

## ICONOGRAPHY

- **System:** [Lucide](https://lucide.dev) (ISC-licensed), 24×24 viewBox, 2px stroke, round caps/joins. This is the natural set for a Next.js / shadcn tool. A curated subset is embedded inline in `components/display/Icon.jsx` (so it ships in the bundle with no runtime fetch) and exposed as `<Icon name="…" />`. Add more glyphs by pasting their Lucide path into the `PATHS` map.
- **Available glyphs:** copy, check, chevron-down/right/up, x, trash, clock, arrow-down, corner-down-right, alert-triangle, info, shield, loader, terminal, key, braces, link, hash, calendar, type, eye, eye-off, reopen, search, git-branch.
- **DataKind icons** (fixed, via `KIND_META`): jwt=key, json=braces, base64=terminal, unix_timestamp=clock, url=link, uuid=hash, hash=hash, text=type.
- **No emoji, no Unicode-glyph icons, no PNG icons.** Icons inherit `currentColor` and are sized in px.
- **No logo / brand mark.** None was provided; do **not** invent one. The brand appears as the monospace wordmark **`devtools`** with a blinking accent cursor block (see `guidelines/brand-wordmark.html` and `thumbnail.html`).

---

## SUBSTITUTIONS & CAVEATS

- **Fonts:** Geist + Geist Mono are loaded from **Google Fonts** via `@import` in `tokens/fonts.css` (no binaries were supplied). Because they load as a remote stylesheet, the compiler reports "Fonts: (none)" — the webfonts still render for consumers, but if you want them shipped as project-hosted `@font-face` files, provide the `.woff2` files and I'll wire them in.
- **No source UI:** all visual decisions are original, chosen to fit the PRD. If there is a real devtools brand/codebase/Figma, attach it and I'll align tokens, type, and components to it.
