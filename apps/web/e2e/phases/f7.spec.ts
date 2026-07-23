import { expect, test, type Locator, type Page } from '@playwright/test';

import { assertNoComposeNetwork, type CapturedRequest } from '../support/compose-network';

// E2E de FASE F7 (planning T7.5) — el recorrido sagrado de COMPARTIR UNA RECETA POR ENLACE, de una
// sola tirada contra el sistema real levantado (Next en build de producción). Tags `@f7 @phase`
// (e2e.md §10): `@f7` lo mete en la no-regresión de la fase; `@phase` lo marca como EL e2e de fase.
//
// El spec ENCADENA los building blocks que T7.3 (compartir + leer `?r=`) y T7.4 (la og:image
// dinámica) ya protegen aislados, en un único recorrido de usuario — no los repite sueltos:
//   componer 2 pasos con un secreto → «Copiar enlace» → la URL no lleva ni fuente ni secreto →
//   abrir el enlace (pestaña fresca) precarga los MISMOS pasos con los campos VACÍOS → la og:image
//   de ese `?r=`, pedida COMO UN CRAWLER (sin JS), responde 200 image/* reflejando los pasos →
//   un `?r=` malformado o con id fuera del catálogo se ignora (pantalla limpia).
//
// CRITERIOS DEL PRD QUE CIERRA (los LOCALES; la parte de PROD la cierra el deploy, no este spec):
//   - 14.17 — construida una receta en `/compose`, compartir produce `/compose?r=…` que, abierto,
//     precarga los mismos pasos con fuente y secreto VACÍOS; y la URL NO contiene el fuente ni el
//     secreto (control negativo con control positivo: los ids SÍ están).
//   - 14.18 — la petición de la og:image de ese enlace (como un crawler, SIN JS) devuelve 200
//     `image/*` reflejando los pasos. Se pide con el `request` de Playwright (APIRequestContext) y
//     `maxRedirects: 0`: un 200 DIRECTO prueba que satori RENDERIZÓ esta receta; un render roto
//     caería al 307 genérico (T7.4) y este assert rojearía. El `?r=` sale del `<meta og:image>` que
//     un crawler lee, y su título «Receta · 2 pasos» es la evidencia determinista de los pasos.
//   - 14.19 — un `?r=` malformado o con id fuera del catálogo se ignora → pantalla limpia, sin paso.
//
// LO QUE ESTE SPEC **NO** HACE (es del deploy con el usuario, no de aquí): la verificación CONTRA
// LA IMAGEN DE PROD en el dominio vivo (la lección de F5: `next start` + standalone empaqueta
// distinto que `next dev`; la og:image ya rompió una vez solo en el empaquetado). Este spec corre
// contra el stack E2E local; el deploy a producción es un paso aparte del bucle.
//
// FORMA: un solo `test()` con `test.step()` por beat (como f0/f2/f6). Es un journey con estado —una
// sesión que compone, comparte, abre el enlace en otra pestaña y comprueba la og de ESE enlace— y
// el fixture `page` se resetea entre tests: partirlo perdería el hilo. El beat de 14.19 abre una
// pestaña FRESCA (sessionStorage limpio): un `?r=` basura no debe resucitar la receta ya cargada.

// El ejemplo canónico de `/compose`, en forma PRETTY para que `json.minify` compacte algo VISIBLE.
// `carlos`/`admin` son dato del usuario: no pueden viajar en el enlace compartido. La misma fuente
// sirve a 14.17 (componer y compartir) y al control negativo de privacidad de la URL.
const SOURCE = '{\n  "sub": "1",\n  "name": "carlos",\n  "role": "admin"\n}';
// El secreto canario (T6.8) — literal de test, evidente, NO un secreto real (skill testing). Se
// teclea en `jwt.sign`: la prueba de que compartir NO lo mete en la URL.
const CANARY_SECRET = 'test-signing-secret-not-a-secret';

const PROD_HOST = 'devtools.carlosvillu.dev';

const sourceField = (page: Page): Locator => page.getByRole('textbox', { name: /entrada/i });
const shareButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Copiar enlace', exact: true });
const stepSelect = (page: Page, n: number): Locator =>
  page.getByRole('combobox', { name: new RegExp(`transformación del paso ${String(n)}`, 'i') });

// Añade un paso desde la paleta agrupada: abre «añadir paso» y pulsa el chip de la transformación.
// Se localiza por ROL y nombre (e2e.md §12), nunca por clase.
async function addStep(page: Page, transform: string): Promise<void> {
  await page.getByRole('button', { name: 'añadir paso' }).click();
  await page.getByRole('button', { name: transform, exact: true }).click();
}

