import React from "react";
import { Icon } from "../display/Icon.jsx";

export function Segmented({
  options = [], value, onChange, size = "md", mono = false, className = "", style,
}) {
  const pad = size === "sm" ? "5px 12px" : "7px 16px";
  const norm = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div
      role="tablist"
      className={className}
      style={{
        display: "inline-flex", gap: 4, padding: 4,
        background: "var(--surface-2)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)", ...style,
      }}
    >
      {norm.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange?.(o.value)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: pad, border: on ? "1px solid var(--border)" : "1px solid transparent",
              borderRadius: "var(--radius)", cursor: "pointer",
              fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
              fontSize: size === "sm" ? "var(--text-xs)" : "var(--text-base)",
              fontWeight: on ? 600 : 500,
              color: on ? "var(--text)" : "var(--text-muted)",
              background: on ? "var(--surface)" : "transparent",
              boxShadow: on ? "var(--shadow-sm)" : "none",
              transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)",
            }}
          >
            {o.icon && <Icon name={o.icon} size={14} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
