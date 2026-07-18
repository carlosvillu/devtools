import { cn } from '@/lib/utils';
import { Icon, type IconName } from './icon';

// Callout — espejo 1:1 de docs/design-system/components/feedback/Callout.jsx.
// Banner de aviso inline: errores, el mensaje «no se detectó nada» y el aviso de
// privacidad obligatorio de `/`. Tono `security` = variante gris apagada (icono shield).
//
// Mapeo del spec: bg/fg de cada tono son alias semánticos con clase de token
// (`bg-accent-subtle-bg`, `text-accent-subtle-fg`…); el color del icono también
// (`text-accent`, `text-warning`…). El ÚNICO valor sin clase es el color del borde,
// que el DS define con `color-mix(...)` (o `--border-strong` en security): se aplica
// inline vía `borderColor` (excepción sancionada — no hay utilidad para un color-mix).
// Cero ramps crudas, cero hex. `role="note"` conserva la semántica del spec.
type CalloutTone = 'info' | 'warning' | 'danger' | 'success' | 'security';

const TONE: Record<
  CalloutTone,
  { container: string; icon: IconName; iconColor: string; border: string }
> = {
  info: {
    container: 'bg-accent-subtle-bg text-accent-subtle-fg',
    icon: 'info',
    iconColor: 'text-accent',
    border: 'color-mix(in oklab, var(--accent) 28%, transparent)',
  },
  warning: {
    container: 'bg-warning-subtle-bg text-warning-subtle-fg',
    icon: 'alert-triangle',
    iconColor: 'text-warning',
    border: 'color-mix(in oklab, var(--warning) 32%, transparent)',
  },
  danger: {
    container: 'bg-danger-subtle-bg text-danger-subtle-fg',
    icon: 'alert-triangle',
    iconColor: 'text-danger',
    border: 'color-mix(in oklab, var(--danger) 32%, transparent)',
  },
  success: {
    container: 'bg-success-subtle-bg text-success-subtle-fg',
    icon: 'check',
    iconColor: 'text-success',
    border: 'color-mix(in oklab, var(--success) 30%, transparent)',
  },
  security: {
    container: 'bg-surface-2 text-text',
    icon: 'shield',
    iconColor: 'text-text-muted',
    border: 'var(--border-strong)',
  },
};

interface CalloutProps extends React.ComponentProps<'div'> {
  /** Tono. "security" es la variante gris apagada del aviso de privacidad. */
  tone?: CalloutTone;
  title?: string;
  /** Sobrescribe el icono por defecto del tono. */
  icon?: IconName;
  children?: React.ReactNode;
}

export function Callout({
  tone = 'info',
  title,
  icon,
  children,
  className,
  style,
  ...props
}: CalloutProps) {
  const t = TONE[tone];
  return (
    <div
      role="note"
      data-slot="callout"
      className={cn('flex gap-3 rounded-md border px-4 py-3 font-sans', t.container, className)}
      style={{ borderColor: t.border, ...style }}
      {...props}
    >
      <Icon name={icon ?? t.icon} size={18} className={cn('mt-px', t.iconColor)} />
      <div className="flex min-w-0 flex-col gap-0.75">
        {title ? <strong className="text-sm font-semibold">{title}</strong> : null}
        {children ? <div className="text-sm leading-snug text-text">{children}</div> : null}
      </div>
    </div>
  );
}
