import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Fidelidad del volcado de tokens: `globals.css` vs el espejo del DS.
 *
 * QUÉ CAPA EJERCITA ESTO, LITERALMENTE (y qué NO):
 *  - SÍ: compara el TEXTO de `apps/web/src/app/globals.css` contra el TEXTO de
 *    `docs/design-system/tokens/*.css`. Convierte «volcado VERBATIM» en ejecutable
 *    y protege contra el drift del día que alguien regenere el espejo con
 *    `DesignSync` y no revuelque, o toque un valor a mano en globals.css.
 *  - NO: no comprueba que el espejo coincida con Claude Design (eso es trabajo de
 *    `DesignSync`, no de un test), ni que el navegador PINTE esos valores. La
 *    comparación visual contra `guidelines/` es one-shot del verifier.
 *
 * Es decir: guarda la relación globals.css ↔ espejo, que es exactamente la cláusula
 * «volcado verbatim» de la Entrega de TD.1. Ni más ni menos.
 */

const here = import.meta.dirname;
const repoRoot = resolve(here, '../../../..');
const mirrorDir = resolve(repoRoot, 'docs/design-system/tokens');
const globalsPath = resolve(repoRoot, 'apps/web/src/app/globals.css');

/** Ficheros del espejo que aportan valores crudos (fonts.css solo trae un @import). */
const MIRROR_FILES = ['colors.css', 'typography.css', 'spacing.css', 'effects.css', 'base.css'];

/**
 * Desviaciones DELIBERADAS y documentadas del volcado. Cada una está justificada en
 * globals.css junto al token. Si añades una, documéntala en AMBOS sitios.
 */
const DOCUMENTED_DEVIATIONS = new Set([
  // El DS carga Geist/Geist Mono por @import de Google Fonts y nombra la familia
  // literal. La Verificación de TD.1 exige 0 CDNs → self-hosted con next/font, que
  // publica la familia real en --font-geist-{sans,mono}. Misma fuente, otro nombre.
  '--font-sans',
  '--font-mono',
]);

/** Quita comentarios `/* … *\/` sin tocar el resto del texto. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Extrae los bloques de PRIMER NIVEL cuyo selector casa con `selectorTest`, saltando
 * anidados (@theme, @layer, @media) con un escáner de llaves — un regex simple se
 * rompería con `@theme inline { … }`.
 */
function topLevelBlocks(css: string, selectorTest: (sel: string) => boolean): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) break;
    // El selector es SOLO lo que sigue a la última sentencia cerrada: sin esto se
    // arrastran los `@import ...;` / `@custom-variant ...;` previos y el bloque deja
    // de reconocerse (con el efecto traicionero de que el test pasa en vacío).
    const preamble = css.slice(i, open);
    const selector = preamble
      .slice(Math.max(preamble.lastIndexOf(';'), preamble.lastIndexOf('}')) + 1)
      .trim();

    // Consumir el bloque contando llaves.
    let depth = 0;
    let j = open;
    for (; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}' && --depth === 0) break;
    }
    const body = css.slice(open + 1, j);
    if (selectorTest(selector)) out.push(body);
    i = j + 1;
  }
  return out;
}

/** `--name: value;` de un cuerpo de bloque, con el valor normalizado en espacios. */
function customProps(body: string): Map<string, string> {
  const props = new Map<string, string>();
  // Solo declaraciones de primer nivel del bloque: los bloques que nos interesan
  // (:root / [data-theme=dark]) no anidan nada.
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    props.set(m[1]!, m[2]!.trim().replace(/\s+/g, ' '));
  }
  return props;
}

function collect(css: string, selectorTest: (sel: string) => boolean): Map<string, string> {
  const all = new Map<string, string>();
  for (const body of topLevelBlocks(stripComments(css), selectorTest)) {
    for (const [k, v] of customProps(body)) all.set(k, v);
  }
  return all;
}

const isRoot = (sel: string) => sel === ':root';
/** El DS declara el tema oscuro en `.dark`; el volcado lo pone bajo atributo. */
const isMirrorDark = (sel: string) => sel === '.dark';
const isGlobalsDark = (sel: string) => sel === "[data-theme='dark']";

// Izados a const de módulo (leídos una sola vez): `mirrorCss` se consultaba en 5
// tests → 25 lecturas de fichero + 4 re-parseos redundantes donde bastan 5.
const mirrorCss = MIRROR_FILES.map((f) => readFileSync(resolve(mirrorDir, f), 'utf8')).join('\n');
const globals = readFileSync(globalsPath, 'utf8');

