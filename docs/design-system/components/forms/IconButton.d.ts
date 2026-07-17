import * as React from "react";
import type { IconName } from "../display/Icon";

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Icon glyph name. */
  icon: IconName;
  /** Accessible label (also the tooltip). Required. */
  label: string;
  /** "ghost" (default, transparent) or "secondary" (bordered). */
  variant?: "ghost" | "secondary";
  size?: "sm" | "md" | "lg";
  /** Pressed / toggled-on state. */
  active?: boolean;
}

/** Square icon-only button — copy, delete, reveal, toolbar actions. Always give a `label`. */
export function IconButton(props: IconButtonProps): JSX.Element;
