import { expect, test } from '@playwright/test';

// E2E de FASE F2 (planning T2.3) — el recorrido sagrado de la fase: CU6 «el regreso» de una
// sola tirada contra el sistema real levantado (Next en build de producción + Postgres real
// del stack E2E), más el guardián de D6. Tags `@f2 @phase` (e2e.md §10): `@f2` lo mete en la
// no-regresión de la fase; `@phase` lo marca como EL e2e de fase.
//
// RECORRIDO (CU6 completo, en el orden en que lo vive una persona):
//   0. sin cuenta: `/` es plenamente funcional y `/history` redirige a login  → D6 + 14.8 (½)
//   1. signup
//   2. analizar DOS entradas (un JWT y un timestamp)
//   3. `/history`: las dos entradas están, con la vista previa REDACTADA        → 14.8 (½)
//   4. reabrir: vuelve la CADENA, no el DATO, y la UI lo dice                   → D7
//   5. borrar: la entrada desaparece
//
// POR QUÉ NO ES UN DUPLICADO DE `e2e/history.spec.ts` (T2.2): aquel spec cubre cada pieza del
// historial por separado, cada test con su propia cuenta recién creada y su propio contexto
// (aparece / reabrir / borrar una / borrar todas / sin sesión / aislamiento). Este recorre CU6
// ENTERO como una sola sesión con estado acumulado — una única cuenta que nace en signup,
// analiza, se reencuentra con lo suyo en `/history`, lo reabre y lo borra. Eso es lo que
// ninguna spec individual hace: probar que las piezas encajan entre sí EN SECUENCIA. Y añade
// dos cosas que `history.spec.ts` NO tiene:
//   - el guardián de D6 ejecutado ANTES de existir la cuenta (contexto anónimo limpio, con un
//     análisis real sin sesión, no solo el redirect de `/history`);
//   - el control de fuga sobre los VALORES YA DECODIFICADOS del JWT (ver bloque 🔴 abajo).
//
// FORMA: un solo `test()` con `test.step()` por beat, como f0.spec.ts y NO como f1.spec.ts.
// f1 son 5 casos de uso INDEPENDIENTES (cada uno parte de `/` en frío); esto es un journey con
// estado (una cuenta que analiza, revisa su historial y lo borra) y el fixture `page` se
// resetea entre tests: partirlo perdería la sesión —y las entradas de historial acumuladas—
// entre beats, que es justo lo que el recorrido debe demostrar. Los `test.step` dejan además
// cada beat nombrado en el reporte y en el trace.
//
// LO QUE ESTE SPEC **NO** HACE (es del verifier, no de aquí): el `psql` literal sobre la fila y
// el `grep` sobre los logs de la web que pide el criterio 14.9. La BD del stack E2E es un
// testcontainer efímero que muere al acabar la suite, y los specs corren en OTRO proceso que el
// servidor web (no ven su stdout). La contribución de este recorrido a 14.9 es que EJERCITA un
// análisis con sesión sobre un input conocido —hay, por tanto, algo que podría haberse
// filtrado— y deja documentados abajo los literales exactos que hay que grepear.
//
// 🔴 POR QUÉ EL `psql` DEL VERIFIER **NO ES REDUNDANTE** CON ESTE SPEC (medido, no supuesto):
// `GET /api/history` valida su SALIDA con `HistoryPageSchema.parse(...)`, y Zod descarta las
// claves desconocidas. Eso es una segunda línea de defensa excelente — pero implica que una
// fuga introducida ANTES de esa frontera (p. ej. `summarizeChain()` emitiendo `step.output`
// en la FILA) se persiste en Postgres y aun así queda INVISIBLE tanto para el HTML como para
// `/api/history`. Comprobado con dos controles negativos en esta tarea: rompiendo solo
// `summarizeChain` el recorrido sigue en VERDE; rompiendo además el contrato (para cruzar la
// frontera) se pone rojo. Conclusión operativa: el `psql` literal sobre la fila que pide el
// criterio 14.8 es la ÚNICA observación de esa clase de fuga. No se puede sustituir por este
// spec, y esa cláusula de la Verificación no debe darse por cubierta aquí.

