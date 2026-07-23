// T2.2 — listado paginado y borrado del historial contra Postgres real
// (testing/db-integration.md §6). El foco de estos tests NO es el roundtrip (eso ya lo
// cubrió T2.1) sino el 🔴 AISLAMIENTO ENTRE USUARIOS a nivel de consulta SQL: que el
// `user_id` esté en el WHERE y no en una comprobación posterior en JavaScript.
//
// Cada caso siembra DOS usuarios con entradas propias y asserta sobre lo que el repo
// DEVUELVE (no sobre un re-filtrado del test): si alguien quitara el `eq(userId)` de
// `listHistoryEntriesByUser`, estos tests se ponen rojos.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestDatabase,
  insertHistoryEntryAt,
  makeUser,
  type TestDatabase,
} from '@app/test-utils';
import {
  HISTORY_PAGE_MAX,
  createHistoryEntry,
  createUser,
  deleteAllHistoryEntriesForUser,
  deleteHistoryEntryForUser,
  listHistoryEntriesByUser,
  type HistoryCursor,
} from '@app/db';

let tdb: TestDatabase;
beforeAll(async () => {
  tdb = await createTestDatabase({ label: 'history-repo' });
});
afterAll(async () => {
  await tdb.close();
});

/** Crea un usuario nuevo (email único) para aislar cada caso de los demás. */
async function freshUser(): Promise<string> {
  const user = await createUser(tdb.db, makeUser());
  return user.id;
}

/** Siembra una entrada con un `created_at` EXACTO en microsegundos (ver el helper). */
const seedAt = (userId: string, isoMicros: string): Promise<string> =>
  insertHistoryEntryAt(tdb.db, { userId, isoMicros });

async function seed(userId: string, preview: string): Promise<string> {
  const row = await createHistoryEntry(tdb.db, {
    userId,
    preview,
    inputKind: 'jwt',
    chain: [{ kind: 'jwt', transformId: 'jwt.decode' }],
  });
  return row.id;
}

describe('createHistoryEntry — columna direction (T6.10)', () => {
  it('sin `direction` la fila queda «decode» por el DEFAULT de la columna (no-regresión 14.8)', async () => {
    // El camino de decodificar (`recordHistoryIfSignedIn`) llama SIN direction: la fila debe
    // quedar 'decode' exactamente como antes de la migración. Esto ejerce el DEFAULT real de
    // Postgres aplicado por la migración 0001 sobre la template.
    const user = await freshUser();
    const row = await createHistoryEntry(tdb.db, {
      userId: user,
      preview: 'un análisis normal',
      inputKind: 'jwt',
      chain: [{ kind: 'jwt', transformId: 'jwt.decode' }],
    });
    expect(row.direction).toBe('decode');
  });

  it('con `direction: compose` roundtrip: la fila lo conserva', async () => {
    const user = await freshUser();
    const row = await createHistoryEntry(tdb.db, {
      userId: user,
      preview: 'compuesto · 2 pasos',
      inputKind: 'json',
      chain: [
        { kind: 'json', transformId: 'json.minify' },
        { kind: 'jwt', transformId: 'jwt.sign' },
      ],
      direction: 'compose',
    });
    expect(row.direction).toBe('compose');

    // Y se lee igual al listar (la columna viaja en el select del repo).
    const { rows } = await listHistoryEntriesByUser(tdb.db, user);
    expect(rows[0]?.direction).toBe('compose');
  });
});

