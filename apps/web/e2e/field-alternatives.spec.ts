import { expect, test, type Locator, type Page } from '@playwright/test';

// Playwright permanente de T1.6 (alternativas de detección O5 + desvío de la cadena O4) sobre
// la pantalla `/` de T1.5. Ejercita el sistema REAL levantado (UI ↔ POST /api/analyze ↔ motor
// puro): determinista y gratuito, sin red externa. Tag @f1 (no-regresión por fase, e2e.md §10).
//
// Protege los criterios 14.3 y 14.4 del PRD:
//   - `1752624000` se lee como timestamp Y deja ver la alternativa `text`; elegirla recalcula.
//   - elegir otra transformación en el paso N recalcula desde ahí, dejando los pasos < N intactos.

// JWT de PRUEBA (ejemplo trabajado del §6.5; el mismo que field.spec.ts). NO es un secreto.
const TEST_JWT =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc1MjUzNzYwMCwiZXhwIjoxNzUyNjI0MDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const field = (page: Page): Locator =>
  page.getByRole('textbox', { name: /pega algo para analizar/i });

// Pega de verdad (mismo helper que field.spec.ts): dispara el evento `paste` real, la rama que
// la UI usa para analizar al instante sin botón. NO es un `fill` (eso saltaría el pegado).
async function pasteInto(page: Page, text: string) {
  await page.evaluate((t) => navigator.clipboard.writeText(t), text);
  await field(page).focus();
  await page.keyboard.press('ControlOrMeta+v');
}

test.describe('@f1 / — alternativas de detección y desvío de la cadena', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('1752624000 se lee como timestamp y deja ver la alternativa text; elegirla recalcula (14.3)', async ({
    page,
  }) => {
    await page.goto('/');
    await pasteInto(page, '1752624000');

    // Lectura como timestamp: transform por defecto aplicado + salida ISO.
    await expect(page.getByText('timestamp.to_iso')).toBeVisible();
    await expect(page.getByText('2025-07-16T00:00:00.000Z')).toBeVisible();

    // La ambigüedad NO se oculta (I8): se ofrece la alternativa `text`, «a un clic» (R1).
    await expect(page.getByText(/también podría ser/i)).toBeVisible();
    const textAlternative = page.getByRole('button', {
      name: /reinterpretar este paso como text/i,
    });
    await expect(textAlternative).toBeVisible();

    // Elegir la alternativa `text` recalcula la cadena: ya no se aplica timestamp.to_iso (el
    // paso se lee como texto plano) y aparece el marcador de fin de cadena de texto.
    await textAlternative.click();
    await expect(page.getByText('timestamp.to_iso')).toHaveCount(0);
    await expect(page.getByText('2025-07-16T00:00:00.000Z')).toHaveCount(0);
    await expect(page.getByText(/dato de texto — fin de la cadena/i)).toBeVisible();
  });

  test('elegir otra transformación en el paso N recalcula desde ahí y deja intactos los pasos < N (14.4)', async ({
    page,
  }) => {
    await page.goto('/');
    await pasteInto(page, TEST_JWT);

    // Cadena por defecto: jwt.decode (paso 0) → json.format (paso 1) → terminal.
    await expect(page.getByText('jwt.decode')).toBeVisible();
    await expect(page.getByText('json.format')).toBeVisible();
    // El payload decodificado del paso 0 (contiene "carlos"): es lo que debe quedar INTACTO.
    await expect(page.getByText('"name": "carlos"').first()).toBeVisible();

    // Desviar el PASO 1 (json): del json.format por defecto a json.sort_keys (una transformación
    // productiva: el compact del paso 0 no está indentado, así que ordenar+indentar sí aporta;
    // minify sería idempotente sobre un JSON ya compacto). El picker del paso 1 es el primer
    // combobox de «Transformación aplicada» (el paso 0, jwt, tiene una sola transformación → sin
    // picker).
    const step1Picker = page.getByRole('combobox', { name: /transformación aplicada/i }).first();
    await step1Picker.selectOption('json.sort_keys');

    // Recalculado desde el paso 1: ahora se aplica json.sort_keys y json.format ya no. El paso 0
    // (jwt.decode) queda INTACTO — su transform y su salida decodificada siguen presentes.
    await expect(page.getByText('json.sort_keys')).toBeVisible();
    await expect(page.getByText('json.format')).toHaveCount(0);
    await expect(page.getByText('jwt.decode')).toBeVisible();
    await expect(page.getByText('"name": "carlos"').first()).toBeVisible();
  });
});
