// Los DOS MODOS de la pantalla de trabajo (PRD §7 / decisión 2 de F6): la misma pantalla,
// dos direcciones, dos URLs. `/analyze` decodifica (la experiencia de siempre) y `/compose`
// compone. Aquí viven el vocabulario (modo ⇄ ruta) y el borrador que sobrevive al conmutador,
// fuera de todo componente: son datos, y así se testean sin jsdom.
//
// ── QUÉ SE CONSERVA AL CONMUTAR (decisión de T6.7, documentada donde vive el código) ──
// Conmutar de modo NO debe tirar lo que el usuario acaba de escribir, pero entrar directo a
// `/compose` (o recargar `/analyze`) SÍ debe dar una pantalla limpia — lo pide la Entrega, y
// además cambiar el comportamiento de recarga de `/analyze` sería una regresión de F1/F5.
// Las dos cosas a la vez se consiguen con un BORRADOR + un FLAG DE UN SOLO USO:
//   · cada modo guarda su borrador en `sessionStorage` mientras el usuario edita;
//   · el conmutador marca el flag JUSTO ANTES de `router.push`;
//   · el modo que monta restaura su borrador SOLO si encuentra el flag, y lo consume.
// Consecuencias, todas deliberadas: conmutar ida y vuelta conserva ambos lados; RECARGAR,
// entrar por enlace directo, volver desde `/history` o abrir la pestaña de nuevo dan pantalla
// limpia. El borrador vive en la pestaña (sessionStorage) hasta que se cierra y NUNCA viaja
// por la red ni por la URL (§11: el input jamás toca la barra de direcciones).
//
// LO QUE EL BORRADOR NO GUARDA: las `options` de un paso. Hoy la única con `options` es
// `jwt.sign`, cuyo `secret` es el dato que toda la fase promete que no se persiste en ningún
// sitio (§11, T6.8/T6.10). El borrador guarda la RECETA (ids de transformación) y la fuente,
// nunca las opciones — allowlist, no blacklist: aquí solo se serializa lo que se enumera.

import { encodeCatalogByGroup } from '@app/core/engine';

// El vocabulario que consumen las pantallas es el TIPO; la exhaustividad la impone
// `Record<WorkMode, …>` en las tablas de abajo (añadir un modo rompe la compilación aquí).
export type WorkMode = 'decode' | 'compose';

// Modo ⇄ ruta en un solo sitio: el conmutador navega con esto y la pantalla deriva su modo de
// la ruta (nunca al revés, para que `usePathname()` sea la única verdad tras navegar).
export const MODE_ROUTE: Record<WorkMode, string> = {
  decode: '/analyze',
  compose: '/compose',
};

const DRAFT_KEY: Record<WorkMode, string> = {
  decode: 'devtools:draft:decode',
  compose: 'devtools:draft:compose',
};

// Flag de un solo uso escrito por el conmutador. Su ausencia es lo que hace que una recarga o
// una visita directa den pantalla limpia.
const SWITCH_FLAG_KEY = 'devtools:mode-switch';

// `sessionStorage` no existe en SSR (y puede lanzar `SecurityError` con cookies de terceros
// bloqueadas o en modo privado de algunos navegadores): todo acceso pasa por aquí, y un fallo
// degrada a «sin borrador» en vez de tumbar la pantalla.
function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Marca que la próxima navegación es un cambio de modo. La llama el conmutador antes de navegar. */
export function markModeSwitch(): void {
  try {
    storage()?.setItem(SWITCH_FLAG_KEY, '1');
  } catch {
    // Cuota llena o storage bloqueado: se pierde la conservación del borrador, no la navegación.
  }
}

