import React from "react";
import { Icon } from "../display/Icon.jsx";

export function EmptyState({ icon = "search", title, description, action, className = "", style, ...rest }) {
  return (
    <div
      className={className}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        gap: "var(--space-3)", padding: "var(--space-10) var(--space-6)",
        fontFamily: "var(--font-sans)", ...style,
      }}
      {...rest}
    >
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 44, height: 44, borderRadius: "var(--radius-lg)",
        background: "var(--surface-2)", color: "var(--text-subtle)", border: "1px solid var(--border)",
      }}>
        <Icon name={icon} size={20} />
      </span>
      {title && <div style={{ fontSize: "var(--text-md)", fontWeight: "var(--weight-semibold)", color: "var(--text)" }}>{title}</div>}
      {description && <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 380, lineHeight: "var(--leading-snug)" }}>{description}</div>}
      {action && <div style={{ marginTop: "var(--space-1)" }}>{action}</div>}
    </div>
  );
}
