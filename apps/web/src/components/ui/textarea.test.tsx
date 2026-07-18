import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Textarea } from './textarea';

/**
 * CAPA: jsdom (DOM/estructura). SÍ — rol textbox, el default `mono=true` (el campo de
 * pegado), `invalid`→aria-invalid + borde danger, `rows`, y que escribir emite valor.
 * NO — el pintado real del borde/anillo (píxel → CUA).
 */
describe('Textarea', () => {
  it('es un textbox y usa la familia mono por defecto (campo de pegado)', () => {
    render(<Textarea aria-label="Pega aquí" />);
    const textarea = screen.getByRole('textbox', { name: /pega aquí/i });
    expect(textarea).toHaveClass('font-mono');
    expect(textarea).toHaveAttribute('data-slot', 'textarea');
    expect(textarea).toHaveAttribute('rows', '6');
  });

  it('mono=false cambia a la familia sans', () => {
    render(<Textarea aria-label="Nota" mono={false} />);
    expect(screen.getByRole('textbox', { name: /nota/i })).toHaveClass('font-sans');
  });

  it('invalid marca aria-invalid y aplica el borde danger', () => {
    render(<Textarea aria-label="Pega aquí" invalid />);
    const textarea = screen.getByRole('textbox', { name: /pega aquí/i });
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveClass('border-danger');
  });

  it('respeta rows explícito', () => {
    render(<Textarea aria-label="x" rows={3} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '3');
  });

  it('escribir actualiza el valor', async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Pega aquí" mono={false} />);
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox', { name: /pega aquí/i });
    await user.type(textarea, 'eyJhbGciOiJIUzI1NiJ9');
    expect(textarea).toHaveValue('eyJhbGciOiJIUzI1NiJ9');
  });
});
