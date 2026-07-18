import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Icon, type IconName } from './icon';

// Button — espejo 1:1 de docs/design-system/components/forms/Button.jsx.
// Nombres de variante = los del DS: primary · secondary · ghost · danger.
// Tamaños = sm (30px) · md (36px) · lg (44px) — alturas del DS traducidas a spacing
// FRACCIONARIO (n×4px) para casar el px exacto sin valores arbitrarios: 30=7.5, 36=9,
// 44=11; paddings 10/14/18px = px-2.5/3.5/4.5.
//
// Colores: SOLO clases semánticas de token del DS. Los estados de hover del DS:
// primary → --accent-hover (token), secondary/ghost → --surface-2, danger → --red-700.
// El hover de danger oscurece a `--danger-hover` (= red-700, espeja a `--accent-hover`).
// Este token semántico se añadió al DS en TD.2 tras detectar que el spec usaba
// `var(--red-700)` directo (no había semántico); ya está volcado en globals.css y en el
// espejo, con `bg-danger-hover` mapeado en @theme. Contraste AA verificado por el bucle:
// blanco/red-600 = 5.4, blanco/red-700 = 7.36. El Button es 100% semántico (0 ramps).
const buttonVariants = cva(
  'items-center justify-center gap-2 rounded-base font-sans font-medium whitespace-nowrap select-none cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'border border-accent bg-accent text-accent-fg hover:bg-accent-hover',
        secondary: 'border border-border-strong bg-surface text-text hover:bg-surface-2',
        ghost: 'border border-transparent bg-transparent text-text hover:bg-surface-2',
        danger: 'border border-danger bg-danger text-accent-fg hover:bg-danger-hover',
      },
      size: {
        sm: 'h-control-sm px-2.5 text-sm',
        md: 'h-control-md px-3.5 text-base',
        lg: 'h-control-lg px-4.5 text-base',
      },
      block: {
        true: 'flex w-full',
        false: 'inline-flex w-auto',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  /** Icono inicial (nombre del inventario del DS). */
  icon?: IconName;
  /** Icono final. */
  iconRight?: IconName;
}

export function Button({
  className,
  variant,
  size,
  block,
  icon,
  iconRight,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  // Tamaño de icono por tamaño de control, 1:1 con Button.jsx: sm→14, md/lg→16.
  const iconSize = size === 'sm' ? 14 : 16;
  return (
    <button
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    >
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={iconSize} /> : null}
    </button>
  );
}
