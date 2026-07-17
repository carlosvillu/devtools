import * as React from "react";

export interface ConfidenceBarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Confidence 0..1. */
  value: number;
  /** Show the numeric value (0.00). Default true. */
  showValue?: boolean;
  /** Track width in px. Default 64. */
  width?: number;
}

/**
 * A compact bar visualising a detector's confidence (0..1). Fill color follows
 * thresholds: ≥0.7 green, ≥0.3 amber, else grey — matching the ambiguity rules (I8).
 */
export function ConfidenceBar(props: ConfidenceBarProps): JSX.Element;
