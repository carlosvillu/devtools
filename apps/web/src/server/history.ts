// Registro de historial desde `POST /api/analyze` (PRD §8 módulo `analyze`, D7).
//
// POLÍTICA DE FALLO — decidida en T2.1 y deliberada: **el registro es best-effort y
// nunca puede tumbar `/api/analyze`**. `/api/analyze` es PÚBLICO (D6) y su valor no
// depende de la BD: si Postgres está caído, el usuario debe seguir recibiendo su cadena.
// Por eso TODO —resolución de sesión incluida, no solo la escritura— va dentro del
// try/catch: `validateSession` toca la BD y lanza si no puede alcanzarla. El precio
// aceptado es que en una caída de BD se pierde la entrada de historial de esa petición;
// la alternativa (500 al usuario) contradiría D6.
//
// §11: en el catch se loguea un MARCADOR ESTÁTICO. Nunca el input, nunca la cadena,
// nunca `err.message` (que puede arrastrar fragmentos del dato o de la conexión).
import type { Chain } from '@app/core/engine';
import { buildHistoryRecord } from '@app/core/history';
import { createHistoryEntry } from '@app/db';
import { getDb } from './db';
import { validateSession } from './session';
import { getRequestLogger } from './request-context';

/**
 * Registra la entrada de historial si la petición trae una sesión VÁLIDA (validada
 * contra la BD, no solo «la cookie existe»: el middleware de Edge no autentica).
 * Sin sesión no escribe nada (D6). Nunca lanza.
 */
export async function recordHistoryIfSignedIn(
  req: Request,
  input: string,
  chain: Chain,
): Promise<void> {
  try {
    // Sin cookie, `validateSession` devuelve null SIN tocar la BD: el camino anónimo
    // no depende de Postgres en absoluto.
    const auth = await validateSession(getDb(), req);
    if (!auth) return;

    // El dato crudo muere aquí: `buildHistoryRecord` es lo único que lo ve, y lo que
    // devuelve ya está redactado (preview ≤120, jwt sin payload ni firma) y resumido
    // (chain solo `{kind, transformId}`).
    const record = buildHistoryRecord(input, chain);
    await createHistoryEntry(getDb(), {
      userId: auth.user.id,
      preview: record.preview,
      inputKind: record.inputKind,
      chain: record.chain,
    });
  } catch {
    getRequestLogger().warn({ marker: 'history_record_failed' }, 'history_record_failed');
  }
}
