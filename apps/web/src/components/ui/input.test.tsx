import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

/**
 * CAPA: jsdom (DOM/estructura). SÍ — rol textbox + nombre accesible, `invalid` como
 * `aria-invalid` + clase de borde danger, `mono`, el glifo inicial y su padding, el
 * estado disabled, y que escribir emite el valor. NO — el borde/anillo pintado en el
 * navegador (píxel → CUA).
 */
describe('Input', () => {
  it('es un textbox operable por nombre accesible (aria-label)', () => {
    render(<Input aria-label="Correo" />);
    const input = screen.getByRole('textbox', { name: /correo/i });
    expect(input).toHaveAttribute('data-slot', 'input');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('invalid marca aria-invalid y aplica el borde danger', () => {
    render(<Input aria-label="Correo" invalid />);
    const input = screen.getByRole('textbox', { name: /correo/i });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('border-danger');
  });

  it('mono usa la familia mono del DS', () => {
    render(<Input aria-label="Token" mono />);
    expect(screen.getByRole('textbox', { name: /token/i })).toHaveClass('font-mono');
  });

  it('con icono renderiza el glifo inicial y reserva su padding', () => {
    render(<Input aria-label="Buscar" icon="search" />);
    const input = screen.getByRole('textbox', { name: /buscar/i });
    expect(input).toHaveClass('pl-9');
    const wrapper = input.closest('[data-slot="input-wrapper"]');
    expect(wrapper?.querySelector('[data-slot="icon"]')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each([
    ['sm', 'h-control-sm'],
    ['md', 'h-control-md'],
    ['lg', 'h-control-lg'],
  ] as const)('tamaño %s emite la altura de control del DS', (size, cls) => {
    render(<Input aria-label="x" size={size} />);
    expect(screen.getByRole('textbox')).toHaveClass(cls);
  });

  it('disabled deshabilita el control', () => {
    render(<Input aria-label="x" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('escribir actualiza el valor del control', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Correo" />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: /correo/i });
    await user.type(input, 'hola@correo.com');
    expect(input).toHaveValue('hola@correo.com');
  });
});
