// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeSwitcher } from './theme-switcher';

/**
 * QUÉ CAPA EJERCITA ESTO (y qué NO):
 *  - SÍ: monta el island `ThemeSwitcher` en jsdom, simula clicks reales con
 *    userEvent y observa el EFECTO sobre `document.documentElement` — el contrato
 *    del switcher (escribe/limpia `data-theme` en <html>) y, sobre todo, que ese
 *    efecto NO se fuga al desmontar (el bug de correctness). Es el patrón de
 *    testing/references/frontend.md §5: interactuar como el usuario y assertar el
 *    resultado observable, nunca el estado interno de React.
 *  - NO: no comprueba que el navegador PINTE el tema oscuro ni el contraste — eso es
 *    del CUA con navegador real. jsdom no hace layout ni pintado.
 *
 * Este es el primer test de componente del repo: estrena jsdom + Testing Library
 * (vía `// @vitest-environment jsdom` por-fichero, dejando el resto del proyecto en
 * `node`). TD.2+ reutilizan estas deps.
 */

afterEach(() => {
  cleanup();
  // Red de seguridad entre tests: aunque la limpieza del efecto ya lo quita al
  // desmontar, garantizamos un <html> sin tema para el siguiente test.
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeSwitcher', () => {
  it('conmuta data-theme en <html> según la opción elegida', async () => {
    const user = userEvent.setup();
    const { getByRole } = render(createElement(ThemeSwitcher));

    // Claro por defecto = SIN atributo (lo que pinta el SSR).
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

    await user.click(getByRole('button', { name: /oscuro/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    await user.click(getByRole('button', { name: /claro/i }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('al desmontarse quita data-theme de <html> (no fuga el tema a otras rutas)', async () => {
    // CONTROL NEGATIVO del bug de fuga: salir de /design-system en el App Router
    // desmonta el switcher sin recargar el documento. Sin la limpieza del efecto,
    // `data-theme="dark"` quedaría pegado en el <html> global y re-tematizaría el
    // resto de la app. Si se elimina el `return () => root.removeAttribute(...)` del
    // efecto de ThemeSwitcher, este test se pone ROJO (verificado).
    const user = userEvent.setup();
    const { unmount, getByRole } = render(createElement(ThemeSwitcher));

    await user.click(getByRole('button', { name: /oscuro/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    unmount();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
