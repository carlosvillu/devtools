// Helper de aserción para errores de Postgres en tests de integración.
//
// Drizzle 0.44+ ENVUELVE el error de pg en un `DrizzleQueryError` cuyo `.message`
// es «Failed query: …»; el SQLSTATE real (`23505` unique, `23503` FK, …) viaja en
// la cadena de `.cause`. Un `toThrow(/duplicate key/)` sobre el mensaje de arriba
// ya no casa: hay que mirar el código. Esta función recorre la cadena de causas y
// devuelve el primer `code` que encuentre.
export function pgErrorCode(err: unknown): string | undefined {
  let current: unknown = err;
  for (let depth = 0; depth < 10 && current != null; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}
