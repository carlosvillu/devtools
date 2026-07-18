'use client';

import { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// Dialog — espejo 1:1 de docs/design-system/components/overlay/Dialog.jsx.
// Modal de CONFIRMACIÓN (borrar una entrada / borrar todas, con confirmación); lo
// consume /history (T2.2). Compone el `Button` del DS para sus acciones.
//
// DESVIACIÓN DELIBERADA (sancionada por frontend/design-system.md §4, el MISMO patrón
// que `Select`): la base es el elemento <dialog> NATIVO (`showModal()`/`close()`), NO una
// primitiva portalizada de Base UI ni de @radix-ui/* (vetada por TD.6, y sin instalar). El
// nativo da GRATIS y sin librería lo que un dialog necesita: foco atrapado, cierre con
// Escape, `::backdrop`, semántica `aria-modal` y restauración del foco al disparador al
// cerrar. Cuando a11y+plataforma apuntan al control nativo, gana el nativo y se documenta
// aquí. Beneficio colateral: no arrastra portal/popover, así que no depende de mocks de
// layout en jsdom (jsdom NO implementa showModal/close: los tests usan un polyfill mínimo
// del setup — ver vitest.setup.ts — para ejercitar la lógica de open/cierre).
//
// TOKENS: todos los valores son clases de token del DS. El scrim del `::backdrop` usa
// `backdrop:bg-code-bg/70` — el DS no define un token de scrim propio, así que se reutiliza
// la superficie «terminal» siempre-oscura (`--code-bg`) al 70% como velo, estable en ambos
// temas (un token de scrim dedicado debería añadirse al DS en un DesignSync posterior). El
// panel usa surface/border/rounded-lg/shadow-lg (elevación de overlay del DS). Cero px
// crudos: `max-w-105` = 420px por la rejilla de 4px. Foco inicial en «Cancelar» (autoFocus)
// para no confirmar por accidente.

type DialogConfirmTone = 'primary' | 'danger';

interface DialogProps {
  /** Estado abierto/cerrado (controlado). */
  open: boolean;
  /** Llamado cuando el diálogo pide cerrarse (Escape, clic en el backdrop, cancelar). */
  onOpenChange: (open: boolean) => void;
  /** Llamado al pulsar la acción de confirmar. */
  onConfirm: () => void;
  /** Título — cableado a aria-labelledby. */
  title: string;
  /** Copy de apoyo opcional — cableado a aria-describedby. */
  description?: string;
  /** Etiqueta del botón de confirmar. Por defecto "Confirmar". */
  confirmLabel?: string;
  /** Etiqueta del botón de cancelar. Por defecto "Cancelar". */
  cancelLabel?: string;
  /** Tono del botón de confirmar. "danger" para confirmaciones destructivas. Por defecto "primary". */
  confirmTone?: DialogConfirmTone;
  /** Contenido extra entre la descripción y las acciones. */
  children?: React.ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmTone = 'primary',
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  // Sincroniza el estado controlado con el elemento nativo. showModal() lanza si ya está
  // abierto y close() no hace nada si ya está cerrado: se comprueba `dialog.open` antes.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-slot="dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      // Escape (evento `cancel` → `close`) y cierre programático llegan aquí: se propaga
      // al estado controlado. Si `open` ya es false, es un no-op (sin bucle).
      onClose={() => {
        onOpenChange(false);
      }}
      // Clic en el backdrop: el target es el propio <dialog> (no su contenido) → cerrar.
      onClick={(e) => {
        if (e.target === ref.current) onOpenChange(false);
      }}
      // El padding vive en el contenido, NO en el <dialog>: si estuviera en el <dialog>, un
      // clic en la franja de padding tendría `e.target === <dialog>` y cerraría el modal como
      // si fuera el backdrop. Con el padding en el hijo, solo el backdrop real (fuera del
      // panel) tiene target = <dialog>.
      // `m-auto`: el reset base de Tailwind fija `margin:0` en todo elemento, lo que anula
      // el `margin:auto` con que el navegador centra un `<dialog>:modal` (position:fixed de la
      // hoja de UA). Sin esto el panel queda anclado arriba-izquierda; `m-auto` restaura el
      // centrado nativo en el viewport. (jsdom no posiciona showModal → lo caza el gate CUA.)
      className={cn(
        'm-auto w-full max-w-105 rounded-lg border border-border bg-surface p-0 text-text shadow-lg',
        'backdrop:bg-code-bg/70',
      )}
    >
      <div data-slot="dialog-content" className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-text">
            {title}
          </h2>
          {description ? (
            <p id={descId} className="text-base leading-snug text-text-muted">
              {description}
            </p>
          ) : null}
          {children}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            autoFocus
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmTone}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
