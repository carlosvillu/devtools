import { cn } from '@/lib/utils';

// Field — espejo 1:1 de docs/design-system/components/forms/Field.jsx.
// Envoltorio de campo: apila label + control + hint/error. `error` REEMPLAZA a `hint`
// y va en color danger. `required` añade un asterisco danger. Se compone alrededor de
// Input/Textarea/Select. La asociación label↔control es explícita vía `htmlFor` (+ el
// `id` del control), como en el spec — Field no genera ids automáticos.
interface FieldProps {
  /** Texto del label sobre el control. */
  label?: string;
  /** id del control al que apunta el label. */
  htmlFor?: string;
  /** Texto de ayuda (muted) bajo el control. */
  hint?: string;
  /** Texto de error (reemplaza a hint, color danger). */
  error?: string;
  required?: boolean;
  children?: React.ReactNode;
  className?: string;
  /** Estilos inline sobre el div contenedor (contrato del DS: Field.jsx los propaga). */
  style?: React.CSSProperties;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className,
  style,
}: FieldProps) {
  return (
    <div data-slot="field" className={cn('flex flex-col gap-2', className)} style={style}>
      {label ? (
        <label htmlFor={htmlFor} data-slot="field-label" className="text-sm font-medium text-text">
          {label}
          {required ? <span className="ml-0.75 text-danger">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span data-slot="field-error" className="text-xs text-danger">
          {error}
        </span>
      ) : hint ? (
        <span data-slot="field-hint" className="text-xs text-text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
