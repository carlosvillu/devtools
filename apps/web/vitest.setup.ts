import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Auto-cleanup del DOM entre tests. @testing-library/react solo lo registra solo si
// las APIs globales de test están activas (`globals: true`), y este proyecto NO las
// activa (los tests importan `describe/it/expect` explícitamente). Sin esto, los
// renders de cada `it` se acumulan en el mismo `document` y un `getByRole` no-scopeado
// encuentra múltiples nodos. Registrarlo aquí, una vez, cubre a todos los ficheros.
afterEach(() => {
  cleanup();
});

// Setup jsdom A NIVEL DE PROYECTO que prescribe testing/references/frontend.md §2 y
// que TD.1 dejó pendiente (usaba jsdom por-fichero, sin matchers ni mocks). Lo estrena
// TD.2 (primeras primitivas del DS). Centraliza aquí las APIs de layout/observación
// que jsdom no implementa y que muchas librerías de UI exigen para montar, para que
// ningún test las repita. Se añaden SOLO las que el proyecto necesita de verdad —
// cada mock es una mentira controlada.
//
// Estado en TD.2: las 6 primitivas de formulario son controles NATIVOS (el Select es
// un `<select>` nativo, no un listbox portalizado de Base UI), así que hoy NINGÚN test
// depende de `matchMedia`/`ResizeObserver`. Se dejan montados igualmente, tal como §2
// manda, porque son la red de seguridad para las primitivas de Base UI con
// portal/popover que llegan en TD.4 (dialog/tooltip/toast): sin ellos, esos
// componentes montan vacíos y los tests dan falsos negativos SILENCIOSOS. Estrenar el
// setup ahora es justo lo que el journal de TD.1 pidió para no caer en esa trampa.

class ResizeObserverMock {
  observe(): void {
    /* jsdom no hace layout: no hay tamaños que emitir. Basta con que exista. */
  }
  unobserve(): void {
    /* noop */
  }
  disconnect(): void {
    /* noop */
  }
}
globalThis.ResizeObserver = ResizeObserverMock;

// Polyfill mínimo de HTMLDialogElement (TD.4, primer <dialog> nativo del proyecto). jsdom
// NO implementa `showModal()`/`show()`/`close()` (verificado: son `undefined`), así que sin
// esto el <dialog> del componente `Dialog` nunca recibe el atributo `open` → queda
// `display:none` → `getByRole('dialog')` no lo encuentra y el test da un falso negativo.
// El polyfill reproduce SOLO el contrato de estado que el componente usa: reflejar el
// atributo `open` y emitir el evento `close`. Lo que NO se puede fingir con honestidad
// —foco atrapado, cierre real por Escape, `::backdrop`— es comportamiento nativo del
// navegador y se verifica en CUA, no aquí (gotcha documentado en la tarea).
// `Partial<…>` para que el chequeo sea genuino: los tipos del DOM declaran showModal
// SIEMPRE presente, así que sin esto `no-unnecessary-condition` marca el guard como muerto.
const dialogProto = HTMLDialogElement.prototype as Partial<HTMLDialogElement>;
if (typeof dialogProto.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(): void {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.show = function show(): void {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(): void {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {
      /* noop */
    },
    removeEventListener() {
      /* noop */
    },
    addListener() {
      /* noop */
    },
    removeListener() {
      /* noop */
    },
    dispatchEvent: () => false,
  }),
});
