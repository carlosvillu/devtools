import React from "react";
import { Icon } from "./Icon.jsx";

const TONE = {
  neutral: { bg: "var(--surface-2)", fg: "var(--text-muted)", bd: "var(--border)" },
  accent:  { bg: "var(--accent-subtle-bg)", fg: "var(--accent-subtle-fg)", bd: "color-mix(in oklab, var(--accent) 30%, transparent)" },
  success: { bg: "var(--success-subtle-bg)", fg: "var(--success-subtle-fg)", bd: "color-mix(in oklab, var(--success) 30%, transparent)" },
  warning: { bg: "var(--warning-subtle-bg)", fg: "var(--warning-subtle-fg)", bd: "color-mix(in oklab, var(--warning) 32%, transparent)" },
  danger:  { bg: "var(--danger-subtle-bg)", fg: "var(--danger-subtle-fg)", bd: "color-mix(in oklab, var(--danger) 32%, transparent)" },
  violet:  { bg: "color-mix(in oklab, var(--violet-500) 14%, var(--surface))", fg: "var(--violet-subtle-fg)", bd: "color-mix(in oklab, var(--violet-500) 32%, transparent)" },
  cyan:    { bg: "color-mix(in oklab, var(--cyan-500) 15%, var(--surface))", fg: "var(--cyan-subtle-fg)", bd: "color-mix(in oklab, var(--cyan-500) 34%, transparent)" },
};

/* DataKind → visual identity. The heart of the product's type vocabulary. */
export const KIND_META = {
  jwt:            { tone: "accent",  icon: "key",      label: "jwt" },
  json:           { tone: "violet",  icon: "braces",   label: "json" },
  base64:         { tone: "cyan",    icon: "terminal", label: "base64" },
  unix_timestamp: { tone: "warning", icon: "clock",    label: "timestamp" },
  url:            { tone: "success", icon: "link",     label: "url" },
  uuid:           { tone: "cyan",    icon: "hash",     label: "uuid" },
  hash:           { tone: "danger",  icon: "hash",     label: "hash" },
  text:           { tone: "neutral", icon: "type",     label: "text" },
};

export function Badge({
  children, kind, tone = "neutral", icon, mono, size = "md",
  outline = false, className = "", style, ...rest
}) {
  const meta = kind ? KIND_META[kind] : null;
  const t = TONE[meta ? meta.tone : tone] || TONE.neutral;
  const glyph = icon || (meta && meta.icon);
  const label = children != null ? children : meta ? meta.label : null;
  const useMono = mono != null ? mono : !!kind;
  const sm = size === "sm";
  return (
    <span
      className={className}
      style={{
        display: "inline-flex", alignItems: "center", gap: sm ? 3 : 5,
        height: sm ? 18 : 22, padding: sm ? "0 6px" : "0 8px",
        fontSize: sm ? "var(--text-2xs)" : "var(--text-xs)",
        fontWeight: "var(--weight-medium)", lineHeight: 1,
        fontFamily: useMono ? "var(--font-mono)" : "var(--font-sans)",
        color: t.fg, background: outline ? "transparent" : t.bg,
        border: `1px solid ${t.bd}`, borderRadius: "var(--radius-sm)",
        whiteSpace: "nowrap", ...style,
      }}
      {...rest}
    >
      {glyph && <Icon name={glyph} size={sm ? 11 : 13} />}
      {label}
    </span>
  );
}
