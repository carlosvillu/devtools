'use client';

import { cn } from '@/lib/utils';
import { Badge, type DataKind } from '@/components/ui/badge';
import { CodeBlock } from '@/components/ui/code-block';
import { ConfidenceBar } from '@/components/ui/confidence-bar';
import { Icon, type IconName } from '@/components/ui/icon';
import { Select } from '@/components/ui/select';

// StepCard — espejo 1:1 de docs/design-system/components/chain/StepCard.jsx.
// La unidad estrella del producto: un paso de la cadena de desenredado. Apila el índice
// del paso, kind detectado + confianza, transform aplicado, alternativas de ambigüedad
// (O5), un picker opcional para desviar la cadena (O4), el valor de salida, las notas de
// la transformación y — en el último paso — el motivo terminal. SOLO compone primitivas
// del DS (Badge, ConfidenceBar, CodeBlock, Icon, Select); no reimplementa nada.
//
// PRESENTACIONAL PURO (TD.5): props planas de tipos LOCALES. `DataKind` es el vocabulario
// del DS (components/ui/badge), no dominio; `transforms` se tipa con la forma plana que
// consume Select. PROHIBIDO importar de `@app/core` — lo garantiza la regla de lint scoped
// en eslint.config.ts. Los wrappers de dominio (que hidratan esto desde @app/core) llegan
// con la feature T1.5.
//
// 'use client': cablea handlers de DOM (el `onChange` del Select → `onSelectTransform`),
// así que es una hoja cliente, igual que CopyButton. CodeBlock (server, sin estado) se
// renderiza como hijo sin problema.
//
// TOKENS/DESVIACIÓN: todos los valores del spec son tokens del DS. Los tamaños del spec
// que en el mirror van como px literales se expresan con la rejilla de 4px del DS
// (`size-6.5` = 26px del rail, `gap-1.5` = 6px, `gap-1.75` = 7px, `max-w-80` = 320px del
// picker) — mismo mecanismo fraccional ya bendecido en Badge (`h-4.5`) y ConfidenceBar.
// La sombra usa la clase `shadow-sm` mapeada al token (idéntico a Card de TD.3), no un
// literal. Cero hex, cero px crudos.

// `Terminal` se mantiene interno (sin export) hasta que un consumidor real lo importe:
// knip rechaza exports huérfanos y este repo difiere la exportación al primer uso (la
// feature T1.5 la promocionará). El spec del DS sí lo publica; será un cambio de una línea.
type Terminal = 'text' | 'no_transform' | 'max_depth' | 'cycle' | 'error';

type TerminalTone = 'neutral' | 'warning' | 'danger';

// Motivo terminal → { tono, etiqueta } — verbatim del mirror (StepCard.jsx TERMINAL).
const TERMINAL: Record<Terminal, { tone: TerminalTone; label: string }> = {
  text: { tone: 'neutral', label: 'Dato de texto — fin de la cadena' },
  no_transform: { tone: 'neutral', label: 'Sin más transformaciones aplicables' },
  max_depth: { tone: 'warning', label: 'Profundidad máxima alcanzada (8 pasos)' },
  cycle: { tone: 'warning', label: 'Ciclo detectado — cadena cortada' },
  error: { tone: 'danger', label: 'Error en la transformación' },
};

// Color de texto del marcador terminal por tono (currentColor lo hereda el Icon).
const TERMINAL_FG: Record<TerminalTone, string> = {
  neutral: 'text-text-subtle',
  warning: 'text-warning',
  danger: 'text-danger',
};

interface StepCardProps extends React.ComponentProps<'div'> {
  /** Índice del paso (base 0) mostrado en el rail. */
  index: number;
  /** Kind detectado en este paso (detección elegida). */
  kind?: DataKind;
  /** Confianza de la detección elegida (0..1). */
  confidence?: number;
  /** Id del transform aplicado (p. ej. "jwt.decode"); se omite si es terminal. */
  applied?: string;
  /** Otros kinds plausibles (confianza ≥ 0.3) — «también podría ser» (O5). */
  alternatives?: DataKind[];
  /** Opciones de transform para el picker de desvío (O4), forma plana que consume Select. */
  transforms?: (string | { value: string; label: string })[];
  /** Valor de salida del paso (renderizado en un CodeBlock). */
  output?: string;
  /** Notas del transform (p. ej. la caducidad de un JWT en lenguaje natural). */
  notes?: string[];
  /** Motivo terminal — pinta el marcador de fin de cadena en el último paso. */
  terminal?: Terminal;
  /** Llamado con el transform elegido cuando el usuario desvía la cadena. */
  onSelectTransform?: (id: string) => void;
}

export function StepCard({
  index,
  kind,
  confidence,
  applied,
  alternatives = [],
  transforms = [],
  output,
  notes = [],
  terminal,
  onSelectTransform,
  className,
  ...props
}: StepCardProps) {
  const hasAlt = alternatives.length > 0;
  const term = terminal ? TERMINAL[terminal] : null;
  const termIcon: IconName = term && term.tone !== 'neutral' ? 'alert-triangle' : 'check';

  return (
    <div
      data-slot="step-card"
      className={cn(
        'relative flex gap-3 rounded-lg border border-border bg-surface p-4 font-sans shadow-sm',
        className,
      )}
      {...props}
    >
      {/* rail del índice de paso */}
      <div className="flex shrink-0 flex-col items-center">
        <span className="inline-flex size-6.5 items-center justify-center rounded-full border border-border-strong bg-surface-2 font-mono text-xs font-semibold text-text-muted">
          {index}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* cabecera de detección */}
        <div className="flex flex-wrap items-center gap-3">
          {kind ? <Badge kind={kind} /> : null}
          {confidence != null ? <ConfidenceBar value={confidence} /> : null}
          {applied ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-text-muted">
              <Icon name="corner-down-right" size={13} />
              <code className="font-mono text-text">{applied}</code>
            </span>
          ) : null}
        </div>

        {/* alternativas de ambigüedad (O5/I8) */}
        {hasAlt ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span>También podría ser:</span>
            {alternatives.map((alt) => (
              <Badge key={alt} kind={alt} size="sm" outline />
            ))}
          </div>
        ) : null}

        {/* picker de transform alternativo (O4) */}
        {transforms.length > 1 ? (
          <div className="flex max-w-80 items-center gap-2">
            <span className="whitespace-nowrap text-xs text-text-muted">Transformación:</span>
            <Select
              mono
              size="sm"
              aria-label="Transformación aplicada"
              value={applied}
              options={transforms}
              onChange={(e) => onSelectTransform?.(e.target.value)}
            />
          </div>
        ) : null}

        {/* salida */}
        {output != null ? <CodeBlock kind={kind} value={output} wrap /> : null}

        {/* notas (p. ej. exp de un jwt) */}
        {notes.length > 0 ? (
          <div className="flex flex-col gap-1">
            {notes.map((note, i) => (
              <span
                // Notas sin id natural; orden posicional estable, sin reordenación.
                key={i}
                className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted"
              >
                <Icon name="info" size={12} className="text-accent" />
                {note}
              </span>
            ))}
          </div>
        ) : null}

        {/* marcador terminal */}
        {term ? (
          <div className={cn('inline-flex items-center gap-1.75 text-xs', TERMINAL_FG[term.tone])}>
            <Icon name={termIcon} size={13} />
            {term.label}
          </div>
        ) : null}
      </div>
    </div>
  );
}
