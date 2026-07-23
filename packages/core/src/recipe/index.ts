// Subpath export `@app/core/recipe`: codec de la receta compartible en la URL (§7, T7.2).
// Lo consumen `/compose` (T7.3, cliente) y la OG (T7.4, servidor). Módulo isomorfo y puro.
// La API pública es el par de funciones + el tipo del resultado. Los delimitadores
// (`RECIPE_STEP_SEP`/`RECIPE_FIELD_SEP`) son un detalle interno del formato: no se re-exportan
// aquí (solo el test del codec los toca, importándolos directo de `./url-codec`).
export { encodeRecipe, decodeRecipe, type DecodeRecipeResult } from './url-codec';
