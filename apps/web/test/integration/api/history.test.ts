// T2.2 — `GET/DELETE /api/history` handler-level contra Postgres real (testing/api.md §2).
//
// 🔴 ESTE FICHERO ES EL GUARDIÁN DEL AISLAMIENTO ENTRE USUARIOS. Conserva las cláusulas
// deterministas de la Verificación del planning:
//   - con una segunda cuenta, `/api/history` está VACÍO;
//   - un `GET /api/history` MANIPULANDO el id de usuario NO devuelve entradas ajenas;
//   - una cookie FORJADA (uuid que no existe en `session`) NO pasa: 401 (el middleware de
//     Edge solo mira que la cookie exista — la autenticación real vive en el handler);
//   - una sesión REVOCADA (logout) tampoco pasa;
//   - un DELETE con el id de una entrada AJENA no la borra: 404 y la fila SOBREVIVE.
//
// Todos los asserts se hacen sobre lo que DEVUELVE el handler real (el que corre en
// producción), nunca sobre un re-filtrado del test — un test que reimplementa la
// comprobación no prueba que la comprobación exista (testing/SKILL.md, anti-patrón d).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestDatabase,
  insertHistoryEntryAt,
  makeUser,
  type TestDatabase,
} from '@app/test-utils';
import {
  createHistoryEntry,
  createUser,
  deleteSession,
  listHistoryEntriesByUser,
  type ChainSummaryEntry,
} from '@app/db';
import { setDbForTests } from '@/server/db';
import { createUserSession } from '@/server/session';
import { SESSION_COOKIE } from '@/server/session-cookie';
import { GET as historyGet, DELETE as historyDelete } from '@/app/api/history/route';
import { callRoute } from '../../helpers/call-route';
import { expectApiError } from '../../helpers/expect-api-error';

const CHAIN: ChainSummaryEntry[] = [
  { kind: 'jwt', transformId: 'jwt.decode' },
  { kind: 'json', transformId: null },
];

let ctx: TestDatabase;
beforeAll(async () => {
  ctx = await createTestDatabase({ label: 'web-history-api' });
  setDbForTests(ctx.db);
});
afterAll(async () => {
  setDbForTests(undefined);
  await ctx.close();
});
beforeEach(() => {
  setDbForTests(ctx.db);
});

interface Account {
  userId: string;
  sessionId: string;
  cookie: string;
}

async function signedInUser(): Promise<Account> {
  const user = await createUser(ctx.db, makeUser());
  const { session } = await createUserSession(ctx.db, user.id);
  return { userId: user.id, sessionId: session.id, cookie: `${SESSION_COOKIE}=${session.id}` };
}

async function seed(userId: string, preview: string): Promise<string> {
  const row = await createHistoryEntry(ctx.db, {
    userId,
    preview,
    inputKind: 'jwt',
    chain: CHAIN,
  });
  return row.id;
}

interface PageBody {
  entries: { id: string; preview: string; createdAt: string }[];
  /** Cursor COMPUESTO: instante (con µs) + id. Ver `listHistoryEntriesByUser`. */
  nextCursor: { createdAt: string; id: string } | null;
}

/** URL de una página siguiendo un cursor compuesto (ambos parámetros o ninguno). */
function pageUrl(limit: number, cursor: PageBody['nextCursor']): string {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    params.set('before', cursor.createdAt);
    params.set('beforeId', cursor.id);
  }
  return `/api/history?${params.toString()}`;
}

/** Siembra una entrada con un `created_at` EXACTO en microsegundos (ver el helper). */
const seedAt = (userId: string, isoMicros: string): Promise<string> =>
  insertHistoryEntryAt(ctx.db, { userId, isoMicros });

function get(path: string, cookie?: string): Promise<Response> {
  return callRoute(historyGet, path, {
    method: 'GET',
    headers: cookie ? { cookie } : {},
  });
}

function del(path: string, cookie?: string): Promise<Response> {
  return callRoute(historyDelete, path, {
    method: 'DELETE',
    headers: cookie ? { cookie } : {},
  });
}

