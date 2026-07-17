import React from "react";
import { CopyButton } from "./CopyButton.jsx";
import { Icon } from "./Icon.jsx";

export function CodeBlock({
  children, value, title, kind, wrap = false, copyable = true, maxHeight = 320,
  className = "", style, ...rest
}) {
  const text = value != null ? value : (typeof children === "string" ? children : "");
  return (
    <div
      className={className}
      style={{
        background: "var(--code-bg)", border: "1px solid var(--code-border)",
        borderRadius: "var(--radius-md)", overflow: "hidden",
        fontFamily: "var(--font-mono)", ...style,
      }}
      {...rest}
    >
      {(title || copyable) && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 34, padding: "0 8px 0 12px",
          borderBottom: "1px solid var(--code-border)", background: "var(--code-surface)",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--code-muted)", fontSize: "var(--text-xs)" }}>
            <Icon name="terminal" size={13} />
            {title || (kind ? kind : "output")}
          </span>
          {copyable && (
            <CopyButton value={text} label="Copiar" size="sm"
              style={{ color: "var(--code-muted)", "--surface-2": "rgba(255,255,255,.08)" }} />
          )}
        </div>
      )}
      <pre style={{
        margin: 0, padding: "12px 14px", color: "var(--code-fg)",
        fontSize: "var(--text-sm)", lineHeight: "var(--leading-code)",
        whiteSpace: wrap ? "pre-wrap" : "pre",
        wordBreak: wrap ? "break-word" : "normal",
        overflow: "auto", maxHeight, tabSize: 2,
      }}>
        <code style={{ fontFamily: "var(--font-mono)" }}>{children != null ? children : value}</code>
      </pre>
    </div>
  );
}
