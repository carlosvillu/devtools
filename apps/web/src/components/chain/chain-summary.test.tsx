import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChainSummary } from './chain-summary';

/**
 * CAPA: jsdom (única lógica del componente: la UNIÓN de badges por chevrones). SÍ — que N
 * kinds producen N badges y N−1 chevrones separadores, en orden. NO — color ni layout
 * (píxel → CUA). Es un componente casi puro; se prueba solo su regla de join (paga alquiler).
 */
describe('ChainSummary', () => {
  it.each([
    [['jwt'] as const, 1, 0],
    [['jwt', 'json'] as const, 2, 1],
    [['base64', 'json', 'text'] as const, 3, 2],
  ])('%j → %i badges y %i chevrones separadores', (kinds, badges, chevrons) => {
    const { container } = render(<ChainSummary kinds={[...kinds]} />);
    const root = container.querySelector('[data-slot="chain-summary"]');
    expect(root).not.toBeNull();
    // Los badges son hijos del contenedor; los chevrones son los Icon que son hijos
    // DIRECTOS del contenedor (los iconos DENTRO de cada badge no cuentan como separadores).
    expect(root?.querySelectorAll('[data-slot="badge"]')).toHaveLength(badges);
    expect(root?.querySelectorAll(':scope > [data-slot="icon"]')).toHaveLength(chevrons);
  });

  it('una cadena vacía no pinta nada', () => {
    const { container } = render(<ChainSummary kinds={[]} />);
    const root = container.querySelector('[data-slot="chain-summary"]');
    expect(root?.querySelectorAll('[data-slot="badge"]')).toHaveLength(0);
    expect(root?.querySelectorAll(':scope > [data-slot="icon"]')).toHaveLength(0);
  });
});
