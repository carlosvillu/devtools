import * as React from "react";

export type IconName =
  | "copy" | "check" | "chevron-down" | "chevron-right" | "chevron-up"
  | "x" | "trash" | "clock" | "arrow-down" | "corner-down-right"
  | "alert-triangle" | "info" | "shield" | "loader" | "terminal"
  | "key" | "braces" | "link" | "hash" | "calendar" | "type"
  | "eye" | "eye-off" | "reopen" | "search" | "git-branch";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Glyph name from the curated Lucide set. */
  name: IconName;
  /** Pixel size (width & height). Default 16. */
  size?: number;
  /** Stroke width. Default 2. */
  strokeWidth?: number;
}

/** Inline SVG icon from the curated Lucide glyph set. */
export function Icon(props: IconProps): JSX.Element;
/** All available glyph names. */
export const iconNames: IconName[];
