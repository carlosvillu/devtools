import { expect, test } from '@playwright/test';

// E2E de FASE F0 (planning T0.5) — el recorrido sagrado del SUELO: arranque con BD real →
// signup → login → refresh → logout, de una sola tirada sobre el sistema real levantado
// (Next en build de producción + Postgres real del stack E2E). Tags `@f0 @phase` (e2e.md
// §10): `@f0` lo mete en la no-regresión de la fase; `@phase` lo marca como EL e2e de fase.
//
// POR QUÉ NO ES UN DUPLICADO DE `e2e/auth.spec.ts`: aquel spec cubre cada pieza de auth por
// separado, cada test con su propia cuenta recién creada y su propio contexto. Este recorre
// el suelo ENTERO como una sola sesión con estado acumulado — una única cuenta que nace en
// signup, se recupera por el formulario de `/login` y sobrevive a un refresh antes de morir
// en el logout. Eso es lo que ninguna spec individual hace: probar que las piezas encajan
// entre sí en secuencia. En particular, `auth.spec.ts` refresca DESPUÉS DE SIGNUP; aquí el
// refresh es DESPUÉS DE LOGIN (otra cookie, otra fila de `session`), y son complementarios.
//
// FORMA: un solo `test()` con `test.step()` por beat, no varios `test()` como f1.spec.ts.
// f1 son 5 casos de uso INDEPENDIENTES (cada uno parte de `/` en frío); esto es un journey
// con estado, y el fixture `page` se resetea entre tests — partirlo perdería la sesión entre
// beats, que es justo lo que el recorrido debe demostrar. Los `test.step` dejan además cada
// beat nombrado en el reporte y en el trace.
//
// La cláusula «`/api/health` devuelve `{ok:true, db:true}`» de la Verificación se conserva
// EN SU MISMA CAPA (HTTP contra el server levantado, no llamando al handler en proceso), y
// el `db:true` es la prueba observable de que el arranque encontró la BD real migrada.

const PASSWORD = 'f0-fase-secreto-123';

// Email único por ejecución: la BD del stack es compartida por toda la suite y `signup`
// rechaza duplicados. `t05-` identifica de quién es la cuenta si hay que mirar la BD.
const uniqueEmail = () =>
  `t05-fase-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}@e2e.local`;

test.describe('@f0 @phase F0 — recorrido del suelo: arranque con BD real → signup → login → refresh → logout', () => {
  // El rate limit de signup es POR IP y `clientIp()` devuelve la cadena literal `'unknown'`
  // cuando no hay `x-forwarded-for` ⇒ TODA la suite compartiría un único bucket (10 altas /
  // 15 min) y el recorrido de fase se volvería flaky por culpa de specs vecinos. Con una IP
  // propia el recorrido tiene su propio bucket. NO se rebaja ningún límite del producto: se
  // manda una cabecera que cualquier cliente real manda igual.
  test.use({ extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.5' } });

  test('el suelo de F0 se sostiene entero: BD viva, alta, sesión recuperable, persistente y revocable', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail();

    await test.step('arranque con BD real: /api/health responde {ok:true, db:true}', async () => {
      // Contra el servidor levantado por HTTP (la capa que nombra la Verificación). `db:true`
      // solo puede salir de una conexión efectiva a Postgres: `checkDbConnection()` traga los
      // fallos y devolvería `db:false` con 200 si la BD no estuviera.
      const res = await request.get('/api/health');
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ ok: true, db: true });
    });

    await test.step('signup: el alta crea la cuenta y deja la sesión iniciada', async () => {
      await page.goto('/signup');
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/contraseña/i).fill(PASSWORD);
      await page.getByRole('button', { name: /crear cuenta/i }).click();

      // Redirige a `/` ya logueado: el header muestra el email de la cuenta y «Salir».
      await expect(page).toHaveURL('/');
      await expect(page.getByText(email)).toBeVisible();
      await expect(page.getByRole('button', { name: /salir/i })).toBeVisible();
    });

    await test.step('cierre intermedio: se sale para poder demostrar el login por formulario', async () => {
      // Deliberado: el alta ya deja sesión, así que la ÚNICA forma de que el siguiente beat
      // ejercite `/login` de verdad (y no un header ya logueado) es salir primero. Este
      // logout no es el del final del recorrido; el que prueba la revocación es aquél.
      await page.getByRole('button', { name: /salir/i }).click();
      await expect(page.getByRole('link', { name: /^entrar$/i })).toBeVisible();
    });

    await test.step('login: las credenciales del alta recuperan la sesión', async () => {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/contraseña/i).fill(PASSWORD);
      await page.getByRole('button', { name: /^entrar$/i }).click();

      await expect(page).toHaveURL('/');
      await expect(page.getByText(email)).toBeVisible();

      // La cookie de sesión es httpOnly (no accesible desde JS de la página).
      const cookies = await page.context().cookies();
      expect(cookies.some((c) => c.name === 'devtools_session' && c.httpOnly)).toBe(true);
    });

    let sessionCookie: { name: string; value: string; domain: string; path: string } | undefined;

    await test.step('refresh: la sesión del login sobrevive a recargar la página', async () => {
      await page.reload();
      await expect(page.getByText(email)).toBeVisible();
      await expect(page.getByRole('button', { name: /salir/i })).toBeVisible();

      // Se guarda el valor de la cookie VIVA para el beat siguiente: es la única forma de
      // observar desde el navegador si el logout revoca la sesión en la BD o solo borra la
      // cookie (el middleware únicamente mira que la cookie esté presente).
      const c = (await page.context().cookies()).find((x) => x.name === 'devtools_session');
      if (!c) throw new Error('no hay cookie `devtools_session` tras el refresh');
      sessionCookie = { name: c.name, value: c.value, domain: c.domain, path: c.path };
    });

    await test.step('logout: la sesión queda revocada en el SERVIDOR, no solo en la UI', async () => {
      await page.getByRole('button', { name: /salir/i }).click();
      await expect(page.getByRole('link', { name: /^entrar$/i })).toBeVisible();

      // La ruta protegida por el middleware vuelve a rechazar. `/history` la construye F2,
      // así que se afirma el REDIRECT a `/login` (con el `next` de vuelta), no el contenido.
      await page.goto('/history');
      await expect(page).toHaveURL(/\/login\?next=%2Fhistory$/);

      // Y la prueba de que la sesión murió EN EL SERVIDOR y no solo en el navegador: se
      // REINYECTA la cookie revocada (un atacante que la hubiera copiado haría exactamente
      // esto) y `/` la valida contra la tabla `session` al renderizar el header. Si el
      // logout solo hubiera limpiado la cookie sin borrar la fila, aquí volvería a salir el
      // email; con la fila borrada, el header muestra «Entrar».
      if (!sessionCookie) throw new Error('el beat del refresh no capturó la cookie de sesión');
      await page.context().addCookies([{ ...sessionCookie, httpOnly: true, sameSite: 'Lax' }]);
      await page.goto('/');
      await expect(page.getByRole('link', { name: /^entrar$/i })).toBeVisible();
      await expect(page.getByText(email)).toHaveCount(0);
      await page.context().clearCookies();

      // Y `/` sigue siendo PÚBLICA tras el logout (D6): el suelo no se cierra al salir.
      const home = await page.goto('/');
      expect(home?.status()).toBe(200);
      await expect(page.getByRole('heading', { name: /pega algo/i })).toBeVisible();
    });
  });
});
