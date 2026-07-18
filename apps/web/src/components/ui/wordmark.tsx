import { cn } from '@/lib/utils';

// Wordmark — espejo 1:1 de docs/design-system/components/brand/Wordmark.jsx.
// La marca `devtools` en mono con el bloque-cursor de acento parpadeante (fuente:
// docs/design-system/guidelines/brand-wordmark.html). No hay logo: este wordmark ES la
// marca. Presentacional puro, sin estado → Server Component (sin 'use client').
//
// TOKENS/DESVIACIÓN: el color del texto usa `text-text` (adaptativo al tema: oscuro en
// claro, claro en oscuro) en lugar del `--gray-0` del specimen, que es blanco-sobre-oscuro
// SOLO para la card. El cursor usa `bg-accent`. Los tamaños del spec (font 22/34/44, cursor
// 7×14 / 11×22 / 14×28, radio 1px, tracking -0.01em) NO tienen token: van por `style` inline
// (excepción sancionada §3.1 para px no tokenizables), con los COLORES siempre en clase de
// token. El margen de 6px sí casa la rejilla → `ml-1.5`.
//
// REDUCED-MOTION: el parpadeo es la única animación en bucle del DS. Se apaga con
// `motion-reduce:animate-none`: sin animación, el bloque queda en su opacidad por defecto
// (1) = sólido y VISIBLE — el estado nunca depende del movimiento (disciplina de TD.5). La
// animación `cursor-blink` y su keyframe viven en globals.css (mecanismo de compilación, no
// se sube al DS).

type WordmarkSize = 'sm' | 'md' | 'lg';

const SIZES: Record<WordmarkSize, { font: number; cw: number; ch: number }> = {
  sm: { font: 22, cw: 7, ch: 14 },
  md: { font: 34, cw: 11, ch: 22 },
  lg: { font: 44, cw: 14, ch: 28 },
};

interface WordmarkProps extends React.ComponentProps<'span'> {
  /** Escala. Por defecto "md" (34px, como el specimen del guideline). */
  size?: WordmarkSize;
  /** Si el cursor parpadea. Por defecto true. Siempre se detiene bajo prefers-reduced-motion. */
  blink?: boolean;
}

export function Wordmark({ size = 'md', blink = true, className, style, ...props }: WordmarkProps) {
  const s = SIZES[size];
  return (
    <span
      data-slot="wordmark"
      className={cn('inline-flex items-center font-mono font-semibold text-text', className)}
      style={{ fontSize: s.font, letterSpacing: '-0.01em', ...style }}
      {...props}
    >
      devtools
      <span
        aria-hidden="true"
        data-slot="wordmark-cursor"
        className={cn(
          'ml-1.5 bg-accent',
          blink && 'animate-cursor-blink motion-reduce:animate-none',
        )}
        style={{ width: s.cw, height: s.ch, borderRadius: 1 }}
      />
    </span>
  );
}
