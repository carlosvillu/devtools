import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guarda de CONTRASTE WCAG AA para los badges de DataKind con hue secundario:
 * json (violet) y base64/uuid (cyan). Estos fallaban el ratio 4.5:1 en tema OSCURO
 * (violet ~2.1:1, cyan ~2.5:1) porque el texto usaba la rampa fija `--violet/cyan-700`
 * (colores oscuros) sobre un fondo de badge oscuro. El fix introdujo los alias
 * semánticos theme-aware `--violet/cyan-subtle-fg` (-700 en claro, -100 en oscuro).
 *
 * QUÉ EJERCITA (y qué no): lee los VALORES REALES de `globals.css` (no hardcodea),
 * resuelve la cadena de `var()` por tema, reproduce el `color-mix(in oklab, …)` del
 * fondo del badge (Badge.tsx) y calcula el ratio WCAG. Convierte «viola/cyan pasan AA
 * en AMBOS temas» en ejecutable, y — como control negativo permanente — falla si el
 * texto vuelve a un step demasiado oscuro en oscuro (o si alguien regresa el claro).
 * NO comprueba el pintado real del navegador (eso es CUA); comprueba los tokens fuente.
 */

const globalsPath = resolve(import.meta.dirname, 'globals.css');
const globals = readFileSync(globalsPath, 'utf8');

// ── Parser de tokens: :root (claro) + [data-theme='dark'] (override) ──────────
// El selector se compara EXACTO contra el texto anterior a `{` (saltando `@custom-variant
// …;` y `@import …;`, cuyo selector no casaría). Se fusionan TODOS los bloques que casen
// (globals.css declara varios `:root {`), igual que hace globals.tokens.test.ts.
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}
function collectProps(css: string, selector: string): Map<string, string> {
  const clean = stripComments(css);
  const map = new Map<string, string>();
  let i = 0;
  while (i < clean.length) {
    const open = clean.indexOf('{', i);
    if (open === -1) break;
    const preamble = clean.slice(i, open);
    const sel = preamble
      .slice(Math.max(preamble.lastIndexOf(';'), preamble.lastIndexOf('}')) + 1)
      .trim();
    let depth = 0;
    let j = open;
    for (; j < clean.length; j++) {
      if (clean[j] === '{') depth++;
      else if (clean[j] === '}' && --depth === 0) break;
    }
    if (sel === selector) {
      const body = clean.slice(open + 1, j);
      const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(body)) !== null) map.set(m[1]!, m[2]!.trim().replace(/\s+/g, ' '));
    }
    i = j + 1;
  }
  if (map.size === 0) throw new Error(`No se encontró ningún bloque \`${selector}\` con tokens`);
  return map;
}
const rootProps = collectProps(globals, ':root');
const darkProps = collectProps(globals, "[data-theme='dark']");
function themeMap(theme: 'light' | 'dark'): Map<string, string> {
  return theme === 'dark' ? new Map([...rootProps, ...darkProps]) : rootProps;
}
/** Resuelve un token siguiendo cadenas `var(--x)` hasta un literal (oklch/#hex). */
function resolveToken(name: string, theme: 'light' | 'dark'): string {
  const map = themeMap(theme);
  let value = map.get(name);
  if (value === undefined) throw new Error(`Token ${name} ausente en tema ${theme}`);
  let guard = 0;
  while (value.startsWith('var(')) {
    const inner = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value)?.[1];
    if (!inner) break;
    const next = map.get(inner);
    if (next === undefined) throw new Error(`Referencia ${inner} sin definir (tema ${theme})`);
    value = next;
    if (++guard > 20) throw new Error(`Ciclo de var() resolviendo ${name}`);
  }
  return value;
}

