import { cn } from '@/lib/utils';
import { Icon, type IconName } from './icon';

// EmptyState — espejo 1:1 de docs/design-system/components/feedback/EmptyState.jsx.
// Estado cero centrado (historial vacío, sin resultados): la app nunca muestra un
// panel en blanco. icono + título + descripción + acción opcional.
//
// Mapeo del spec a tokens: contenedor py-10 px-6 (--space-10/6), gap-3 (--space-3); el
// medallón del icono es 44px = size-11, rounded-lg, surface-2, text-subtle, border;
// título text-md semibold; descripción text-sm text-muted, ancho máx 380px = max-w-95
// (95×4px, rejilla de spacing del DS); acción mt-1 (--space-1). Cero ramps, cero hex.
interface EmptyStateProps extends React.ComponentProps<'div'> {
  icon?: IconName;
  title?: string;
  description?: string;
  /** Nodo de acción opcional (p. ej. un Button). */
  action?: React.ReactNode;
}

export function EmptyState({
  icon = 'search',
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn('flex flex-col items-center gap-3 px-6 py-10 text-center font-sans', className)}
      {...props}
    >
      <span className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-surface-2 text-text-subtle">
        <Icon name={icon} size={20} />
      </span>
      {title ? <div className="text-md font-semibold text-text">{title}</div> : null}
      {description ? (
        <div className="max-w-95 text-sm leading-snug text-text-muted">{description}</div>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
