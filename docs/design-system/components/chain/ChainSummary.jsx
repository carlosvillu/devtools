import React from "react";
import { Badge } from "../display/Badge.jsx";
import { Icon } from "../display/Icon.jsx";

export function ChainSummary({ kinds = [], size = "sm", className = "", style, ...rest }) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap", ...style }}
      {...rest}
    >
      {kinds.map((k, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Icon name="chevron-right" size={13} style={{ color: "var(--text-subtle)" }} />}
          <Badge kind={k} size={size} />
        </React.Fragment>
      ))}
    </span>
  );
}
