import * as React from "react";
import type { DataKind } from "../display/Badge";

export interface HistoryRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Redacted, truncated preview (≤120 chars, D7) — never the raw input. */
  preview: string;
  /** Detected kind of step 0. */
  kind?: DataKind;
  /** Applied chain, as kinds, for the summary. */
  chain?: DataKind[];
  /** Relative time string, e.g. "hace 3 h". */
  time?: string;
  onReopen?: () => void;
  onDelete?: () => void;
}

/**
 * One row of the /history list: redacted preview, detected kind, chain summary,
 * relative time, and reopen/delete actions. Honors D7 — shows only the redacted
 * preview and the kind/transform summary, never raw values.
 */
export function HistoryRow(props: HistoryRowProps): JSX.Element;
