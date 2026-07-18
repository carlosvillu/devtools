import { cloneElement, isValidElement, useId, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

// Field — espejo 1:1 de docs/design-system/components/forms/Field.jsx.
// Envoltorio de campo: apila label + control + hint/error. `error` REEMPLAZA a `hint`
// y va en color danger. `required` añade un asterisco danger. Se compone alrededor de
// Input/Textarea/Select. La asociación label↔control es explícita vía `htmlFor` (+ el
// `id` del control).
//
// A11y: además del label, el hint/error se enlazan al control por `aria-describedby`.
// Field genera ids estables con `useId`, los pone en el nodo de hint/error y, vía
// `cloneElement`, inyecta `aria-describedby` en el hijo (fusionándolo con el que el
// caller ya traiga). Como `error` reemplaza a `hint`, solo hay un nodo de mensaje a la
// vez → se describe por ese. El estado inválido lo sigue controlando el caller (prop
// `invalid` de Input/Textarea): Field no fuerza `aria-invalid`.
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
  // ids estables para enlazar el control con su hint/error vía aria-describedby.
  const reactId = useId();
  const hintId = `${reactId}-hint`;
  const errorId = `${reactId}-error`;
  const messageId = error ? errorId : hint ? hintId : undefined;

  let control = children;
  if (isValidElement(children) && messageId !== undefined) {
    const child = children as ReactElement<{ 'aria-describedby'?: string }>;
    const existing = child.props['aria-describedby'];
    control = cloneElement(child, {
      'aria-describedby': existing ? `${existing} ${messageId}` : messageId,
    });
  }

  return (
    <div data-slot="field" className={cn('flex flex-col gap-2', className)} style={style}>
      {label ? (
        <label htmlFor={htmlFor} data-slot="field-label" className="text-sm font-medium text-text">
          {label}
          {required ? <span className="ml-0.75 text-danger">*</span> : null}
        </label>
      ) : null}
      {control}
      {error ? (
        <span id={errorId} data-slot="field-error" className="text-xs text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} data-slot="field-hint" className="text-xs text-text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
