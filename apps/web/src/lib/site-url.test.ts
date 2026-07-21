import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_URL, resolveSiteUrl } from './site-url';

// Guarda PERMANENTE de la trampa central de T5.5: el origen público del que Next deriva la
// og:image ABSOLUTA. El control negativo es el assert de host: si el default volviera a ser
// localhost (o el helper dejara de existir), estos tests se ponen ROJOS gratis, en `pnpm gate`,
// sin levantar navegador ni servidor.
describe('resolveSiteUrl', () => {
  it('sin NEXT_PUBLIC_SITE_URL cae al dominio de PRODUCCIÓN, nunca a localhost', () => {
    const url = resolveSiteUrl({});
    // 🔴 CONTROL NEGATIVO: el default es prod, no localhost. Si metadataBase volviera a faltar,
    // Next usaría http://localhost:3000 — este host-check es justo lo que lo caza.
    expect(url.host).toBe('devtools.carlosvillu.dev');
    expect(url.protocol).toBe('https:');
    expect(url.host).not.toContain('localhost');
    expect(url.origin).toBe(DEFAULT_SITE_URL);
  });

  it('usa NEXT_PUBLIC_SITE_URL cuando es una URL válida (deriva de env)', () => {
    const url = resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://staging.example.com' });
    expect(url.origin).toBe('https://staging.example.com');
  });

  it('con env vacío o inválido cae al dominio de producción (no un localhost implícito)', () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: '' }).host).toBe('devtools.carlosvillu.dev');
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: '   ' }).host).toBe('devtools.carlosvillu.dev');
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'no-es-una-url' }).host).toBe(
      'devtools.carlosvillu.dev',
    );
  });

  it('rechaza esquemas no-http(s) (javascript:, ftp:, data:) y cae al dominio de producción', () => {
    for (const evil of ['javascript:alert(1)', 'ftp://x.example.com', 'data:text/html,x']) {
      expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: evil }).origin).toBe(DEFAULT_SITE_URL);
    }
  });

  it('acepta un http:// explícito (no solo https)', () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' }).origin).toBe(
      'http://localhost:3000',
    );
  });
});
