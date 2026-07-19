// T2.1 — registro de historial redactado desde `POST /api/analyze`, handler-level contra
// Postgres real (testing/api.md §2). Conserva la Verificación del planning:
//   - con sesión, analizar el JWT de §6.5 crea UNA fila cuyo `preview` no contiene el
//     token completo ni el payload, y cuyo `chain` no contiene ningún valor;
//   - control negativo LITERAL (criterio 14.8): el dump de la fila REAL leída de la BD no
//     contiene ni el token codificado ni el payload YA DECODIFICADO;
//   - sin sesión, la misma llamada NO crea ninguna fila (control negativo de D6).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, makeUser, type TestDatabase } from '@app/test-utils';
import { createDb, createUser, historyEntry, listHistoryEntriesByUser, type Db } from '@app/db';
import { PREVIEW_MAX_CHARS } from '@app/core/history';
import type { Chain } from '@app/core/engine';
import { setDbForTests } from '@/server/db';
import { createUserSession } from '@/server/session';
import { SESSION_COOKIE } from '@/server/session-cookie';
import { makeSlidingWindowRateLimiter, setAnalyzeRateLimiterForTests } from '@/server/rate-limit';
import { POST as analyzeRoute } from '@/app/api/analyze/route';
import { callRoute } from '../../helpers/call-route';

// El ejemplo trabajado del PRD §6.5 — el input literal de la Verificación.
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc';
const INPUT = `Bearer ${JWT}`;
const JWT_PAYLOAD_SEGMENT = 'eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ';
const JWT_SIGNATURE_SEGMENT = 'abc';

/** Fragmentos que NO pueden aparecer en la fila persistida. Incluye a propósito los
 *  valores YA DECODIFICADOS: si un bug guardara `steps[1].input` (el payload en claro),
 *  grepear solo el token codificado no lo cazaría — el base64 no se parece al JSON. */
const FORBIDDEN_FRAGMENTS = [
  JWT, // el token completo
  JWT_PAYLOAD_SEGMENT, // el payload codificado
  '1752624000', // el `exp` decodificado (steps[1].input)
  '"sub"', // el claim decodificado
];

let ctx: TestDatabase;
beforeAll(async () => {
  ctx = await createTestDatabase({ label: 'web-analyze-history' });
  setDbForTests(ctx.db);
});
afterAll(async () => {
  setDbForTests(undefined);
  await ctx.close();
});

beforeEach(() => {
  setDbForTests(ctx.db);
  // Umbral alto: el rate limit de `/api/analyze` no es lo que se prueba aquí.
  setAnalyzeRateLimiterForTests(makeSlidingWindowRateLimiter({ limit: 1000, windowMs: 60_000 }));
});
afterEach(() => {
  setAnalyzeRateLimiterForTests(undefined);
});

async function signedInUser(): Promise<{ userId: string; cookie: string }> {
  const user = await createUser(ctx.db, makeUser());
  const { session } = await createUserSession(ctx.db, user.id);
  return { userId: user.id, cookie: `${SESSION_COOKIE}=${session.id}` };
}

/** Filas TOTALES de `history_entry` (de cualquier usuario): un registro indebido de
 *  una petición anónima aparecería aquí aunque no supiéramos a quién atribuirlo. */
async function countHistoryRows(): Promise<number> {
  const rows = await ctx.db.select({ id: historyEntry.id }).from(historyEntry);
  return rows.length;
}

function analyze(input: string, cookie?: string): Promise<Response> {
  return callRoute(analyzeRoute, '/api/analyze', {
    method: 'POST',
    json: { input },
    ...(cookie ? { headers: { cookie } } : {}),
  });
}

