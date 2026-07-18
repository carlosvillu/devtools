import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './select';

/**
 * CAPA: jsdom (DOM/estructura). SÍ — rol combobox + nombre accesible, la NORMALIZACIÓN
 * de `options` (strings y {value,label}), el placeholder deshabilitado, el disparo de
 * onChange al elegir, `invalid`→aria-invalid y el glifo chevron decorativo. NO — el
 * pintado del borde/anillo ni la apariencia del desplegable nativo (píxel/plataforma
 * → CUA). Es `<select>` NATIVO a propósito (desviación sancionada por §4), de ahí el
 * rol combobox nativo y que no dependa de portal/popover.
 */
describe('Select', () => {
  it('es un combobox operable por nombre accesible y normaliza options string', () => {
    render(<Select aria-label="Transformación" options={['jwt.decode', 'base64.decode']} />);
    const select = screen.getByRole('combobox', { name: /transformación/i });
    expect(select).toHaveAttribute('data-slot', 'select');
    expect(screen.getByRole('option', { name: 'jwt.decode' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'base64.decode' })).toBeInTheDocument();
  });

  it('normaliza options {value,label}', () => {
    render(
      <Select
        aria-label="Transformación"
        defaultValue="a"
        options={[
          { value: 'a', label: 'Opción A' },
          { value: 'b', label: 'Opción B' },
        ]}
      />,
    );
    const optionA = screen.getByRole<HTMLOptionElement>('option', { name: 'Opción A' });
    expect(optionA.value).toBe('a');
  });

  it('placeholder añade una opción deshabilitada primera', () => {
    render(
      <Select
        aria-label="Transformación"
        placeholder="Elige…"
        defaultValue=""
        options={['jwt.decode']}
      />,
    );
    const placeholder = screen.getByRole<HTMLOptionElement>('option', { name: 'Elige…' });
    expect(placeholder).toBeDisabled();
    expect(placeholder.value).toBe('');
  });

  it('en uso NO controlado con placeholder, la option-placeholder queda seleccionada de inicio', () => {
    // Regresión (code-review TD.2): un <select> nativo auto-selecciona la primera
    // opción HABILITADA, así que sin defaultValue="" el valor inicial sería "a", no el
    // placeholder. El fix fija defaultValue="" cuando el consumidor no gobierna el
    // valor. CONTROL NEGATIVO verificado: quitar ese defaultValue pone este test ROJO
    // (select.value === 'a'). Capa: jsdom (valor inicial del control nativo).
    render(<Select aria-label="Transformación" placeholder="Elige…" options={['a', 'b']} />);
    const select = screen.getByRole<HTMLSelectElement>('combobox', { name: /transformación/i });
    expect(select.value).toBe('');
  });

  it('con value/defaultValue del consumidor, el fix del placeholder NO pisa el caso controlado', () => {
    render(
      <Select
        aria-label="Transformación"
        placeholder="Elige…"
        defaultValue="b"
        options={['a', 'b']}
      />,
    );
    const select = screen.getByRole<HTMLSelectElement>('combobox', { name: /transformación/i });
    expect(select.value).toBe('b');
  });

  it('elegir una opción dispara onChange con el nuevo valor', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Select
        aria-label="Transformación"
        defaultValue="jwt.decode"
        onChange={onChange}
        options={['jwt.decode', 'base64.decode']}
      />,
    );
    const select = screen.getByRole<HTMLSelectElement>('combobox', { name: /transformación/i });
    await user.selectOptions(select, 'base64.decode');
    expect(select.value).toBe('base64.decode');
    expect(onChange).toHaveBeenCalled();
  });

  it('invalid marca aria-invalid', () => {
    render(<Select aria-label="x" invalid options={['a']} />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renderiza el chevron como glifo decorativo', () => {
    render(<Select aria-label="x" options={['a']} />);
    const wrapper = screen.getByRole('combobox').closest('[data-slot="select-wrapper"]');
    expect(wrapper?.querySelector('[data-slot="icon"]')).toHaveAttribute('aria-hidden', 'true');
  });
});
