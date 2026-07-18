import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './icon-button';

/**
 * CAPA: jsdom (DOM/estructura). SÍ — el nombre accesible del botón icon-only viene de
 * `label` (aria-label + title), el mapeo variante/tamaño/active→clase de token, el
 * estado disabled y el click. NO — el color/hover real en el navegador (píxel → CUA).
 */
describe('IconButton', () => {
  it('toma el nombre accesible de label (aria-label) y lo repite como title', () => {
    render(<IconButton icon="copy" label="Copiar valor" />);
    const button = screen.getByRole('button', { name: /copiar valor/i });
    expect(button).toHaveAttribute('title', 'Copiar valor');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('data-slot', 'icon-button');
  });

  it('renderiza el glifo como decorativo (aria-hidden)', () => {
    render(<IconButton icon="trash" label="Borrar" />);
    const glyph = screen.getByRole('button').querySelector('[data-slot="icon"]');
    expect(glyph).toHaveAttribute('aria-hidden', 'true');
  });

  it.each([
    ['ghost', 'border-transparent'],
    ['secondary', 'border-border-strong'],
  ] as const)('variante %s emite su clase de borde del DS', (variant, cls) => {
    render(<IconButton icon="eye" label="Mostrar" variant={variant} />);
    expect(screen.getByRole('button')).toHaveClass(cls);
  });

  it.each([
    ['sm', 'size-7'],
    ['md', 'size-8'],
    ['lg', 'size-10'],
  ] as const)('tamaño %s emite el cuadrado del DS', (size, cls) => {
    render(<IconButton icon="eye" label="Mostrar" size={size} />);
    expect(screen.getByRole('button')).toHaveClass(cls);
  });

  it('active aplica las clases del estado toggled', () => {
    render(<IconButton icon="eye" label="Mostrar" active />);
    expect(screen.getByRole('button')).toHaveClass('bg-surface-2', 'text-text');
  });

  it('disabled deshabilita y no dispara onClick', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<IconButton icon="trash" label="Borrar" disabled onClick={onClick} />);
    const button = screen.getByRole('button', { name: /borrar/i });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('dispara onClick al pulsar', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<IconButton icon="copy" label="Copiar" onClick={onClick} />);
    await user.click(screen.getByRole('button', { name: /copiar/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
