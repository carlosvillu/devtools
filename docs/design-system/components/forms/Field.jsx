import React from "react";

export function Field({ label, htmlFor, hint, error, required = false, children, className = "", style }) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", ...style }}>
      {label && (
        <label htmlFor={htmlFor} style={{
          fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)",
          color: "var(--text)", fontFamily: "var(--font-sans)",
        }}>
          {label}
          {required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--danger)", fontFamily: "var(--font-sans)" }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>{hint}</span>
      ) : null}
    </div>
  );
}
