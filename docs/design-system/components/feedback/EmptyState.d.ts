import * as React from "react";
import type { IconName } from "../display/Icon";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: IconName;
  title?: string;
  description?: string;
  /** Optional action node (e.g. a Button). */
  action?: React.ReactNode;
}

/** Centered empty/zero state — an empty history list, no results. Never a blank screen. */
export function EmptyState(props: EmptyStateProps): JSX.Element;
