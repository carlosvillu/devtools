import { expect, test } from '@playwright/test';
import { encodeRecipe } from '@app/core/recipe';

// Playwright permanente de T7.4 — la og:image DINÁMICA por receta de `/compose`. Tag @f7
// (no-regresión de fase). Determinista y gratuito: pide la ruta OG y lee el `<head>` contra el
// sistema REAL levantado, sin ejecutar JS (como un crawler). La fidelidad VISUAL de la imagen la
// cierra la verificación de tarea (juicio humano) y el prod la cierra T7.5; aquí se blinda el
// CONTRATO: 200 `image/*` para una receta válida, y fallback SIN 500 para `?r=` inválido/ausente.
//
// `r` se construye con el codec REAL (`encodeRecipe`, T7.2) sobre una receta válida: el mismo
// string que produce «Copiar enlace». Así el test se ata a la verdad del catálogo vivo, no a un
// literal que se quedaría obsoleto si el formato cambiara.
const VALID_R = encodeRecipe([
  { transform_id: 'json.minify', kind: 'json' },
  { transform_id: 'jwt.sign', kind: 'jwt' },
]);

const PROD_HOST = 'devtools.carlosvillu.dev';

test.describe('@f7 /compose/og — la og:image dinámica por receta (T7.4)', () => {
  test('un `?r=` VÁLIDO → 200 `image/*` DIRECTO de tamaño razonable (la imagen de la receta)', async ({
    request,
  }) => {
    // 🔴 `maxRedirects: 0` es DELIBERADO: sin él, `request.get` sigue el redirect y un render de
    // receta ROTO (satori lanza → fallback 307 → PNG estático) seguiría dando 200 image/png y este
    // test pasaría EN VERDE con la feature rota (el «test que nadie ha visto fallar»). Exigiendo un
    // 200 DIRECTO, cualquier caída al fallback en el camino válido se pone ROJA (sería 307).
    const res = await request.get(`/compose/og?r=${VALID_R}`, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/^image\//);
    // satori renderiza un PNG real (wordmark + pasos): decenas de KB, nunca un cuerpo vacío.
    expect((await res.body()).byteLength).toBeGreaterThan(1000);
  });

  test('🔴 un `?r=` INVÁLIDO → redirige a la og genérica estática (fallback), NUNCA un 500', async ({
    request,
  }) => {
    // `%25%25basura%25%25` no decodifica a receta: `decodeRecipe` da `ok:false`. El handler
    // redirige a `/opengraph-image.png` (que NO necesita fuente ni satori: infalible). Se afirma el
    // 307 + `location` EXACTO (no solo «algún 200 image/*»): prueba que es EL fallback de F5, no un
    // render silencioso. Un crawler que recibiera 500 no pintaría preview.
    const res = await request.get('/compose/og?r=%25%25basura-que-no-decodifica%25%25', {
      maxRedirects: 0,
    });
    expect(res.status()).toBe(307);
    // 🔴 CONTROL NEGATIVO del bug prod-only de T7.5: el `Location` es RELATIVO (exacto
    // `/opengraph-image.png`), NUNCA absoluto. En el standalone detrás de Caddy, un
    // `new URL('/opengraph-image.png', request.url)` emitía `https://0.0.0.0:3000/…` (origen INTERNO
    // del contenedor) → inalcanzable para el crawler. Un `Location` relativo lo resuelve el crawler
    // contra el host PÚBLICO que pidió. Si alguien reintroduce la URL absoluta, este `toBe` (y el
    // guard de esquema/host interno) se pone ROJO.
    expect(res.headers().location).toBe('/opengraph-image.png');
    expect(res.headers().location).not.toMatch(/:\/\//); // sin esquema → relativo
    expect(res.headers().location).not.toContain('0.0.0.0'); // jamás el bind interno
    // …y siguiéndolo se sirve una imagen (200 image/*), nunca un error.
    const followed = await request.get('/compose/og?r=%25%25basura-que-no-decodifica%25%25');
    expect(followed.status()).toBe(200);
    expect(followed.headers()['content-type']).toMatch(/^image\//);
    expect((await followed.body()).byteLength).toBeGreaterThan(1000);
  });

  test('🔴 un id de transformación INVENTADO → fallback (307 a la genérica), sin 500', async ({
    request,
  }) => {
    // Misma verdad `decodeRecipe` que la pantalla (T7.3): un id fuera del catálogo vivo → `ok:false`.
    const res = await request.get('/compose/og?r=nope.inventado-json', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers().location).toBe('/opengraph-image.png'); // relativo (ver control negativo arriba)
    expect(res.headers().location).not.toMatch(/:\/\//);
  });

  test('SIN `?r=` → fallback (307 a la genérica), sin error', async ({ request }) => {
    const res = await request.get('/compose/og', { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers().location).toBe('/opengraph-image.png'); // relativo (ver control negativo arriba)
    expect(res.headers().location).not.toMatch(/:\/\//);
  });
});

test.describe('@f7 /compose — la metadata og apunta a la imagen de la receta (T7.4)', () => {
  test('con `?r=` válido, el `<head>` declara og:image ABSOLUTA a `/compose/og` con la receta, y la sirve', async ({
    page,
  }) => {
    await page.goto(`/compose?r=${VALID_R}`);

    const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute('content');
    const ogTitle = await page.locator('meta[property="og:title"]').first().getAttribute('content');
    expect(ogImage, 'og:image debe existir en el <head> de /compose?r=').toBeTruthy();

    const ogUrl = new URL(ogImage ?? '');
    // 🔴 CONTROL NEGATIVO (heredado de T5.5): host de PRODUCCIÓN, jamás localhost (metadataBase).
    expect(ogUrl.host).toBe(PROD_HOST);
    expect(ogUrl.protocol).toBe('https:');
    expect(ogUrl.host).not.toContain('localhost');
    // Apunta a la ruta OG DINÁMICA con la receta (no al PNG estático genérico).
    expect(ogUrl.pathname).toBe('/compose/og');
    expect(ogUrl.searchParams.get('r')).toBe(VALID_R);
    // El título refleja los pasos: «Receta · 2 pasos».
    expect(ogTitle).toContain('Receta · 2 pasos');

    // La tarjeta de Twitter es la grande.
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );

    // La imagen SE SIRVE (ruta local, no la URL de prod que este build aún no desplegó).
    const res = await page.request.get(ogUrl.pathname + ogUrl.search);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/^image\//);
  });

  test('sin `?r=`, el `<head>` de `/compose` cae a la og GENÉRICA estática de F5', async ({
    page,
  }) => {
    await page.goto('/compose');
    const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute('content');
    expect(ogImage, 'og:image genérica debe existir').toBeTruthy();
    const ogUrl = new URL(ogImage ?? '');
    expect(ogUrl.host).toBe(PROD_HOST);
    // La genérica es el PNG estático de F5, no la ruta dinámica.
    expect(ogUrl.pathname).toBe('/opengraph-image.png');
  });
});
