import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Icon, type IconName } from './icon';

// IconButton — espejo 1:1 de docs/design-system/components/forms/IconButton.jsx.
// Botón cuadrado icon-only. Variantes del DS: ghost (default) · secondary (bordered).
// Tamaños sm/md/lg = 28/32/40px → size-7/8/10. `active` = estado toggled (visual).
//
// a11y: `label` (obligatorio) se cablea como `aria-label` Y `title` (tooltip), tal
// como manda el spec/prompt — es el nombre accesible del control (la Verificación
// exige «operable por rol y accessible name»). El color de texto vive DENTRO de la
// variante `active` (no en base) para no depender de la resolución de conflictos de
// tailwind-merge sobre nombres de token del DS que su config no conoce.
const iconButtonVariants = cva(
  'inline-flex items-center justify-center p-0 rounded-base cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45',
  {
    variants: {
      variant: {
        ghost: 'border border-transparent bg-transparent hover:bg-surface-2',
        secondary: 'border border-border-strong bg-surface hover:bg-surface-2',
      },
      size: {
        sm: 'size-7 text-sm',
        md: 'size-8 text-base',
        lg: 'size-10 text-base',
      },
      active: {
        true: 'bg-surface-2 text-text',
        false: 'text-text-muted',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md', active: false },
  },
);

interface IconButtonProps
  extends
    Omit<React.ComponentProps<'button'>, 'aria-label'>,
    VariantProps<typeof iconButtonVariants> {
  /** Icono (nombre del inventario del DS). */
  icon: IconName;
  /** Nombre accesible (también el tooltip). Obligatorio. */
  label: string;
}

export function IconButton({
  className,
  icon,
  label,
  variant,
  size,
  active,
  type = 'button',
  ...props
}: IconButtonProps) {
  // Tamaño de glifo por tamaño, 1:1 con IconButton.jsx: sm→14, md→16, lg→18.
  const glyphSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;
  return (
    <button
      type={type}
      data-slot="icon-button"
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ variant, size, active }), className)}
      {...props}
    >
      <Icon name={icon} size={glyphSize} />
    </button>
  );
}
