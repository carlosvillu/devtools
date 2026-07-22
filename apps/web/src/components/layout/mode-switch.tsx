'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Segmented } from '@/components/ui/segmented';
import { MODE_ROUTE, markModeSwitch, type WorkMode } from '@/lib/work-mode';

// El conmutador decodificar ⇄ codificar cableado a RUTAS (T6.7). La primitiva `Segmented`
// (T6.3) es presentacional y pura —controlada por `value` + `onChange`, sin navegación
// dentro—: el cableado es de esta pieza, que es la única de la pantalla que necesita ser
// cliente para navegar.
//
// EL VALOR SE DERIVA DE LA RUTA, no de estado propio: `usePathname()` es la única verdad
// después de navegar. Si el conmutador guardara su propia selección, una vuelta atrás del
// navegador (o un enlace directo) dejaría el control mintiendo sobre en qué modo estás.
// `Segmented` ya está preparado para el retardo entre el clic y el `value` nuevo (su roving
// focus es estado propio, con resincronización cuando `value` cambia por fuera).
//
// `router.push` navega SIN RECARGAR (App Router: transición de cliente), que es lo que pide la
// Entrega; el flag de cambio de modo se marca ANTES de navegar para que la pantalla de destino
// pueda restaurar su borrador (ver `lib/work-mode.ts` para la decisión completa).
const OPTIONS = [
  { value: 'decode' satisfies WorkMode, label: 'decodificar', icon: 'search' as const },
  { value: 'compose' satisfies WorkMode, label: 'codificar', icon: 'git-branch' as const },
];

interface ModeSwitchProps {
  /** Modo de la pantalla que lo monta; es también el segmento marcado. */
  mode: WorkMode;
}

export function ModeSwitch({ mode }: ModeSwitchProps) {
  const router = useRouter();
  const pathname = usePathname();

  // La ruta manda sobre la prop: mientras la navegación está en vuelo, el pathname ya es el
  // nuevo y el segmento marcado acompaña al usuario sin esperar al render del servidor.
  const current: WorkMode = pathname.startsWith(MODE_ROUTE.compose) ? 'compose' : mode;

  return (
    <Segmented
      size="md"
      value={current}
      aria-label="Dirección: decodificar o codificar"
      options={OPTIONS}
      onChange={(value) => {
        const next: WorkMode = value === 'compose' ? 'compose' : 'decode';
        if (next === current) return;
        markModeSwitch();
        router.push(MODE_ROUTE[next]);
      }}
    />
  );
}
