import { cn } from '@/lib/utils';

// ConfidenceBar — espejo 1:1 de docs/design-system/components/display/ConfidenceBar.jsx.
// Barra compacta con la confianza de un detector (0..1). El color de relleno sigue los
// umbrales del producto: ≥0.7 verde, ≥0.3 ámbar, si no gris — casando las reglas de
// ambigüedad (I8).
//
// O5 (la ambigüedad se COMUNICA, no se insinúa — requisito duro): la confianza NO
// depende solo del color. Se comunica por DOS canales no cromáticos adicionales:
//   1) la LONGITUD del relleno (width = v×100%), legible para un daltónico, y
//   2) la ETIQUETA NUMÉRICA `v.toFixed(2)` (showValue, por defecto true).
// El spec ya trae ambos; se replican fielmente (no se añade nivel textual: sería
// desviarse del 1:1). Con `showValue={false}` quedan longitud + color (nunca color solo).
//
// INLINE (irreducible): el ancho de la pista (`width`, prop), el ancho del relleno
// (`v×100%`, dinámico) y el color de nivel (`--success`/`--warning`/`--text-subtle`,
// dinámico) no tienen utilidad de clase → van en `style`. El resto son tokens.
function level(v: number): string {
  if (v >= 0.7) return 'var(--success)';
  if (v >= 0.3) return 'var(--warning)';
  return 'var(--text-subtle)';
}

interface ConfidenceBarProps extends React.ComponentProps<'span'> {
  /** Confianza 0..1. */
  value: number;
  /** Mostrar el valor numérico (0.00). Default true. */
  showValue?: boolean;
  /** Ancho de la pista en px. Default 64. */
  width?: number;
}

export function ConfidenceBar({
  value,
  showValue = true,
  width = 64,
  className,
  style,
  ...props
}: ConfidenceBarProps) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <span
      data-slot="confidence-bar"
      className={cn('inline-flex items-center gap-2', className)}
      style={style}
      {...props}
    >
      <span
        className="relative h-1.25 shrink-0 overflow-hidden rounded-full border border-border bg-surface-inset"
        style={{ width }}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            width: `${String(v * 100)}%`,
            background: level(v),
            transition: 'width var(--dur-slow) var(--ease)',
          }}
        />
      </span>
      {showValue ? (
        <span className="min-w-7.5 font-mono text-2xs tabular-nums text-text-muted">
          {v.toFixed(2)}
        </span>
      ) : null}
    </span>
  );
}
