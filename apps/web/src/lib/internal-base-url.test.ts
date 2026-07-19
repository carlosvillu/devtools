// Unit de la GUARDA DE DESTINO de `api-server` (T2.2).
//
// Por qué existe: `api-server` reenvía la cookie de sesión del visitante a la base URL
// interna, y esa base sale de `INTERNAL_API_URL`, un override libre por env sin validación
// de host. Si apuntara fuera del loopback, las credenciales de cada visitante saldrían del
// proceso EN SILENCIO. Esta guarda convierte ese fallo silencioso en un error ruidoso, y
// este test es lo que impide que alguien la relaje sin darse cuenta.
//
// Se testea la función PURA (no el fetch): es donde vive toda la decisión.
import { describe, expect, it } from 'vitest';
import { assertLoopbackBaseUrl } from './internal-base-url';

describe('assertLoopbackBaseUrl', () => {
  it.each([
    'http://localhost:3000',
    'http://127.0.0.1:3110',
    'http://[::1]:3000',
    'https://localhost:3000',
  ])('acepta el loopback %s', (url) => {
    expect(assertLoopbackBaseUrl(url)).toBe(url);
  });

  it.each([
    'http://example.com',
    'https://devtools.carlosvillu.dev',
    'http://10.0.0.5:3000',
    'http://192.168.1.20',
    // El caso traicionero: un host que CONTIENE «localhost» pero no lo es.
    'http://localhost.evil.com',
    'http://127.0.0.1.evil.com',
  ])('RECHAZA %s: reenviar ahí sacaría la cookie de sesión del proceso', (url) => {
    expect(() => assertLoopbackBaseUrl(url)).toThrow(/loopback/i);
  });

  it('rechaza una base URL que ni siquiera es una URL', () => {
    expect(() => assertLoopbackBaseUrl('no-es-una-url')).toThrow(/inválida/i);
  });

  it('el mensaje de error no filtra credenciales, solo el host de configuración', () => {
    // El error viaja a los logs: no puede arrastrar cookies ni tokens.
    expect(() => assertLoopbackBaseUrl('http://example.com')).toThrow(/example\.com/);
    expect(() => assertLoopbackBaseUrl('http://example.com')).not.toThrow(/cookie=/i);
  });
});
