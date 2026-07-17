import React from "react";
import { Badge } from "../display/Badge.jsx";
import { ChainSummary } from "../chain/ChainSummary.jsx";
import { IconButton } from "../forms/IconButton.jsx";
import { Icon } from "../display/Icon.jsx";

export function HistoryRow({
  preview, kind, chain = [], time, onReopen, onDelete, className = "", style, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={className}
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-4)",
        padding: "var(--space-3) var(--space-4)", background: hover ? "var(--surface-2)" : "var(--surface)",
        borderBottom: "1px solid var(--border)", fontFamily: "var(--font-sans)",
        transition: "background var(--dur)", ...style,
      }}
      {...rest}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
        <code style={{
          fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
        }}>{preview}</code>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {kind && <Badge kind={kind} size="sm" />}
          {chain.length > 0 && <ChainSummary kinds={chain} size="sm" />}
        </div>
      </div>

      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--text-xs)", color: "var(--text-subtle)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
        <Icon name="clock" size={12} />{time}
      </span>

      <div style={{ display: "flex", gap: 2, opacity: hover ? 1 : 0.35, transition: "opacity var(--dur)" }}>
        {onReopen && <IconButton icon="reopen" label="Reabrir" size="sm" onClick={onReopen} />}
        {onDelete && <IconButton icon="trash" label="Borrar" size="sm" onClick={onDelete} />}
      </div>
    </div>
  );
}
