import { expect, test, type Page } from '@playwright/test';

// Playwright permanente de T2.2 (`/history`). Protege, contra el sistema real levantado,
// los comportamientos que el planning nombra:
//   - analizar algo CON SESIÓN lo hace aparecer en `/history` (vista previa redactada);
//   - REABRIR restaura la cadena y muestra el aviso de D7 («el dato no se restaura»);
//   - BORRAR una entrada la quita;
//   - BORRAR TODAS deja el `EmptyState`;
//   - `/history` SIN SESIÓN redirige a `/login`;
//   - 🔴 UN USUARIO NO VE LAS ENTRADAS DE OTRO (control negativo de aislamiento, DOS cuentas).
//
// Sin storageState global: cada test crea su(s) cuenta(s) con email único (aislamiento
// bajo `fullyParallel`).
//
// JWT de PRUEBA (el del ejemplo trabajado del PRD §6.5). NO es un secreto: firmado con una
// clave desconocida. test-token-not-a-secret.
const TEST_JWT =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc1MjUzNzYwMCwiZXhwIjoxNzUyNjI0MDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// El payload y la firma del JWT: D7 exige que NUNCA aparezcan en la pantalla de historial.
const JWT_PAYLOAD_SEGMENT =
  'eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc1MjUzNzYwMCwiZXhwIjoxNzUyNjI0MDAwfQ';
const JWT_SIGNATURE_SEGMENT = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// 🔴 FRAGMENTOS CORTOS — sin esto los asserts de fuga NO PUEDEN FALLAR (detectado en T2.3
// con un control negativo: desactivando la redacción, la spec seguía VERDE). El motivo es
// que `preview` se trunca a 120 caracteres y el JWT mide 170: el truncado PARTE el segmento
// completo, así que un `not.toContain(<segmento entero>)` no casa nunca — ni con la fuga
// delante. Los prefijos cortos sí sobreviven al truncado, y los valores DECODIFICADOS
// cubren la otra familia de fuga (persistir `steps[i].input`, que un grep del base64 no ve).
const JWT_PAYLOAD_PREFIX = 'eyJzdWIiOiIx';
const JWT_SIGNATURE_PREFIX = 'SflKxwRJ';
/** Valores ya decodificados del payload: no deben aparecer NUNCA. */
const JWT_DECODED_LEAKS = ['carlos', '1752537600', '1752624000'];

/** Afirma que un volcado (HTML o JSON) no contiene NINGUNA forma del dato del usuario. */
function expectNoJwtLeak(dump: string): void {
  expect(dump).not.toContain(JWT_PAYLOAD_SEGMENT);
  expect(dump).not.toContain(JWT_SIGNATURE_SEGMENT);
  // Los que muerden de verdad: sobreviven al truncado de 120.
  expect(dump).not.toContain(JWT_PAYLOAD_PREFIX);
  expect(dump).not.toContain(JWT_SIGNATURE_PREFIX);
  for (const decoded of JWT_DECODED_LEAKS) expect(dump).not.toContain(decoded);
}

const PASSWORD = 'e2e-secreto-123';
const uniqueEmail = (tag: string) =>
  `t22-${tag}-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}@e2e.local`;

async function signup(page: Page, email: string): Promise<void> {
  await page.goto('/signup');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(PASSWORD);
  await page.getByRole('button', { name: /crear cuenta/i }).click();
  await expect(page.getByRole('button', { name: /salir/i })).toBeVisible();
}

/**
 * Pega de verdad en el campo de `/analyze` para que se dispare el análisis (y su registro).
 * `marker` es el transform que debe aparecer en la cadena: la espera va por CONDICIÓN
 * OBSERVABLE (nada de timeouts fijos) y es específica del input, no genérica.
 * F5/T5.2: el campo vive en `/analyze` (`/` es la landing y ya no redirige aquí).
 */
async function analyze(page: Page, text: string, marker: string): Promise<void> {
  await page.goto('/analyze');
  await page.evaluate((t) => navigator.clipboard.writeText(t), text);
  await page.getByRole('textbox', { name: /pega algo para analizar/i }).focus();
  await page.keyboard.press('ControlOrMeta+v');
  // La cadena desplegada prueba que el análisis terminó (y por tanto que la escritura
  // del historial ya se disparó en el servidor).
  await expect(page.getByText(marker)).toBeVisible();
}

