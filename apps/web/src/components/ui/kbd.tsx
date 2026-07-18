import { cn } from '@/lib/utils';

// Kbd — espejo 1:1 de docs/design-system/components/display/Kbd.jsx.
// Tecla de teclado (key cap): devtools es keyboard-first y muestra los atajos con
// estas. Es PRESENTACIONAL — un `<kbd>` semántico, sin interacción. La cláusula
// «operable por teclado» de la Verificación no le aplica: no hay nada que operar (no
// añadimos tabIndex/handlers). Su a11y es el elemento semántico correcto.
//
// Mapeo del spec a clases de token: minWidth 20 / height 20 = size 5 (min-w-5 h-5),
// padding "0 6px" = px-1.5, borde inferior de 2px (relieve de tecla) = border-b-2,
// resto verbatim en tokens. Todos los valores salen del DS; cero ramps, cero hardcode.
interface KbdProps extends React.ComponentProps<'kbd'> {
  children?: React.ReactNode;
}

export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-b-2 border-border-strong bg-surface px-1.5 font-mono text-2xs leading-none font-medium text-text-muted',
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
