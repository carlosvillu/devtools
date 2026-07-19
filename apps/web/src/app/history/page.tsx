import { redirect } from 'next/navigation';
import { HistoryPageSchema, type HistoryEntryView } from '@app/core/history';
import { SiteHeader } from '@/components/layout/site-header';
import { HistoryPanel } from '@/components/history-list/history-panel';
import { getServerSession } from '@/server/current-user';
import { api } from '@/lib/api-server';

// `/history` — la pantalla de historial (PRD §7), construida desde docs/mockups/history.html
// con las primitivas del DS. Server Component delgado (architecture.md §1.3): resuelve la
// sesión, LEE LOS DATOS POR LA API REST (§3.1, con la cookie reenviada) y monta la hoja
// interactiva `HistoryPanel`, donde vive la frontera `'use client'`.
//
// 🔴 GUARDA DE SESIÓN EN EL SERVIDOR — no es redundante con `proxy.ts`:
// el middleware corre en Edge y SOLO comprueba que la cookie EXISTA (`Boolean(valor)`); no
// mira la BD, ni expiración, ni revocación. Una cookie FORJADA o REVOCADA lo atraviesa. Si
// esta página confiara en él, alguien con `devtools_session=<uuid inventado>` llegaría a la
// pantalla del historial. Por eso aquí se resuelve la sesión CONTRA POSTGRES
// (`getServerSession`) y sin sesión válida se redirige a `/login`.
//
// Y ninguna capa delega su autenticación en otra: `GET /api/history` vuelve a validar la
// sesión por su cuenta (`withSession`) y acota la consulta al usuario que ella misma
// resuelve — esta página no le pasa ningún id de usuario, porque ese parámetro no existe.
export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const session = await getServerSession();
  if (!session) redirect('/login?next=/history');

  // 🔵 «VACÍO» y «NO SE PUDO CARGAR» son estados DISTINTOS y no se pueden colapsar.
  // Un fallo de la API no debe reventar la pantalla (se mantiene la premisa de no tumbar
  // `/history` por un fallo de BD), pero devolver lista vacía ante un error haría que la
  // UI AFIRMARA ALGO FALSO: un usuario con 40 entradas leería «Tu historial está vacío» y,
  // en un producto cuya promesa es guardar su historial, es razonable concluir que se ha
  // borrado solo. Se distingue el error y el panel ofrece reintentar.
  let entries: HistoryEntryView[] = [];
  let loadFailed = false;
  try {
    entries = (await api.get('/api/history', HistoryPageSchema)).entries;
  } catch {
    // El detalle ya se registra en el handler; aquí solo importa el hecho del fallo.
    loadFailed = true;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <SiteHeader />
      <main className="flex flex-1 justify-center px-7 py-10">
        <div className="w-full max-w-180">
          <HistoryPanel initialEntries={entries} loadFailed={loadFailed} />
        </div>
      </main>
    </div>
  );
}
