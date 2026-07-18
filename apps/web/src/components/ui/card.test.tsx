import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './card';

/**
 * CAPA: jsdom (DOM/estructura). SÍ — que las variantes cva (padding/inset/hover) emiten
 * las clases de token del DS, protegiendo la traducción 1:1 contra regresión, y que los
 * children se renderizan. NO — la elevación/sombra REAL ni el hover pintado (píxel → CUA).
 */
describe('Card', () => {
  it('por defecto es una superficie con fondo, borde y sombra de token', () => {
    render(<Card>contenido</Card>);
    const card = screen.getByText('contenido');
    expect(card).toHaveAttribute('data-slot', 'card');
    expect(card).toHaveClass('bg-surface', 'shadow-sm', 'rounded-lg', 'border-border', 'p-4');
  });

  it.each([
    ['sm', 'p-3'],
    ['md', 'p-4'],
    ['lg', 'p-6'],
  ] as const)('padding %s emite el espaciado de token del DS', (padding, cls) => {
    render(<Card padding={padding}>x</Card>);
    expect(screen.getByText('x')).toHaveClass(cls);
  });

  it('inset usa surface-2 y quita la sombra (variante hundida)', () => {
    render(<Card inset>x</Card>);
    expect(screen.getByText('x')).toHaveClass('bg-surface-2', 'shadow-none');
  });

  it('hover añade las clases de elevación de token', () => {
    render(<Card hover>x</Card>);
    expect(screen.getByText('x')).toHaveClass('hover:border-border-strong', 'hover:shadow-md');
  });
});
