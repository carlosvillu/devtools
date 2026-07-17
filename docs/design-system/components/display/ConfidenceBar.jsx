import React from "react";

function level(v) {
  if (v >= 0.7) return { color: "var(--success)", label: "alta" };
  if (v >= 0.3) return { color: "var(--warning)", label: "media" };
  return { color: "var(--text-subtle)", label: "baja" };
}

export function ConfidenceBar({
  value = 0, showValue = true, width = 64, className = "", style, ...rest
}) {
  const v = Math.max(0, Math.min(1, value));
  const l = level(v);
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 8, ...style }} {...rest}>
      <span style={{
        position: "relative", width, height: 5, borderRadius: "var(--radius-full)",
        background: "var(--surface-inset)", overflow: "hidden", flexShrink: 0,
        border: "1px solid var(--border)",
      }}>
        <span style={{
          position: "absolute", inset: 0, width: `${v * 100}%`,
          background: l.color, borderRadius: "var(--radius-full)",
          transition: "width var(--dur-slow) var(--ease)",
        }} />
      </span>
      {showValue && (
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)",
          color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", minWidth: 30,
        }}>
          {v.toFixed(2)}
        </span>
      )}
    </span>
  );
}
