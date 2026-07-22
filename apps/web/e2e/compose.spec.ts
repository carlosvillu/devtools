import { expect, test, type Locator, type Page } from '@playwright/test';

// Playwright permanente de T6.7 — `/compose`, el constructor de cadena, y el CONMUTADOR de
// dirección, contra el sistema real levantado. Tag @f6 (no-regresión de fase, e2e.md §10).
//
// Qué protege (Entrega/Verificación de T6.7):
//   - `/compose` abre en modo componer, con el `Segmented` marcando «codificar» y pantalla limpia.
//   - Escribir el JSON del ejemplo + `json.minify` produce el `MINIFIED` del artboard EN EL
//     NAVEGADOR (el motor corre en cliente: no hay `/api/compose` que pudiera estar haciéndolo).
//   - Un segundo paso encadena sobre la salida del primero; quitar un paso recalcula los demás.
//   - La salida de cualquier paso se copia al portapapeles.
//   - 🔴 COMPONER NO DISPARA NI UNA PETICIÓN DE RED (D10/§5.3): se cuentan las peticiones con
//     `page.on('request')` durante toda la sesión de composición, no se mira la pantalla.
//   - El conmutador lleva a `/analyze` SIN RECARGAR (marcador vivo en `window`) y `/analyze`
//     SIGUE FUNCIONANDO IGUAL (guardián de no-regresión de 14.1: el JWT se abre en `jwt → json`).
//   - Recargar `/compose` da pantalla limpia (la otra mitad de la decisión de conservación:
//     conmutar conserva, recargar no).
//   - En viewport móvil no hay scroll horizontal.

// El ejemplo del artboard `ComposeClaro` (docs/mockups/compose.html). El `MINIFIED` del mockup SÍ
// es exacto y se usa como golden (el `SIGNED` NO: es decorativo — desviación acordada de F6).
const SOURCE = '{\n  "sub": "1",\n  "name": "carlos",\n  "role": "admin"\n}';
const MINIFIED = '{"sub":"1","name":"carlos","role":"admin"}';
// base64url (sin padding) de MINIFIED — calculado por el motor, fijado aquí como golden de que
// el segundo paso encadena sobre la SALIDA del primero y no sobre la fuente.
const MINIFIED_B64URL = 'eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiJ9';
// base64url de la FUENTE sin minificar: el control que distingue «encadenó» de «volvió a partir
// de la entrada». Si el segundo paso leyera la fuente, la salida sería esta.
const SOURCE_B64URL = 'ewogICJzdWIiOiAiMSIsCiAgIm5hbWUiOiAiY2FybG9zIiwKICAicm9sZSI6ICJhZG1pbiIKfQ';

// El JWT de 14.1 (cabecera `Authorization` completa), el mismo literal que usan field/landing.
// NO es un secreto: firma con clave desconocida, payload {sub:1,name:carlos}.
const TEST_JWT =
  'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc1MjUzNzYwMCwiZXhwIjoxNzUyNjI0MDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const sourceField = (page: Page): Locator => page.getByRole('textbox', { name: /entrada/i });

// Añade un paso desde la paleta agrupada: abre «añadir paso» y pulsa el chip de la
// transformación. Se localiza por ROL y nombre (e2e.md §12), nunca por clase.
async function addStep(page: Page, transform: string): Promise<void> {
  await page.getByRole('button', { name: 'añadir paso' }).click();
  await page.getByRole('button', { name: transform, exact: true }).click();
}

// La salida de un paso se localiza POR SU VALOR (el texto que el usuario ve y copia), no por
// una clase ni por el contenedor: si el motor dejara de producirlo, el locator no existe.
const outputValue = (page: Page, value: string): Locator => page.getByText(value).first();

