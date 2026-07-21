import { expect, test, type Locator, type Page } from '@playwright/test';
import { PENDING_INPUT_KEY } from '@/lib/pending-input';

// Playwright permanente de T5.1 — el transporte del input pendiente de la landing a `/analyze`
// por sessionStorage, contra el sistema REAL levantado (UI ↔ POST /api/analyze ↔ motor puro).
// Determinista y gratuito: sin red externa. Tag @f5 (no-regresión de fase, e2e.md §10).
//
// Qué protege (Entrega/Verificación T5.1):
//   - `/analyze` LEE y CONSUME `sessionStorage['devtools:pending-input']` al montar y lo analiza
//     como si se hubiera pegado (disparo inmediato). La clave queda BORRADA (un solo uso).
//   - Recargar `/analyze` NO re-analiza (la clave ya se consumió).
//   - Sin pending → campo vacío y funcional.
//   - 🔴 CONTROL NEGATIVO DE PRIVACIDAD (§11 del PRD): tras el flujo, el input está presente en
//     el CAMPO (prueba de que viajó y de que el canal observado lleva datos) pero JAMÁS en la
//     URL — ni query ni fragment. Un query param filtraría el input a la barra, al historial del
//     navegador, al `Referer` y a los logs de Caddy/Cloudflare: la clase de fuga que F3/F4
//     cerraron. Verificado en dev reintroduciendo la fuga (input en `?q=`) → el assert se pone
//     ROJO; con el transporte por sessionStorage → verde.

// La CABECERA ENTERA `Authorization: Bearer <JWT>`, igual que field/f1: la cadena literal de
// 14.1. NO es un secreto (firmado con clave desconocida, payload {sub:1,name:carlos}).
const TEST_JWT =
  'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc1MjUzNzYwMCwiZXhwIjoxNzUyNjI0MDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
// Prefijo del payload base64url del JWT: sobrevive intacto sin transformaciones, así que si el
// input se colara a la URL este literal casaría (patrón que SÍ apunta al dato peligroso).
const JWT_PAYLOAD_MARKER = 'eyJzdWIiOiIxIiwibmFt';

const field = (page: Page): Locator =>
  page.getByRole('textbox', { name: /pega algo para analizar/i });

test.describe('@f5 /analyze — consumo del input pendiente por sessionStorage', () => {
  test('lee y consume el pending, lo analiza, borra la clave y NUNCA lo pone en la URL', async ({
    page,
  }) => {
    // Se entra a `/analyze` limpio (sin pending): campo vacío, funcional.
    await page.goto('/analyze');
    await expect(field(page)).toHaveValue('');

    // La landing dejaría el input en sessionStorage antes de navegar; aquí lo sembramos a mano.
    await page.evaluate(
      ([key, value]) => {
        window.sessionStorage.setItem(key, value);
      },
      [PENDING_INPUT_KEY, TEST_JWT] as const,
    );

    // Montaje que consume el pending: recargar remonta el árbol y dispara el efecto de consumo.
    await page.reload();

    // Se auto-analiza (disparo inmediato, sin pulsar nada): la cadena jwt → json aparece.
    await expect(page.getByText('jwt.decode')).toBeVisible();
    await expect(page.getByText('json.format')).toBeVisible();

    // El input VIAJÓ y está presente en el campo — control positivo de que el dato fluyó de
    // verdad (sin esto, el assert negativo de la URL sería vacuo).
    await expect(field(page)).toHaveValue(TEST_JWT);

    // 🔴 Privacidad: la URL es `/analyze` LIMPIA — sin query ni fragment, y sin rastro del token.
    const url = new URL(page.url());
    expect(url.pathname).toBe('/analyze');
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
    expect(page.url()).not.toContain(JWT_PAYLOAD_MARKER);
    expect(page.url()).not.toContain('Bearer');

    // La clave se CONSUMIÓ: ya no existe en sessionStorage.
    const afterConsume = await page.evaluate(
      (key) => window.sessionStorage.getItem(key),
      PENDING_INPUT_KEY,
    );
    expect(afterConsume).toBeNull();

    // Recargar NO re-analiza: la clave ya no está, así que el campo arranca vacío y sin cadena.
    await page.reload();
    await expect(field(page)).toHaveValue('');
    await expect(page.getByText('jwt.decode')).toHaveCount(0);
  });
});
