import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

// Guardián de D6: el proxy protege ÚNICAMENTE /history y /api/history. Este test FALLA
// si `/` (o cualquier ruta pública) se protege por error. La auto-guarda del proxy hace
// fiel esta prueba: la función se invoca directamente, sin depender del `matcher`.
const req = (path: string, cookie?: string): NextRequest =>
  new NextRequest(`http://localhost${path}`, cookie ? { headers: { cookie } } : undefined);

const isNext = (res: { headers: Headers }): boolean => res.headers.get('x-middleware-next') === '1';

describe('proxy (D6)', () => {
  it('GUARDIÁN: `/` NUNCA se protege (sin sesión → pasa, no redirige)', () => {
    const res = proxy(req('/'));
    expect(isNext(res)).toBe(true);
    expect(res.status).not.toBe(307);
  });

  it('rutas públicas pasan sin sesión: /login, /signup, /api/analyze, /api/auth/login', () => {
    for (const p of ['/login', '/signup', '/api/analyze', '/api/auth/login', '/api/health']) {
      expect(isNext(proxy(req(p)))).toBe(true);
    }
  });

  it('/history sin sesión → redirect 307 a /login con ?next=', () => {
    const res = proxy(req('/history'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location')!;
    expect(location).toContain('/login');
    expect(location).toContain('next=%2Fhistory');
  });

  it('/history CON cookie de sesión → pasa (la validación real la hace el handler)', () => {
    const res = proxy(req('/history', 'devtools_session=cualquier-valor'));
    expect(isNext(res)).toBe(true);
  });

  it('/api/history sin sesión → 401 tipado (no redirect)', () => {
    const res = proxy(req('/api/history'));
    expect(res.status).toBe(401);
  });

  it('/api/history CON cookie → pasa', () => {
    expect(isNext(proxy(req('/api/history', 'devtools_session=x')))).toBe(true);
  });
});
