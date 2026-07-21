import { expect, test, type Locator, type Page } from '@playwright/test';

// Playwright permanente de T5.2 — la LANDING (`/`) y su relevo del input a `/analyze`, contra el
// sistema REAL levantado (UI ↔ sessionStorage ↔ /analyze ↔ POST /api/analyze ↔ motor puro).
// Determinista y gratuito: sin red externa. Tag @f5 (no-regresión de fase, e2e.md §10).
//
// Qué protege (Entrega/Verificación T5.2):
//   - `/` muestra wordmark, campo, badges y footer; NUNCA una cadena (la landing no analiza).
//   - Pegar en el campo → navega a `/analyze` y allí aparece la cadena.
//   - Enter (texto tecleado, sin pegar) → mismo aterrizaje.
//   - Teclear sin Enter → NO navega (la landing espera).
//   - «Pega un ejemplo» → `/analyze` con su cadena.
//   - «Entrar» es un enlace (`role=link`), no un `<button>` (f0/auth lo esperan así).
//   - 🔴 CONTROL NEGATIVO DE PRIVACIDAD (§11): tras pegar y aterrizar en `/analyze`, el input
//     está presente en el CAMPO (control positivo: el dato viajó) pero JAMÁS en la URL — ni query
//     ni fragment. Un query param filtraría el JWT a la barra, al historial del navegador, al
//     `Referer` y a los logs de Caddy/Cloudflare (la clase de fuga que F3/F4 cerraron). Verificado
//     manualmente reintroduciendo la fuga (input en `?q=` / `#`) → los asserts de `url.search` /
//     `url.hash` se ponen ROJOS; con el transporte por sessionStorage → verde.

// La CABECERA ENTERA `Authorization: Bearer <JWT>`, igual que field/f1/analyze-pending: la cadena
// literal de 14.1. NO es un secreto (firma con clave desconocida, payload {sub:1,name:carlos}).
const TEST_JWT =
  'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc1MjUzNzYwMCwiZXhwIjoxNzUyNjI0MDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
// Prefijo del payload base64url del JWT: sobrevive intacto sin transformaciones, así que si el
// input se colara a la URL este literal casaría (patrón que SÍ apunta al dato peligroso).
const JWT_PAYLOAD_MARKER = 'eyJzdWIiOiIxIiwibmFt';

const field = (page: Page): Locator =>
  page.getByRole('textbox', { name: /pega algo para analizar/i });

// Aterrizaje esperado del relevo: en `/analyze`, con la cadena desplegada, el input presente en el
// campo y la URL LIMPIA (sin el input en query ni fragment). Reutilizado por los tres disparos.
async function expectCleanAnalyzeLanding(page: Page, expectedValue: string): Promise<void> {
  await expect(page).toHaveURL('/analyze');
  // La cadena jwt → json aparece: el relevo llegó y `/analyze` consumió el pending y analizó.
  await expect(page.getByText('jwt.decode')).toBeVisible();
  await expect(page.getByText('json.format')).toBeVisible();
  // Control positivo: el input VIAJÓ y está en el campo (sin esto, el assert negativo sería vacuo).
  await expect(field(page)).toHaveValue(expectedValue);
  // 🔴 Privacidad: la URL es `/analyze` LIMPIA, sin rastro del token.
  const url = new URL(page.url());
  expect(url.pathname).toBe('/analyze');
  expect(url.search).toBe('');
  expect(url.hash).toBe('');
  expect(page.url()).not.toContain(JWT_PAYLOAD_MARKER);
  expect(page.url()).not.toContain('Bearer');
}

test.describe('@f5 / — la landing y el relevo del input a /analyze', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('la landing muestra wordmark, campo, badges y footer, y NO analiza', async ({ page }) => {
    await page.goto('/');

    // Wordmark (el h1 de la landing), campo vacío, los 7 badges de kind y el footer con GitHub +
    // aviso de privacidad completo.
    await expect(page.getByRole('heading', { name: /devtools/i })).toBeVisible();
    await expect(field(page)).toHaveValue('');
    for (const kind of ['jwt', 'base64', 'json', 'timestamp', 'url', 'uuid', 'hash']) {
      await expect(page.getByText(kind, { exact: true })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: /github/i })).toBeVisible();
    await expect(page.getByText(/procesa lo que pegas en el servidor/i)).toBeVisible();
    await expect(page.getByText(/no se guarda el dato crudo/i)).toBeVisible();

    // «Entrar» es un ENLACE (role=link), no un botón: f0/auth lo localizan por rol de enlace.
    await expect(page.getByRole('link', { name: /^entrar$/i })).toBeVisible();

    // La landing NUNCA muestra la cadena: no hay ningún transform en pantalla.
    await expect(page.getByText('jwt.decode')).toHaveCount(0);
    await expect(page.getByText('json.format')).toHaveCount(0);
  });

  test('pegar un JWT hace el relevo a /analyze con la cadena y la URL LIMPIA', async ({ page }) => {
    await page.goto('/');

    // Pegado REAL (no `fill`): escribe al portapapeles y dispara ⌘/Ctrl+V sobre el campo enfocado,
    // para emitir el evento `paste` real que la landing usa para saltar a /analyze.
    await page.evaluate((t) => navigator.clipboard.writeText(t), TEST_JWT);
    await field(page).focus();
    await page.keyboard.press('ControlOrMeta+v');

    await expectCleanAnalyzeLanding(page, TEST_JWT);
  });

  test('Enter con un JWT tecleado hace el mismo relevo a /analyze', async ({ page }) => {
    await page.goto('/');

    // Tecleado (sin pegar): `fill` dispara input sin evento paste; la landing NO navega al teclear.
    await field(page).fill(TEST_JWT);
    await expect(page).toHaveURL('/'); // aún en la landing: teclear no dispara nada
    // Enter (sin Shift) analiza → salta a /analyze.
    await field(page).press('Enter');

    await expectCleanAnalyzeLanding(page, TEST_JWT);
  });

  test('teclear sin Enter NO navega: la landing espera', async ({ page }) => {
    await page.goto('/');

    await field(page).fill('un texto cualquiera sin pulsar enter');
    // Sigue en la landing, sin cadena: teclear no dispara el relevo.
    await expect(page).toHaveURL('/');
    await expect(field(page)).toHaveValue('un texto cualquiera sin pulsar enter');
    await expect(page.getByText('jwt.decode')).toHaveCount(0);
  });

  test('«Pega un ejemplo» lleva a /analyze con su cadena y la URL limpia', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /pega un ejemplo/i }).click();

    await expect(page).toHaveURL('/analyze');
    await expect(page.getByText('jwt.decode')).toBeVisible();
    await expect(page.getByText('json.format')).toBeVisible();
    // El ejemplo tampoco viaja por la URL.
    const url = new URL(page.url());
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  });
});

