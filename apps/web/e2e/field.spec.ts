import { expect, test, type Locator, type Page } from '@playwright/test';

// Playwright permanente de T1.5 (`/` — el campo y la cadena). Protege el cableado
// UI ↔ POST /api/analyze contra el sistema real levantado. Determinista y gratuito: el
// motor es puro y sin red externa. Tag @f1 (regla de no-regresión por fase, e2e.md §10).
//
// JWT de PRUEBA (el del ejemplo trabajado del PRD §6.5). NO es un secreto: firmado con una
// clave desconocida, payload {sub:1,name:carlos}. test-token-not-a-secret.
const TEST_JWT =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc1MjUzNzYwMCwiZXhwIjoxNzUyNjI0MDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const field = (page: Page): Locator =>
  page.getByRole('textbox', { name: /pega algo para analizar/i });

// Pega de verdad: escribe al portapapeles y dispara Ctrl/Cmd+V sobre el campo enfocado, para
// que el navegador emita el evento `paste` real (el que la UI usa para analizar al instante,
// sin botón). NO es un `fill`: eso saltaría la rama de pegado.
async function pasteInto(page: Page, text: string) {
  await page.evaluate((t) => navigator.clipboard.writeText(t), text);
  await field(page).focus();
  await page.keyboard.press('ControlOrMeta+v');
}

test.describe('@f1 / — el campo y la cadena', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('el campo tiene el foco al cargar y el aviso de seguridad es visible', async ({ page }) => {
    await page.goto('/');
    await expect(field(page)).toBeFocused();
    await expect(page.getByText(/procesa lo que pegas en el servidor/i)).toBeVisible();
  });

  test('pegar un JWT despliega la cadena jwt → json sin tocar ningún botón', async ({ page }) => {
    await page.goto('/');
    await pasteInto(page, TEST_JWT);

    // La cadena aparece: transform aplicado en cada paso + el payload formateado + la
    // expiración en lenguaje natural (criterio 14.1), sin haber pulsado nada.
    await expect(page.getByText('jwt.decode')).toBeVisible();
    await expect(page.getByText('json.format')).toBeVisible();
    await expect(page.getByText('"name": "carlos"')).toBeVisible();
    await expect(page.getByText(/caduc/i)).toBeVisible();
  });

  test('cada paso intermedio se copia con un clic', async ({ page }) => {
    await page.goto('/');
    await pasteInto(page, TEST_JWT);
    await expect(page.getByText('jwt.decode')).toBeVisible();

    // Un botón «Copiar» por salida de paso (jwt.decode y json.format tienen output).
    const copyButtons = page.getByRole('button', { name: /^copiar$/i });
    await expect(copyButtons.first()).toBeVisible();
    expect(await copyButtons.count()).toBeGreaterThanOrEqual(2);

    await copyButtons.first().click();
    await expect(page.getByRole('button', { name: /copiado/i }).first()).toBeVisible();
  });

  test('una entrada no reconocida muestra un mensaje explícito, no una pantalla vacía', async ({
    page,
  }) => {
    await page.goto('/');
    // `fill` = tecleo (rama debounce), no pegado: también debe analizar.
    await field(page).fill('holaquetalestamos');
    await expect(page.getByText(/no se reconoció ningún formato/i)).toBeVisible();
    await expect(page.getByText(/se interpreta como texto plano/i)).toBeVisible();
  });

  test('en viewport móvil la cadena se apila y el body no hace scroll horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await pasteInto(page, TEST_JWT);
    await expect(page.getByText('jwt.decode')).toBeVisible();

    // Sin scroll horizontal del documento (la cadena se apila, nunca tabla horizontal).
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
