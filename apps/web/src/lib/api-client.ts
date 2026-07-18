// Cliente HTTP tipado e isomorfo de la app (frontend/architecture.md §3). ÚNICA pieza
// que hace fetch contra la API REST propia: nadie escribe `fetch('/api/…')` a mano. Cada
// respuesta se valida con el schema Zod de `@app/core` que se le pasa; un HTTP no-ok se
// convierte en `ApiError` tipada leyendo el envelope `{code,message,details?}` (contrato de
// core). Importable desde client components (`'use client'`); los server components usan
// `api-server.ts` (aún no necesario: `/` dispara el análisis en cliente al pegar/escribir).
import { z } from 'zod';
import { ErrorEnvelopeSchema, type ErrorEnvelope } from '@app/core/contracts';

export class ApiError extends Error {
  constructor(
    readonly code: ErrorEnvelope['code'],
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Base de SERVIDOR por precedencia (arquitectura §3.1): override explícito >
// derivada del puerto real pedido > default de Next. Función PURA sobre el env para
// poder testear la precedencia sin arrancar nada. `PORT` se valida solo en FORMA
// (dígitos): el RANGO no es asunto del resolver (un PORT fuera de rango impide que Next
// arranque, así que el resolver nunca se llama con él).
export function resolveServerBaseUrl(env: Record<string, string | undefined>): string {
  const override = env.INTERNAL_API_URL?.trim();
  if (override) return override.replace(/\/$/, '');
  const port = env.PORT?.trim();
  if (port && /^\d+$/.test(port)) return `http://localhost:${port}`;
  return 'http://localhost:3000';
}

// En navegador: rutas RELATIVAS (el origin propio) — `PORT` no significa nada ahí, por eso
// el guard de `typeof window` va PRIMERO. En jsdom (tests) y en servidor: URL absoluta (el
// fetch de Node la exige).
const base = (): string =>
  typeof window === 'undefined' || process.env.NODE_ENV === 'test'
    ? resolveServerBaseUrl(process.env)
    : '';

export async function apiFetch<S extends z.ZodType>(
  path: string,
  schema: S,
  init: RequestInit & { baseUrl?: string } = {},
): Promise<z.infer<S>> {
  const { baseUrl, ...rest } = init;
  const res = await fetch(`${baseUrl ?? base()}${path}`, { ...rest, cache: 'no-store' });

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const envelope = ErrorEnvelopeSchema.safeParse(body);
    if (envelope.success) {
      throw new ApiError(
        envelope.data.code,
        envelope.data.message,
        res.status,
        envelope.data.details,
      );
    }
    throw new ApiError('internal', `Respuesta sin envelope de ${path}`, res.status);
  }

  return schema.parse(await res.json());
}

const json = (body: unknown, method: string): RequestInit => ({
  method,
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json' },
});

export const api = {
  get: <S extends z.ZodType>(path: string, schema: S, init?: RequestInit & { baseUrl?: string }) =>
    apiFetch(path, schema, init),
  post: <S extends z.ZodType>(
    path: string,
    schema: S,
    body: unknown,
    init?: RequestInit & { baseUrl?: string },
  ) => apiFetch(path, schema, { ...init, ...json(body, 'POST') }),
};
