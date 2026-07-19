'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Los dos destinos de la nav de escritorio, con su ESTADO ACTIVO.
//
// POR QUÉ ES UN CLIENT COMPONENT: el mockup (docs/mockups/history.html → `HistoryClaro`,
// `active:"history"`) resalta el destino de la pantalla en curso y atenúa el otro — en `/`
// se resalta «el campo», en `/history` se resalta «historial». Saber en qué ruta estamos
// exige `usePathname()`, que es un hook de cliente, y `SiteHeader` es un Server Component
// ASÍNCRONO (lee la sesión contra la BD) que por tanto no puede usarlo. Se extrae por eso
// SOLO esta pieza a la frontera de cliente (frontend §3: `'use client'` en las hojas), en
// vez de convertir la cabecera entera.
//
// TOKENS: `text-text` (activo) / `text-text-muted` (inactivo) y los pesos 600/500 son los
// del mockup. Cero valores crudos.
const LINKS = [
  { href: '/', label: 'el campo' },
  { href: '/history', label: 'historial' },
] as const;

export function SiteNavLinks() {
  const pathname = usePathname();

  return (
    <>
      {LINKS.map(({ href, label }) => {
        // `/` solo está activa en la raíz exacta; el resto, también en sus subrutas.
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
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
