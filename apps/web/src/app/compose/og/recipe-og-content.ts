import type { HistoryComposeStep } from '@app/core/history';

// Derivación PURA de los textos que pinta la imagen OG de una receta (T7.4). Vive fuera del
// route handler (architecture.md §2.3: toda transformación de datos en funciones puras, testeable
// como unit sin levantar satori) y la consumen tanto el render de `ImageResponse` como
// `generateMetadata` de `/compose` (el `og:title` «Receta · N pasos» sale de aquí, una sola
// verdad entre la imagen y el `<head>`).

/** Título de la receta: «Receta · N pasos» (singular «1 paso»). N = número de pasos. */
export function recipeHeadline(steps: HistoryComposeStep[]): string {
  const n = steps.length;
  return `Receta · ${String(n)} ${n === 1 ? 'paso' : 'pasos'}`;
}

/**
 * Los ids de transformación de la receta, EN ORDEN, para pintarlos como cadena. Devuelve el array
 * de ids (`['json.minify', 'jwt.sign']`); el render los une con la flecha del DS (` → `) y hace
 * wrap. Se devuelve el array (no un string ya unido) para que el render controle el separador y el
 * salto de línea sin re-parsear.
 */
export function recipeTransformIds(steps: HistoryComposeStep[]): string[] {
  return steps.map((step) => step.transform_id);
}
