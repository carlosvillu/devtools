import React from "react";
import { Badge, KIND_META } from "../display/Badge.jsx";
import { ConfidenceBar } from "../display/ConfidenceBar.jsx";
import { CodeBlock } from "../display/CodeBlock.jsx";
import { Icon } from "../display/Icon.jsx";
import { Select } from "../forms/Select.jsx";

const TERMINAL = {
  text: { tone: "neutral", label: "Dato de texto — fin de la cadena" },
  no_transform: { tone: "neutral", label: "Sin más transformaciones aplicables" },
  max_depth: { tone: "warning", label: "Profundidad máxima alcanzada (8 pasos)" },
  cycle: { tone: "warning", label: "Ciclo detectado — cadena cortada" },
  error: { tone: "danger", label: "Error en la transformación" },
};

export function StepCard({
  index, kind, confidence, applied, alternatives = [], transforms = [],
  output, notes = [], terminal, onSelectTransform, className = "", style, ...rest
}) {
  const hasAlt = alternatives.length > 0;
  const term = terminal ? TERMINAL[terminal] : null;
  return (
    <div
      className={className}
      style={{
        position: "relative", display: "flex", gap: "var(--space-3)",
        padding: "var(--space-4)", background: "var(--surface)",
        border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)", fontFamily: "var(--font-sans)", ...style,
      }}
      {...rest}
    >
      {/* step index rail */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 26, height: 26, borderRadius: "var(--radius-full)",
          background: "var(--surface-2)", border: "1px solid var(--border-strong)",
          fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)",
          fontWeight: "var(--weight-semibold)", color: "var(--text-muted)",
        }}>{index}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", minWidth: 0, flex: 1 }}>
        {/* detection header */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {kind && <Badge kind={kind} />}
          {confidence != null && <ConfidenceBar value={confidence} />}
          {applied && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto", color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
              <Icon name="corner-down-right" size={13} />
              <code style={{ fontFamily: "var(--font-mono)", color: "var(--text)" }}>{applied}</code>
            </span>
          )}
        </div>

        {/* ambiguity alternatives (O5/I8) */}
        {hasAlt && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            <span>También podría ser:</span>
            {alternatives.map((a) => <Badge key={a} kind={a} size="sm" outline />)}
          </div>
        )}

        {/* alternative transform picker (O4) */}
        {transforms.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", maxWidth: 320 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Transformación:</span>
            <Select mono size="sm" value={applied} options={transforms} onChange={(e) => onSelectTransform?.(e.target.value)} />
          </div>
        )}

        {/* output */}
        {output != null && <CodeBlock kind={kind} value={output} wrap />}

        {/* notes (e.g. jwt exp) */}
        {notes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {notes.map((n, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                <Icon name="info" size={12} style={{ color: "var(--accent)" }} />{n}
              </span>
            ))}
          </div>
        )}

        {/* terminal marker */}
        {term && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "var(--text-xs)", color: term.tone === "danger" ? "var(--danger)" : term.tone === "warning" ? "var(--warning)" : "var(--text-subtle)" }}>
            <Icon name={term.tone === "neutral" ? "check" : "alert-triangle"} size={13} />
            {term.label}
          </div>
        )}
      </div>
    </div>
  );
}
