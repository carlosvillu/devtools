import React from "react";
import { Icon } from "./Icon.jsx";

export function CopyButton({
  value = "", label = "Copiar", size = "md", withLabel = false,
  onCopy, className = "", style, ...rest
}) {
  const [copied, setCopied] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const timer = React.useRef(null);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopy?.(value);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    } catch (_) { /* clipboard blocked — no-op */ }
  };

  const dim = size === "sm" ? 28 : 32;
  const glyph = size === "sm" ? 14 : 16;

  if (withLabel) {
    return (
      <button type="button" onClick={copy} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        className={className}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, height: dim, padding: "0 10px",
          fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)",
          color: copied ? "var(--success)" : "var(--text-muted)", background: hover ? "var(--surface-2)" : "transparent",
          border: "1px solid transparent", borderRadius: "var(--radius)", cursor: "pointer",
          transition: "background var(--dur), color var(--dur)", ...style,
        }} {...rest}>
        <Icon name={copied ? "check" : "copy"} size={glyph} />
        {copied ? "Copiado" : label}
      </button>
    );
  }

  return (
    <button type="button" onClick={copy} aria-label={label} title={label}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className={className}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: dim, height: dim, borderRadius: "var(--radius)", cursor: "pointer",
        color: copied ? "var(--success)" : "var(--text-muted)",
        background: hover ? "var(--surface-2)" : "transparent",
        border: "1px solid transparent", transition: "background var(--dur), color var(--dur)", ...style,
      }} {...rest}>
      <Icon name={copied ? "check" : "copy"} size={glyph} />
    </button>
  );
}
