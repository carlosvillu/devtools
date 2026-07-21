import { expect, test } from '@playwright/test';

// Playwright permanente de T5.5 — la og:image compartible de la portada `/`, contra el sistema
// REAL levantado. Determinista y gratuito: solo lee el <head> de `/` y sirve la imagen local. Tag
// @f5 (no-regresión de fase).
//
// Qué protege (Entrega/Verificación T5.5):
//   - El <head> de `/` declara `og:image` Y `twitter:image` con una URL ABSOLUTA.
//   - 🔴 CONTROL NEGATIVO DE LA TRAMPA CENTRAL: el host de esas URLs es el de PRODUCCIÓN
//     (`devtools.carlosvillu.dev`, el `metadataBase`), NUNCA `localhost`. Sin `metadataBase` en el
//     layout, Next emite la imagen con `http://localhost:3000/...` y el share se rompe en prod
//     aunque el meta-tag exista — verificado manualmente quitando `metadataBase` y rebuild: ambas
//     URLs pasan a `http://localhost:.../opengraph-image.png` y este assert de host se pone ROJO.
//   - La imagen se SIRVE 200 con `Content-Type: image/*` (se pide la ruta local, no la URL de prod:
//     el dominio real lo verifica el bucle tras el deploy).

const PROD_HOST = 'devtools.carlosvillu.dev';

test.describe('@f5 / — la og:image compartible (T5.5)', () => {
  test('el <head> declara og:image y twitter:image ABSOLUTAS con el host de producción', async ({
    page,
  }) => {
    await page.goto('/');

    const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute('content');
    const twitterImage = await page
      .locator('meta[name="twitter:image"]')
      .first()
      .getAttribute('content');

    // Ambas presentes y ABSOLUTAS (parsear como URL absoluta no lanza). El `?? ''` mantiene el
    // tipo `string` sin `!`/`as` (prohibidos por el linter); si faltaran, `new URL('')` lanza y el
    // test falla ruidosamente igual.
    expect(ogImage, 'og:image debe existir en el <head>').toBeTruthy();
    expect(twitterImage, 'twitter:image debe existir en el <head>').toBeTruthy();

    const ogUrl = new URL(ogImage ?? '');
    const twUrl = new URL(twitterImage ?? '');

    // 🔴 CONTROL NEGATIVO: el host es el de PRODUCCIÓN, no localhost. Este es el assert que caza la
    // desaparición de `metadataBase` (sin él, host === 'localhost').
    expect(ogUrl.host).toBe(PROD_HOST);
    expect(twUrl.host).toBe(PROD_HOST);
    expect(ogUrl.protocol).toBe('https:');
    expect(ogUrl.host).not.toContain('localhost');
    expect(twUrl.host).not.toContain('localhost');

    // og:image y twitter:image apuntan a la MISMA imagen (la convención de fichero de Next las
    // deriva ambas de `opengraph-image.png`).
    expect(twUrl.pathname).toBe(ogUrl.pathname);

    // La tarjeta de X/Twitter es la grande (summary_large_image), no la mínima.
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );

    // La imagen SE SIRVE: se pide la RUTA (pathname+query) contra la baseURL LOCAL — no la URL de
    // prod, que este build aún no ha desplegado; el dominio real lo verifica el bucle tras deploy.
    const res = await page.request.get(ogUrl.pathname + ogUrl.search);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/^image\//);
  });
});