/** Los dos inputs de prueba y el transform observable de cada uno. */
const JWT_MARKER = 'jwt.decode';
// ⚠️ NO uses aquí `1752624000`: es el `exp` DECODIFICADO del JWT de prueba, y está en
// `JWT_DECODED_LEAKS`. Como segunda entrada sería una vista previa legítima, así que
// `expectNoJwtLeak` daría un fallo espurio en cualquier test que analice ambos — y, peor,
// invitaría a quitar ese literal de la lista de fugas, que es justo el que más muerde.
const TIMESTAMP = '1700000000';
const TIMESTAMP_MARKER = 'timestamp.to_iso';

// T2.4 — base64 que DESCODIFICA a texto reconocible. No es un secreto: es el literal de la
// Verificación del planning. test-base64-not-a-secret.
const BASE64_INPUT = 'SGVsbG8gV29ybGQgc2VjcmV0'; // → «Hello World secret»
const BASE64_DECODED = 'Hello World secret';
/** 🔴 PREFIJO CORTO del propio base64: el assert que puede FALLAR de verdad. El literal
 *  decodificado nunca es substring del base64, así que un `not.toContain(decoded)` es
 *  INERTE por sí solo (la trampa de T2.3); el prefijo, en cambio, estaría presente si la
 *  redacción de `base64` se desactivara. Se mantienen los dos: el decodificado cubre una
 *  fuga futura de `steps[i].output`, que un grep del base64 no vería. */
const BASE64_PREFIX = 'SGVsbG8';
const BASE64_MARKER = 'base64.decode';

/** Filas de historial visibles (el DS marca cada una con data-slot="history-row"). */
const rows = (page: Page) => page.locator('[data-slot="history-row"]');

/** IP propia de esta spec (mismo patrón que f0.spec.ts y f2.spec.ts). Sin ella, el rate
 *  limit de signup (10 altas / 15 min POR IP) se comparte con `auth.spec.ts` bajo la clave
 *  literal `'unknown'`: al añadir el caso base64 de T2.4 la suite completa pasó de 10 altas
 *  en ese bucket y empezó a fallar el signup de un test AL AZAR (síntoma: «botón salir no
 *  encontrado»). NO se rebaja ningún límite del producto — se manda una cabecera que
 *  cualquier cliente real manda igual. */
const SPEC_IP = '203.0.113.22';

