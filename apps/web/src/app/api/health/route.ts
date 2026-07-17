// Healthcheck público (PRD §9). T0.2 le añadirá `db: boolean` cuando exista Postgres.
import type { Health } from '@app/core/contracts';
import { withRoute } from '@/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // un health cacheado no es un health

export const GET = withRoute(
  () => {
    // El contrato de core tipa la respuesta: si `Health` cambia en packages/core,
    // esto deja de compilar. Ahí vive el control negativo de la Verificación de T0.1.
    //
    // Sin `HealthSchema.parse()` a propósito: validar en runtime, por request, un
    // literal que tsc ya probó no aporta nada, y estrenaría en la primera ruta del
    // proyecto el patrón «valida tu propia salida» — que este mismo repo documenta
    // como bug en server/errors.ts (un ZodError de SALIDA es drift nuestro ⇒ 500).
    const body: Health = { ok: true };
    return Promise.resolve(Response.json(body));
  },
  { route: '/api/health' },
);
