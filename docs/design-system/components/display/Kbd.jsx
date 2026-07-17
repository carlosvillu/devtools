import React from "react";

export function Kbd({ children, className = "", style, ...rest }) {
  return (
    <kbd
      className={className}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: 20, height: 20, padding: "0 6px",
        fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", fontWeight: "var(--weight-medium)",
        color: "var(--text-muted)", background: "var(--surface)",
        border: "1px solid var(--border-strong)", borderBottomWidth: 2,
        borderRadius: "var(--radius-sm)", lineHeight: 1, ...style,
      }}
      {...rest}
    >
      {children}
    </kbd>
  );
}
