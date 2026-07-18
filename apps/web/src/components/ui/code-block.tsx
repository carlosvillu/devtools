import { cn } from '@/lib/utils';
import { CopyButton } from './copy-button';
import { Icon } from './icon';

// CodeBlock — espejo 1:1 de docs/design-system/components/display/CodeBlock.jsx.
// Bloque monoespaciado oscuro para un valor de dato — la superficie «terminal»,
// SIEMPRE oscura (tokens `--code-*`), independiente del tema. Cabecera opcional con
// etiqueta de kind y botón de copia. Cada salida de paso usa uno de estos.
//
// Server Component (sin estado): renderiza el CopyButton (client) como hijo. Valores
// desde tokens `--code-*` (mapeados a `bg-code-bg`, `text-code-fg`…). Excepciones
// inline: `maxHeight` (prop dinámico) y `tabSize`; y el override de `--surface-2` que se
// pasa al CopyButton para teñir su hover de blanco translúcido sobre la cabecera oscura
// (el DS no define un token de hover para superficie de código → `rgba(255,255,255,.08)`
// hardcodeado, tal como el mirror; DOCUMENTADO como desviación menor a «cero hardcode»).
interface CodeBlockProps extends React.ComponentProps<'div'> {
  /** Contenido a renderizar (string o nodos resaltados). */
  children?: React.ReactNode;
  /** String crudo para el botón de copia (cae al children string). */
  value?: string;
  /** Etiqueta de cabecera. Default `kind` o "output". */
  title?: string;
  /** DataKind mostrado en la cabecera cuando no hay title. */
  kind?: string;
  /** Ajuste suave de líneas largas en vez de scroll horizontal. */
  wrap?: boolean;
  /** Muestra cabecera + botón de copia. Default true. */
  copyable?: boolean;
  /** Altura máx en px antes de hacer scroll. Default 320. */
  maxHeight?: number;
}

export function CodeBlock({
  children,
  value,
  title,
  kind,
  wrap = false,
  copyable = true,
  maxHeight = 320,
  className,
  ...props
}: CodeBlockProps) {
  const text = value ?? (typeof children === 'string' ? children : '');
  return (
    <div
      data-slot="code-block"
      className={cn(
        'overflow-hidden rounded-md border border-code-border bg-code-bg font-mono',
        className,
      )}
      {...props}
    >
      {title || copyable ? (
        <div className="flex h-8.5 items-center justify-between border-b border-code-border bg-code-surface pr-2 pl-3">
          <span className="inline-flex items-center gap-1.75 text-xs text-code-muted">
            <Icon name="terminal" size={13} />
            {title ?? kind ?? 'output'}
          </span>
          {copyable ? (
            <CopyButton
              value={text}
              label="Copiar"
              size="sm"
              className="text-code-muted"
              style={{ '--surface-2': 'rgba(255,255,255,.08)' } as React.CSSProperties}
            />
          ) : null}
        </div>
      ) : null}
      <pre
        className={cn(
          'm-0 overflow-auto px-3.5 py-3 text-sm leading-code text-code-fg',
          wrap ? 'break-words whitespace-pre-wrap' : 'whitespace-pre',
        )}
        style={{ maxHeight, tabSize: 2 }}
      >
        <code className="font-mono">{children ?? value}</code>
      </pre>
    </div>
  );
}
