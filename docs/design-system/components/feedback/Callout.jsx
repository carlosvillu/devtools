import React from "react";
import { Icon } from "../display/Icon.jsx";

const TONE = {
  info:    { icon: "info", fg: "var(--accent-subtle-fg)", bg: "var(--accent-subtle-bg)", bd: "color-mix(in oklab, var(--accent) 28%, transparent)", accent: "var(--accent)" },
  warning: { icon: "alert-triangle", fg: "var(--warning-subtle-fg)", bg: "var(--warning-subtle-bg)", bd: "color-mix(in oklab, var(--warning) 32%, transparent)", accent: "var(--warning)" },
  danger:  { icon: "alert-triangle", fg: "var(--danger-subtle-fg)", bg: "var(--danger-subtle-bg)", bd: "color-mix(in oklab, var(--danger) 32%, transparent)", accent: "var(--danger)" },
  success: { icon: "check", fg: "var(--success-subtle-fg)", bg: "var(--success-subtle-bg)", bd: "color-mix(in oklab, var(--success) 30%, transparent)", accent: "var(--success)" },
  security:{ icon: "shield", fg: "var(--text)", bg: "var(--surface-2)", bd: "var(--border-strong)", accent: "var(--text-muted)" },
};

export function Callout({ tone = "info", title, icon, children, className = "", style, ...rest }) {
  const t = TONE[tone] || TONE.info;
  return (
    <div
      role="note"
      className={className}
      style={{
        display: "flex", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)",
        background: t.bg, border: `1px solid ${t.bd}`, borderRadius: "var(--radius-md)",
        color: t.fg, fontFamily: "var(--font-sans)", ...style,
      }}
      {...rest}
    >
      <Icon name={icon || t.icon} size={18} style={{ color: t.accent, marginTop: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        {title && <strong style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" }}>{title}</strong>}
        {children && <div style={{ fontSize: "var(--text-sm)", lineHeight: "var(--leading-snug)", color: "var(--text)" }}>{children}</div>}
      </div>
    </div>
  );
}
