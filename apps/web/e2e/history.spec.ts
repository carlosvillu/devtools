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
 * Pega de verdad en el campo de `/` para que se dispare el análisis (y su registro).
 * `marker` es el transform que debe aparecer en la cadena: la espera va por CONDICIÓN
 * OBSERVABLE (nada de timeouts fijos) y es específica del input, no genérica.
 */
async function analyze(page: Page, text: string, marker: string): Promise<void> {
  await page.goto('/');
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