test.describe('@f7 @phase F7 — compartir la receta por enlace: componer → compartir → abrir → la og del enlace → un enlace roto se ignora', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('el enlace compartido cierra el círculo: una receta con secreto se comparte SIN filtrarlo, se reabre con los campos vacíos, su og responde como imagen a un crawler, y un enlace roto se ignora', async ({
    page,
    context,
  }) => {
    // El enlace producido por «Copiar enlace», capturado en el beat 1 para reabrirlo en el beat 2 y
    // para derivar de él la og del beat 3. Es la URL REAL que un usuario copiaría y pegaría.
    let shareUrl = '';
    // El param `?r=` de la receta (control positivo/negativo de privacidad y ancla de la og).
    let recipeParam = '';

    await test.step('🔴 14.17: componer `json.minify` + `jwt.sign` con el secreto canario y «Copiar enlace» produce una URL con `?r=` que NO lleva ni el fuente ni el secreto — los ids SÍ', async () => {
      await page.goto('/compose');
      await page.waitForLoadState('networkidle');
      // Sin pasos no hay nada que compartir: el botón no existe todavía.
      await expect(shareButton(page)).toHaveCount(0);

      // Componer no dispara red (14.14, F6): se cuenta desde antes de teclear y se afirma la ventana
      // cero-red ANTES de pulsar compartir (compartir sí escribe en el portapapeles, no en la red,
      // pero la og y el prefetch vendrían después). Reforzar aquí hace el recorrido REAL sin repetir
      // el test aislado de F6; el helper compartido no se duplica.
      const requests: CapturedRequest[] = [];
      page.on('request', (request) => {
        requests.push({ method: request.method(), url: request.url(), body: request.postData() });
      });

      await sourceField(page).fill(SOURCE);
      await addStep(page, 'json.minify');
      await addStep(page, 'jwt.sign');
      await page.getByLabel(/secreto de firma/i).fill(CANARY_SECRET);
      await expect(page.getByText(/listo para compartir/i)).toBeVisible();

      // 🔴 Ni componer ni firmar tocaron la red, y ninguna petición del framework llevó el dato.
      assertNoComposeNetwork(requests, ['carlos', 'admin', CANARY_SECRET]);

      // Compartir es pulsar el botón REAL y leer la URL que deja en el portapapeles — no se fabrica.
      await shareButton(page).click();
      // 🔴 BARRERA DE DETERMINISMO: el `writeText` del `CopyButton` es async; leer el portapapeles
      // inmediatamente podría dar `''` (→ `new URL('')` lanza) si aún no ha resuelto. Se espera el
      // estado «Copiado» que el botón muestra tras copiar (copy-button.tsx: el nombre accesible vira
      // a «Copiado») ANTES de leer — es además más fiel al usuario, que ve confirmada la copia.
      await expect(page.getByRole('button', { name: /copiado/i })).toBeVisible();
      shareUrl = await page.evaluate(() => navigator.clipboard.readText());

      const shared = new URL(shareUrl);
      expect(shared.pathname).toBe('/compose');
      recipeParam = shared.searchParams.get('r') ?? '';
      expect(recipeParam).not.toBe('');

      // 🔴 CONTROL POSITIVO: los ids de la receta SÍ viajan (si no, el grep negativo no probaría nada).
      expect(recipeParam).toContain('json.minify');
      expect(recipeParam).toContain('jwt.sign');

      // 🔴 CONTROL NEGATIVO: ni el secreto ni el fuente aparecen en NINGUNA parte de la URL.
      expect(shareUrl).not.toContain(CANARY_SECRET);
      expect(shareUrl).not.toContain('not-a-secret');
      expect(shareUrl).not.toContain('carlos');
      expect(shareUrl).not.toContain('admin');

      // 🔴 ESTRUCTURA ESTRICTA (ancla que MUERDE ante una fuga, no un `not.toContain` que la
      // tragaría): exactamente dos pasos `id-kind`. El secreto lleva `-` y el fuente lleva `{`/`"`/`:`
      // — colarse en el param rompería este patrón.
      expect(recipeParam).toMatch(/^json\.minify-\w+~jwt\.sign-\w+$/);
    });

    await test.step('🔴 14.17: abrir el enlace en una pestaña FRESCA precarga los MISMOS pasos con la fuente y el secreto VACÍOS y el aviso de receta compartida', async () => {
      // Pestaña nueva = contexto/sessionStorage frescos: se prueba que la receta la reconstruye el
      // `?r=`, no un borrador local. Se navega a la URL REAL producida arriba, no a una fabricada.
      const opened = await context.newPage();
      await opened.goto(shareUrl);

      // Los mismos 2 pasos, en orden, sembrados en los `Select` — y ni uno más.
      await expect(stepSelect(opened, 1)).toHaveValue('json.minify');
      await expect(stepSelect(opened, 2)).toHaveValue('jwt.sign');
      await expect(stepSelect(opened, 3)).toHaveCount(0);

      // El fuente y el secreto arrancan VACÍOS: el dato no viajó, lo aporta quien abre.
      await expect(sourceField(opened)).toHaveValue('');
      expect(await opened.getByLabel(/secreto de firma/i).inputValue()).toBe('');

      // Y el aviso de receta compartida está presente.
      await expect(opened.getByText(/abriste una receta compartida/i)).toBeVisible();

      await opened.close();
    });

    await test.step('🔴 14.18: la og:image que anuncia el `<head>` del enlace responde a un crawler (sin JS) con 200 `image/*` reflejando los pasos', async () => {
      // Se lee la og:image del HEAD de `/compose?r=…` — exactamente lo que un crawler de Slack/Twitter
      // ve SIN ejecutar JS. La og apunta al host de PROD (metadataBase), pero la imagen la sirve este
      // build en local; por eso se pide `pathname + search`, no la URL absoluta de prod.
      const openedForOg = await context.newPage();
      await openedForOg.goto(shareUrl);
      const ogImage = await openedForOg
        .locator('meta[property="og:image"]')
        .first()
        .getAttribute('content');
      const ogTitle = await openedForOg
        .locator('meta[property="og:title"]')
        .first()
        .getAttribute('content');
      expect(ogImage, 'og:image debe existir en el <head> de /compose?r=').toBeTruthy();

      const ogUrl = new URL(ogImage ?? '');
      // Control negativo heredado de T5.5/T7.4: host de PROD, jamás localhost (metadataBase).
      expect(ogUrl.host).toBe(PROD_HOST);
      // Apunta a la ruta OG DINÁMICA con LA MISMA receta del recorrido (no al PNG genérico): el
      // crawler recibiría la imagen de ESTOS pasos. Se ata a `recipeParam` con la misma ancla.
      expect(ogUrl.pathname).toBe('/compose/og');
      expect(ogUrl.searchParams.get('r')).toBe(recipeParam);
      expect(ogUrl.searchParams.get('r')).toMatch(/^json\.minify-\w+~jwt\.sign-\w+$/);
      // El título lo deriva la receta: «Receta · 2 pasos» es la evidencia determinista de los pasos.
      expect(ogTitle).toContain('Receta · 2 pasos');

      // 🔴 COMO UN CRAWLER: `request` (APIRequestContext) NO ejecuta JS, y `maxRedirects: 0` exige un
      // 200 DIRECTO. Un render roto de la receta caería al fallback 307 genérico (T7.4) y esto
      // rojearía — así que un 200 image/* DIRECTO prueba que satori pintó ESTA receta, no la genérica.
      // NO se usa `page.goto`: seguiría redirects y ejecutaría el navegador (no es lo que ve el crawler).
      const res = await openedForOg.request.get(ogUrl.pathname + ogUrl.search, { maxRedirects: 0 });
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toMatch(/^image\//);
      // satori renderiza un PNG real (wordmark + pasos): decenas de KB, nunca un cuerpo vacío.
      expect((await res.body()).byteLength).toBeGreaterThan(1000);

      await openedForOg.close();
    });

    await test.step('🔴 14.19: un `?r=` malformado o con un id fuera del catálogo se ignora — pantalla limpia, sin paso ejecutado', async () => {
      // Pestaña FRESCA a propósito: reusar la del beat 2/3 arrastraría la receta ya cargada y un
      // borrador resucitado daría un falso «pantalla limpia» (el hazard de resurrección de F6). Cada
      // enlace roto se prueba sobre sessionStorage limpio.
      for (const badR of ['%25%25basura-que-no-decodifica%25%25', 'nope.inventado-json']) {
        const broken = await context.newPage();
        await broken.goto(`/compose?r=${badR}`);

        // Ningún paso sembrado, ningún aviso de receta compartida, ningún resultado — pero la
        // pantalla sigue FUNCIONAL (la afordancia de añadir un paso está ahí).
        await expect(sourceField(broken)).toHaveValue('');
        await expect(stepSelect(broken, 1)).toHaveCount(0);
        await expect(broken.getByText(/abriste una receta compartida/i)).toHaveCount(0);
        await expect(broken.getByText(/listo para compartir/i)).toHaveCount(0);
        await expect(broken.getByRole('button', { name: 'añadir paso' })).toBeVisible();

        await broken.close();
      }
    });
  });
});
