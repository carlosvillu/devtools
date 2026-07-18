import React from "react";
import { Button } from "../forms/Button.jsx";

// Dialog — modal de CONFIRMACIÓN (borrar una entrada / borrar todas, con confirmación).
// El producto lo consume en /history. Especificación visual: overlay con scrim oscuro
// (color-mix del token --code-bg, la superficie «terminal» siempre oscura) + panel
// centrado (surface, borde, radio de card, sombra de overlay) con título, descripción y
// dos acciones (cancelar secundario + confirmar, cuyo tono es `primary` por defecto y
// `danger` para borrados). Copy en español informal ("tú").
//
// En la app este spec se materializa con el elemento <dialog> NATIVO (showModal/close):
// foco atrapado, cierre con Escape, ::backdrop y aria-modal sin librería. Aquí, como
// specimen estático del panel, se dibuja abierto e inline para mostrar su aspecto.

export function Dialog({
  open = true,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmTone = "primary",
  onConfirm,
  onCancel,
  children,
}) {
  if (!open) return null;
  return (
    <div
      role="presentation"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-4)",
        background: "color-mix(in oklab, var(--code-bg) 70%, transparent)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          width: "100%",
          maxWidth: 420,
          padding: "var(--space-6)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "var(--text-lg)",
              fontWeight: "var(--weight-semibold)",
              letterSpacing: "var(--tracking-tight)",
              color: "var(--text)",
            }}
          >
            {title}
          </h2>
          {description && (
            <p style={{ margin: 0, fontSize: "var(--text-base)", lineHeight: "var(--leading-snug)", color: "var(--text-muted)" }}>
              {description}
            </p>
          )}
          {children}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={confirmTone} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
