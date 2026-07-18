import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Field } from '@/components/ui/field';

describe('Field aria-describedby — ramas no cubiertas por el showcase', () => {
  it('error tiene PRIORIDAD sobre hint cuando ambos se pasan', () => {
    const { container } = render(
      <Field label="X" error="boom" hint="nope"><input id="c" /></Field>,
    );
    const input = container.querySelector('input')!;
    const errNode = container.querySelector('[data-slot="field-error"]')!;
    const hintNode = container.querySelector('[data-slot="field-hint"]');
    expect(hintNode).toBeNull(); // hint no se renderiza cuando hay error
    expect(input.getAttribute('aria-describedby')).toBe(errNode.id);
  });

  it('FUSIONA con el aria-describedby que trae el caller (hint)', () => {
    const { container } = render(
      <Field label="X" hint="ayuda"><input id="c" aria-describedby="caller-1 caller-2" /></Field>,
    );
    const input = container.querySelector('input')!;
    const hintNode = container.querySelector('[data-slot="field-hint"]')!;
    const db = input.getAttribute('aria-describedby')!;
    expect(db).toBe(`caller-1 caller-2 ${hintNode.id}`);
    expect(db.split(' ')).toContain(hintNode.id);
    expect(db).toContain('caller-1');
  });

  it('sin hint ni error NO añade aria-describedby', () => {
    const { container } = render(<Field label="X"><input id="c" /></Field>);
    expect(container.querySelector('input')!.hasAttribute('aria-describedby')).toBe(false);
  });
});
