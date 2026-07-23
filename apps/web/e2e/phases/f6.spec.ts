import { expect, test, type Locator, type Page } from '@playwright/test';

import { assertNoComposeNetwork, type CapturedRequest } from '../support/compose-network';

// E2E de FASE F6 (planning T6.11) — el recorrido sagrado de la DIRECCIÓN INVERSA, de una sola
// tirada contra el sistema real levantado (Next en build de producción + Postgres real del stack
// E2E). Tags `@f6 @phase` (e2e.md §10): `@f6` lo mete en la no-regresión de la fase; `@phase` lo
// marca como EL e2e de fase.
//
// RECORRIDO (el de la Entrega de T6.11, en el orden en que lo vive una persona):
//   landing → enlace a componer → escribir → encadenar 2 pasos → firmar → copiar el resultado →
//   conmutar a decodificar → pegar ese resultado → la cadena lo vuelve a abrir → (con cuenta) la
//   receta está en /history y se reabre.
//
// CRITERIOS DEL PRD QUE CIERRA (los de prod los cierra el deploy, no este spec):
//   - 14.14 — componer `json.minify` + `jwt.sign` muestra los dos pasos con su tipo DETECTADO y el
//     resultado copiable, SIN una sola petición de red durante la composición (D10/§5.3). Se cuenta
//     con `page.on('request')` y el helper compartido `assertNoComposeNetwork`, no se mira la
//     pantalla. Beat 2, ANÓNIMO (copiar sin sesión no registra: T6.10) → la ventana cero-red puede
//     incluir el copiado, lo que además PRUEBA que copiar sin cuenta tampoco filtra.
//   - 14.15 — el JWT compuesto, pegado en /analyze, se vuelve a abrir HASTA EL JSON ORIGINAL: las
//     dos direcciones son inversas sobre el sistema real. Beat 3 asserta los marcadores de la
//     cadena (`jwt.decode`/`json.format`) Y que el VALOR original (`"name": "carlos"`) reaparece
//     formateado — un análisis que solo «procesó algo» no lo pasaría.
//   - 14.16 — con sesión, componer crea una entrada en /history con la RECETA y ni el fuente, ni el
//     resultado, ni el secreto. El `psql`/`pg_dump` literal sobre la fila es del verifier/deploy;
//     aquí se protege lo OBSERVABLE (patrón de history.spec.ts / T6.10): la fila existe con su
//     receta, el cuerpo del POST no lleva dato, y reabrir da los pasos con el campo VACÍO.
//
// FORMA: un solo `test()` con `test.step()` por beat (como f0/f2), NO varios `test()`. Es un
// journey con estado —una visita que empieza anónima, compone, conmuta, pega, y LUEGO crea una
// cuenta y compone de nuevo— y el fixture `page` se resetea entre tests: partirlo perdería el
// hilo (y la sesión) entre beats. Los `test.step` dejan cada beat nombrado en el reporte y el trace.
//
// LO QUE ESTE SPEC **NO** HACE (es del verifier/deploy, no de aquí): el `psql`/`pg_dump` literal
// sobre la fila (14.16) y la verificación CONTRA LA IMAGEN DE PROD en el dominio vivo (la lección
// de F5: `next start` + standalone empaqueta distinto que `next dev`). Este spec corre contra el
// stack E2E; el deploy a producción es un paso aparte del bucle, con confirmación del usuario.

// El ejemplo de la Verificación del planning / T6.10, en forma PRETTY para que `json.minify` haga
// algo VISIBLE (compactar). `carlos` y `"sub"` son dato del usuario: no pueden persistirse ni
// viajar por la red. La misma fuente sirve a 14.14 (componer), 14.15 (el JWT que se pega en
// /analyze reabre a `carlos`) y 14.16 (la receta con sesión).
const SOURCE = '{\n  "sub": "1",\n  "name": "carlos"\n}';
// La salida de `json.minify` (golden): el paso 1 la produce sobre la fuente pretty.
const MINIFIED = '{"sub":"1","name":"carlos"}';
// El secreto canario de T6.8 — literal de test, evidente, NO un secreto real (skill testing).
const CANARY_SECRET = 'test-signing-secret-not-a-secret';

const PASSWORD = 'f6-fase-secreto-123';

