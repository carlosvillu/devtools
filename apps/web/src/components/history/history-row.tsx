'use client';

import { cn } from '@/lib/utils';
import { Badge, type DataKind } from '@/components/ui/badge';
import { ChainSummary } from '@/components/chain/chain-summary';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';

// HistoryRow — espejo 1:1 de docs/design-system/components/history/HistoryRow.jsx.
// Una fila de la lista `/history`: preview redactado (mono, truncado), kind detectado,
// resumen de cadena, tiempo relativo y acciones reabrir/borrar que aparecen al hover.
// SOLO compone primitivas del DS (Badge, ChainSummary, Icon, IconButton).
//
// D7 (invariante duro): muestra SOLO el `preview` redactado + el resumen de kind/cadena,
// JAMÁS el valor crudo. El componente ni siquiera recibe el valor crudo — su contrato de
// props no lo incluye.
//
// PRESENTACIONAL PURO (TD.5): props planas; `DataKind` es vocabulario del DS, no dominio.
// PROHIBIDO importar de `@app/core` (regla de lint scoped en eslint.config.ts). El wrapper
// de dominio (que mapea una entrada de historial de @app/core a estas props) llega con T2.2.
//
// 'use client': cablea `onClick` (reabrir/borrar) en los IconButton → hoja cliente.
//
// DESVIACIÓN DELIBERADA vs el spec (misma que Card/CopyButton de TD.3): el mirror conmuta
// el fondo y la visibilidad de las acciones con `React.useState(hover)` + onMouseEnter/Leave.
// Aquí se hace con `group`/`group-hover:` de Tailwind — resultado visual idéntico, SIN
// estado, y sirve mejor la cláusula prefers-reduced-motion: el estado visible (fondo,
// opacidad de las acciones) lo fija el hover, no la transición, así que apagar la
// animación NO pierde el estado (solo deja de interpolarlo). Enriquecimiento a11y sobre el
// spec: `focus-within:opacity-100` revela las acciones también al navegar por teclado (los
// botones son operables en todo momento — están siempre en el DOM, solo cambia la opacidad).
//
// TOKENS: padding `py-3 px-4` (space-3/space-4); gaps 6px/5px/2px = `gap-1.5`/`gap-1.25`/
// `gap-0.5`; opacidad de reposo de las acciones 0.35 = `opacity-35`. Cero hex, cero px crudos.
interface HistoryRowProps extends React.ComponentProps<'div'> {
  /** Preview redactado y truncado (≤120 chars, D7) — nunca el input crudo. */
  preview: string;
  /** Kind detectado del paso 0. */
  kind?: DataKind;
  /** Cadena aplicada, como kinds, para el resumen. */
  chain?: DataKind[];
  /** String de tiempo relativo, p. ej. "hace 3 h". */
  time?: string;
  onReopen?: () => void;
  onDelete?: () => void;
}

export function HistoryRow({
  preview,
  kind,
  chain = [],
  time,
  onReopen,
  onDelete,
  className,
  ...props
}: HistoryRowProps) {
  return (
    <div
      data-slot="history-row"
      className={cn(
        'group flex items-center gap-4 border-b border-border bg-surface px-4 py-3 font-sans transition-colors hover:bg-surface-2',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <code className="block max-w-full truncate font-mono text-sm text-text">{preview}</code>
        <div className="flex flex-wrap items-center gap-3">
          {kind ? <Badge kind={kind} size="sm" /> : null}
          {chain.length > 0 ? <ChainSummary kinds={chain} size="sm" /> : null}
        </div>
      </div>

      <span className="inline-flex items-center gap-1.25 whitespace-nowrap text-xs tabular-nums text-text-subtle">
        <Icon name="clock" size={12} />
        {time}
      </span>

      <div className="flex gap-0.5 opacity-35 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {onReopen ? (
          <IconButton icon="reopen" label="Reabrir" size="sm" onClick={onReopen} />
        ) : null}
        {onDelete ? <IconButton icon="trash" label="Borrar" size="sm" onClick={onDelete} /> : null}
      </div>
    </div>
  );
}
