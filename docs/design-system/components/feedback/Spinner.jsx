import React from "react";

export function Spinner({ size = 16, label, className = "", style, ...rest }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-muted)", ...style }} {...rest}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
        style={{ animation: "dtds-spin 0.7s linear infinite", display: "block" }}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {label && <span style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" }}>{label}</span>}
      <style>{"@keyframes dtds-spin{to{transform:rotate(360deg)}}"}</style>
    </span>
  );
}
