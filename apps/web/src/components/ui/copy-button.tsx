'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './icon';

// CopyButton — espejo 1:1 de docs/design-system/components/display/CopyButton.jsx.
// Botón copiar-al-portapapeles que vira a un check verde ~1.4s. Cada valor de paso de
// la cadena es copiable con uno de estos (O3). Es un <button> REAL: foco, Enter/Espacio
// y clic disparan la copia — la cláusula «operable por teclado» de la Verificación.
//
// A11Y (enriquecido sobre el spec, sin tocar lo visual): el estado «copiado» debe ser
// OBSERVABLE y ACCESIBLE. En modo icono el `aria-label` conmuta a «Copiado» al copiar
// (el mirror lo dejaba fijo, invisible para lector de pantalla); en modo con texto, el
// propio texto visible («Copiado») ya actualiza el nombre accesible. Es a11y intacta,
// invariante del proyecto.
//
// Se sustituye el hover con `useState` del mirror por la clase `hover:bg-surface-2`
// (idéntico resultado, menos estado). El color de hover puede recolorearse desde fuera
// sobrescribiendo `--surface-2` inline (lo hace CodeBlock sobre su cabecera oscura).
// Tamaños del DS: sm 28px (size-7) · md 32px (size-8); glifo 14/16.
interface CopyButtonProps extends Omit<React.ComponentProps<'button'>, 'onCopy'> {
  /** Texto escrito al portapapeles al pulsar. */
  value: string;
  /** aria-label / tooltip (modo icono) y texto por defecto (modo con label). */
  label?: string;
  size?: 'sm' | 'md';
  /** Muestra texto junto al icono en vez de un botón solo-icono. */
  withLabel?: boolean;
  /** Llamado con el valor copiado tras una copia con éxito. */
  onCopy?: (value: string) => void;
}

export function CopyButton({
  value,
  label = 'Copiar',
  size = 'md',
  withLabel = false,
  onCopy,
  className,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    try {
      // `navigator.clipboard` es undefined en contextos no seguros/sin permisos: el
      // guard es real en runtime aunque lib.dom lo tipe como siempre presente.
      const clipboard = navigator.clipboard as Clipboard | undefined;
      if (clipboard?.writeText) await clipboard.writeText(value);
      setCopied(true);
      onCopy?.(value);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setCopied(false);
      }, 1400);
    } catch {
      /* clipboard bloqueado — no-op */
    }
  };

  const glyph = size === 'sm' ? 14 : 16;
  const box = size === 'sm' ? 'size-7' : 'size-8';
  const height = size === 'sm' ? 'h-7' : 'h-8';
  const tone = copied ? 'text-success' : 'text-text-muted';

  if (withLabel) {
    return (
      <button
        type="button"
        data-slot="copy-button"
        onClick={() => void copy()}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-base border border-transparent px-2.5 font-sans text-sm font-medium transition-colors hover:bg-surface-2',
          height,
          tone,
          className,
        )}
        {...props}
      >
        <Icon name={copied ? 'check' : 'copy'} size={glyph} />
        {copied ? 'Copiado' : label}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-slot="copy-button"
      onClick={() => void copy()}
      aria-label={copied ? 'Copiado' : label}
      title={copied ? 'Copiado' : label}
      className={cn(
        'inline-flex items-center justify-center rounded-base border border-transparent transition-colors hover:bg-surface-2',
        box,
        tone,
        className,
      )}
      {...props}
    >
      <Icon name={copied ? 'check' : 'copy'} size={glyph} />
    </button>
  );
}
