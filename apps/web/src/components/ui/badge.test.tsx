import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, KIND_META, type DataKind } from './badge';

/**
 * CAPA: jsdom (DOM/estructura + lógica pura del mapa de tipos). SÍ — que `KIND_META`
 * fija la identidad visual de cada DataKind, que un `kind` deriva label/icono/mono, que
 * los tonos emiten las clases de token del DS y que `outline`/`icon`/`mono` se resuelven.
 * NO — el color REAL pintado ni el color-mix del borde (píxel → CUA en ambos temas).
 */
describe('Badge', () => {
  it('KIND_META cubre los 8 DataKind con tono, icono y label del vocabulario del producto', () => {
    const kinds: DataKind[] = [
      'base64',
      'jwt',
      'json',
      'unix_timestamp',
      'url',
      'uuid',
      'hash',
      'text',
    ];
    expect(Object.keys(KIND_META).sort()).toEqual([...kinds].sort());
    // Anclas del contrato visual (regresión del mapa): jwt=key/accent, json=braces/violet,
    // base64=terminal/cyan, timestamp=clock/warning, url=link/success.
    expect(KIND_META.jwt).toEqual({ tone: 'accent', icon: 'key', label: 'jwt' });
    expect(KIND_META.json).toEqual({ tone: 'violet', icon: 'braces', label: 'json' });
    expect(KIND_META.base64).toEqual({ tone: 'cyan', icon: 'terminal', label: 'base64' });
    expect(KIND_META.unix_timestamp).toEqual({
      tone: 'warning',
      icon: 'clock',
      label: 'timestamp',
    });
    expect(KIND_META.url).toEqual({ tone: 'success', icon: 'link', label: 'url' });
  });

  it('kind pinta el label del vocabulario, un icono SVG y familia mono por defecto', () => {
    render(<Badge kind="unix_timestamp" />);
    const badge = screen.getByText('timestamp');
    expect(badge).toHaveAttribute('data-slot', 'badge');
    expect(badge).toHaveClass('font-mono'); // mono por defecto cuando hay kind
    expect(badge.querySelector('svg[data-slot="icon"]')).not.toBeNull();
  });

  it('children reemplaza al label del kind y mono=false fuerza sans', () => {
    render(
      <Badge kind="jwt" mono={false}>
        personalizado
      </Badge>,
    );
    const badge = screen.getByText('personalizado');
    expect(badge).toHaveClass('font-sans');
    expect(screen.queryByText('jwt')).toBeNull();
  });

  it.each([
    ['neutral', ['bg-surface-2', 'text-text-muted']],
    ['accent', ['bg-accent-subtle-bg', 'text-accent-subtle-fg']],
    ['success', ['bg-success-subtle-bg', 'text-success-subtle-fg']],
    ['warning', ['bg-warning-subtle-bg', 'text-warning-subtle-fg']],
    ['danger', ['bg-danger-subtle-bg', 'text-danger-subtle-fg']],
  ] as const)('tono %s emite las clases de token semántico del DS', (tone, classes) => {
    render(<Badge tone={tone}>x</Badge>);
    const badge = screen.getByText('x');
    for (const cls of classes) expect(badge).toHaveClass(cls);
  });

  it.each([
    ['violet', 'text-violet-700'],
    ['cyan', 'text-cyan-700'],
  ] as const)(
    'tono secundario %s usa la rampa del DS para el texto (desviación sancionada)',
    (tone, fg) => {
      // violet/cyan no tienen alias semántico: el DS los pinta con la rampa. El fondo es
      // color-mix inline (sin clase de fondo semántica), así que NO debe llevar bg-*-subtle-bg.
      render(<Badge tone={tone}>x</Badge>);
      const badge = screen.getByText('x');
      expect(badge).toHaveClass(fg);
      expect(badge.className).not.toMatch(/bg-\w+-subtle-bg/);
    },
  );

  it('outline no aplica clase de fondo semántica', () => {
    render(
      <Badge tone="accent" outline>
        x
      </Badge>,
    );
    expect(screen.getByText('x')).not.toHaveClass('bg-accent-subtle-bg');
  });

  it('icon sobrescribe el icono por defecto del kind y size sm emite su altura de token', () => {
    render(<Badge kind="jwt" icon="check" size="sm" />);
    const badge = screen.getByText('jwt');
    expect(badge).toHaveClass('h-4.5', 'text-2xs');
    expect(badge.querySelector('svg[data-slot="icon"]')).not.toBeNull();
  });
});