describe('listHistoryEntriesByUser — aislamiento', () => {
  it('devuelve SOLO las entradas del usuario pedido: las del otro NO aparecen', async () => {
    const alice = await freshUser();
    const bob = await freshUser();
    await seed(alice, 'preview-de-alice');
    await seed(bob, 'preview-de-bob');

    const { rows: forBob } = await listHistoryEntriesByUser(tdb.db, bob);

    // Control POSITIVO: Bob ve lo suyo.
    expect(forBob.map((r) => r.preview)).toContain('preview-de-bob');
    // Control NEGATIVO (el que importa): nada de Alice se cuela. Se asserta la AUSENCIA
    // sobre lo que el repo devolvió, no sobre un re-filtrado del test.
    expect(forBob.map((r) => r.preview)).not.toContain('preview-de-alice');
    expect(forBob.every((r) => r.userId === bob)).toBe(true);
  });

  it('ordena de la más reciente a la más antigua', async () => {
    const user = await freshUser();
    await seed(user, 'vieja');
    await seed(user, 'nueva');

    const { rows } = await listHistoryEntriesByUser(tdb.db, user);
    const times = rows.map((r) => r.createdAt.getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});

describe('listHistoryEntriesByUser — paginación', () => {
  it('acota el tamaño de página a HISTORY_PAGE_MAX aunque pidan más', async () => {
    const user = await freshUser();
    for (let i = 0; i < HISTORY_PAGE_MAX + 3; i++) await seed(user, `entrada-${String(i)}`);

    // Punto lejos del ancla: se piden 500 y el tope debe seguir siendo 50.
    expect((await listHistoryEntriesByUser(tdb.db, user, { limit: 500 })).rows).toHaveLength(
      HISTORY_PAGE_MAX,
    );
    expect((await listHistoryEntriesByUser(tdb.db, user)).rows).toHaveLength(HISTORY_PAGE_MAX);
  });

  it('respeta un limit menor y avanza con el cursor `before` sin SOLAPE', async () => {
    const user = await freshUser();
    for (let i = 0; i < 5; i++) await seed(user, `pag-${String(i)}`);

    const page1 = await listHistoryEntriesByUser(tdb.db, user, { limit: 2 });
    expect(page1.rows).toHaveLength(2);

    const page2 = await listHistoryEntriesByUser(tdb.db, user, {
      limit: 2,
      before: page1.lastCursor ?? undefined,
    });
    expect(page2.rows).toHaveLength(2);
    const ids1 = new Set(page1.rows.map((r) => r.id));
    expect(page2.rows.some((r) => ids1.has(r.id))).toBe(false);
  });

  // 🔴 EL TEST QUE FALTABA. Los dos de arriba solo asertan AUSENCIA DE SOLAPE, que es el
  // fallo que la gente busca; el bug real era el contrario y complementario: un HUECO.
  //
  // `created_at` es `timestamptz` (MICROsegundos en Postgres) pero el driver lo entrega
  // como `Date` de JS (MILIsegundos, truncado hacia abajo). Con un cursor de solo tiempo y
  // un filtro `created_at < cursor`, toda fila del intervalo `[cursor_truncado, cursor_real)`
  // desaparecía de las DOS páginas. Sin filas dentro del mismo milisegundo el bug es
  // invisible — por eso este test las fabrica a propósito.
  it('🔴 NO PIERDE NINGUNA FILA al paginar entera una lista con instantes en el MISMO milisegundo', async () => {
    const user = await freshUser();

    // Instantes con microsegundos distintos DENTRO del mismo milisegundo (.500) más uno
    // fuera: exactamente la configuración que abría el hueco.
    const micros = [
      '2026-07-19T10:00:00.500900Z',
      '2026-07-19T10:00:00.500500Z',
      '2026-07-19T10:00:00.500100Z',
      '2026-07-19T10:00:00.400000Z',
      '2026-07-19T10:00:00.399000Z',
    ];
    const expected = new Set<string>();
    for (const at of micros) expected.add(await seedAt(user, at));

    // Se pagina la lista ENTERA de 2 en 2 siguiendo el cursor, como haría un «cargar más».
    const seen: string[] = [];
    let cursor: HistoryCursor | undefined;
    for (let guard = 0; guard < 10; guard++) {
      const page = await listHistoryEntriesByUser(tdb.db, user, { limit: 2, before: cursor });
      seen.push(...page.rows.map((r) => r.id));
      if (page.rows.length < 2 || !page.lastCursor) break;
      cursor = page.lastCursor;
    }

    // El conjunto recuperado es EXACTAMENTE el sembrado: ni una fila perdida…
    expect(new Set(seen)).toEqual(expected);
    // …y ni una repetida (el mismo assert protege contra el solape, gratis).
    expect(seen).toHaveLength(micros.length);
  });
});

describe('deleteHistoryEntryForUser — aislamiento', () => {
  it('borra la entrada propia y devuelve true', async () => {
    const user = await freshUser();
    const id = await seed(user, 'a-borrar');

    expect(await deleteHistoryEntryForUser(tdb.db, user, id)).toBe(true);
    expect((await listHistoryEntriesByUser(tdb.db, user)).rows.map((r) => r.id)).not.toContain(id);
  });

  it('NO borra la entrada de otro usuario: devuelve false y la fila SOBREVIVE', async () => {
    const alice = await freshUser();
    const bob = await freshUser();
    const aliceEntry = await seed(alice, 'intocable-de-alice');

    // Bob intenta borrar la entrada de Alice pasando su id real.
    expect(await deleteHistoryEntryForUser(tdb.db, bob, aliceEntry)).toBe(false);

    // Un 404 no basta: la fila tiene que seguir ahí (un bug podría devolver false Y borrar).
    const { rows: aliceRows } = await listHistoryEntriesByUser(tdb.db, alice);
    expect(aliceRows.map((r) => r.id)).toContain(aliceEntry);
  });
});

describe('deleteAllHistoryEntriesForUser — aislamiento', () => {
  it('vacía SOLO el historial del usuario; el del otro queda intacto', async () => {
    const alice = await freshUser();
    const bob = await freshUser();
    await seed(alice, 'alice-1');
    await seed(alice, 'alice-2');
    await seed(bob, 'bob-1');

    expect(await deleteAllHistoryEntriesForUser(tdb.db, bob)).toBe(1);

    expect((await listHistoryEntriesByUser(tdb.db, bob)).rows).toHaveLength(0);
    expect((await listHistoryEntriesByUser(tdb.db, alice)).rows.map((r) => r.preview)).toEqual(
      expect.arrayContaining(['alice-1', 'alice-2']),
    );
  });
});
