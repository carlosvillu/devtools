import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Wordmark } from './wordmark';

/**
 * CAPA: jsdom (estructura + wiring de clases/estilo). SÍ — que renderiza el texto de marca,
 * que el cursor lleva el token de acento y el CABLEADO del parpadeo + su apagado por
 * reduced-motion (clases `animate-cursor-blink` y `motion-reduce:animate-none`), que
 * `blink=false` no anima, y que `size` fija el tamaño inline. NO — que el navegador PINTE el
 * parpadeo ni que lo detenga de verdad bajo la media query (jsdom no evalúa animaciones ni
 * media queries): eso es CUA. Por eso el test asegura la PRESENCIA de las clases, no observa
 * el blink parándose (que sería fingir lo que jsdom no hace).
 */
describe('Wordmark', () => {
  it('renderiza la marca `devtools` con el token de texto adaptativo al tema', () => {
    render(<Wordmark />);
    const mark = screen.getByText(/devtools/);
    expect(mark).toHaveAttribute('data-slot', 'wordmark');
    expect(mark).toHaveClass('text-text', 'font-mono', 'font-semibold');
  });

  it('el cursor usa el token de acento, es aria-hidden y parpadea por defecto', () => {
    const { container } = render(<Wordmark />);
    const cursor = container.querySelector('[data-slot="wordmark-cursor"]');
    expect(cursor).not.toBeNull();
    expect(cursor).toHaveAttribute('aria-hidden', 'true');
    expect(cursor).toHaveClass('bg-accent');
    // Cableado del parpadeo Y su apagado bajo reduced-motion (el bloque queda sólido).
    expect(cursor).toHaveClass('animate-cursor-blink', 'motion-reduce:animate-none');
  });

  it('blink=false deja el cursor estático (sin la clase de animación)', () => {
    const { container } = render(<Wordmark blink={false} />);
    const cursor = container.querySelector('[data-slot="wordmark-cursor"]');
    expect(cursor).not.toHaveClass('animate-cursor-blink');
    expect(cursor).not.toHaveClass('motion-reduce:animate-none');
    // Sigue siendo el bloque de acento, solo que sin animar.
    expect(cursor).toHaveClass('bg-accent');
  });

  it('size fija el tamaño de fuente y las dimensiones del cursor por `style` (px no tokenizables)', () => {
    const { container, rerender } = render(<Wordmark size="md" />);
    expect(screen.getByText(/devtools/)).toHaveStyle({ fontSize: '34px' });
    let cursor = container.querySelector('[data-slot="wordmark-cursor"]');
    expect(cursor).toHaveStyle({ width: '11px', height: '22px' });

    rerender(<Wordmark size="sm" />);
    expect(screen.getByText(/devtools/)).toHaveStyle({ fontSize: '22px' });
    cursor = container.querySelector('[data-slot="wordmark-cursor"]');
    expect(cursor).toHaveStyle({ width: '7px', height: '14px' });

    rerender(<Wordmark size="lg" />);
    expect(screen.getByText(/devtools/)).toHaveStyle({ fontSize: '44px' });
  });
});
