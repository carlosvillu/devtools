// Barrel del backend de web: SOLO lo que los route handlers consumen a través
// de él (api.md §1). knip veta reexportar por el barrel un símbolo que nadie
// consume por aquí — `toErrorResponse` y `getRequestLogger` se importan de su
// path directo desde donde hagan falta. Es intencional, no drift.
export { withRoute } from './with-route';
