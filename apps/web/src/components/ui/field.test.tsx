import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './field';
import { Input } from './input';

/**
 * CAPA: jsdom (DOM/estructura). SÍ — la asociación label↔control vía htmlFor (que hace
 * al control localizable por su label), la lógica condicional hint/error (error
 * REEMPLAZA a hint) y el asterisco de `required`. NO — color/tipografía pintados
 * (píxel → CUA). Aquí vive la lógica condicional del componente, que es justo lo que
 * la capa jsdom debe cubrir (testing/frontend.md §1).
 */
describe('Field', () => {
  it('asocia el label al control por htmlFor, haciéndolo localizable por su label', () => {
    render(
      <Field label="Email" htmlFor="email">
        <Input id="email" aria-label="Email" />
      </Field>,
    );
    // getByLabelText prueba la asociación real label↔input (no solo que el texto exista).
    expect(screen.getByLabelText('Email')).toHaveAttribute('data-slot', 'input');
  });

  it('muestra el hint cuando no hay error', () => {
    render(<Field label="Email" hint="Usaremos esto para avisarte." />);
    expect(screen.getByText(/usaremos esto/i)).toBeInTheDocument();
  });

  it('error REEMPLAZA al hint (no se muestran ambos)', () => {
    render(<Field label="Email" hint="pista" error="Ese correo no existe." />);
    expect(screen.getByText(/ese correo no existe/i)).toBeInTheDocument();
    expect(screen.queryByText('pista')).not.toBeInTheDocument();
  });

  it('required añade el asterisco', () => {
    render(<Field label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('propaga la prop style al div contenedor (contrato del DS: Field.d.ts)', () => {
    render(
      <Field label="Email" style={{ maxWidth: 320 }}>
        <Input aria-label="Email" />
      </Field>,
    );
    const container = screen.getByText('Email').closest('[data-slot="field"]');
    expect(container).toHaveStyle({ maxWidth: '320px' });
  });

  it('sin label ni hint ni error solo renderiza el marco con sus hijos', () => {
    render(
      <Field>
        <Input aria-label="Suelto" />
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: /suelto/i })).toBeInTheDocument();
  });
});
