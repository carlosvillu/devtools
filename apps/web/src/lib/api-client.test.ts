import { afterEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, apiFetch, resolveServerBaseUrl } from './api-client';

// Precedencia de la base de servidor (architecture.md §3.1): override explícito > derivada
// del PORT pedido > default de Next. Es la lección de un incidente real (base hardcodeada al
// 3000 tumbaba las páginas RSC en otro puerto), así que se protege como test permanente.
describe('resolveServerBaseUrl', () => {
  test('INTERNAL_API_URL gana y se le normaliza la barra final', () => {
    expect(resolveServerBaseUrl({ INTERNAL_API_URL: 'http://proxy:9000/' })).toBe(
      'http://proxy:9000',
    );
  });

  test('sin override, se deriva de PORT', () => {
    expect(resolveServerBaseUrl({ PORT: '3117' })).toBe('http://localhost:3117');
  });

  test('el override tiene prioridad sobre PORT', () => {
    expect(resolveServerBaseUrl({ INTERNAL_API_URL: 'http://x:1', PORT: '3117' })).toBe(
      'http://x:1',
    );
  });

  test('un PORT no numérico se ignora → default 3000', () => {
    expect(resolveServerBaseUrl({ PORT: 'abc' })).toBe('http://localhost:3000');
  });

  test('sin override ni PORT → default 3000', () => {
    expect(resolveServerBaseUrl({})).toBe('http://localhost:3000');
  });
});

describe('apiFetch', () => {
  const Schema = z.object({ ok: z.boolean() });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockFetch = (res: Response) => {
    const spy = vi.fn(() => Promise.resolve(res));
    vi.stubGlobal('fetch', spy);
    return spy;
  };

  test('parsea la respuesta con el schema en un 200 y fuerza cache no-store', async () => {
    const spy = mockFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await expect(apiFetch('/x', Schema, { baseUrl: 'http://t' })).resolves.toEqual({ ok: true });
    expect(spy).toHaveBeenCalledWith('http://t/x', expect.objectContaining({ cache: 'no-store' }));
  });

  test('un envelope de error se convierte en ApiError tipada con code/status', async () => {
    mockFetch(
      new Response(JSON.stringify({ code: 'validation_error', message: 'malo' }), { status: 400 }),
    );
    await expect(apiFetch('/x', Schema, { baseUrl: 'http://t' })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'validation_error',
      status: 400,
      message: 'malo',
    });
  });

  test('una respuesta no-ok sin envelope → ApiError internal', async () => {
    mockFetch(new Response('nope', { status: 500 }));
    const err = await apiFetch('/x', Schema, { baseUrl: 'http://t' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'internal', status: 500 });
  });
});
