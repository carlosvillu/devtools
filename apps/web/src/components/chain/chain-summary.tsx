import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import { Badge, type DataKind } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';

// ChainSummary — espejo 1:1 de docs/design-system/components/chain/ChainSummary.jsx.
// Resumen compacto de una línea de una cadena: badges de kind unidos por un chevron.
// Se usa en las filas de historial. Presentacional PURO (props planas): NO conoce el
// dominio — el único tipo que toca es `DataKind`, que es el VOCABULARIO del DS (vive en
// components/ui/badge), no un tipo de `@app/core`. La regla de lint scoped en
// eslint.config.ts (TD.5) prohíbe cualquier import de `@app/core` en este directorio.
//
// Server Component (sin estado ni handlers), igual que Card/Badge: nada de 'use client'.
//
// TOKENS: gap 5px (spec) = `gap-1.25` (rejilla de 4px del DS, mismo mecanismo que las
// fracciones ya usadas en Badge — `h-4.5`, `gap-1.25`); chevron a `text-text-subtle` e
// Icon size 13, 1:1 con el spec. Cero hex, cero px crudos.
interface ChainSummaryProps extends React.ComponentProps<'span'> {
  /** Kinds ordenados de la cadena, p. ej. ["base64","json"]. */
  kinds: DataKind[];
  size?: 'sm' | 'md';
}

export function ChainSummary({ kinds, size = 'sm', className, ...props }: ChainSummaryProps) {
  return (
    <span
      data-slot="chain-summary"
      className={cn('inline-flex flex-wrap items-center gap-1.25', className)}
      {...props}
    >
      {kinds.map((kind, i) => (
        // El índice es clave estable: `kinds` es un orden posicional (la misma kind puede
        // repetirse en la cadena) sin id natural, y la lista no se reordena in situ.
        <Fragment key={i}>
          {i > 0 ? <Icon name="chevron-right" size={13} className="text-text-subtle" /> : null}
          <Badge kind={kind} size={size} />
        </Fragment>
      ))}
    </span>
  );
}
