import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// `cn`: el helper estándar de shadcn/ui. Une clases condicionales (clsx) y resuelve
// conflictos de utilidades Tailwind (tailwind-merge) para que un `className` del
// caller gane sobre el default de la primitiva. Las primitivas de components/ui
// mantienen sus variantes cva AUTOCONTENIDAS (un solo valor por propiedad dentro de
// cada variante), así que la resolución de conflictos de tailwind-merge sobre
// nombres de token del DS —que su config por defecto no conoce— nunca es necesaria
// para el render base; twMerge solo interviene cuando el caller pasa un override.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
