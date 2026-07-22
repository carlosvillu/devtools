import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Paridad del INVENTARIO DE TOKENS del DS: `_adherence.oxlintrc.json` vs `globals.css`.
 *
 * QUÉ CAPA EJERCITA ESTO, LITERALMENTE (y qué NO):
 *  - SÍ: lee `docs/design-system/_adherence.oxlintrc.json` (la fuente de la que se
 *    adaptó a mano nuestro lint de adherencia de TD.6) y comprueba que CADA token de su
 *    `x-omelette.tokens` está DECLARADO en `apps/web/src/app/globals.css`.
 *  - NO: no compara VALORES (eso ya lo hace `globals.tokens.test.ts` contra
 *    `tokens/*.css`), ni pinta nada, ni valida las reglas esquery del JSON.
 *
 * POR QUÉ EXISTE (deuda recogida en T6.3): el `_adherence.oxlintrc.json` es el único
 * fichero del espejo que NADIE del repo leía. En T6.2 se descubrió que llevaba meses
 * derivando aguas arriba —ganó `Dialog`, `Image`, `Wordmark`, `SegmentedOption`, dos
 * grupos de `no-restricted-imports` y 4 tokens de accesibilidad (`--danger-hover`,
 * `--violet-subtle-fg`, `--cyan-subtle-fg`, `--gray-450`)— sin que ningún test se
 * pusiera rojo. Este test lo vuelve LOAD-BEARING dentro de `pnpm gate`: a partir de
 * ahora, un `DesignSync` que traiga un token nuevo al inventario del DS y no lo vuelque
 * a `globals.css` se pone ROJO en vez de pasar en silencio.
 */

const repoRoot = resolve(import.meta.dirname, '../../../..');
const adherencePath = resolve(repoRoot, 'docs/design-system/_adherence.oxlintrc.json');
const globalsPath = resolve(repoRoot, 'apps/web/src/app/globals.css');

interface AdherenceConfig {
  'x-omelette': { tokens: string[] };
}

/** Quita comentarios `/* … *\/` sin tocar el resto del texto. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

// Lectura a nivel de módulo, como en los dos ficheros hermanos (`globals.tokens.test.ts`,
// `globals.contrast.test.ts`): los ficheros no cambian entre casos.
const adherenceTokens = (JSON.parse(readFileSync(adherencePath, 'utf8')) as AdherenceConfig)[
  'x-omelette'
].tokens;

// DEUDA CONOCIDA: este extractor de custom properties es la TERCERA copia en `src/app`
// (`globals.tokens.test.ts` y `globals.contrast.test.ts` tienen las otras dos).
// Se hace `stripComments` ANTES de parsear, igual que las hermanas: sin eso, un token
// COMENTADO (`/* --foo: x; */`) contaría como declarado aquí y como NO declarado allí —
// un falso verde justo en la guarda que este fichero instala. Unificar las tres en un
// helper compartido es deuda pendiente; cambiar la semántica de las otras dos no es
// neutro y no es de esta tarea.
/** Nombres de custom property DECLARADAS (`--x: …`) en globals.css, sin contar comentarios. */
const declaredCustomProperties = new Set(
  [...stripComments(readFileSync(globalsPath, 'utf8')).matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map(
    (match) => match[1] ?? '',
  ),
);

describe('inventario de tokens del DS ↔ globals.css', () => {
  it('el espejo declara un inventario de tokens no vacío', () => {
    // Guarda contra el falso verde: si el JSON cambiara de forma y el inventario se
    // leyera vacío, el test de abajo pasaría sin comprobar nada.
    expect(adherenceTokens.length).toBeGreaterThan(100);
  });

  it('todo token del inventario del DS está declarado en globals.css', () => {
    const missing = adherenceTokens.filter((token) => !declaredCustomProperties.has(token));
    expect(missing).toEqual([]);
  });

  it('los 4 tokens de accesibilidad que el espejo ganó en T6.2 están volcados', () => {
    // PIN DE REGRESIÓN DELIBERADO — NO borrar por «redundante» con el caso de arriba.
    // El genérico mira el inventario del espejo: si un DesignSync futuro SACARA estos 4
    // del inventario, dejaría de mirarlos y la deuda de T6.2 podría repetirse en silencio.
    // Este caso fija su presencia con independencia de lo que diga el inventario.
    const declared = declaredCustomProperties;
    for (const token of [
      '--danger-hover',
      '--violet-subtle-fg',
      '--cyan-subtle-fg',
      '--gray-450',
    ]) {
      expect(declared.has(token), `${token} debería estar declarado en globals.css`).toBe(true);
    }
  });
});
