import React from "react";
import { Icon } from "../display/Icon.jsx";

export function Input({
  size = "md", invalid = false, mono = false, icon, type = "text",
  className = "", style, disabled = false, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === "sm" ? "var(--control-h-sm)" : size === "lg" ? "var(--control-h-lg)" : "var(--control-h)";
  const borderColor = invalid ? "var(--danger)" : focus ? "var(--accent)" : "var(--border-strong)";
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
      {icon && (
        <Icon name={icon} size={16} style={{ position: "absolute", left: 12, color: "var(--text-subtle)", pointerEvents: "none" }} />
      )}
      <input
        type={type}
        disabled={disabled}
        onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
        className={className}
        style={{
          width: "100%", height: h,
          padding: icon ? "0 12px 0 36px" : "0 12px",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
          fontSize: size === "sm" ? "var(--text-sm)" : "var(--text-base)",
          color: "var(--text)", background: disabled ? "var(--surface-2)" : "var(--surface)",
          border: `1px solid ${borderColor}`, borderRadius: "var(--radius)",
          outline: "none", boxShadow: focus ? "var(--focus-ring)" : "none",
          transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)",
          opacity: disabled ? 0.6 : 1,
          "--ph": "var(--text-subtle)",
          ...style,
        }}
        {...rest}
      />
    </div>
  );
}
