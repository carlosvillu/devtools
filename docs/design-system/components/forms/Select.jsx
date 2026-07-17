import React from "react";
import { Icon } from "../display/Icon.jsx";

export function Select({
  options = [], value, onChange, size = "md", invalid = false, mono = false,
  placeholder, disabled = false, className = "", style, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === "sm" ? "var(--control-h-sm)" : size === "lg" ? "var(--control-h-lg)" : "var(--control-h)";
  const borderColor = invalid ? "var(--danger)" : focus ? "var(--accent)" : "var(--border-strong)";
  const norm = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div style={{ position: "relative", display: "inline-flex", width: "100%", ...style }}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className={className}
        style={{
          appearance: "none", WebkitAppearance: "none", width: "100%", height: h,
          padding: "0 34px 0 12px",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
          fontSize: size === "sm" ? "var(--text-sm)" : "var(--text-base)",
          color: "var(--text)", background: disabled ? "var(--surface-2)" : "var(--surface)",
          border: `1px solid ${borderColor}`, borderRadius: "var(--radius)",
          outline: "none", boxShadow: focus ? "var(--focus-ring)" : "none", cursor: disabled ? "not-allowed" : "pointer",
          transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)",
        }}
        {...rest}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {norm.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
    </div>
  );
}
