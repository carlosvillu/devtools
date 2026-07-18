import { cn } from '@/lib/utils';

// Spinner — espejo 1:1 de docs/design-system/components/feedback/Spinner.jsx.
// Indicador de carga indeterminada (p. ej. mientras se calcula la cadena). Hereda
// `currentColor`; con `label` añade una fila de texto.
//
// El SVG (geometría del anillo) y la animación de giro son IRREDUCIBLES a clases de
// token: se portan verbatim del mirror (misma excepción que Icon.tsx). El giro es una
// keyframe propia `dtds-spin` a 0.7s lineal — se conserva tal cual en vez de
// `animate-spin` de Tailwind (que gira a 1s) para no desviarse del spec. Se apaga con
// `prefers-reduced-motion` (regla global de globals.css). `size` es dinámico → inline.
// El color/tipografía sí son tokens (`text-text-muted`, `text-sm`, `font-sans`).
interface SpinnerProps extends React.ComponentProps<'span'> {
  /** Diámetro en px. Default 16. */
  size?: number;
  /** Texto opcional junto al spinner. */
  label?: string;
}

export function Spinner({ size = 16, label, className, ...props }: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      role="status"
      className={cn('inline-flex items-center gap-2 text-text-muted', className)}
      {...props}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ animation: 'dtds-spin 0.7s linear infinite', display: 'block' }}
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="font-sans text-sm">{label}</span> : null}
      <style>{'@keyframes dtds-spin{to{transform:rotate(360deg)}}'}</style>
    </span>
  );
}
