import React from "react";

export function Textarea({
  invalid = false, mono = true, autoFocus = false, rows = 6,
  className = "", style, disabled = false, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const borderColor = invalid ? "var(--danger)" : focus ? "var(--accent)" : "var(--border-strong)";
  return (
    <textarea
      rows={rows}
      autoFocus={autoFocus}
      disabled={disabled}
      onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
      onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
      className={className}
      style={{
        width: "100%", display: "block", resize: "vertical",
        padding: "12px 14px",
        fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        fontSize: "var(--text-sm)", lineHeight: "var(--leading-code)",
        color: "var(--text)", background: disabled ? "var(--surface-2)" : "var(--surface)",
        border: `1px solid ${borderColor}`, borderRadius: "var(--radius-md)",
        outline: "none", boxShadow: focus ? "var(--focus-ring)" : "none",
        transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)",
        ...style,
      }}
      {...rest}
    />
  );
}
