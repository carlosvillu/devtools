import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

/**
 * QUÉ CAPA EJERCITA ESTO (y qué NO):
 *  - SÍ (jsdom, capa DOM/estructura): rol + nombre accesible del control, el mapeo
 *    cva variante→CLASE de token del DS (que un nombre de variante emita las clases
 *    correctas — protege la traducción 1:1 contra regresión), estado `disabled`,
 *    render condicional de glifos y el disparo de `onClick`.
 *  - NO: que el NAVEGADOR pinte hover/focus/disabled fieles (color real, anillo de
 *    foco). Eso es píxel: lo verifica el gate CUA en navegador, no jsdom. Aquí se
 *    asserta que la clase `hover:bg-accent-hover` EXISTE, no que el navegador la
 *    aplique — son cosas distintas (lección del incidente 1 del journal de TD.1).
 */
describe('Button', () => {
  it('es un button con nombre accesible por su texto y type="button" por defecto', () => {
    render(<Button>Analizar</Button>);
    const button = screen.getByRole('button', { name: /analizar/i });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('data-slot', 'button');
  });

  it('respeta type explícito (submit)', () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole('button', { name: /enviar/i })).toHaveAttribute('type', 'submit');
  });

  it.each([
    ['primary', ['bg-accent', 'text-accent-fg', 'hover:bg-accent-hover', 'border-accent']],
    ['secondary', ['bg-surface', 'text-text', 'border-border-strong', 'hover:bg-surface-2']],
    ['ghost', ['bg-transparent', 'text-text', 'border-transparent', 'hover:bg-surface-2']],
    ['danger', ['bg-danger', 'text-accent-fg', 'border-danger', 'hover:bg-danger-hover']],
  ] as const)('variante %s emite las clases de token del DS', (variant, classes) => {
    render(<Button variant={variant}>x</Button>);
    const button = screen.getByRole('button');
    for (const cls of classes) expect(button).toHaveClass(cls);
  });

  it.each([
    ['sm', 'h-control-sm'],
    ['md', 'h-control-md'],
    ['lg', 'h-control-lg'],
  ] as const)('tamaño %s emite la altura de control del DS', (size, heightClass) => {
    render(<Button size={size}>x</Button>);
    expect(screen.getByRole('button')).toHaveClass(heightClass);
  });

  it('block estira a ancho completo', () => {
    render(<Button block>x</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('disabled deshabilita el control', () => {
    render(<Button disabled>x</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renderiza iconos SVG decorativos (aria-hidden) sin ensuciar el nombre accesible', () => {
    render(
      <Button icon="reopen" iconRight="chevron-right">
        Reabrir
      </Button>,
    );
    const button = screen.getByRole('button', { name: /reabrir/i });
    const icons = button.querySelectorAll('svg[data-slot="icon"]');
    expect(icons).toHaveLength(2);
    for (const icon of icons) {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      // Es SVG-inline del DS (no un glifo Unicode dependiente de la fuente): lleva
      // geometría real dentro.
      expect(icon.querySelector('path')).not.toBeNull();
    }
  });

  it('dispara onClick al pulsar', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Pulsar</Button>);
    await user.click(screen.getByRole('button', { name: /pulsar/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('no dispara onClick cuando está disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button disabled onClick={onClick}>
        Pulsar
      </Button>,
    );
    await user.click(screen.getByRole('button', { name: /pulsar/i }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
