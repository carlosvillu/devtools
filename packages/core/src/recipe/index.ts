// Subpath export `@app/core/recipe`: codec de la receta compartible en la URL (§7, T7.2).
// Módulo isomorfo y puro. Hoy `decodeRecipe` se consume en el SERVIDOR (la página `/compose` que lee
// `?r=`, T7.3; y la ruta OG, T7.4) y `encodeRecipe` en el CLIENTE (el botón «Copiar enlace», T7.3).
// La API pública es el par de funciones + el tipo del resultado. Los delimitadores
// (`RECIPE_STEP_SEP`/`RECIPE_FIELD_SEP`) son un detalle interno del formato: no se re-exportan
// aquí (solo el test del codec los toca, importándolos directo de `./url-codec`).
export { encodeRecipe, decodeRecipe, type DecodeRecipeResult } from './url-codec';