// IP propia de este recorrido: el rate limit de signup es 10 altas / 15 min POR IP y `clientIp()`
// comparte una clave única sin header de proxy ⇒ toda la suite compartiría bucket y el recorrido se
// volvería flaky por specs vecinos. `.60` no colisiona con ninguna otra spec (f0=.5, f2=.23/.22,
// history @f6=.23). NO se rebaja ningún límite del producto: se manda una cabecera que cualquier
// cliente real manda igual.
const SPEC_IP = '203.0.113.60';

// Email único por ejecución: la BD del stack es compartida por toda la suite y `signup` rechaza
// duplicados. `t611-` identifica de quién es la cuenta si hay que mirar la BD.
const uniqueEmail = () =>
  `t611-fase-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}@e2e.local`;

const sourceField = (page: Page): Locator => page.getByRole('textbox', { name: /entrada/i });
const analyzeField = (page: Page): Locator =>
  page.getByRole('textbox', { name: /pega algo para analizar/i });

// Añade un paso desde la paleta agrupada: abre «añadir paso» y pulsa el chip de la transformación.
// Se localiza por ROL y nombre (e2e.md §12), nunca por clase.
async function addStep(page: Page, transform: string): Promise<void> {
  await page.getByRole('button', { name: 'añadir paso' }).click();
  await page.getByRole('button', { name: transform, exact: true }).click();
}

