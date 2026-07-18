import { expect, test, type Locator, type Page } from '@playwright/test';

// E2E de FASE F1 (planning T1.7) — el recorrido sagrado de la fase: los 5 casos de uso de
// PRD §3 que NO necesitan cuenta (CU1..CU5), ejecutados contra el sistema real levantado
// (UI ↔ POST /api/analyze ↔ motor puro). Determinista y coste $0: el motor es puro y sin red
// externa. Tags `@f1 @phase` (e2e.md §10): `@f1` lo incluye en la no-regresión de la fase;
// `@phase` lo marca como el E2E de fase (uno por fase).
//
// Reparto de criterios del PRD §14 que este recorrido cierra (el resto son invariantes del
// corpus del motor, cubiertos por packages/core, NO por navegador):
//   14.1 → CU1 (token opaco: JWT → jwt → json, expiración en lenguaje natural, sin botón)
//   14.2 → CU2 (log ilegible: base64 → json, 3 pasos, copiar un paso intermedio)
//   14.3 → CU3 (ambigüedad: 1752624000 lee timestamp Y ofrece `text`; elegirla recalcula)
//   14.4 → CU4 vía O4 (desvío: en un paso json elegir otra transformación recalcula desde ahí
//          dejando intactos los anteriores; ver nota de reconciliación abajo)
//   14.5 → I7 (una entrada ~200 KB recibe 413 sin ser procesada)
//   CU5  → URL con parámetros URL-encoded → url.split_query → valores DECODIFICADOS visibles
//
// RECONCILIACIÓN §3 CU4: la narrativa literal («un base64 decodifica a texto y el usuario elige
// hash a mano») está superada por el motor real, que AUTO-detecta `hash` para cualquier hex de
// 32/40/64 (no queda en `text`). Así que CU4 se realiza por su forma canónica O4/14.1..14.4:
// desviar un paso con >1 transformación. No es un gap de producto.
//
// El criterio 14.1 exige además «< 1 s»: esa MEDICIÓN de latencia es del verifier (evidencia
// cronometrada en docs/verifications/T1.7/). Aquí se protege el núcleo FUNCIONAL de 14.1 (la
// cadena aparece sin pulsar nada; el auto-wait de Playwright confirma que se resuelve), sin un
// assert de reloj de pared —flaky perpetuo contra un build de prod en un VPS con carga—.

// JWT de PRUEBA (ejemplo trabajado del PRD §6.5; el mismo que field.spec.ts). NO es un secreto:
// firmado con clave desconocida, payload {sub:1,name:carlos}. test-token-not-a-secret.
const TEST_JWT =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc1MjUzNzYwMCwiZXhwIjoxNzUyNjI0MDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// base64 que CONTIENE JSON (CU2): decodifica a `{"user":"carlos","role":"admin"}` → cadena
// base64 → json (3 pasos: base64.decode, json.format, terminal). Literal de prueba, sin secreto.
const TEST_B64_JSON = Buffer.from('{"user":"carlos","role":"admin"}').toString('base64');

// URL de callback con parámetros URL-encoded (CU5): `%20`→espacio, `%2F`→`/`, `%2B`→`+`,
// `%3A%2F%2F`→`://`. La prueba del DECODIFICADO es que la salida muestra los valores limpios.
const TEST_CALLBACK_URL =
  'https://app.example.com/callback?state=abc%20xyz&code=a%2Fb%2Bc&redirect_uri=https%3A%2F%2Ffoo.com';

const field = (page: Page): Locator =>
  page.getByRole('textbox', { name: /pega algo para analizar/i });

// Pega de verdad (mismo helper que los specs de T1.5/T1.6): escribe al portapapeles y dispara
// Ctrl/Cmd+V sobre el campo enfocado, para que el navegador emita el evento `paste` real —la
// rama que la UI usa para analizar al instante sin botón—. NO es un `fill` (eso saltaría el
// pegado). Se duplica a propósito: el recorrido de fase no debe depender de los otros specs.
async function pasteInto(page: Page, text: string) {
  await page.evaluate((t) => navigator.clipboard.writeText(t), text);
  await field(page).focus();
  await page.keyboard.press('ControlOrMeta+v');
}

