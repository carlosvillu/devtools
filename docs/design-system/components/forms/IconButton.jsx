import React from "react";
import { Icon } from "../display/Icon.jsx";

const SIZE = { sm: 28, md: 32, lg: 40 };
const GLYPH = { sm: 14, md: 16, lg: 18 };

export function IconButton({
  icon, label, variant = "ghost", size = "md", disabled = false,
  active = false, className = "", style, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const bordered = variant === "secondary";
  const bg = active
    ? "var(--surface-2)"
    : hover && !disabled ? "var(--surface-2)" : bordered ? "var(--surface)" : "transparent";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={className}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: SIZE[size], height: SIZE[size], padding: 0,
        borderRadius: "var(--radius)", cursor: disabled ? "not-allowed" : "pointer",
        color: active ? "var(--text)" : "var(--text-muted)",
        background: bg,
        border: bordered ? "1px solid var(--border-strong)" : "1px solid transparent",
        transition: "background var(--dur) var(--ease), color var(--dur)",
        opacity: disabled ? 0.45 : 1, ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={GLYPH[size]} />
    </button>
  );
}
