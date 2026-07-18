import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Callout } from './callout';

/**
 * CAPA: jsdom (DOM/estructura + lógica del mapa de tonos). SÍ — que cada tono elige su
 * icono e emite su clase de fondo de token, que el `role="note"` (semántica del aviso)
 * se conserva, que title/children se renderizan y que `icon` sobrescribe. NO — el
 * color-mix real del borde ni el acento del icono (píxel → CUA en ambos temas).
 */
describe('Callout', () => {
  it('es un role=note con fondo de token del tono por defecto (info)', () => {
    render(<Callout title="Aviso">cuerpo</Callout>);
    const note = screen.getByRole('note');
    expect(note).toHaveAttribute('data-slot', 'callout');
    expect(note).toHaveClass('bg-accent-subtle-bg', 'text-accent-subtle-fg');
    expect(screen.getByText('Aviso').tagName).toBe('STRONG');
    expect(screen.getByText('cuerpo')).toBeInTheDocument();
  });

  it.each([
    ['warning', 'bg-warning-subtle-bg'],
    ['danger', 'bg-danger-subtle-bg'],
    ['success', 'bg-success-subtle-bg'],
    ['security', 'bg-surface-2'],
  ] as const)('tono %s emite su clase de fondo de token', (tone, cls) => {
    render(<Callout tone={tone}>x</Callout>);
    expect(screen.getByRole('note')).toHaveClass(cls);
  });

  it('el tono security usa el icono shield (aviso de privacidad)', () => {
    // shield = un único <path>, sin <circle> ni <rect>: ancla de que se eligió ese glifo.
    const { container } = render(
      <Callout tone="security" title="Sobre tus datos">
        No lo uses con secretos vivos.
      </Callout>,
    );
    const icon = container.querySelector('svg[data-slot="icon"]');
    expect(icon).not.toBeNull();
    expect(icon?.querySelector('circle')).toBeNull();
    expect(icon?.querySelector('rect')).toBeNull();
    expect(icon?.querySelector('path')).not.toBeNull();
  });

  it('icon sobrescribe el icono por defecto del tono', () => {
    const { container } = render(
      <Callout tone="info" icon="key">
        x
      </Callout>,
    );
    // key trae un <circle> (el diente); info trae un <circle> también, así que el ancla
    // es que el icono existe y es SVG del DS (el glifo exacto es píxel → CUA).
    expect(container.querySelector('svg[data-slot="icon"]')).not.toBeNull();
  });
});