describe('GET /api/history — autenticación real (no la del middleware)', () => {
  it('sin cookie responde 401 y el cuerpo no trae entradas', async () => {
    const body = await expectApiError(await get('/api/history'), 401, 'unauthorized');
    expect(body).not.toHaveProperty('entries');
  });

  it('🔴 con una cookie FORJADA (uuid inventado que no existe en `session`) responde 401', async () => {
    // Este es EL caso que el middleware de Edge deja pasar: la cookie EXISTE, así que
    // `Boolean(valor)` es true. Solo la validación contra la BD lo caza. Si alguien
    // "optimizara" el handler confiando en el middleware, este test se pondría rojo.
    const forged = `${SESSION_COOKIE}=11111111-2222-3333-4444-555555555555`;
    const body = await expectApiError(await get('/api/history', forged), 401, 'unauthorized');
    expect(body).not.toHaveProperty('entries');
  });

  it.each([
    ['no-uuid', 'x'],
    ['basura', 'basura'],
    ['con comillas de inyección', "x' OR 1=1--"],
    ['uuid a medias', '11111111-2222-3333'],
  ])('🔴 con una cookie MALFORMADA (%s) responde 401, nunca 500', async (_caso, valor) => {
    // El id de sesión es la PK `uuid` de `session`. Con un valor que no es UUID, Postgres
    // no devuelve «cero filas»: lanza error de CAST, que subía como **500**. Un 500 aquí
    // (a) contradice el contrato declarado en `with-session.ts` («una cookie forjada no
    // encuentra fila → null → 401»), y (b) hace DISTINGUIBLE una cookie forjada de una
    // inexistente, que es justo lo que la indistinguibilidad de §11 evita en el login.
    // El 🔴 requisito de T2.2 nombra literalmente `devtools_session=x` como el caso
    // canónico de cookie forjada, así que este es EL caso, no un extremo.
    const res = await get('/api/history', `${SESSION_COOKIE}=${valor}`);
    expect(res.status).toBe(401);
    const body = await expectApiError(res, 401, 'unauthorized');
    expect(body).not.toHaveProperty('entries');
  });

  it('🔴 con una sesión REVOCADA (tras logout) responde 401 aunque el navegador reenvíe la cookie', async () => {
    const acc = await signedInUser();
    await seed(acc.userId, 'ENTRADA-ANTES-DEL-LOGOUT');

    // La sesión se borra de la BD, pero quien tenga la cookie la conserva y la reenvía:
    // el navegador no la "devuelve". Solo la validación contra la BD la rechaza.
    await deleteSession(ctx.db, acc.sessionId);

    const res = await get('/api/history', acc.cookie);
    const body = await expectApiError(res, 401, 'unauthorized');
    // El historial de esa cuenta no puede filtrarse por una sesión ya revocada.
    expect(JSON.stringify(body)).not.toContain('ENTRADA-ANTES-DEL-LOGOUT');
  });
});

