import * as React from "react";

export interface CopyButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  /** Text written to the clipboard on click. */
  value: string;
  /** aria-label / tooltip (icon mode) and default text (label mode). */
  label?: string;
  size?: "sm" | "md";
  /** Show text next to the icon instead of an icon-only button. */
  withLabel?: boolean;
  /** Called with the copied value after a successful copy. */
  onCopy?: (value: string) => void;
}

/**
 * Copy-to-clipboard button that flips to a green check for ~1.4s.
 * Every chain step value in devtools is copyable with one of these (O3).
 */
export function CopyButton(props: CopyButtonProps): JSX.Element;
