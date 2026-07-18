import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Kbd } from './kbd';

/**
 * CAPA: jsdom (DOM/estructura). Kbd es PRESENTACIONAL (un `<kbd>` semántico, sin
 * interacción — la cláusula «operable por teclado» no le aplica: no hay nada que operar).
 * El único hecho no cubierto por TypeScript es que emite el elemento semántico correcto
 * `<kbd>`: eso se ancla aquí. El aspecto (relieve de tecla) es píxel → CUA.
 */
describe('Kbd', () => {
  it('renderiza un elemento <kbd> semántico con su contenido', () => {
    render(<Kbd>Esc</Kbd>);
    const kbd = screen.getByText('Esc');
    expect(kbd.tagName).toBe('KBD');
    expect(kbd).toHaveAttribute('data-slot', 'kbd');
  });
});
