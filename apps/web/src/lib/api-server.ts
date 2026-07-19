// Cliente HTTP para SERVER COMPONENTS (frontend/architecture.md §3.1). Gemelo de
// `api-client.ts` con dos diferencias que solo tienen sentido en el servidor:
//
//  1. **Reenvía la cookie de sesión.** El `fetch` de un RSC NO propaga las cookies del
//     visitante solas: sin esto, la página pediría `/api/history` como ANÓNIMA y se
//     comería un 401. En el navegador esto es gratis; aquí hay que hacerlo explícito.
//  2. **Base URL absoluta interna** (`resolveServerBaseUrl`), nunca un puerto a mano.
//
// `import 'server-only'` convierte en FALLO DE BUILD (no de runtime) el que un client
// component importe esto por error: `next/headers` es server-only a nivel de grafo de
// módulos. La regla de imports es: RSC → `@/lib/api-server`; `'use client'` → `@/lib/api-client`.
import 'server-only';
import { cookies } from 'next/headers';
import type { z } from 'zod';
import { apiFetch, resolveServerBaseUrl } from './api-client';
// La guarda vive en su propio módulo (sin `server-only`) para poder testearla como unit.
import { assertLoopbackBaseUrl } from './internal-base-url';

async function serverFetch<S extends z.ZodType>(
  path: string,
  schema: S,
  init: RequestInit = {},
): Promise<z.infer<S>> {
  // Se valida ANTES de leer las cookies: si el destino no es de fiar, no se llega ni a
  // materializar la cabecera con las credenciales.
  const baseUrl = assertLoopbackBaseUrl(resolveServerBaseUrl(process.env));

  // Leer cookies hace la página dinámica: correcto, el historial es un dato vivo y por
  // usuario — cachearlo entre visitantes sería exactamente el bug de aislamiento a evitar.
  const cookieHeader = (await cookies()).toString();
  // `Headers` en vez de esparcir `init.headers`: `HeadersInit` admite también un array de
  // pares, y esparcirlo en un objeto produciría claves numéricas silenciosamente.
  const headers = new Headers(init.headers);
  if (cookieHeader) headers.set('cookie', cookieHeader);

  return apiFetch(path, schema, { ...init, baseUrl, headers });
}

export const api = {
  get: <S extends z.ZodType>(path: string, schema: S) => serverFetch(path, schema),
};