test.describe('@f6 /compose — componer: la cadena en la dirección inversa', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('abre en modo componer, con el conmutador en «codificar» y la pantalla limpia', async ({
    page,
  }) => {
    await page.goto('/compose');

    await expect(page.getByRole('heading', { name: /compón algo/i })).toBeVisible();
    // El conmutador es un tablist real y marca la dirección en curso.
    await expect(page.getByRole('tab', { name: 'codificar', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('tab', { name: 'decodificar', exact: true })).toHaveAttribute(
      'aria-selected',
      'false',
    );

    // Pantalla limpia y funcional: campo vacío, ningún paso, ninguna barra de resultado…
    await expect(sourceField(page)).toHaveValue('');
    await expect(page.getByRole('button', { name: 'añadir paso' })).toBeVisible();
    await expect(page.getByText(/listo para compartir/i)).toHaveCount(0);
    // …y SIN badge de «reconocido»: con el campo vacío el motor dice `text` (I6) y la UI lo
    // suprime a mano. Este assert es el que muerde si esa supresión se pierde.
    await expect(page.getByText(/reconocido/i)).toHaveCount(0);

    // El aviso de privacidad dice la verdad de nuestra implementación (no la del artboard).
    await expect(page.getByText(/no sale de tu navegador/i)).toBeVisible();
  });

  test('escribir el ejemplo y encadenar dos pasos compone en el navegador, SIN una sola petición de red', async ({
    page,
  }) => {
    await page.goto('/compose');
    // Se espera a que la carga termine ANTES de contar: lo que se afirma es que COMPONER no
    // pide nada, no que la página no se descargue a sí misma.
    await page.waitForLoadState('networkidle');

    const requests: { method: string; url: string; body: string | null }[] = [];
    page.on('request', (request) => {
      requests.push({ method: request.method(), url: request.url(), body: request.postData() });
    });

    await sourceField(page).fill(SOURCE);
    // El kind de la fuente se DETECTA (I10) y aparece junto a la entrada.
    await expect(page.getByText(/reconocido/i)).toBeVisible();

    await addStep(page, 'json.minify');
    await expect(outputValue(page, MINIFIED)).toBeVisible();

    // Segundo paso: encadena sobre la SALIDA del primero, no sobre la fuente.
    await addStep(page, 'base64url.encode');
    await expect(outputValue(page, MINIFIED_B64URL)).toBeVisible();
    await expect(page.getByText(SOURCE_B64URL)).toHaveCount(0);

    // La barra de resultado: 2 pasos aplicados, el kind detectado de la salida y el valor final.
    await expect(page.getByText(/·\s*2 pasos\s*·/)).toBeVisible();
    await expect(page.getByText(/listo para compartir/i)).toBeVisible();

    // 🔴 EL CONTROL QUE PRUEBA D10: la composición no genera NI UNA petición de la aplicación.
    //
    // Se descuenta UNA sola clase de tráfico, y se dice por qué: el App Router PREFETCHEA las
    // rutas de la cabecera (`/`, `/analyze`, `/history`, `/login`) con peticiones RSC `?_rsc=`
    // en cuanto el navegador queda ocioso — a veces después del `networkidle`, que es lo que hizo
    // FLAKY la primera versión de este assert. Son GET del framework por una ruta ya conocida:
    // sin cuerpo y sin un solo byte de lo que el usuario escribe (lo comprueba el bucle de
    // abajo, que es lo que de verdad afirma la promesa del `Callout`).
    const appRequests = requests.filter(
      (request) => !request.url.includes('_rsc=') && !request.url.includes('/_next/'),
    );
    expect(appRequests).toEqual([]);

    // Y ni siquiera el prefetch del framework puede llevar el dato: ninguna petición tiene
    // cuerpo, ninguna va a la API, y el texto compuesto no aparece en ninguna URL.
    for (const request of requests) {
      expect(request.body).toBeNull();
      expect(request.method).toBe('GET');
      expect(request.url).not.toContain('/api/');
      expect(request.url).not.toContain('carlos');
      expect(request.url).not.toContain(MINIFIED_B64URL);
    }
  });

  test('quitar un paso recalcula los siguientes', async ({ page }) => {
    await page.goto('/compose');
    await sourceField(page).fill(SOURCE);
    await addStep(page, 'json.minify');
    await addStep(page, 'base64url.encode');
    await expect(outputValue(page, MINIFIED_B64URL)).toBeVisible();

    // Fuera el primer paso: el segundo pasa a aplicarse sobre la FUENTE, y su salida cambia.
    await page.getByRole('button', { name: /quitar el paso 1/i }).click();

    await expect(page.getByRole('button', { name: /quitar el paso 2/i })).toHaveCount(0);
    await expect(outputValue(page, SOURCE_B64URL)).toBeVisible();
    await expect(page.getByText(MINIFIED_B64URL)).toHaveCount(0);
    await expect(page.getByText(/·\s*1 paso\s*·/)).toBeVisible();
  });

  test('la salida de un paso se copia al portapapeles', async ({ page }) => {
    await page.goto('/compose');
    await sourceField(page).fill(SOURCE);
    await addStep(page, 'json.minify');
    await expect(outputValue(page, MINIFIED)).toBeVisible();

    await page
      .getByRole('button', { name: /^copiar$/i })
      .first()
      .click();

    await expect
      .poll(async () => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(MINIFIED);
  });

  test('un paso imposible se explica y NO ofrece resultado copiable', async ({ page }) => {
    await page.goto('/compose');
    await sourceField(page).fill('esto no es json');
    await addStep(page, 'json.minify');

    // El mensaje viene del motor (I9: el fallo es dato, no excepción) y la pantalla sobrevive.
    // Se filtra por texto: el App Router monta su propio `role="alert"` (route announcer) vacío.
    await expect(page.getByRole('alert').filter({ hasText: /json/i })).toBeVisible();
    // 🔴 La barra de resultado NO aparece: con `terminal: 'error'` el `output` del contrato es el
    // parcial del último paso correcto, y ofrecerlo sería dar por bueno un resultado incompleto.
    await expect(page.getByText(/listo para compartir/i)).toHaveCount(0);
  });

  test('recargar `/compose` da pantalla limpia (conmutar conserva; recargar, no)', async ({
    page,
  }) => {
    await page.goto('/compose');
    await sourceField(page).fill(SOURCE);
    await addStep(page, 'json.minify');
    await expect(outputValue(page, MINIFIED)).toBeVisible();

    await page.reload();

    await expect(sourceField(page)).toHaveValue('');
    await expect(page.getByText(/listo para compartir/i)).toHaveCount(0);
  });

  test('en viewport móvil no hay scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/compose');
    await sourceField(page).fill(SOURCE);
    await addStep(page, 'json.minify');
    await expect(outputValue(page, MINIFIED)).toBeVisible();
    // La paleta abierta es lo más ancho de la pantalla: se comprueba también con ella desplegada.
    await page.getByRole('button', { name: 'añadir paso' }).click();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('@f6 el conmutador de dirección: /compose ⇄ /analyze', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('«decodificar» lleva a /analyze SIN RECARGAR y el recorrido de 14.1 sigue intacto', async ({
    page,
  }) => {
    await page.goto('/compose');
    await sourceField(page).fill(SOURCE);

    // Marcador VIVO en la ventana: si hubiera recarga de página, se perdería. Es la forma
    // observable de afirmar «cambia la URL sin recargar» (Entrega T6.7).
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__t67NoReload = 'vivo';
    });

    await page.getByRole('tab', { name: 'decodificar', exact: true }).click();

    await expect(page).toHaveURL('/analyze');
    expect(
      await page.evaluate(
        () => (window as unknown as Record<string, unknown>).__t67NoReload ?? null,
      ),
    ).toBe('vivo');

    // 🔴 GUARDIÁN DE NO-REGRESIÓN: `/analyze` sigue siendo la pantalla de siempre — se pega el
    // JWT de 14.1 y la cadena lo abre hasta el JSON.
    await page.getByRole('textbox', { name: /pega algo para analizar/i }).fill(TEST_JWT);
    await expect(page.getByText('jwt.decode')).toBeVisible();
    await expect(page.getByText('json.format')).toBeVisible();
    // Y el input NUNCA toca la URL (§11), tampoco al llegar por el conmutador.
    const url = new URL(page.url());
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  });

  test('🔴 recargar `/analyze` NO restaura lo escrito: su comportamiento no cambia con F6', async ({
    page,
  }) => {
    // El espejo del test de recarga de `/compose`, y el que protege la regla dura de T6.7:
    // `/analyze` sigue siendo la experiencia de hoy salvo por el conmutador. Escribir aquí SÍ
    // guarda borrador (para el conmutador), así que si `takeSwitchedDraft` ignorara el flag de
    // un solo uso, esta recarga devolvería el JWT y el usuario vería su dato resucitar solo.
    await page.goto('/analyze');
    const field = page.getByRole('textbox', { name: /pega algo para analizar/i });
    await field.fill(TEST_JWT);
    await expect(page.getByText('jwt.decode')).toBeVisible(); // control positivo: se escribió

    await page.reload();

    await expect(field).toHaveValue('');
    await expect(page.getByText('jwt.decode')).toHaveCount(0);
  });

  test('🔴 conmutar no tira lo PEGADO DESDE LA PORTADA (la vía de entrada real de /analyze)', async ({
    page,
  }) => {
    // Este test NO usa `fill()` sobre `/analyze` a propósito. `fill` dispara el `onChange` del
    // campo, y una versión anterior guardaba el borrador SOLO ahí: el test pasaba con el bug
    // delante mientras el camino real —pegar en la portada, que fija el input por el relevo de
    // `pending-input` sin pasar por `onChange`— perdía el dato al conmutar. Se ejercita ese
    // camino: `/` → pegado real → `/analyze` → conmutar → volver.
    await page.goto('/');
    await page.evaluate((t) => navigator.clipboard.writeText(t), TEST_JWT);
    await page.getByRole('textbox', { name: /pega algo para analizar/i }).focus();
    await page.keyboard.press('ControlOrMeta+v');

    await expect(page).toHaveURL('/analyze');
    await expect(page.getByText('jwt.decode')).toBeVisible(); // control positivo: el relevo llegó

    // A componer, se escribe algo, y de vuelta: lo pegado desde la portada SIGUE AHÍ.
    await page.getByRole('tab', { name: 'codificar', exact: true }).click();
    await expect(page).toHaveURL('/compose');
    await sourceField(page).fill(SOURCE);
    await addStep(page, 'json.minify');

    await page.getByRole('tab', { name: 'decodificar', exact: true }).click();
    await expect(page).toHaveURL('/analyze');
    await expect(page.getByRole('textbox', { name: /pega algo para analizar/i })).toHaveValue(
      TEST_JWT,
    );
    await expect(page.getByText('jwt.decode')).toBeVisible();

    // Y la receta de componer también sobrevive al viaje de vuelta.
    await page.getByRole('tab', { name: 'codificar', exact: true }).click();
    await expect(page).toHaveURL('/compose');
    await expect(sourceField(page)).toHaveValue(SOURCE);
    await expect(outputValue(page, MINIFIED)).toBeVisible();
  });

  test('🔴 un borrador viejo NO resucita encima de un dato nuevo pegado desde la portada', async ({
    page,
  }) => {
    // La otra cara del mismo bug, y la peor: si el borrador solo se guardara al teclear, el
    // relevo de la portada dejaría intacto el borrador anterior y al conmutar volvería EL VIEJO,
    // presentado como si fuera lo que el usuario acaba de pegar.
    const OLD = 'VIEJO-AAA-esto-ya-lo-habia-sustituido';
    await page.goto('/analyze');
    await page.getByRole('textbox', { name: /pega algo para analizar/i }).fill(OLD);

    // Dato NUEVO por el camino real (portada → pegado → relevo).
    await page.goto('/');
    await page.evaluate((t) => navigator.clipboard.writeText(t), TEST_JWT);
    await page.getByRole('textbox', { name: /pega algo para analizar/i }).focus();
    await page.keyboard.press('ControlOrMeta+v');
    await expect(page).toHaveURL('/analyze');
    await expect(page.getByText('jwt.decode')).toBeVisible();

    // Ida y vuelta con el conmutador: vuelve el dato NUEVO, y del viejo no queda rastro.
    await page.getByRole('tab', { name: 'codificar', exact: true }).click();
    await expect(page).toHaveURL('/compose');
    await page.getByRole('tab', { name: 'decodificar', exact: true }).click();
    await expect(page).toHaveURL('/analyze');

    await expect(page.getByRole('textbox', { name: /pega algo para analizar/i })).toHaveValue(
      TEST_JWT,
    );
    await expect(page.getByText(OLD)).toHaveCount(0);
  });

  test('la paleta lleva el foco consigo: al abrirla enfoca el primer chip; al cerrarla, «añadir paso»', async ({
    page,
  }) => {
    await page.goto('/compose');
    await page.getByRole('button', { name: 'añadir paso' }).click();
    // Sin gestión de foco, el disparador se desmonta y el foco cae a `<body>`.
    await expect(page.getByRole('button', { name: 'json.minify', exact: true })).toBeFocused();

    await page.getByRole('button', { name: /cerrar la paleta/i }).click();
    await expect(page.getByRole('button', { name: 'añadir paso' })).toBeFocused();
  });
});