test.describe('@f1 @phase F1 — recorrido de los 5 casos de uso sin cuenta (CU1..CU5)', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('CU1 (14.1): pegar un JWT despliega jwt → json con la expiración en lenguaje natural, sin botón', async ({
    page,
  }) => {
    await page.goto('/');
    // El campo tiene el foco al cargar y el aviso de seguridad (§11) es visible: el primer uso
    // es evidente sin leer nada.
    await expect(field(page)).toBeFocused();
    await expect(page.getByText(/procesa lo que pegas en el servidor/i)).toBeVisible();

    await pasteInto(page, TEST_JWT);

    // La cadena `jwt → json` aparece sin pulsar nada: transform de cada paso, el payload
    // formateado y la expiración en lenguaje natural (criterio 14.1). La medición literal
    // «< 1 s» la cronometra el verifier; aquí el auto-wait prueba que se resuelve.
    await expect(page.getByText('jwt.decode')).toBeVisible();
    await expect(page.getByText('json.format')).toBeVisible();
    await expect(page.getByText('"name": "carlos"')).toBeVisible();
    await expect(page.getByText(/caduc/i)).toBeVisible();
  });

  test('CU2 (14.2): un base64 que contiene JSON muestra 3 pasos y copia un paso intermedio con un clic', async ({
    page,
  }) => {
    await page.goto('/');
    await pasteInto(page, TEST_B64_JSON);

    // 3 pasos: base64.decode (paso 0) → json.format (paso 1) → terminal (paso 2). El JSON
    // formateado del paso intermedio es visible.
    await expect(page.getByText('base64.decode')).toBeVisible();
    await expect(page.getByText('json.format')).toBeVisible();
    await expect(page.getByText('"user": "carlos"')).toBeVisible();

    // Copiar un paso intermedio con un clic (O3): hay un botón «Copiar» por salida de paso.
    const copyButtons = page.getByRole('button', { name: /^copiar$/i });
    await expect(copyButtons.first()).toBeVisible();
    expect(await copyButtons.count()).toBeGreaterThanOrEqual(2);
    await copyButtons.first().click();
    await expect(page.getByRole('button', { name: /copiado/i }).first()).toBeVisible();
  });

  test('CU3 (14.3): 1752624000 se lee como timestamp y ofrece la alternativa text; elegirla recalcula', async ({
    page,
  }) => {
    await page.goto('/');
    await pasteInto(page, '1752624000');

    // Lectura por defecto como timestamp Unix (confianza alta por el rango plausible).
    await expect(page.getByText('timestamp.to_iso')).toBeVisible();
    await expect(page.getByText('2025-07-16T00:00:00.000Z')).toBeVisible();

    // La ambigüedad NO se oculta (I8): se ofrece la alternativa `text` «a un clic» (R1).
    await expect(page.getByText(/también podría ser/i)).toBeVisible();
    const textAlternative = page.getByRole('button', {
      name: /reinterpretar este paso como text/i,
    });
    await expect(textAlternative).toBeVisible();

    // Elegir `text` recalcula: ya no se aplica timestamp.to_iso y la cadena termina en texto.
    await textAlternative.click();
    await expect(page.getByText('timestamp.to_iso')).toHaveCount(0);
    await expect(page.getByText('2025-07-16T00:00:00.000Z')).toHaveCount(0);
    await expect(page.getByText(/dato de texto — fin de la cadena/i)).toBeVisible();
  });

  test('CU4 (14.4, O4): desviar un paso json a otra transformación recalcula desde ahí y deja intactos los anteriores', async ({
    page,
  }) => {
    await page.goto('/');
    await pasteInto(page, TEST_JWT);

    // Cadena por defecto: jwt.decode (paso 0) → json.format (paso 1) → terminal. El payload
    // decodificado del paso 0 («carlos») es lo que debe quedar INTACTO tras el desvío.
    await expect(page.getByText('jwt.decode')).toBeVisible();
    await expect(page.getByText('json.format')).toBeVisible();
    await expect(page.getByText('"name": "carlos"').first()).toBeVisible();

    // Desviar el PASO 1 (json) de json.format a json.sort_keys (productiva: ordena+indenta el
    // compact del paso 0). El paso 0 (jwt) tiene una sola transformación → sin picker; el primer
    // combobox «Transformación aplicada» es por tanto el del paso 1.
    const step1Picker = page.getByRole('combobox', { name: /transformación aplicada/i }).first();
    await step1Picker.selectOption('json.sort_keys');

    // Recalculado desde el paso 1 (ahora json.sort_keys, ya no json.format); el paso 0 intacto.
    await expect(page.getByText('json.sort_keys')).toBeVisible();
    await expect(page.getByText('json.format')).toHaveCount(0);
    await expect(page.getByText('jwt.decode')).toBeVisible();
    await expect(page.getByText('"name": "carlos"').first()).toBeVisible();
  });

  test('CU5: una URL con parámetros URL-encoded se desglosa con los valores DECODIFICADOS', async ({
    page,
  }) => {
    await page.goto('/');
    await pasteInto(page, TEST_CALLBACK_URL);

    // El paso aplica url.split_query (el kind url con query → desglose de parámetros).
    await expect(page.getByText('url.split_query')).toBeVisible();

    // Los parámetros aparecen desglosados con los valores YA DECODIFICADOS (la prueba de CU5):
    //   state=abc%20xyz     → "abc xyz"   (%20 → espacio)
    //   code=a%2Fb%2Bc      → "a/b+c"     (%2F → «/», %2B → «+»)
    //   redirect_uri=…%3A%2F%2F… → "https://foo.com" (%3A%2F%2F → «://»)
    await expect(page.getByText('"state": "abc xyz"')).toBeVisible();
    await expect(page.getByText('"code": "a/b+c"')).toBeVisible();
    await expect(page.getByText('"redirect_uri": "https://foo.com"')).toBeVisible();
  });

  test('14.5 (I7): una entrada de ~200 KB recibe 413 sin que el servidor la procese', async ({
    request,
  }) => {
    // ~200 KB de payload, por encima del límite de 128 KB del handler. Petición HTTP directa
    // (no navegador): el borde debe rechazar ANTES de invocar el motor.
    const input = 'a'.repeat(200 * 1024);
    const res = await request.post('/api/analyze', { data: { input } });

    // 413 con el envelope de error (payload_too_large). La prueba de «sin procesar» observable a
    // esta capa: la respuesta es el envelope de error, NO una `Chain` (una petición procesada
    // devolvería `{ steps: [...] }`). El control por LOG («no se emite analyze_completed») ya lo
    // asegura el test handler-level de route.test.ts (I7/14.5); el verifier lo reproduce sobre
    // los logs del sistema real en docs/verifications/T1.7/.
    expect(res.status()).toBe(413);
    const body = (await res.json()) as { code?: string; steps?: unknown };
    expect(body.code).toBe('payload_too_large');
    expect(body.steps).toBeUndefined();
  });
});
