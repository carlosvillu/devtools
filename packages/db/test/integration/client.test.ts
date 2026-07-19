// Guarda de los TIMEOUTS DE CLIENTE del pool (T2.1). No abre ninguna conexión: construir
// un `Pool` de node-postgres es perezoso, así que esto es una aserción de configuración.
//
// POR QUÉ EXISTE ESTE TEST: sin estos dos timeouts, una BD que acepta la conexión pero
// NUNCA responde (congelada, no caída) cuelga indefinidamente a quien la espere. Medido
// con `docker pause` sobre Postgres: cualquier petición CON COOKIE a `/api/analyze`
// —endpoint PÚBLICO— se colgaba >25 s, y la disparaba un anónimo mandando una cookie
// cualquiera. Eso rompe D6 («`/` y `/api/analyze` no dependen de la BD»). Con los
// timeouts, la misma petición responde 200 con su cadena en ~5 s.
//
// Si alguien borra estas opciones «porque no hacen nada», este test se pone rojo y el
// comentario explica qué se rompe. Es una aserción de config, no de comportamiento: la
// prueba de comportamiento (pause/unpause de un contenedor) es demasiado pesada y frágil
// para la suite, y quedó documentada en `docs/verifications/T2.1/`.
import { describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createDb } from '../../src/client';

// Cadena sintáctica, nunca se conecta: el pool es perezoso.
const DSN = 'postgres://user:pass-not-a-secret@127.0.0.1:1/none';

// Banda sensata: por debajo de 1 s cualquier latencia normal de red/consulta rompería la
// app; por encima de 30 s el timeout deja de proteger de nada útil. Un `> 0` pelado no
// vale: pasaría con `1` ms, que es tan roto como no tenerlo (lo señaló el verifier).
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 30_000;

interface PoolTimeoutOptions {
  connectionTimeoutMillis?: number;
  query_timeout?: number;
  statement_timeout?: number;
}

const timeoutOptionsOf = (): PoolTimeoutOptions =>
  (createDb(DSN) as unknown as { $client: Pool }).$client.options as PoolTimeoutOptions;

describe('createDb — timeouts de cliente del pool', () => {
  it('acota ABRIR una conexión (`connectionTimeoutMillis`) y una consulta EN VUELO (`query_timeout`), con valores operables', () => {
    const options = timeoutOptionsOf();

    // Hacen falta LOS DOS y por motivos distintos: `connectionTimeoutMillis` cubre el
    // pool frío (adquirir/abrir conexión) y `query_timeout` el pool caliente (consulta ya
    // en vuelo sobre una conexión abierta). `query_timeout` es el que salva el caso real
    // de BD congelada. El default de node-postgres es `0` = ESPERAR PARA SIEMPRE.
    expect(options.connectionTimeoutMillis).toBeGreaterThanOrEqual(MIN_TIMEOUT_MS);
    expect(options.connectionTimeoutMillis).toBeLessThanOrEqual(MAX_TIMEOUT_MS);
    expect(options.query_timeout).toBeGreaterThanOrEqual(MIN_TIMEOUT_MS);
    expect(options.query_timeout).toBeLessThanOrEqual(MAX_TIMEOUT_MS);
  });

  it('NO se sustituyen por `statement_timeout`: lo aplica el SERVIDOR, y un servidor congelado no puede dispararlo', () => {
    const options = timeoutOptionsOf();

    // Este test guarda la trampa que promete su nombre: si alguien cambia los timeouts de
    // cliente por `statement_timeout` «que es lo estándar», el test se pone rojo. Pasar
    // solo `statement_timeout` deja VERDE un test con la BD parada (`docker stop` falla
    // rápido por connection refused) y sigue COLGANDO con la BD congelada (`docker pause`).
    expect(options.statement_timeout).toBeUndefined();
    expect(options.query_timeout).toBeDefined();
  });
});
