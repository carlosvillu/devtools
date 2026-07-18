import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './spinner';

/**
 * CAPA: jsdom (DOM/estructura). SÍ — el `role="status"` (feedback asíncrono anunciable) y
 * el render condicional del label. NO — el giro real ni el color (píxel/animación → CUA).
 */
describe('Spinner', () => {
  it('es un role=status con un SVG decorativo, sin label por defecto', () => {
    render(<Spinner />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('data-slot', 'spinner');
    expect(status.querySelector('svg')).not.toBeNull();
    // Sin label no hay fila de texto (el <span> del label no se renderiza).
    expect(status.querySelector('span')).toBeNull();
  });

  it('muestra el label cuando se pasa', () => {
    render(<Spinner label="Analizando…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Analizando…');
  });
});
