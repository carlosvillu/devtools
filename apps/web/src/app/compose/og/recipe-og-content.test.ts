import { describe, expect, it } from 'vitest';
import type { HistoryComposeStep } from '@app/core/history';
import { recipeHeadline, recipeTransformIds } from './recipe-og-content';

// Unit de la derivación PURA de los textos de la OG dinámica por receta (T7.4). Estos textos son
// la ÚNICA verdad compartida entre la imagen server-render y el `og:title` del `<head>` de
// `/compose`: si divergieran, la tarjeta social mentiría respecto a la imagen. Determinista y
// gratuito → vive en `pnpm gate`.

const step = (
  transform_id: string,
  kind: HistoryComposeStep['kind'] = 'text',
): HistoryComposeStep => ({ transform_id, kind });

describe('recipeHeadline', () => {
  it('pluraliza en «pasos» para más de un paso', () => {
    expect(recipeHeadline([step('json.minify'), step('jwt.sign')])).toBe('Receta · 2 pasos');
  });

  it('usa el singular «paso» para un único paso (frontera de pluralización)', () => {
    expect(recipeHeadline([step('json.minify')])).toBe('Receta · 1 paso');
  });

  it('cuenta los 8 pasos del cap máximo', () => {
    const steps = Array.from({ length: 8 }, (_, i) => step(`t.${String(i)}`));
    expect(recipeHeadline(steps)).toBe('Receta · 8 pasos');
  });
});

describe('recipeTransformIds', () => {
  it('devuelve los ids EN ORDEN, sin el kind (la cadena visual son solo los ids)', () => {
    const steps = [
      step('json.minify', 'json'),
      step('base64url.encode', 'base64'),
      step('jwt.sign', 'jwt'),
    ];
    expect(recipeTransformIds(steps)).toEqual(['json.minify', 'base64url.encode', 'jwt.sign']);
  });

  it('preserva el orden exacto (una receta reordenada pinta otra cadena)', () => {
    expect(recipeTransformIds([step('b'), step('a')])).toEqual(['b', 'a']);
  });
});
