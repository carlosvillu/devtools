import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './empty-state';

/**
 * CAPA: jsdom (DOM/estructura). SÍ — el render condicional de title/description/action y
 * el icono SVG del DS. NO — el centrado/espaciado pintado (píxel → CUA). Es casi puro
 * pintado; el test cubre la lógica condicional (un panel nunca queda en blanco).
 */
describe('EmptyState', () => {
  it('renderiza icono, título, descripción y acción', () => {
    const { container } = render(
      <EmptyState
        icon="clock"
        title="Sin historial todavía"
        description="Aparecerá aquí."
        action={<button type="button">Analizar algo</button>}
      />,
    );
    expect(container.querySelector('[data-slot="empty-state"]')).not.toBeNull();
    expect(container.querySelector('svg[data-slot="icon"]')).not.toBeNull();
    expect(screen.getByText('Sin historial todavía')).toBeInTheDocument();
    expect(screen.getByText('Aparecerá aquí.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analizar algo' })).toBeInTheDocument();
  });

  it('sin action ni description sigue mostrando el medallón de icono (nunca en blanco)', () => {
    const { container } = render(<EmptyState title="Nada" />);
    expect(container.querySelector('svg[data-slot="icon"]')).not.toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
