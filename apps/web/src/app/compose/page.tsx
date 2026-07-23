import { WorkScreen } from '@/components/layout/work-screen';
import { ComposeBuilder } from '@/components/compose/compose-builder';
import { getServerSession } from '@/server/current-user';
import { decodeRecipe } from '@app/core/recipe';
import type { HistoryComposeStep } from '@app/core/history';

// `/compose` — la pantalla de trabajo en modo COMPONER (PRD §7, decisión 2 de F6): la misma
// pantalla que `/analyze`, recorrida en el otro sentido. Server Component delgado
// (architecture.md §1.3): compone el marco compartido (`WorkScreen`: cabecera + encabezado +
// conmutador) y monta la hoja interactiva `ComposeBuilder`.
//
// El motor de composición se importa y se ejecuta EN EL CLIENTE (D10/§5.3): componer no dispara
// ni una petición de red, ni el fuente ni el secreto salen del navegador.
//
// 🔴 D6 — POR QUÉ ESTA PÁGINA RESUELVE LA SESIÓN AUNQUE SEA PÚBLICA:
// componer funciona ENTERO sin cuenta; la sesión solo decide si, al copiar el resultado, se
// registra la RECETA en `/history` (T6.10). Se resuelve aquí, en el servidor, para que el
// cliente NO tenga que adivinar si hay sesión (la cookie es HttpOnly y no la puede leer) y para
// que un visitante ANÓNIMO no dispare ni una petición al copiar — así 14.14 (cero red) se
// mantiene sin depender de un 401. `getServerSession` es NON-FATAL (BD caída ⇒ `null`): un fallo
// degrada a «anónimo, sin registro», nunca tumba `/compose` (misma filosofía que la landing D6).
// 🔴 T7.3 — LA RECETA COMPARTIDA SE LEE AQUÍ, EN EL SERVIDOR:
// `/compose?r=<receta>` lleva SOLO los ids de transformación (nunca el fuente ni el secreto, §11/R2).
// El Server Component lee `searchParams.r` y lo VALIDA con `decodeRecipe` (core, puro, TOTAL: nunca
// lanza), y pasa a la isla los PASOS ya decodificados como prop serializable (tipo de contrato de
// `@app/core`, no un string opaco). Un `?r=` ausente/basura/con un id inventado → `decodeRecipe` da
// `{ ok:false }` → se pasa `null` → la isla arranca con pantalla limpia (14.19), nunca un error.
//
// POR QUÉ AQUÍ Y NO EN EL CLIENTE: `decodeRecipe` es una única función pura de core; T7.4 la llamará
// también server-side para la OG. Validar en el servidor mantiene una sola verdad (misma función,
// dos llamantes), pasa a la isla un tipo de contrato en vez de un string sin validar, y evita que la
// lógica de «receta válida» diverja entre la pantalla y la imagen OG.
export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const session = await getServerSession();
  const { r } = await searchParams;
  const decoded = r !== undefined ? decodeRecipe(r) : { ok: false as const };
  const sharedRecipe: HistoryComposeStep[] | null = decoded.ok ? decoded.steps : null;

  return (
    <WorkScreen
      mode="compose"
      title="Compón algo. Lo empaqueta."
      description="La dirección inversa: escribe un valor y encadena transformaciones — minify, base64, url, hash, firma JWT — hasta lo que quieras compartir."
    >
      <ComposeBuilder signedIn={session !== null} sharedRecipe={sharedRecipe} />
    </WorkScreen>
  );
}