describe('🔴 GET /api/history — aislamiento entre usuarios', () => {
  it('devuelve SOLO las entradas del usuario de la sesión: las de la otra cuenta NO aparecen', async () => {
    const alice = await signedInUser();
    const bob = await signedInUser();
    const aliceEntry = await seed(alice.userId, 'SECRETO-DE-ALICE');
    await seed(bob.userId, 'cosa-de-bob');

    const res = await get('/api/history', bob.cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as PageBody;

    // Control POSITIVO: Bob ve lo suyo.
    expect(body.entries.map((e) => e.preview)).toContain('cosa-de-bob');
    // Control NEGATIVO (el que muerde): nada de Alice, ni por preview ni por id.
    expect(body.entries.map((e) => e.preview)).not.toContain('SECRETO-DE-ALICE');
    expect(body.entries.map((e) => e.id)).not.toContain(aliceEntry);
    // Y por si alguien añadiera un campo nuevo: el dump entero no menciona a Alice.
    expect(JSON.stringify(body)).not.toContain('SECRETO-DE-ALICE');
  });

  it('🔴 la SEGUNDA CUENTA recién creada ve el historial VACÍO (aunque la primera tenga entradas)', async () => {
    const alice = await signedInUser();
    await seed(alice.userId, 'entrada-de-alice-1');
    await seed(alice.userId, 'entrada-de-alice-2');

    const bob = await signedInUser();
    const res = await get('/api/history', bob.cookie);
    const body = (await res.json()) as PageBody;

    expect(body.entries).toEqual([]);
    expect(body.nextCursor).toBeNull();
  });

  it('🔴 MANIPULAR el id de usuario en la query NO devuelve entradas ajenas', async () => {
    const alice = await signedInUser();
    const bob = await signedInUser();
    await seed(alice.userId, 'SECRETO-DE-ALICE');

    // El control negativo LITERAL de la Verificación: Bob pide el historial pasando el
    // id REAL de Alice por todos los nombres de parámetro plausibles. El handler no lee
    // ninguno: el userId sale de la sesión. Si alguien añadiera soporte para uno de
    // estos, este test se pondría rojo.
    for (const param of ['userId', 'user_id', 'user', 'id']) {
      const res = await get(`/api/history?${param}=${alice.userId}`, bob.cookie);
      expect(res.status).toBe(200);
      const body = (await res.json()) as PageBody;
      expect(body.entries).toEqual([]);
      expect(JSON.stringify(body)).not.toContain('SECRETO-DE-ALICE');
    }
  });

  it('la respuesta NO expone el `user_id` de la fila', async () => {
    const alice = await signedInUser();
    await seed(alice.userId, 'sin-user-id');

    const body = (await (await get('/api/history', alice.cookie)).json()) as PageBody;
    expect(JSON.stringify(body)).not.toContain(alice.userId);
  });
});

describe('GET /api/history — paginación', () => {
  it('acota el tamaño de página a 50 y rechaza un limit fuera de rango', async () => {
    const acc = await signedInUser();
    for (let i = 0; i < 52; i++) await seed(acc.userId, `entrada-${String(i)}`);

    const body = (await (await get('/api/history', acc.cookie)).json()) as PageBody;
    expect(body.entries).toHaveLength(50);
    expect(body.nextCursor).not.toBeNull();

    // Un limit por encima del máximo es un 400 tipado, no un silencioso "te doy 5000".
    await expectApiError(await get('/api/history?limit=5000', acc.cookie), 400, 'validation_error');
  });

  it('el cursor compuesto avanza a la página siguiente sin solapar', async () => {
    const acc = await signedInUser();
    for (let i = 0; i < 4; i++) await seed(acc.userId, `pag-${String(i)}`);

    const page1 = (await (await get('/api/history?limit=2', acc.cookie)).json()) as PageBody;
    expect(page1.entries).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = (await (await get(pageUrl(2, page1.nextCursor), acc.cookie)).json()) as PageBody;

    const ids1 = new Set(page1.entries.map((e) => e.id));
    expect(page2.entries.some((e) => ids1.has(e.id))).toBe(false);
  });

  it('rechaza un cursor a medias: `before` sin `beforeId` es 400', async () => {
    const acc = await signedInUser();
    // El cursor es compuesto: aceptar solo el instante reabriría el hueco de paginación.
    const body = await expectApiError(
      await get('/api/history?before=2026-07-19T10%3A00%3A00.500900Z', acc.cookie),
      400,
      'validation_error',
    );
    // Y falla como error de VALIDACIÓN, sin devolver entradas por el camino.
    expect(body).not.toHaveProperty('entries');
  });

  // 🔴 Mismo guardián que en el repo, pero en la capa de la API: el hueco de paginación
  // nacía de que `Date` (ms) no representa el `timestamptz` (µs) de Postgres. Aquí se
  // recorre la lista ENTERA por HTTP siguiendo `nextCursor`, como haría un «cargar más».
  it('🔴 NO PIERDE NINGUNA entrada al paginar entera una lista con instantes en el MISMO milisegundo', async () => {
    const acc = await signedInUser();
    const expected = new Set<string>();
    for (const at of [
      '2026-07-19T10:00:00.500900Z',
      '2026-07-19T10:00:00.500500Z',
      '2026-07-19T10:00:00.500100Z',
      '2026-07-19T10:00:00.400000Z',
      '2026-07-19T10:00:00.399000Z',
    ]) {
      expected.add(await seedAt(acc.userId, at));
    }

    const seen: string[] = [];
    let cursor: PageBody['nextCursor'] = null;
    for (let guard = 0; guard < 10; guard++) {
      const page = (await (await get(pageUrl(2, cursor), acc.cookie)).json()) as PageBody;
      seen.push(...page.entries.map((e) => e.id));
      if (page.entries.length < 2 || !page.nextCursor) break;
      cursor = page.nextCursor;
    }

    expect(new Set(seen)).toEqual(expected);
    expect(seen).toHaveLength(5);
  });
});

describe('🔴 DELETE /api/history — aislamiento entre usuarios', () => {
  it('sin sesión responde 401 y no borra nada', async () => {
    const acc = await signedInUser();
    const entry = await seed(acc.userId, 'no-se-borra-sin-sesion');

    await expectApiError(await del(`/api/history?id=${entry}`), 401, 'unauthorized');
    expect((await listHistoryEntriesByUser(ctx.db, acc.userId)).rows.map((r) => r.id)).toContain(
      entry,
    );
  });

  it('borra la entrada propia', async () => {
    const acc = await signedInUser();
    const entry = await seed(acc.userId, 'a-borrar');

    const res = await del(`/api/history?id=${entry}`, acc.cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 1 });
    expect(
      (await listHistoryEntriesByUser(ctx.db, acc.userId)).rows.map((r) => r.id),
    ).not.toContain(entry);
  });

  it('🔴 un DELETE con el id de una entrada AJENA responde 404 y la fila SOBREVIVE', async () => {
    const alice = await signedInUser();
    const bob = await signedInUser();
    const aliceEntry = await seed(alice.userId, 'INTOCABLE-DE-ALICE');

    // 404, no 403: un 403 confirmaría que esa entrada existe y es de otra persona.
    await expectApiError(await del(`/api/history?id=${aliceEntry}`, bob.cookie), 404, 'not_found');

    // Un 404 NO basta como prueba: un bug podría devolver 404 Y haber borrado la fila.
    const { rows: aliceRows } = await listHistoryEntriesByUser(ctx.db, alice.userId);
    expect(aliceRows.map((r) => r.id)).toContain(aliceEntry);
  });

  it('🔴 «borrar todas» vacía SOLO el historial propio; el de la otra cuenta queda intacto', async () => {
    const alice = await signedInUser();
    const bob = await signedInUser();
    await seed(alice.userId, 'alice-sobrevive-1');
    await seed(alice.userId, 'alice-sobrevive-2');
    await seed(bob.userId, 'bob-se-borra');

    const res = await del('/api/history', bob.cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 1 });

    expect((await listHistoryEntriesByUser(ctx.db, bob.userId)).rows).toHaveLength(0);
    expect((await listHistoryEntriesByUser(ctx.db, alice.userId)).rows).toHaveLength(2);
  });
});
