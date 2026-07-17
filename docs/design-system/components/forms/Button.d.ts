import * as React from "react";
import type { IconName } from "../display/Icon";

/**
 * Primary action button.
 * @startingPoint section="Forms" subtitle="Button variants & sizes" viewport="700x160"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. Default "primary". */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Control height. Default "md". */
  size?: "sm" | "md" | "lg";
  /** Leading icon name. */
  icon?: IconName;
  /** Trailing icon name. */
  iconRight?: IconName;
  /** Stretch to full width. */
  block?: boolean;
}

/** Primary action button. Solid accent for the main action, secondary (bordered) and ghost for supporting actions, danger for destructive ones. */
export function Button(props: ButtonProps): JSX.Element;