// JWT de PRUEBA (ejemplo trabajado del PRD §6.5; el mismo que f1.spec.ts y history.spec.ts).
// NO es un secreto: firmado con una clave desconocida. test-token-not-a-secret.
const TEST_JWT =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc1MjUzNzYwMCwiZXhwIjoxNzUyNjI0MDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// 🔴 LOS LITERALES DE FUGA DEL CRITERIO 14.8 / D7 — y la trampa que los rodea.
//
// El header del JWT (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`) **SÍ debe aparecer** en la vista
// previa: `redactInput()` lo conserva POR DISEÑO y sustituye payload y firma por `…`. Por eso
// un `grep` de `eyJ` a secas —sobre el HTML, sobre la fila o sobre los logs— da un FAIL
// espurio, y por eso aquí el header se afirma EN POSITIVO (abajo) en vez de prohibirse.
//
// Las fugas de verdad son tres familias, y solo la primera se ve grepeando base64:
//   (a) el token completo o su segmento de PAYLOAD codificado;
//   (b) la FIRMA;
//   (c) 🔴 los valores YA DECODIFICADOS (`1752624000`, `"sub"`, `carlos`). Por ahí se colaría
//       un bug de «persistir `steps[i].input`/`steps[i].output`»: la cadena decodificada NO se
//       parece al base64 original, así que un grep de (a) no la vería jamás. Este es el hueco
//       que el recorrido de fase cierra y que `history.spec.ts` no cubre.
//
// ⚠️ Y una segunda trampa, cazada con el control negativo de esta misma tarea: los literales
// de fuga tienen que ser **CORTOS**. `preview` se trunca a 120 caracteres, y el JWT de prueba
// mide 170: con la redacción DESACTIVADA a propósito, la fila guardaba medio payload en claro
// y un `not.toContain(<segmento de payload COMPLETO>)` seguía pasando en verde, porque el
// truncado había partido el literal buscado. Por eso cada familia se busca por un PREFIJO
// distintivo que sobrevive al truncado, no por el segmento entero.
const LEAK_PAYLOAD_SEGMENT =
  'eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc1MjUzNzYwMCwiZXhwIjoxNzUyNjI0MDAwfQ';
/** Prefijo del payload: 12 chars, cabe de sobra dentro de los 120 del truncado. */
const LEAK_PAYLOAD_PREFIX = 'eyJzdWIiOiIx';
const LEAK_SIGNATURE_SEGMENT = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
/** Prefijo de la firma, por el mismo motivo. */
const LEAK_SIGNATURE_PREFIX = 'SflKxwRJ';
const LEAK_DECODED_EXP = '1752624000';
const LEAK_DECODED_IAT = '1752537600';
const LEAK_DECODED_NAME = 'carlos';
// NOTA (medida, no supuesta): NO se busca `"sub"` con comillas. En el HTML las comillas salen
// escapadas como `&quot;`, así que ese literal jamás casaría y el assert sería DECORATIVO —
// verde para siempre, incluso con la fuga delante. Los tres valores de arriba (`exp`, `iat`,
// `name`) sí aparecen tal cual y cubren la familia de los decodificados.

/** El header del JWT: lo ÚNICO del token que la redacción conserva (assert en positivo). */
const KEPT_JWT_HEADER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

/** Todos los literales que NO pueden aparecer ni en el HTML de `/history` ni en `/api/history`. */
const LEAKS = [
  TEST_JWT.replace(/^Bearer\s+/, ''),
  LEAK_PAYLOAD_SEGMENT,
  LEAK_PAYLOAD_PREFIX,
  LEAK_SIGNATURE_SEGMENT,
  LEAK_SIGNATURE_PREFIX,
  LEAK_DECODED_EXP,
  LEAK_DECODED_IAT,
  LEAK_DECODED_NAME,
];

// SEGUNDA ENTRADA — deliberadamente **NO** `1752624000`. Ese número es el `exp` decodificado
// del JWT: si la segunda entrada fuera ese timestamp, su vista previa lo contendría de forma
// legítima y el número dejaría de ser una señal limpia de fuga (el `psql`/`grep` del verifier
// daría un falso positivo). `1700000000` no aparece en ninguna parte del JWT.
const SECOND_INPUT = '1700000000';
const JWT_MARKER = 'jwt.decode';
const SECOND_MARKER = 'timestamp.to_iso';

const PASSWORD = 'f2-fase-secreto-123';

// Email único por ejecución: la BD del stack es compartida por toda la suite y `signup`
// rechaza duplicados. `t23-` identifica de quién es la cuenta si hay que mirar la BD.
const uniqueEmail = () =>
  `t23-fase-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}@e2e.local`;