// Playwright permanente de T5.4 — el header de la landing REFLEJA LA SESIÓN. Antes de T5.4
// `LandingHome` era síncrono y su header pintaba siempre «Entrar», así que un usuario logueado que
// pulsaba el Wordmark en `/analyze` (enlaza a `/`) aterrizaba en la landing viendo «Entrar» como si
// no tuviera cuenta. Ahora `/` es dinámica (`force-dynamic`) y `LandingHome` lee `getServerSession`.
//
// Ejercita AMBOS estados en `/`:
//   (a) con sesión → el email de la cuenta es visible y NO existe el enlace «Entrar».
//   (b) anónimo → «Entrar» (role=link) es visible y ningún email aparece.
//
// 🔴 CONTROL NEGATIVO (verificado en la implementación): revertir el header a estático (siempre
// «Entrar», sin leer la sesión) pone el test logueado en ROJO por sus dos asserts — «Entrar» pasa a
// existir (count != 0) y el email deja de estar visible.

// Sin storageState global: el test logueado crea su propia cuenta con email único (aislamiento bajo
// `fullyParallel`), mismo patrón que `auth.spec.ts`. ~5 líneas duplicadas a propósito: extraer un
// helper compartido tocaría `auth.spec.ts`, fuera del alcance de T5.4.
const T54_PASSWORD = 'e2e-secreto-123';
const t54Email = (): string =>
  `t54-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}@e2e.local`;

async function signup(page: Page, email: string): Promise<void> {
  await page.goto('/signup');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(T54_PASSWORD);
  await page.getByRole('button', { name: /crear cuenta/i }).click();
  // El signup deja sesión iniciada y aterriza en `/analyze` (F5/T5.2): esperarlo garantiza que la
  // cookie de sesión ya está puesta antes de navegar a `/`.
  await expect(page).toHaveURL('/analyze');
}

test.describe('@f5 / — el header de la landing refleja la sesión (T5.4)', () => {
  test('con sesión iniciada: `/` muestra el email y NO el enlace «Entrar»', async ({ page }) => {
    const email = t54Email();
    await signup(page, email);

    await page.goto('/');

    // Ancla de CAPA: fija que estamos en la LANDING (`/`) y no en `/analyze`. El header logueado de
    // `LandingHome` y el de `SiteHeader` (en `/analyze`) son indistinguibles (email + «Salir»); sin
    // esto, un rebote a `/analyze` haría pasar los asserts ejercitando `SiteHeader` y el control
    // negativo de T5.4 (revertir SOLO el header de la landing) dejaría de morder en silencio.
    await expect(page).toHaveURL('/');
    // Contenido propio de la landing (NO exclusivo: el mismo texto es el h1 de `/analyze`), como
    // comprobación secundaria de que la página renderizó. El ancla de capa es el `toHaveURL('/')` de
    // arriba, que es lo único que falla en `/analyze`.
    await expect(page.getByText('Pega algo. Lo desenreda.')).toBeVisible();

    // El header refleja la sesión: el email de la cuenta es visible…
    await expect(page.getByText(email)).toBeVisible();
    // …y «Salir» (LogoutButton) está presente, como en `SiteHeader`.
    await expect(page.getByRole('button', { name: /salir/i })).toBeVisible();
    // …y NO existe el enlace «Entrar» (el defecto que T5.4 corrige).
    await expect(page.getByRole('link', { name: /^entrar$/i })).toHaveCount(0);
  });

  test('anónimo: `/` muestra «Entrar» (role=link) y ningún email', async ({ page }) => {
    // Contexto limpio (sin la cookie del otro test): visitante anónimo.
    await page.goto('/');

    // Ancla de CAPA: estamos en la LANDING, no en `/analyze` (ambos muestran «Entrar» sin sesión).
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Pega algo. Lo desenreda.')).toBeVisible();

    await expect(page.getByRole('link', { name: /^entrar$/i })).toBeVisible();
    // Ninguna dirección de correo aparece en el header anónimo.
    await expect(page.getByText(/@e2e\.local/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /salir/i })).toHaveCount(0);
  });
});
