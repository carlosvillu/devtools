import React from "react";

const PAD = { sm: "var(--space-3)", md: "var(--space-4)", lg: "var(--space-6)" };

export function Card({ children, padding = "md", inset = false, hover = false, className = "", style, ...rest }) {
  const [h, setH] = React.useState(false);
  return (
    <div
      onMouseEnter={hover ? () => setH(true) : undefined}
      onMouseLeave={hover ? () => setH(false) : undefined}
      className={className}
      style={{
        background: inset ? "var(--surface-2)" : "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: inset ? "none" : "var(--shadow-sm)",
        padding: PAD[padding],
        transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)",
        ...(hover && h ? { borderColor: "var(--border-strong)", boxShadow: "var(--shadow-md)" } : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
