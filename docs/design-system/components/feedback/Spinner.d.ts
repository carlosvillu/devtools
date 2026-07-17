import * as React from "react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Diameter in px. Default 16. */
  size?: number;
  /** Optional text beside the spinner. */
  label?: string;
}

/** Indeterminate loading spinner — e.g. while the chain is being computed. */
export function Spinner(props: SpinnerProps): JSX.Element;