test.describe('@f2 @phase F2 — CU6 el regreso: sin cuenta → signup → analizar dos → /history → reabrir → borrar', () => {
  // El rate limit de signup es POR IP y `clientIp()` devuelve una clave ÚNICA compartida
  // cuando no llega ningún header de proxy ⇒ TODA la suite compartiría un bucket (10 altas /
  // 15 min) y el recorrido de fase se volvería flaky por culpa de specs vecinos. Con una IP
  // propia —distinta de la `203.0.113.5` que ya usa f0.spec.ts— este recorrido tiene su propio
  // bucket. NO se rebaja ningún límite del producto: se manda una cabecera que cualquier
  // cliente real manda igual.
  test.use({
    extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.23' },
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  test('el regreso funciona entero: `/` sigue siendo de todos, y lo que analizo con cuenta vuelve redactado, se reabre y se borra', async ({
    page,
  }) => {
    const email = uniqueEmail();

    /** Pega de verdad en el campo de `/analyze` para disparar el análisis (y su registro). La
     *  espera va por CONDICIÓN OBSERVABLE (la cadena desplegada), nunca por timeout fijo.
     *  F5/T5.2: el campo vive en `/analyze` (`/` es la landing y ya no redirige aquí). */
    const analyze = async (text: string, marker: string): Promise<void> => {
      await page.goto('/analyze');
      await page.evaluate((t) => navigator.clipboard.writeText(t), text);
      await page.getByRole('textbox', { name: /pega algo para analizar/i }).focus();
      await page.keyboard.press('ControlOrMeta+v');
      await expect(page.getByText(marker)).toBeVisible();
    };

    const rows = page.locator('[data-slot="history-row"]');

    await test.step('🔴 D6 / criterio 14.8 (sin sesión): `/` es plenamente funcional sin cuenta y `/history` redirige a login', async () => {
      // Este beat corre ANTES del signup: el contexto está limpio, no hay cookie de sesión
      // ninguna. Es el guardián literal de D6 — F2 no puede haber cerrado la puerta que F1
      // dejó abierta.
      // F5/T5.2: `/` es la landing (pública, usable, sin sesión); el suelo de análisis se mudó a
      // `/analyze`, donde el helper `analyze` ejercita D6 abajo. La landing responde 200 y ofrece
      // el campo para saltar al análisis.
      const home = await page.goto('/');
      expect(home?.status()).toBe(200);
      await expect(page.getByRole('heading', { name: /devtools/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /pega algo para analizar/i })).toBeVisible();
      // Y el header confirma que se está ANÓNIMO (si hubiera sesión, aquí saldría «Salir»).
      await expect(page.getByRole('link', { name: /^entrar$/i })).toBeVisible();

      // «Plenamente funcional» no es que la página cargue: es que ANALIZA. Un análisis real,
      // sin cuenta, con la cadena desplegada en `/analyze`. `/api/analyze` es pública (D6).
      await analyze(TEST_JWT, JWT_MARKER);

      // Y la puerta que sí está cerrada: `/history` sin sesión manda a login, con el `next`
      // de vuelta para no perder el destino.
      await page.goto('/history');
      await expect(page).toHaveURL(/\/login\?next=%2Fhistory$/);
    });

    await test.step('signup: el alta crea la cuenta y deja la sesión iniciada', async () => {
      await page.goto('/signup');
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/contraseña/i).fill(PASSWORD);
      await page.getByRole('button', { name: /crear cuenta/i }).click();

      // Redirige directo a `/analyze` (F5/T5.2).
      await expect(page).toHaveURL('/analyze');
      await expect(page.getByText(email)).toBeVisible();
      await expect(page.getByRole('button', { name: /salir/i })).toBeVisible();
    });

    await test.step('el historial de la cuenta recién creada arranca VACÍO', async () => {
      // Punto de partida explícito: sin esto, el «hay 2 entradas» del beat siguiente no
      // probaría que las escribió ESTE recorrido (la BD del stack la comparte toda la suite),
      // y de paso demuestra que el análisis ANÓNIMO del primer beat NO se registró en ningún
      // sitio que esta cuenta pueda ver.
      await page.goto('/history');
      await expect(rows).toHaveCount(0);
      await expect(page.locator('[data-slot="empty-state"]')).toBeVisible();
    });

    await test.step('analizar DOS entradas con la sesión iniciada', async () => {
      await analyze(TEST_JWT, JWT_MARKER);
      await analyze(SECOND_INPUT, SECOND_MARKER);
    });

    await test.step('🔴 criterio 14.8 (con sesión): las dos entradas están en `/history`, con la vista previa REDACTADA', async () => {
      await page.goto('/history');
      await expect(rows).toHaveCount(2);

      // Están LAS DOS y son las que se analizaron: el kind de cada una se ve en su fila (la
      // más reciente primero).
      await expect(rows.first()).toContainText(/timestamp/i);
      await expect(rows.last()).toContainText(/jwt/i);

      // 🔴 EL ASSERT MÁS DURO DE 14.8: la vista previa de la fila del JWT es EXACTAMENTE la
      // forma redactada — header intacto, payload y firma reducidos a `…`. Es un assert de
      // igualdad, no de contención: cualquier byte del dato que se colara (aunque el truncado
      // a 120 chars lo partiera por la mitad) cambia este texto y pone el test rojo. Los
      // `not.toContain` de abajo complementan, pero es ESTE el que no admite escapatoria.
      await expect(rows.last().locator('code')).toHaveText(`Bearer ${KEPT_JWT_HEADER}.….…`);

      // La REDACCIÓN, afirmada por los dos lados sobre el HTML COMPLETO (no solo el texto
      // visible: un dato escondido en un atributo o en un nodo oculto seguiría siendo una
      // filtración):
      const html = await page.content();
      //  (+) lo que la redacción CONSERVA por diseño — el header del JWT. Sin este assert en
      //      positivo, un producto que no guardara NADA pasaría los asserts negativos de
      //      abajo sin haber redactado nada, y «no hay historial» se confundiría con «hay
      //      historial redactado».
      expect(html).toContain(KEPT_JWT_HEADER);
      expect(html).toContain('…');
      //  (−) y lo que NO puede estar: token, payload, firma y —la familia que un grep de
      //      base64 nunca vería— los valores YA DECODIFICADOS.
      for (const leak of LEAKS) {
        expect(html, `el HTML de /history no puede contener «${leak}»`).not.toContain(leak);
      }

      // El mismo control sobre la RESPUESTA DE LA API, pedida desde el navegador con la cookie
      // de la sesión: es la proyección más cercana a la FILA que un E2E puede observar (el
      // `psql` literal del criterio es del verifier). Si la fila llevara `steps[i].input`, un
      // campo nuevo aparecería aquí aunque la UI no lo pintase.
      const body = await page.evaluate(async () => {
        const res = await fetch('/api/history', { credentials: 'include' });
        return JSON.stringify(await res.json());
      });
      expect(body).toContain(KEPT_JWT_HEADER);
      for (const leak of LEAKS) {
        expect(body, `la respuesta de /api/history no puede contener «${leak}»`).not.toContain(
          leak,
        );
      }
    });

    await test.step('🔴 D7: REABRIR restaura la CADENA, no el DATO — y la UI lo dice', async () => {
      // El aviso de D7 está CLICK-GATED: antes de reabrir, el diálogo no existe en el DOM. Sin
      // este assert previo, el beat pasaría por un texto ya presente en la página sin haber
      // reabierto nunca, y no protegería nada.
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await rows
        .last()
        .getByRole('button', { name: /reabrir/i })
        .click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      // La CADENA sí vuelve: los pasos aplicados aparecen dentro del diálogo.
      await expect(dialog).toContainText(JWT_MARKER);
      // El DATO no, y el aviso lo dice con todas las letras.
      await expect(dialog).toContainText(/no se restaura/i);
      await expect(dialog).toContainText(/vuelve a pegarlo/i);

      // Reabrir es el momento de máximo riesgo de fuga (es lo que «trae de vuelta» la entrada):
      // se repite el control completo sobre el HTML con el diálogo ABIERTO.
      const html = await page.content();
      for (const leak of LEAKS) {
        expect(html, `el diálogo de reabrir no puede contener «${leak}»`).not.toContain(leak);
      }
    });

    await test.step('borrar: la entrada se va con confirmación, y se va LA QUE SE PIDIÓ', async () => {
      // Se cierra el diálogo de reabrir para volver a la lista (si no, el `getByRole('dialog')`
      // del borrado casaría con el que ya está abierto).
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      const survivorPreview = await rows.first().locator('code').textContent();

      // El botón DE LA FILA (nombre accesible exacto «Borrar»), no el «Borrar todo» de la
      // cabecera: un `/borrar/i` sin anclar casaría con los dos.
      await rows
        .last()
        .getByRole('button', { name: /^borrar$/i })
        .click();

      // Con CONFIRMACIÓN: nada se borra hasta confirmar en el diálogo.
      const confirm = page.getByRole('dialog');
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: /^borrar$/i }).click();

      await expect(rows).toHaveCount(1);
      // Y la que queda es la OTRA, no una cualquiera.
      if (survivorPreview) {
        await expect(rows.first().locator('code')).toHaveText(survivorPreview);
      }

      // El borrado es de VERDAD (en el servidor), no un ocultado en cliente: tras recargar,
      // sigue habiendo una sola entrada.
      await page.reload();
      await expect(rows).toHaveCount(1);
    });

    await test.step('🔴 D6 de cierre: `/` sigue siendo plenamente funcional también al final del recorrido', async () => {
      // El guardián del principio se repite al final con la cuenta ya viva: F2 no ha convertido
      // el campo público en una pantalla de socios.
      await page.getByRole('button', { name: /salir/i }).click();
      await expect(page.getByRole('link', { name: /^entrar$/i })).toBeVisible();
      await analyze(SECOND_INPUT, SECOND_MARKER);
    });
  });
});
