import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DesignSystemPage from './page';

/**
 * QUÉ CAPA EJERCITA ESTO, LITERALMENTE (y qué NO):
 *  - SÍ: renderiza el árbol React de `/design-system` (página server + el island
 *    `ThemeSwitcher`) a HTML estático con `renderToStaticMarkup`. Prueba de forma
 *    determinista que la página NO lanza al renderizar en servidor y que emite los
 *    specimens de fundaciones prometidos por la Entrega (rampas, alias, escala
 *    tipográfica, espaciado, radios, sombras) y el switcher de tema.
 *  - NO: no comprueba que el navegador PINTE los tokens, ni que el switcher cambie
 *    el tema en vivo (eso requiere DOM real y lo verifica el CUA con navegador), ni
 *    la comparación visual contra guidelines/. Aquí no hay jsdom ni eventos.
 *
 * Es un guardarraíl contra regresiones de render (un token roto, un componente que
 * lanza en SSR), no un sustituto de la verificación visual.
 */

describe('DesignSystemPage', () => {
  // El render vive DENTRO del test que dice cubrir el «sin lanzar»: así un throw en
  // SSR es un rojo de ESE test, no un error de colección de todo el fichero. Los
  // demás tests reutilizan el HTML ya renderizado (los `it` corren en orden de
  // declaración dentro del fichero).
  let html = '';

  it('renderiza a HTML estático sin lanzar', () => {
    expect(() => {
      html = renderToStaticMarkup(createElement(DesignSystemPage));
    }).not.toThrow();
    expect(html).toContain('Fundaciones');
  });

  it('incluye los specimens de las fundaciones', () => {
    for (const title of ['Color', 'Tipografía', 'Espaciado', 'Radios', 'Sombras']) {
      expect(html).toContain(title);
    }
  });

  it('muestra el nombre de tokens crudos como specimen', () => {
    // Un swatch por alias semántico: el token se enseña por su nombre.
    expect(html).toContain('--surface');
    expect(html).toContain('--accent');
    expect(html).toContain('--code-key');
  });

  it('monta el switcher de tema con sus dos opciones accesibles', () => {
    expect(html).toContain('aria-label="Tema del design system"');
    expect(html).toContain('Claro');
    expect(html).toContain('Oscuro');
  });

  it('incluye la sección de primitivas de formulario (TD.2) con controles operables', () => {
    // La sección existe y renderiza las primitivas en SSR sin lanzar (parte del
    // `it` de arriba que envuelve el render). Aquí se comprueba que los controles
    // llevan su semántica/nombre accesible: un botón con data-slot, un select con su
    // chevron, y un input asociado a su label por id — la Verificación de TD.2 exige
    // «operables por rol y accessible name».
    expect(html).toContain('Primitivas de formulario');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('data-slot="icon-button"');
    expect(html).toContain('data-slot="select"');
    expect(html).toContain('for="ds-email"');
    expect(html).toContain('id="ds-email"');
  });
});
