// Healthcheck público (PRD §9). Desde T0.2 reporta también la conectividad con
// Postgres: `{ ok:true, db:true }` si la BD responde, `{ ok:true, db:false }` si no
// —sin tumbar la app: `ok` es siempre true mientras la web sirva.
import type { Health } from '@app/core/contracts';
import { withRoute } from '@/server';
import { checkDbConnection } from '@/server/db-health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // un health cacheado no es un health

export const GET = withRoute(
  async () => {
    // `checkDbConnection()` NUNCA lanza (db-health.ts): traga cualquier fallo de la
    // BD y devuelve un booleano, para que un Postgres caído sea un `db:false` con
    // 200 —el control negativo de la Verificación de T0.2— y no un 500 que rompa el
    // envelope de salud.
    const db = await checkDbConnection();

    // El contrato de core tipa la respuesta: si `Health` cambia en packages/core,
    // esto deja de compilar. Ahí vive el control negativo de la Verificación de T0.1.
    //
    // Sin `HealthSchema.parse()` a propósito: validar en runtime, por request, un
    // literal que tsc ya probó no aporta nada, y estrenaría en la primera ruta del
    // proyecto el patrón «valida tu propia salida» — que este mismo repo documenta
    // como bug en server/errors.ts (un ZodError de SALIDA es drift nuestro ⇒ 500).
    const body: Health = { ok: true, db };
    return Response.json(body);
  },
  { route: '/api/health' },
);
