import { test, expect } from '@playwright/test';

// Auth E2E permanente (T0.4, testing/references/e2e.md). Protege el recorrido real en
// navegador: signup deja sesión iniciada que SOBREVIVE A UN REFRESH; logout la invalida;
// `/history` sin sesión REDIRIGE a `/login`; y el GUARDIÁN de D6: `/` sin sesión responde
// 200 y es usable. Sin storageState global: cada test parte deslogueado y crea su propia
// cuenta con un email único (aislamiento bajo `fullyParallel`).
const PASSWORD = 'e2e-secreto-123';
const uniqueEmail = (tag: string) =>
  `t04-${tag}-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}@e2e.local`;

async function signup(page: import('@playwright/test').Page, email: string): Promise<void> {
  await page.goto('/signup');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(PASSWORD);
  await page.getByRole('button', { name: /crear cuenta/i }).click();
}

test.describe('auth', { tag: ['@f0'] }, () => {
  test('signup deja sesión iniciada y la cookie sobrevive a un refresh', async ({ page }) => {
    const email = uniqueEmail('signup');
    await signup(page, email);

    // Redirige a `/` con la sesión iniciada, y `/` rebota a `/analyze` (F5/T5.1: la superficie
    // de análisis vive ahí ahora). El header muestra el email + «Salir».
    await expect(page).toHaveURL('/analyze');
    await expect(page.getByRole('button', { name: /salir/i })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    // La cookie httpOnly de sesión existe.
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'devtools_session' && c.httpOnly)).toBe(true);

    // SOBREVIVE A UN REFRESH: tras recargar, sigue logueado.
    await page.reload();
    await expect(page.getByRole('button', { name: /salir/i })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  test('logout invalida la sesión: vuelve «Entrar» y /history redirige a /login', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('logout'));
    await expect(page.getByRole('button', { name: /salir/i })).toBeVisible();

    await page.getByRole('button', { name: /salir/i }).click();
    // El header vuelve a mostrar «Entrar».
    await expect(page.getByRole('link', { name: /^entrar$/i })).toBeVisible();

    // Sin sesión, /history redirige a /login.
    await page.goto('/history');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login tras signup vuelve a iniciar sesión', async ({ page }) => {
    const email = uniqueEmail('login');
    await signup(page, email);
    await page.getByRole('button', { name: /salir/i }).click();
    await expect(page.getByRole('link', { name: /^entrar$/i })).toBeVisible();

    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(PASSWORD);
    await page.getByRole('button', { name: /^entrar$/i }).click();

    // Login redirige a `/`, que rebota a `/analyze` (F5/T5.1).
    await expect(page).toHaveURL('/analyze');
    await expect(page.getByRole('button', { name: /salir/i })).toBeVisible();
  });

  test('GUARDIÁN D6: `/` sin sesión responde 200 y es usable; /history redirige', async ({
    page,
  }) => {
    // `/` pública: 200 y con el campo utilizable.
    const resp = await page.goto('/');
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /pega algo/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^entrar$/i })).toBeVisible();

    // `/history` sin sesión → redirect a /login.
    await page.goto('/history');
    await expect(page).toHaveURL(/\/login/);
  });
});