test.describe('@f6 @phase F6 — la dirección inversa: componer → firmar → conmutar → reabrir en /analyze → (con cuenta) /history', () => {
  test.use({
    extraHTTPHeaders: { 'x-forwarded-for': SPEC_IP },
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  test('la dirección inversa se sostiene entera: la landing lleva a componer, la cadena firma sin salir del navegador, /analyze la reabre, y con cuenta la receta queda en el historial', async ({
    page,
  }) => {
    // El JWT compuesto en el beat 2, capturado para pegarlo en /analyze (beat 3). No es un secreto:
    // firmado con el canario de test, payload {sub, name:carlos, iat}.
    let composedToken = '';

    await test.step('la landing enlaza a componer: `/` → «compón algo» → /compose en modo componer', async () => {
      // El recorrido empieza en la portada pública (F5) y llega a componer por la afordancia que
      // T6.9 añadió — NO por un `goto('/compose')` directo. Es el primer eslabón de la Entrega.
      const landing = await page.goto('/');
      expect(landing?.status()).toBe(200);

      const composeLink = page.getByRole('link', { name: /compón algo/i });
      await expect(composeLink).toBeVisible();
      await composeLink.click();

      await expect(page).toHaveURL('/compose');
      // El encabezado de componer solo existe en esa pantalla: ancla que aterrizamos en el modo
      // correcto (un modo equivocado o una vuelta a la portada no lo tendría).
      await expect(page.getByRole('heading', { name: /compón algo/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'codificar', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    await test.step('🔴 14.14: escribir y encadenar `json.minify` + `jwt.sign` compone y FIRMA en el navegador, con los dos tipos detectados y SIN una sola petición de red', async () => {
      // Se espera a que la carga termine ANTES de contar: lo que se afirma es que COMPONER no pide
      // nada, no que la página no se descargue a sí misma.
      await page.waitForLoadState('networkidle');

      const requests: CapturedRequest[] = [];
      page.on('request', (request) => {
        requests.push({ method: request.method(), url: request.url(), body: request.postData() });
      });

      await sourceField(page).fill(SOURCE);
      // El kind de la fuente se DETECTA (I10) y aparece junto a la entrada.
      await expect(page.getByText(/reconocido/i)).toBeVisible();

      // Paso 1: json.minify compacta la fuente pretty (salida VISIBLE) y su tipo se DETECTA sobre
      // esa salida (I10), mostrado como «produce json» —el badge del kind detectado, no declarado—.
      // Se localiza por ese texto (el badge renderiza su label como texto): «reconocido json» de la
      // fuente no colisiona, y ninguna clase ni traversal de DOM interviene.
      await addStep(page, 'json.minify');
      await expect(page.getByText(MINIFIED).first()).toBeVisible();
      await expect(page.getByText(/produce\s+json/i).first()).toBeVisible();

      // Paso 2: jwt.sign encadena sobre la SALIDA del paso 1. El panel de firma se DERIVA del
      // descriptor del motor (un `Select` de algoritmo HS256 + el campo de secreto).
      await addStep(page, 'jwt.sign');
      await expect(page.getByRole('combobox', { name: /algoritmo/i })).toHaveValue('HS256');
      await page.getByLabel(/secreto de firma/i).fill(CANARY_SECRET);

      // El tipo del segundo paso, también detectado: el JWT firmado es `jwt`.
      await expect(page.getByText(/produce\s+jwt/i).first()).toBeVisible();

      // El resultado es copiable: la barra de resultado aparece con los 2 pasos y el kind final.
      await expect(page.getByText(/·\s*2 pasos\s*·/)).toBeVisible();
      await expect(page.getByText(/listo para compartir/i)).toBeVisible();
      await page.getByRole('button', { name: /copiar el resultado/i }).click();
      composedToken = await page.evaluate(() => navigator.clipboard.readText());

      // El resultado es un JWT de tres segmentos y su firma NO es el secreto en claro.
      expect(composedToken.split('.')).toHaveLength(3);
      expect(composedToken).not.toContain(CANARY_SECRET);

      // 🔴 EL CONTROL DE 14.14: ni componer, ni firmar, ni COPIAR (anónimo, sin sesión → sin
      // registro: T6.10) dispara una sola petición de la aplicación, y ninguna petición lleva lo
      // que el usuario escribió (`carlos`), el secreto ni el token resultante.
      assertNoComposeNetwork(requests, ['carlos', CANARY_SECRET, composedToken]);
    });

    await test.step('🔴 14.15: conmutar a decodificar y pegar el JWT en /analyze lo vuelve a abrir HASTA EL JSON original', async () => {
      // El conmutador lleva a /analyze; se pega el JWT compuesto POR EL CAMINO REAL (portapapeles +
      // teclado), no con `fill()`: el relevo de F5 y el disparo del análisis pasan por el evento de
      // pegado real.
      await page.getByRole('tab', { name: 'decodificar', exact: true }).click();
      await expect(page).toHaveURL('/analyze');

      await page.evaluate((t) => navigator.clipboard.writeText(t), composedToken);
      await analyzeField(page).focus();
      await page.keyboard.press('ControlOrMeta+v');

      // La cadena inversa: `jwt.decode` abre el token y `json.format` formatea su payload.
      await expect(page.getByText('jwt.decode')).toBeVisible();
      await expect(page.getByText('json.format')).toBeVisible();
      // 🔴 LA PRUEBA DE QUE SON INVERSAS: el VALOR original vuelve. `compose` firmó el JSON de
      // `carlos`; `analyze` lo reabre y el payload formateado muestra ese mismo `"name": "carlos"`.
      // No es «analyze procesó algo»: es «analyze deshizo EXACTAMENTE lo que compose hizo».
      await expect(page.getByText('"name": "carlos"')).toBeVisible();

      // Y el input jamás toca la URL (§11 / control de no-regresión de F5), tampoco al llegar por
      // el conmutador y pegar.
      const url = new URL(page.url());
      expect(url.search).toBe('');
      expect(url.hash).toBe('');
    });

    await test.step('con sesión: el alta crea la cuenta y su historial arranca vacío', async () => {
      await page.goto('/signup');
      await page.getByLabel(/email/i).fill(uniqueEmail());
      await page.getByLabel(/contraseña/i).fill(PASSWORD);
      await page.getByRole('button', { name: /crear cuenta/i }).click();
      await expect(page).toHaveURL('/analyze');
      await expect(page.getByRole('button', { name: /salir/i })).toBeVisible();

      // Punto de partida explícito: sin esto, el «hay 1 entrada» del beat siguiente no probaría que
      // la escribió ESTE recorrido (la BD la comparte toda la suite), y de paso demuestra que el
      // componer ANÓNIMO de los beats 2–3 no dejó rastro que esta cuenta pueda ver.
      await page.goto('/history');
      await expect(page.locator('[data-slot="history-row"]')).toHaveCount(0);
      await expect(page.locator('[data-slot="empty-state"]')).toBeVisible();
    });

    await test.step('🔴 14.16: con sesión, componer y copiar crea una entrada en /history con la RECETA — y ni el fuente, ni el resultado, ni el secreto', async () => {
      // Componer de nuevo: `goto('/compose')` da pantalla LIMPIA (sin flag de conmutación no se
      // restaura borrador: work-mode.ts), así que esta composición no arrastra la de los beats 2–3.
      await page.goto('/compose');
      await page.waitForLoadState('networkidle');
      // Directo, no emergente: la pantalla llega LIMPIA (el borrador de los beats 2–3 no resucita
      // sin flag de conmutación). Sin esto, un draft resucitado se cazaría solo indirectamente (dos
      // `addStep` sobre 2 pasos ya restaurados darían 4 y romperían el `· 2 pasos` de más abajo).
      await expect(sourceField(page)).toHaveValue('');
      await sourceField(page).fill(SOURCE);
      await addStep(page, 'json.minify');
      await addStep(page, 'jwt.sign');
      await page.getByLabel(/secreto de firma/i).fill(CANARY_SECRET);
      await expect(page.getByText(/listo para compartir/i)).toBeVisible();

      // Copiar es el disparador del registro (T6.10, solo con sesión). Se captura el POST para
      // probar en el borde de CLIENTE que lleva la receta y NADA del usuario.
      const postPromise = page.waitForRequest(
        (req) => req.url().includes('/api/history') && req.method() === 'POST',
      );
      const responsePromise = page.waitForResponse(
        (res) => res.url().includes('/api/history') && res.request().method() === 'POST',
      );
      await page.getByRole('button', { name: /copiar el resultado/i }).click();

      const body = (await postPromise).postData() ?? '';
      // Control POSITIVO: la receta (los ids) SÍ viaja.
      expect(body).toContain('json.minify');
      expect(body).toContain('jwt.sign');
      // 🔴 Control NEGATIVO: ni el fuente, ni `carlos`, ni el secreto, ni el JWT resultante.
      expect(body).not.toContain('carlos');
      expect(body).not.toContain('"sub"');
      expect(body).not.toContain(CANARY_SECRET);
      expect(body).not.toContain('eyJhbGci'); // ningún prefijo del JWT compuesto
      expect((await responsePromise).status()).toBe(201);

      // La fila aparece en /history con la etiqueta sintética y el marcador de dirección.
      await page.goto('/history');
      const rows = page.locator('[data-slot="history-row"]');
      await expect(rows).toHaveCount(1);
      await expect(rows.first().locator('code')).toHaveText('compuesto · 2 pasos');
      await expect(rows.first()).toContainText(/codificar/i);

      // 🔴 Ni la pantalla ni el endpoint (la proyección más cercana a la fila que un E2E ve) pueden
      // contener el dato del usuario; la receta SÍ (control positivo de que el grep apunta bien).
      const html = await page.content();
      const rowDump = await page.evaluate(async () => {
        const res = await fetch('/api/history', { credentials: 'include' });
        return JSON.stringify(await res.json());
      });
      for (const dump of [html, rowDump]) {
        expect(dump).not.toContain('carlos');
        expect(dump).not.toContain(CANARY_SECRET);
      }
      expect(rowDump).toContain('json.minify');
      expect(rowDump).toContain('jwt.sign');
    });

    await test.step('🔴 14.16 (reabrir): la receta se reabre en /compose con los pasos y el campo VACÍO — el dato nunca se guardó', async () => {
      const rows = page.locator('[data-slot="history-row"]');
      // El aviso de reabrir es CLICK-GATED (no existe hasta pulsar).
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await rows
        .first()
        .getByRole('button', { name: /reabrir/i })
        .click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      // La honestidad de D7, un grado más fuerte: el dato NO vuelve porque nunca se guardó.
      await expect(dialog).toContainText(/no se restaura porque nunca se guardó/i);
      await expect(dialog).toContainText('json.minify');
      await expect(dialog).toContainText('jwt.sign');

      await dialog.getByRole('button', { name: /reabrir en componer/i }).click();

      // Navega a /compose con los PASOS restaurados…
      await expect(page).toHaveURL(/\/compose/);
      await expect(page.getByRole('combobox', { name: /Transformación del paso 1/i })).toHaveValue(
        'json.minify',
      );
      await expect(page.getByRole('combobox', { name: /Transformación del paso 2/i })).toHaveValue(
        'jwt.sign',
      );
      // …y el campo de entrada y el secreto VACÍOS: el dato no se restaura (nunca se guardó).
      await expect(sourceField(page)).toHaveValue('');
      expect(await page.getByLabel(/secreto de firma/i).inputValue()).toBe('');
    });
  });
});