test.describe('@f2 /history — historial de la cuenta', () => {
  test.use({
    extraHTTPHeaders: { 'x-forwarded-for': SPEC_IP },
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  test('sin sesión, /history redirige a /login', async ({ page }) => {
    await page.goto('/history');
    await expect(page).toHaveURL(/\/login/);
  });

  test('analizar con sesión hace aparecer la entrada en /history, con la vista previa REDACTADA', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('aparece'));
    await analyze(page, TEST_JWT, JWT_MARKER);

    await page.goto('/history');
    await expect(rows(page)).toHaveCount(1);

    // El tipo detectado y la cadena aplicada se ven en la fila.
    await expect(rows(page).first()).toContainText(/jwt/i);

    // Fidelidad al mockup: la nav resalta el destino EN CURSO («historial»), no «el campo».
    await expect(page.getByRole('link', { name: /^historial$/i }).first()).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByRole('link', { name: /^el campo$/i })).not.toHaveAttribute(
      'aria-current',
      'page',
    );

    // 🔴 D7 / criterio 14.8: la pantalla NO puede contener el payload ni la firma. Se
    // inspecciona el HTML COMPLETO, no solo el texto visible: un dato escondido en un
    // atributo o en un nodo oculto seguiría siendo una filtración.
    const html = await page.content();
    expectNoJwtLeak(html);

    // 🔴 F5/T5.1 — el GEMELO de la aserción de arriba, sobre `/analyze`: en la pantalla del
    // campo la nav resalta «el campo» (`aria-current="page"`) y NO «historial». Sin esto, la
    // regresión del estado activo (nav apuntando a `/`, que ya solo redirige, así que «el
    // campo» nunca quedaba current en `/analyze`) se colaría sin que ningún test la cazara.
    await page.goto('/analyze');
    await expect(page.getByRole('link', { name: /^el campo$/i }).first()).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByRole('link', { name: /^historial$/i })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('🔴 T2.4: un base64 que DESCODIFICA a texto reconocible no deja rastro (ni en pantalla ni en la fila)', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('base64'));
    await analyze(page, BASE64_INPUT, BASE64_MARKER);

    await page.goto('/history');
    await expect(rows(page)).toHaveCount(1);

    // Igualdad sobre la vista previa: no admite escapatoria. Solo la longitud sobrevive.
    await expect(rows(page).first().locator('code')).toHaveText('… (24 caracteres)');
    // El historial SIGUE SIRVIENDO: el kind detectado identifica la entrada.
    await expect(rows(page).first()).toContainText(/base64/i);

    // 🔴 Ni la pantalla ni el ENDPOINT (la fila tal cual sale de la BD) pueden contener el
    // contenido decodificado NI un prefijo corto del propio base64 — el prefijo es el
    // assert que muerde: sobrevive al truncado de 120 y solo desaparece por la redacción.
    const html = await page.content();
    const rowDump = await page.evaluate(async () => {
      const res = await fetch('/api/history', { credentials: 'include' });
      return JSON.stringify(await res.json());
    });
    for (const dump of [html, rowDump]) {
      expect(dump).not.toContain(BASE64_DECODED);
      expect(dump).not.toContain('World secret');
      expect(dump).not.toContain(BASE64_PREFIX);
      expect(dump).not.toContain(BASE64_INPUT);
    }
    // CONTROL POSITIVO: el grep apunta bien — lo que SÍ se conserva está en ambos volcados.
    expect(html).toContain('caracteres');
    expect(rowDump).toContain('caracteres');
  });

  test('🔴 D7: REABRIR muestra la cadena y el aviso de que el dato NO se restaura', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('reabrir'));
    await analyze(page, TEST_JWT, JWT_MARKER);
    await page.goto('/history');
    await expect(rows(page)).toHaveCount(1);

    // El aviso de D7 está CLICK-GATED: antes de reabrir, el diálogo no existe. Sin este
    // assert previo, el test pasaría por la nota al pie del mockup sin haber reabierto
    // nunca — y no protegería nada.
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page
      .getByRole('button', { name: /reabrir/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // La CADENA sí se restaura: los pasos aplicados aparecen dentro del diálogo.
    await expect(dialog).toContainText('jwt.decode');
    // Y el aviso de D7 lo dice explícitamente: el DATO no.
    await expect(dialog).toContainText(/no se restaura/i);
    await expect(dialog).toContainText(/vuelve a pegarlo/i);

    // Reabrir tampoco puede filtrar el dato original.
    const html = await page.content();
    expectNoJwtLeak(html);
  });

  test('borrar una entrada la quita de la lista', async ({ page }) => {
    await signup(page, uniqueEmail('borrar-una'));
    await analyze(page, TEST_JWT, JWT_MARKER);
    await analyze(page, TIMESTAMP, TIMESTAMP_MARKER); // segunda entrada, de otro kind
    await page.goto('/history');
    await expect(rows(page)).toHaveCount(2);

    // Se apunta al botón de borrado DE LA FILA (nombre accesible exacto «Borrar»), no al
    // «Borrar todo» de la cabecera: un `/borrar/i` sin anclar casaría con los dos.
    const firstPreview = await rows(page).first().locator('code').textContent();
    await rows(page)
      .first()
      .getByRole('button', { name: /^borrar$/i })
      .click();

    // Con CONFIRMACIÓN: el borrado no ocurre hasta confirmar en el diálogo.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^borrar$/i }).click();

    await expect(rows(page)).toHaveCount(1);
    // Y se fue LA QUE SE PIDIÓ, no una cualquiera: la que queda es la otra.
    if (firstPreview) {
      await expect(rows(page).first().locator('code')).not.toHaveText(firstPreview);
    }
  });

  test('borrar TODAS deja el EmptyState', async ({ page }) => {
    await signup(page, uniqueEmail('borrar-todas'));
    await analyze(page, TEST_JWT, JWT_MARKER);
    await analyze(page, TIMESTAMP, TIMESTAMP_MARKER);
    await page.goto('/history');
    await expect(rows(page)).toHaveCount(2);

    await page.getByRole('button', { name: /borrar todo/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /borrar todo/i }).click();

    await expect(rows(page)).toHaveCount(0);
    // El EmptyState del DS, no un panel en blanco.
    await expect(page.locator('[data-slot="empty-state"]')).toBeVisible();
    await expect(page.getByText(/historial está vacío/i)).toBeVisible();
  });

  test('🔴 AISLAMIENTO: un usuario NO ve las entradas de otro (dos cuentas)', async ({
    browser,
  }) => {
    // Dos contextos de navegador INDEPENDIENTES = dos cuentas con cookies separadas.
    const ctxA = await browser.newContext({
      extraHTTPHeaders: { 'x-forwarded-for': SPEC_IP },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const ctxB = await browser.newContext({
      extraHTTPHeaders: { 'x-forwarded-for': SPEC_IP },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    try {
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();

      // La cuenta A analiza algo: su historial tiene UNA entrada.
      await signup(pageA, uniqueEmail('aislamiento-a'));
      await analyze(pageA, TEST_JWT, JWT_MARKER);
      await pageA.goto('/history');
      await expect(rows(pageA)).toHaveCount(1);

      // La cuenta B, recién creada, ve su historial VACÍO — no el de A.
      await signup(pageB, uniqueEmail('aislamiento-b'));
      await pageB.goto('/history');
      await expect(rows(pageB)).toHaveCount(0);
      await expect(pageB.locator('[data-slot="empty-state"]')).toBeVisible();

      // Control negativo sobre el HTML de B: ni rastro del dato de A.
      const htmlB = await pageB.content();
      expectNoJwtLeak(htmlB);
      // Además, en el historial de OTRA cuenta no puede aparecer ni el header (que en el
      // preview propio SÍ es legítimo): la entrada entera es ajena.
      expect(htmlB).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');

      // Y el propio ENDPOINT, pedido desde el navegador de B (con SU cookie), no devuelve
      // entradas ajenas ni aunque se le pase el id de usuario por la query.
      const bodyB = await pageB.evaluate(async () => {
        const res = await fetch('/api/history', { credentials: 'include' });
        return (await res.json()) as { entries: unknown[] };
      });
      expect(bodyB.entries).toEqual([]);

      // A sigue viendo lo suyo: el aislamiento no es "nadie ve nada".
      await pageA.reload();
      await expect(rows(pageA)).toHaveCount(1);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('en viewport móvil /history no hace scroll horizontal y el atajo del header lleva aquí', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await signup(page, uniqueEmail('movil'));
    await analyze(page, TEST_JWT, JWT_MARKER);

    // El atajo de historial de la cabecera móvil ya está ACTIVO (la pantalla existe).
    await page.getByRole('link', { name: /^historial$/i }).click();
    await expect(page).toHaveURL(/\/history/);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

// ── T6.10 — el historial guarda la RECETA (y solo la receta) ──────────────────────────────────
// Protege, contra el sistema real, que componer con sesión deja rastro en `/history` SIN que un
// solo carácter del usuario salga del navegador:
//   - con sesión, componer dos pasos crea una entrada con su receta (preview sintético);
//   - la petición que la crea lleva la RECETA (ids) y NUNCA el fuente, `carlos` ni el secreto
//     (canario en el borde de CLIENTE, complementario del `pg_dump` del servidor);
//   - reabrir lleva a `/compose` con los pasos y el campo VACÍO (el dato no se restaura);
//   - borrar la quita;
//   - SIN sesión, componer + copiar NO dispara ni un `POST /api/history` (ninguna fila).

// El ejemplo de la Verificación del planning. `carlos` es dato del usuario: no puede persistirse.
const COMPOSE_SOURCE = '{"sub":"1","name":"carlos"}';
// El secreto canario (literal de test, NO un secreto real — skill testing).
const COMPOSE_CANARY = 'test-signing-secret-not-a-secret';

const composeSourceField = (page: Page) => page.getByRole('textbox', { name: /entrada/i });

async function addComposeStep(page: Page, transform: string): Promise<void> {
  await page.getByRole('button', { name: 'añadir paso' }).click();
  await page.getByRole('button', { name: transform, exact: true }).click();
}

/** Compone `{"sub":"1","name":"carlos"}` → json.minify → jwt.sign(canario) y deja la barra de
 *  resultado lista. No copia: eso lo decide cada test (copiar es el disparador del registro). */
async function composeSignedRecipe(page: Page): Promise<void> {
  await page.goto('/compose');
  await page.waitForLoadState('networkidle');
  await composeSourceField(page).fill(COMPOSE_SOURCE);
  await addComposeStep(page, 'json.minify');
  await addComposeStep(page, 'jwt.sign');
  await page.getByLabel(/secreto de firma/i).fill(COMPOSE_CANARY);
  await expect(page.getByText(/listo para compartir/i)).toBeVisible();
}

// IP PROPIA de este bloque, distinta de `SPEC_IP` del bloque @f2 de arriba: el rate limit de
// signup es 10 altas / 15 min POR IP, y ambos bloques crean cuentas. Compartir bucket agota el
// límite y rompe un signup al azar (el gotcha ya documentado en la cabecera de este fichero).
const SPEC_IP_F6 = '203.0.113.23';

test.describe('@f6 /history — la receta de composición (T6.10)', () => {
  test.use({
    extraHTTPHeaders: { 'x-forwarded-for': SPEC_IP_F6 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  test('🔴 con sesión, componer y copiar crea una entrada con la RECETA — y la petición no lleva el dato', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('compose-crea'));
    await composeSignedRecipe(page);

    // La petición de registro se captura para probar, en el borde de CLIENTE, que lleva la receta
    // y NADA del usuario (el `pg_dump` del servidor lo prueba por el otro lado).
    const postPromise = page.waitForRequest(
      (req) => req.url().includes('/api/history') && req.method() === 'POST',
    );
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/history') && res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /copiar el resultado/i }).click();

    const postReq = await postPromise;
    const body = postReq.postData() ?? '';
    // Control POSITIVO: la receta (los ids) SÍ viaja.
    expect(body).toContain('json.minify');
    expect(body).toContain('jwt.sign');
    // 🔴 Control NEGATIVO: ni el fuente, ni `carlos`, ni el secreto canario, ni el JWT resultante.
    expect(body).not.toContain('carlos');
    expect(body).not.toContain(COMPOSE_CANARY);
    expect(body).not.toContain('"sub"');
    expect(body).not.toContain('eyJhbGci'); // ningún prefijo del JWT compuesto

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    // La fila aparece en /history con la etiqueta sintética y el marcador de dirección.
    await page.goto('/history');
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().locator('code')).toHaveText('compuesto · 2 pasos');
    await expect(rows(page).first()).toContainText(/codificar/i);

    // 🔴 Ni la pantalla ni el endpoint pueden contener el dato del usuario.
    const html = await page.content();
    const rowDump = await page.evaluate(async () => {
      const res = await fetch('/api/history', { credentials: 'include' });
      return JSON.stringify(await res.json());
    });
    for (const dump of [html, rowDump]) {
      expect(dump).not.toContain('carlos');
      expect(dump).not.toContain(COMPOSE_CANARY);
    }
    // Control positivo: la receta SÍ está guardada (el grep apunta bien).
    expect(rowDump).toContain('json.minify');
    expect(rowDump).toContain('jwt.sign');
    expect(rowDump).toContain('compose');
  });

  test('🔴 reabrir una receta lleva a /compose con los pasos y SIN el dato (nunca se guardó)', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('compose-reabrir'));
    await composeSignedRecipe(page);
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/history') && res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /copiar el resultado/i }).click();
    await responsePromise;

    await page.goto('/history');
    await expect(rows(page)).toHaveCount(1);

    // El aviso de reabrir es CLICK-GATED (no existe hasta pulsar).
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page
      .getByRole('button', { name: /reabrir/i })
      .first()
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
    // …y el campo de entrada VACÍO: el dato no se restaura.
    await expect(composeSourceField(page)).toHaveValue('');
    // El secreto TAMPOCO se restaura (nunca se guardó): el campo llega vacío.
    expect(await page.getByLabel(/secreto de firma/i).inputValue()).toBe('');
  });

  test('borrar una receta la quita del historial', async ({ page }) => {
    await signup(page, uniqueEmail('compose-borrar'));
    await composeSignedRecipe(page);
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/history') && res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /copiar el resultado/i }).click();
    await responsePromise;

    await page.goto('/history');
    await expect(rows(page)).toHaveCount(1);

    await rows(page)
      .first()
      .getByRole('button', { name: /^borrar$/i })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^borrar$/i }).click();

    await expect(rows(page)).toHaveCount(0);
    await expect(page.locator('[data-slot="empty-state"]')).toBeVisible();
  });

  test('🔴 SIN sesión, componer y copiar NO dispara ningún POST /api/history (ninguna fila)', async ({
    page,
  }) => {
    // Anónimo: `/compose` funciona entero (D6), pero copiar NO registra nada. No se puede mirar
    // `/history` (redirige a login), así que se prueba sobre la RED: ninguna petición de registro.
    const posts: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/history') && req.method() === 'POST') posts.push(req.url());
    });

    await composeSignedRecipe(page);
    await page.getByRole('button', { name: /copiar el resultado/i }).click();

    // Observable, no timeout fijo (el codebase es alérgico a esperas ciegas): leer el
    // portapapeles PRUEBA que el `onCopy` ya se ejecutó (la escritura del portapapeles ocurre
    // dentro de él, antes del callback). Si ese callback fuera a disparar un POST, ya habría
    // salido — y `posts` lo habría capturado. El token de 3 segmentos es además el control
    // positivo de que componer funciona entero sin cuenta (D6).
    const token = await page.evaluate(() => navigator.clipboard.readText());
    expect(token.split('.')).toHaveLength(3);
    await page.waitForLoadState('networkidle');

    expect(posts).toEqual([]);
  });
});
