import { SiteHeader } from '@/components/layout/site-header';
import { ModeSwitch } from '@/components/layout/mode-switch';
import type { WorkMode } from '@/lib/work-mode';

// EL MARCO COMPARTIDO de la pantalla de trabajo (T6.7): cabecera + encabezado + conmutador de
// dirección + contenedor. `/analyze` y `/compose` son LA MISMA PANTALLA en dos modos (decisión 2
// de F6), así que su chrome se escribe una vez: si mañana cambia el ancho, el padding o el sitio
// del conmutador, cambia en las dos a la vez o no cambia en ninguna.
//
// Server Component: solo compone (la única frontera de cliente que introduce es `ModeSwitch`,
// que necesita el router). Las medidas son EXACTAMENTE las que `/analyze` ya tenía —`max-w-190`,
// `px-7 py-10`, `mb-6`, `text-2xl`, `max-w-140`— porque la Entrega prohíbe cualquier cambio
// visual en decodificar salvo la aparición del conmutador.
//
// Responsive (contra `docs/mockups/compose-mobile.html`): el encabezado y el conmutador se
// apilan en móvil (`flex-col` → `sm:flex-row`) para que el `Segmented` no comprima el título ni
// desborde a lo ancho en 390px.
interface WorkScreenProps {
  mode: WorkMode;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function WorkScreen({ mode, title, description, children }: WorkScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <SiteHeader />
      <main className="flex flex-1 justify-center px-7 py-10">
        <div className="w-full max-w-190">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="mb-2 text-2xl leading-tight font-semibold tracking-tight">{title}</h1>
              <p className="max-w-140 text-md text-text-muted">{description}</p>
            </div>
            <ModeSwitch mode={mode} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
