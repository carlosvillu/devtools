import { WorkScreen } from '@/components/layout/work-screen';
import { ComposeBuilder } from '@/components/compose/compose-builder';
import { getServerSession } from '@/server/current-user';

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
export default async function ComposePage() {
  const session = await getServerSession();

  return (
    <WorkScreen
      mode="compose"
      title="Compón algo. Lo empaqueta."
      description="La dirección inversa: escribe un valor y encadena transformaciones — minify, base64, url, hash, firma JWT — hasta lo que quieras compartir."
    >
      <ComposeBuilder signedIn={session !== null} />
    </WorkScreen>
  );
}
