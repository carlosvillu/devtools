import * as React from "react";

export type DialogConfirmTone = "primary" | "danger";

/**
 * Modal confirmation dialog — "delete one / delete all, with confirmation".
 * In the app it is built on the NATIVE <dialog> element (showModal/close): focus trap,
 * Escape-to-close, ::backdrop and aria-modal come for free, no library.
 * @startingPoint section="Overlay" subtitle="A confirmation dialog" viewport="700x360"
 */
export interface DialogProps {
  /** Controlled open/closed state. */
  open: boolean;
  /** Called when the dialog requests to close (Escape, backdrop click, cancel). */
  onOpenChange: (open: boolean) => void;
  /** Called when the confirm action is pressed. */
  onConfirm: () => void;
  /** Dialog title — wired to aria-labelledby. */
  title: string;
  /** Optional supporting copy — wired to aria-describedby. */
  description?: string;
  /** Confirm button label. Default "Confirmar". */
  confirmLabel?: string;
  /** Cancel button label. Default "Cancelar". */
  cancelLabel?: string;
  /** Button tone for the confirm action. "danger" for destructive confirmations. Default "primary". */
  confirmTone?: DialogConfirmTone;
  /** Extra content rendered between the description and the actions. */
  children?: React.ReactNode;
}

/** A native-<dialog>-backed modal for confirmations. Composes Button for its actions. */
export function Dialog(props: DialogProps): JSX.Element;