// ── Color: oklch/#hex → oklab → sRGB lineal → luminancia relativa → WCAG ──────
type Oklab = [number, number, number];
function oklchLiteralToOklab(lit: string): Oklab {
  const nums = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(lit);
  if (!nums) throw new Error(`No es oklch(): ${lit}`);
  const L = Number(nums[1]);
  const C = Number(nums[2]);
  const h = (Number(nums[3]) * Math.PI) / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
}
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function hexToOklab(hex: string): Oklab {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const r = srgbToLinear(parseInt(full.slice(0, 2), 16) / 255);
  const g = srgbToLinear(parseInt(full.slice(2, 4), 16) / 255);
  const b = srgbToLinear(parseInt(full.slice(4, 6), 16) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function toOklab(literal: string): Oklab {
  return literal.startsWith('#') ? hexToOklab(literal) : oklchLiteralToOklab(literal);
}
/** color-mix(in oklab, A p%, B): media ponderada en oklab. */
function mixOklab(a: Oklab, pA: number, b: Oklab): Oklab {
  const w = pA / 100;
  return [a[0] * w + b[0] * (1 - w), a[1] * w + b[1] * (1 - w), a[2] * w + b[2] * (1 - w)] as Oklab;
}
function oklabToLinearSrgb([L, a, b]: Oklab): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
function relLuminance(o: Oklab): number {
  const [r, g, b] = oklabToLinearSrgb(o).map((c) => Math.max(0, Math.min(1, c)));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(fg: Oklab, bg: Oklab): number {
  const a = relLuminance(fg);
  const b = relLuminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Ratio texto↔fondo de un badge de hue secundario, tal como lo pinta Badge.tsx. */
function badgeContrast(hue: 'violet' | 'cyan', mixPct: number, theme: 'light' | 'dark'): number {
  const fg = toOklab(resolveToken(`--${hue}-subtle-fg`, theme));
  const bgMixSource = toOklab(resolveToken(`--${hue}-500`, theme));
  const surface = toOklab(resolveToken('--surface', theme));
  const bg = mixOklab(bgMixSource, mixPct, surface);
  return contrast(fg, bg);
}

const AA = 4.5;
// Porcentajes de color-mix del fondo, 1:1 con Badge.tsx (violet 14%, cyan 15%).
const VIOLET_MIX = 14;
const CYAN_MIX = 15;

describe('Contraste WCAG AA de los badges de DataKind (hue secundario)', () => {
  it('json (violet) pasa AA en tema CLARO y OSCURO', () => {
    expect(badgeContrast('violet', VIOLET_MIX, 'light')).toBeGreaterThanOrEqual(AA);
    expect(badgeContrast('violet', VIOLET_MIX, 'dark')).toBeGreaterThanOrEqual(AA);
  });

  it('base64/uuid (cyan) pasa AA en tema CLARO y OSCURO', () => {
    expect(badgeContrast('cyan', CYAN_MIX, 'light')).toBeGreaterThanOrEqual(AA);
    expect(badgeContrast('cyan', CYAN_MIX, 'dark')).toBeGreaterThanOrEqual(AA);
  });

  it('control negativo: la rampa fija -700 (el bug) SÍ fallaría AA en oscuro', () => {
    // Prueba que el test MUERDE: con el valor viejo (--violet/cyan-700 en oscuro) el
    // ratio cae por debajo de AA. Si esto dejara de fallar, el guard no valdría nada.
    const oldViolet = contrast(
      toOklab(resolveToken('--violet-700', 'dark')),
      mixOklab(
        toOklab(resolveToken('--violet-500', 'dark')),
        VIOLET_MIX,
        toOklab(resolveToken('--surface', 'dark')),
      ),
    );
    const oldCyan = contrast(
      toOklab(resolveToken('--cyan-700', 'dark')),
      mixOklab(
        toOklab(resolveToken('--cyan-500', 'dark')),
        CYAN_MIX,
        toOklab(resolveToken('--surface', 'dark')),
      ),
    );
    expect(oldViolet).toBeLessThan(AA);
    expect(oldCyan).toBeLessThan(AA);
  });
});
