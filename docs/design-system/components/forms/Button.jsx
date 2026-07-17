import React from "react";
import { Icon } from "../display/Icon.jsx";

const H = { sm: "var(--control-h-sm)", md: "var(--control-h)", lg: "var(--control-h-lg)" };
const PAD = { sm: "0 10px", md: "0 14px", lg: "0 18px" };
const FS = { sm: "var(--text-sm)", md: "var(--text-base)", lg: "var(--text-base)" };

const VARIANTS = {
  primary: { background: "var(--accent)", color: "var(--accent-fg)", border: "1px solid var(--accent)" },
  secondary: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border-strong)" },
  ghost: { background: "transparent", color: "var(--text)", border: "1px solid transparent" },
  danger: { background: "var(--danger)", color: "var(--accent-fg)", border: "1px solid var(--danger)" },
};
const HOVER = {
  primary: "var(--accent-hover)",
  secondary: "var(--surface-2)",
  ghost: "var(--surface-2)",
  danger: "var(--red-700)",
};

export function Button({
  variant = "primary", size = "md", icon, iconRight, block = false,
  disabled = false, type = "button", children, className = "", style, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button
      type={type}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={className}
      style={{
        display: block ? "flex" : "inline-flex", width: block ? "100%" : "auto",
        alignItems: "center", justifyContent: "center", gap: "var(--space-2)",
        height: H[size], padding: PAD[size], fontSize: FS[size],
        fontFamily: "var(--font-sans)", fontWeight: "var(--weight-medium)",
        lineHeight: 1, borderRadius: "var(--radius)", cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap", userSelect: "none",
        transition: "background var(--dur) var(--ease), border-color var(--dur) var(--ease), opacity var(--dur)",
        opacity: disabled ? 0.5 : 1,
        ...v,
        background: hover && !disabled ? HOVER[variant] : v.background,
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 14 : 16} />}
    </button>
  );
}
