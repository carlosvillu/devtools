import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Card — espejo 1:1 de docs/design-system/components/display/Card.jsx.
// Panel de superficie genérico (formularios de auth, secciones de contenido).
// Variantes con los nombres del DS: padding sm/md/lg (--space-3/4/6 = p-3/4/6),
// `inset` (hundido: surface-2, sin sombra), `hover` (se eleva al pasar el ratón).
//
// DESVIACIÓN DELIBERADA vs el spec: el mirror implementa el hover con React.useState
// (onMouseEnter/Leave) para conmutar borderColor/boxShadow. Aquí se hace con las
// variantes `hover:` de Tailwind (`hover:border-border-strong hover:shadow-md`) —
// resultado idéntico y SIN estado, por lo que Card se queda como Server Component
// (nada de 'use client'). Todos los valores son tokens del DS.
const cardVariants = cva('rounded-lg border border-border transition-[border-color,box-shadow]', {
  variants: {
    padding: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
    inset: {
      true: 'bg-surface-2 shadow-none',
      false: 'bg-surface shadow-sm',
    },
    hover: {
      true: 'hover:border-border-strong hover:shadow-md',
      false: '',
    },
  },
  defaultVariants: { padding: 'md', inset: false, hover: false },
});

interface CardProps extends React.ComponentProps<'div'>, VariantProps<typeof cardVariants> {
  children?: React.ReactNode;
}

export function Card({ className, padding, inset, hover, children, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ padding, inset, hover }), className)}
      {...props}
    >
      {children}
    </div>
  );
}