describe('globals.css vuelca los tokens del espejo del DS verbatim', () => {
  it('el espejo aporta tokens que comparar (guarda contra un espejo vacío)', () => {
    // Sin esto, un espejo borrado haría pasar todo lo demás vacuamente.
    expect(collect(mirrorCss, isRoot).size).toBeGreaterThan(80);
    expect(collect(mirrorCss, isMirrorDark).size).toBeGreaterThan(15);
  });

  it('todo token del tema claro (`:root` del espejo) está en `:root` con su valor', () => {
    const mirror = collect(mirrorCss, isRoot);
    const dumped = collect(globals, isRoot);

    const mismatches: string[] = [];
    for (const [token, value] of mirror) {
      if (DOCUMENTED_DEVIATIONS.has(token)) continue;
      const got = dumped.get(token);
      if (got === undefined) mismatches.push(`${token}: FALTA en globals.css (espejo: ${value})`);
      else if (got !== value) mismatches.push(`${token}: espejo \`${value}\` ≠ globals \`${got}\``);
    }
    // Se compara el string unido (no el array) para que el diff de un fallo liste
    // las divergencias legibles de un vistazo.
    expect(mismatches.join('\n')).toBe('');
  });

  it('todo token del tema oscuro (`.dark` del espejo) está bajo `[data-theme=dark]`', () => {
    const mirror = collect(mirrorCss, isMirrorDark);
    const dumped = collect(globals, isGlobalsDark);

    const mismatches: string[] = [];
    for (const [token, value] of mirror) {
      if (DOCUMENTED_DEVIATIONS.has(token)) continue;
      const got = dumped.get(token);
      if (got === undefined)
        mismatches.push(`${token}: FALTA bajo [data-theme='dark'] (espejo: ${value})`);
      else if (got !== value) mismatches.push(`${token}: espejo \`${value}\` ≠ globals \`${got}\``);
    }
    expect(mismatches.join('\n')).toBe('');
  });

  it('no hay tokens inventados: `:root` no añade valores que el espejo no tenga', () => {
    // El principio vinculante de la fase TD: ningún valor visual se inventa en código.
    // Un token de más en globals.css es un valor que el DS no conoce.
    const mirror = collect(mirrorCss, isRoot);
    const dumped = collect(globals, isRoot);
    const invented = [...dumped.keys()].filter((t) => !mirror.has(t));
    expect(invented.join('\n')).toBe('');
  });

  it('el tema oscuro NO se conmuta por media query (solo por atributo)', () => {
    // Cláusula explícita de TD.1: switchers por atributo en <html>, nunca por
    // `prefers-color-scheme`. Esto sí es determinista y barato de conservar.
    expect(stripComments(globals)).not.toMatch(/prefers-color-scheme/);
  });
});

describe('las fuentes del DS se sirven self-hosted (0 peticiones a CDNs)', () => {
  /**
   * OJO — ESTO ES UNA APROXIMACIÓN, NO LA CLÁUSULA COMPLETA.
   *
   * La cláusula de la Verificación («ninguna petición a CDNs externos en la pestaña
   * de red») habla del NAVEGADOR, y este test solo lee CSS: no levanta la app ni mira
   * la red. Ejercita la capa del fichero, no la del runtime.
   *
   * Qué conserva de verdad: que nadie vuelva a meter un `@import`/`url()` a un CDN
   * en globals.css — que es exactamente como el espejo del DS carga hoy las fuentes
   * (`tokens/fonts.css` → fonts.googleapis.com) y, por tanto, el modo realista de que
   * la regresión vuelva a entrar al revolcar tokens.
   * Qué NO conserva: cualquier otra petición externa (una <img>, un script, un fetch).
   * Eso lo verifica el verifier en la pestaña de red, y quedará cubierto de verdad
   * cuando exista infra E2E (T0.4/T0.5), donde se puede interceptar la red real.
   */
  it('globals.css no referencia ningún host externo', () => {
    const css = stripComments(globals);
    const externals = [...css.matchAll(/url\(\s*['"]?(https?:)?\/\/[^)]+\)/g)].map((m) => m[0]);
    expect(externals.join('\n')).toBe('');
  });

  it('globals.css no importa el fonts.css del espejo (que sí va a Google Fonts)', () => {
    // Import defensivo: el único @import legítimo es 'tailwindcss'.
    const imports = [...stripComments(globals).matchAll(/@import\s+([^;]+);/g)].map((m) =>
      m[1]!.trim(),
    );
    expect(imports).toEqual(["'tailwindcss'"]);
  });

  it('el espejo efectivamente carga las fuentes de un CDN (el motivo de la desviación)', () => {
    // Control: si un día el DS pasa a servir las fuentes él mismo, esta desviación
    // documentada deja de tener motivo y hay que revisar el volcado de --font-*.
    const fonts = readFileSync(resolve(mirrorDir, 'fonts.css'), 'utf8');
    expect(fonts).toMatch(/fonts\.googleapis\.com/);
  });
});
