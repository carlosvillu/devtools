import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConfidenceBar } from './confidence-bar';

/**
 * CAPA: jsdom (DOM/estructura + lógica pura de clamp/formato). El foco es el REQUISITO
 * DURO O5: la confianza NO se comunica solo por color. Aquí se asserta el canal no
 * cromático textual (la etiqueta numérica `v.toFixed(2)`, presente y correcta) y su
 * clamping a [0,1]. NO se asserta el color del relleno ni su ancho pintado (píxel →
 * CUA en ambos temas); esos son los otros canales (color + longitud), verificados allí.
 */
describe('ConfidenceBar', () => {
  it('O5: renderiza la etiqueta numérica con 2 decimales (canal no cromático, legible sin color)', () => {
    render(<ConfidenceBar value={0.95} />);
    const bar = screen.getByText('0.95');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveClass('tabular-nums');
  });

  it('formatea a 0.00 siempre con 2 decimales', () => {
    render(<ConfidenceBar value={0.4} />);
    expect(screen.getByText('0.40')).toBeInTheDocument();
  });

  it('clampa por encima de 1 a 1.00 y por debajo de 0 a 0.00', () => {
    const { rerender } = render(<ConfidenceBar value={1.5} />);
    expect(screen.getByText('1.00')).toBeInTheDocument();
    rerender(<ConfidenceBar value={-0.3} />);
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });

  it('showValue=false oculta la etiqueta (quedan longitud + color, nunca color solo)', () => {
    render(<ConfidenceBar value={0.5} showValue={false} />);
    expect(screen.queryByText('0.50')).toBeNull();
  });

  it('expone data-slot para localizarlo', () => {
    const { container } = render(<ConfidenceBar value={0.5} />);
    expect(container.querySelector('[data-slot="confidence-bar"]')).not.toBeNull();
  });
});
