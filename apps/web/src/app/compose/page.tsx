import { WorkScreen } from '@/components/layout/work-screen';
import { ComposeBuilder } from '@/components/compose/compose-builder';

// `/compose` — la pantalla de trabajo en modo COMPONER (PRD §7, decisión 2 de F6): la misma
// pantalla que `/analyze`, recorrida en el otro sentido. Server Component delgado
// (architecture.md §1.3): compone el marco compartido (`WorkScreen`: cabecera + encabezado +
// conmutador) y monta la hoja interactiva `ComposeBuilder`.
//
// SIN fetch y SIN `loading.tsx`/`error.tsx`: esta ruta no lee nada del servidor. El motor de
// composición se importa y se ejecuta en el cliente (D10/§5.3) — componer no dispara ni una
// petición de red.
//
// Copy del encabezado: el del artboard `ComposeClaro` de `docs/mockups/compose.html`.
export default function ComposePage() {
  return (
    <WorkScreen
      mode="compose"
      title="Compón algo. Lo empaqueta."
      description="La dirección inversa: escribe un valor y encadena transformaciones — minify, base64, url, hash, firma JWT — hasta lo que quieras compartir."
    >
      <ComposeBuilder />
    </WorkScreen>
  );
}
