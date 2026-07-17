import * as React from "react";
import type { DataKind } from "../display/Badge";

export interface ChainSummaryProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Ordered kinds of the chain, e.g. ["base64","json"]. */
  kinds: DataKind[];
  size?: "sm" | "md";
}

/** Compact one-line summary of a chain: kind badges joined by chevrons. Used in history rows. */
export function ChainSummary(props: ChainSummaryProps): JSX.Element;
