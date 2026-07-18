import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon, type IconName, iconNames } from './icon';

/**
 * CAPA: jsdom (DOM/estructura). SÍ — que `Icon` emite un <svg> real con los <path>/
 * <circle>/… del glifo del DS, decorativo (aria-hidden), con `size`/`strokeWidth`
 * aplicados, y que un nombre no mapeado no revienta. NO — que el navegador PINTE el
 * trazo (píxel → CUA). Esto es lo que sustituye a los glifos Unicode que salían tofu:
 * el test asegura que el icono es SVG-inline, no un carácter dependiente de la fuente.
 */
describe('Icon', () => {
  it('renderiza un <svg> decorativo con el fragmento del glifo dentro', () => {
    const { container } = render(<Icon name="copy" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('data-slot', 'icon');
    // `copy` es un rect + un path en el espejo: el SVG lleva geometría real.
    expect(svg?.querySelector('rect')).not.toBeNull();
    expect(svg?.querySelector('path')).not.toBeNull();
  });

  it('aplica size (width/height) y strokeWidth', () => {
    const { container } = render(<Icon name="search" size={14} strokeWidth={1.5} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '14');
    expect(svg).toHaveAttribute('height', '14');
    expect(svg).toHaveAttribute('stroke-width', '1.5');
  });

  it('usa 16px y strokeWidth 2 por defecto', () => {
    const { container } = render(<Icon name="chevron-down" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('stroke-width', '2');
  });

  it('expone los 26 nombres del inventario del DS', () => {
    expect(iconNames).toHaveLength(26);
    expect(iconNames).toContain('copy');
    expect(iconNames).toContain('git-branch');
  });

  it('un nombre no mapeado no revienta (svg vacío)', () => {
    // El contrato tipa `name: IconName`; el cast fuerza el caso de runtime que el
    // `?? null` del componente cubre (p. ej. datos que se salen del type en el borde).
    expect(() => render(<Icon name={'no-existe' as IconName} />)).not.toThrow();
  });
});
