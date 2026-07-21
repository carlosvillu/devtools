'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Los dos destinos de la nav de escritorio, con su ESTADO ACTIVO.
//
// POR QUÉ ES UN CLIENT COMPONENT: el mockup (docs/mockups/history.html → `HistoryClaro`,
// `active:"history"`) resalta el destino de la pantalla en curso y atenúa el otro — en
// `/analyze` se resalta «el campo», en `/history` se resalta «historial». Saber en qué ruta
// estamos
// exige `usePathname()`, que es un hook de cliente, y `SiteHeader` es un Server Component
// ASÍNCRONO (lee la sesión contra la BD) que por tanto no puede usarlo. Se extrae por eso
// SOLO esta pieza a la frontera de cliente (frontend §3: `'use client'` en las hojas), en
// vez de convertir la cabecera entera.
//
// TOKENS: `text-text` (activo) / `text-text-muted` (inactivo) y los pesos 600/500 son los
// del mockup. Cero valores crudos.
// F5/T5.1: el campo se mudó de `/` a `/analyze` (`/` solo redirige). La nav apunta al destino
// REAL para que el estado activo (`aria-current` + resalte) case con la ruta en la que el
// usuario acaba. El Wordmark del header sí sigue en `/` (logo → inicio = landing).
const LINKS = [
  { href: '/analyze', label: 'el campo' },
  { href: '/history', label: 'historial' },
] as const;

export function SiteNavLinks() {
  const pathname = usePathname();

  return (
    <>
      {LINKS.map(({ href, label }) => {
        // Un destino queda activo en su ruta y en sus subrutas (p. ej. `/history/…`).
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(active ? 'font-semibold text-text' : 'font-medium text-text-muted')}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