/**
 * Guarda el borrador del modo indicado (lo llama cada editor mientras el usuario escribe).
 *
 * ── RETENCIÓN: DECISIÓN DELIBERADA DE T6.7 ────────────────────────────────────────────
 * El borrador vive en `sessionStorage`, es decir MIENTRAS LA PESTAÑA ESTÉ ABIERTA, y no en
 * `localStorage` (que sobreviviría al cierre) ni en la URL (§11) ni en el servidor (D10). Es más
 * retención que la del `pending-input` de F5, que se consume de un solo uso, y por eso se decide
 * explícitamente en vez de heredarse:
 *   · lo que se guarda es lo que el usuario ESTÁ editando en la otra dirección de la misma
 *     pantalla, así que tirarlo antes de que vuelva sería tirar su trabajo — que es justo lo que
 *     la Entrega prohíbe («sin perder lo escrito dentro de la misma visita»);
 *   · VACIAR EL CAMPO BORRA LA CLAVE (el `value === ''` de abajo): el usuario tiene un gesto
 *     evidente para que no quede nada, y «lo he borrado» significa borrado también aquí;
 *   · NUNCA entra en el borrador nada que §11 prohíba persistir: se serializa una allowlist
 *     (`source` + ids de transformación). El secreto de firma de T6.8 vive en `options`, que no
 *     tiene por dónde llegar hasta aquí — y hay test que lo fija.
 */
export function saveDraft(mode: WorkMode, value: string): void {
  try {
    const store = storage();
    if (!store) return;
    // Cadena vacía = «no hay nada que conservar»: se BORRA la clave en vez de guardar un hueco.
    if (value === '') store.removeItem(DRAFT_KEY[mode]);
    else store.setItem(DRAFT_KEY[mode], value);
  } catch {
    // Igual que arriba: el borrador es una comodidad, nunca un requisito de funcionamiento.
  }
}

/**
 * Devuelve el borrador del modo SOLO si venimos de un cambio de modo, y consume el flag.
 * Sin flag (recarga, enlace directo, vuelta desde otra ruta) devuelve `null`: pantalla limpia.
 */
export function takeSwitchedDraft(mode: WorkMode): string | null {
  const store = storage();
  if (!store) return null;
  try {
    if (store.getItem(SWITCH_FLAG_KEY) === null) return null;
    store.removeItem(SWITCH_FLAG_KEY);
    return store.getItem(DRAFT_KEY[mode]);
  } catch {
    return null;
  }
}

// ── Serialización del borrador de COMPONER ────────────────────────────────────────────
// La fuente + los ids de los pasos. Se declara aquí, junto al resto del borrador, para que la
// exclusión de `options` sea evidente al leer el módulo (y no un olvido río abajo).
export interface ComposeDraft {
  source: string;
  transforms: string[];
}

export function serializeComposeDraft(draft: ComposeDraft): string {
  return JSON.stringify({ source: draft.source, transforms: draft.transforms });
}

// Ids que EXISTEN hoy en el catálogo de codificación del motor. El borrador es dato que
// SOBREVIVE al código que lo escribió (una pestaña abierta durante un despliegue, un catálogo que
// cambia): al leerlo se descartan los pasos que la pantalla no podría representar honestamente.
const KNOWN_TRANSFORMS = new Set(
  encodeCatalogByGroup().flatMap((group) => group.items.map((item) => item.id)),
);

/**
 * Parseo TOTAL: un borrador corrupto (o de una versión anterior) devuelve `null`, nunca lanza.
 *
 * Además del parseo, SANEA la receta: se quedan solo los ids que existen en el catálogo. Un id
 * vacío haría que `safeCompose` rechazara la receta entera y la pantalla se sustituyera por un
 * aviso de «quítalos» sin ningún control con el que quitarlos; y un id desconocido dejaría el
 * `Select` del paso en blanco mientras el error habla de otra cosa. Descartar es lo honesto:
 * el usuario ve la receta que SÍ se puede reproducir.
 */
export function parseComposeDraft(raw: string | null): ComposeDraft | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { source, transforms } = parsed as { source?: unknown; transforms?: unknown };
  if (typeof source !== 'string') return null;
  if (!Array.isArray(transforms) || !transforms.every((t) => typeof t === 'string')) return null;
  return { source, transforms: transforms.filter((t) => KNOWN_TRANSFORMS.has(t)) };
}