describe('POST /api/analyze — registro de historial (D7)', () => {
  it('con sesión registra UNA fila con el preview redactado y el resumen de la cadena', async () => {
    const { userId, cookie } = await signedInUser();

    const res = await analyze(INPUT, cookie);
    expect(res.status).toBe(200);
    const chain = (await res.json()) as Chain;
    // El contrato de respuesta NO cambia: la cadena sigue llegando completa al usuario.
    expect(chain.steps[0]?.detections[0]?.kind).toBe('jwt');

    const { rows } = await listHistoryEntriesByUser(ctx.db, userId);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;

    // `preview`: redactado (payload y firma → …) y por debajo del límite de 120.
    expect(row.preview).toBe('Bearer eyJhbGciOiJIUzI1NiJ9.….…');
    expect(row.preview.length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS);
    // `input_kind`: el del paso 0.
    expect(row.inputKind).toBe('jwt');
    // `chain`: SOLO {kind, transformId}, un elemento por paso.
    expect(row.chain.length).toBe(chain.steps.length);
    expect(row.chain[0]).toEqual({ kind: 'jwt', transformId: 'jwt.decode' });
    for (const entry of row.chain) {
      expect(Object.keys(entry).sort()).toEqual(['kind', 'transformId']);
    }
  });

  it('CONTROL NEGATIVO (criterio 14.8): el dump de la fila leída de la BD no contiene el dato', async () => {
    const { userId, cookie } = await signedInUser();
    await analyze(INPUT, cookie);

    // Se grepea la fila REAL devuelta por la BD, no el objeto que construyó el código.
    const [row] = (await listHistoryEntriesByUser(ctx.db, userId)).rows;
    const dump = JSON.stringify(row);
    for (const fragment of FORBIDDEN_FRAGMENTS) {
      expect(dump).not.toContain(fragment);
    }
    // La firma tampoco, comprobada solo sobre el preview (`abc` es demasiado corto para
    // grepearlo contra el dump entero sin falsos positivos de uuids).
    expect(row!.preview).not.toContain(JWT_SIGNATURE_SEGMENT);
  });

  it('un input larguísimo se persiste truncado a 120 caracteres', async () => {
    const { userId, cookie } = await signedInUser();
    const huge = `zzz${'A'.repeat(5000)}`;

    await analyze(huge, cookie);

    const [row] = (await listHistoryEntriesByUser(ctx.db, userId)).rows;
    expect(row!.preview.length).toBe(PREVIEW_MAX_CHARS);
    expect(huge).not.toContain(row!.preview); // truncado, no el input íntegro
  });

  it('CONTROL NEGATIVO (D6): SIN sesión no se crea ninguna fila y la respuesta es idéntica', async () => {
    const before = await countHistoryRows();

    const res = await analyze(INPUT);
    expect(res.status).toBe(200);
    const chain = (await res.json()) as Chain;
    expect(chain.steps[0]?.detections[0]?.kind).toBe('jwt');

    expect(await countHistoryRows()).toBe(before);
  });

  it('CONTROL NEGATIVO (D6): una cookie de sesión FORJADA no registra nada', async () => {
    // El middleware de Edge solo mira que la cookie exista; la sesión se valida en el
    // handler contra la BD. Un id inventado no puede escribir historial de nadie.
    const before = await countHistoryRows();

    const res = await analyze(INPUT, `${SESSION_COOKIE}=11111111-1111-4111-8111-111111111111`);
    expect(res.status).toBe(200);

    expect(await countHistoryRows()).toBe(before);
  });

  it('con la BD CAÍDA la respuesta sigue siendo la cadena correcta (el registro no tumba analyze)', async () => {
    // BD inalcanzable de verdad (no un mock del repo): así se ejercita también el fallo de
    // `validateSession`, que es el que se olvida de envolver con más facilidad.
    const brokenDb: Db = createDb('postgresql://nobody:nobody@127.0.0.1:1/none');
    setDbForTests(brokenDb);

    const res = await analyze(INPUT, `${SESSION_COOKIE}=11111111-1111-4111-8111-111111111111`);

    expect(res.status).toBe(200);
    const chain = (await res.json()) as Chain;
    expect(chain.steps[0]?.detections[0]?.kind).toBe('jwt');
    expect(chain.steps[0]?.applied).toBe('jwt.decode');
  });
});
