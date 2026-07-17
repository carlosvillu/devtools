import * as React from "react";
import type { DataKind } from "../display/Badge";
import type { SelectOption } from "../forms/Select";

export type Terminal = "text" | "no_transform" | "max_depth" | "cycle" | "error";

/**
 * One step of the untangling chain — the product's signature unit.
 * @startingPoint section="Chain" subtitle="A single chain step" viewport="700x340"
 */
export interface StepCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Zero-based step index shown in the rail. */
  index: number;
  /** Detected kind for this step (chosen detection). */
  kind?: DataKind;
  /** Confidence of the chosen detection (0..1). */
  confidence?: number;
  /** Transform id applied at this step (e.g. "jwt.decode"), or omitted if terminal. */
  applied?: string;
  /** Other plausible kinds (confidence ≥ 0.3) — shown as "también podría ser" (O5). */
  alternatives?: DataKind[];
  /** Selectable transform options for the desvío picker (O4). */
  transforms?: (string | SelectOption)[];
  /** The step's output value (rendered in a CodeBlock). */
  output?: string;
  /** Notes surfaced by the transform (e.g. JWT expiry in natural language). */
  notes?: string[];
  /** Terminal reason — renders the chain's ending marker on the last step. */
  terminal?: Terminal;
  /** Called with the chosen transform id when the user diverts the chain. */
  onSelectTransform?: (id: string) => void;
}

/** Shows the step index, detected kind + confidence, applied transform, ambiguity alternatives, an optional divert picker, the output, notes, and (on the last step) the terminal reason. Composes Badge, ConfidenceBar, Select, CodeBlock. */
export function StepCard(props: StepCardProps): JSX.Element;
