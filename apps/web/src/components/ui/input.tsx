import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Icon, type IconName } from './icon';

// Input — espejo 1:1 de docs/design-system/components/forms/Input.jsx.
// Input de texto de una línea. Alturas sm/md/lg = 30/36/44px → h-control-sm/md/lg
// (token `--control-h-*` del DS vía @theme, no el literal).
// `invalid` → borde danger; `mono` → familia mono; `icon` → icono inicial (SVG del DS).
//
// Orden de precedencia del borde (del spec): invalid GANA sobre focus. Por eso el
// borde de foco (`focus-visible:border-accent`) vive en `invalid:false` y NO se
// aplica cuando `invalid` es true — con invalid el borde se queda danger aunque esté
// enfocado. El anillo de foco (--ring) sí se muestra en ambos casos.
const inputVariants = cva(
  'w-full rounded-base border bg-surface text-text outline-none transition-colors placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60',
  {
    variants: {
      size: {
        sm: 'h-control-sm text-sm',
        md: 'h-control-md text-base',
        lg: 'h-control-lg text-base',
      },
      invalid: {
        true: 'border-danger',
        false: 'border-border-strong focus-visible:border-accent',
      },
      mono: {
        true: 'font-mono',
        false: 'font-sans',
      },
      withIcon: {
        true: 'pr-3 pl-9',
        false: 'px-3',
      },
    },
    defaultVariants: { size: 'md', invalid: false, mono: false, withIcon: false },
  },
);

interface InputProps
  extends
    Omit<React.ComponentProps<'input'>, 'size'>,
    Omit<VariantProps<typeof inputVariants>, 'withIcon'> {
  /** Icono inicial (nombre del inventario del DS). */
  icon?: IconName;
}

export function Input({
  className,
  size,
  invalid,
  mono,
  icon,
  type = 'text',
  ...props
}: InputProps) {
  return (
    <div data-slot="input-wrapper" className="relative flex w-full items-center">
      {icon ? (
        <Icon
          name={icon}
          size={16}
          className="pointer-events-none absolute left-3 text-text-subtle"
        />
      ) : null}
      <input
        type={type}
        data-slot="input"
        aria-invalid={invalid ? true : undefined}
        className={cn(inputVariants({ size, invalid, mono, withIcon: !!icon }), className)}
        {...props}
      />
    </div>
  );
}
