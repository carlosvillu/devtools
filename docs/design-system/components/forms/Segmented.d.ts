import * as React from "react";

export interface SegmentedOption {
  value: string;
  label: string;
  /** Optional Lucide glyph name shown before the label. */
  icon?: string;
}

export interface SegmentedProps {
  /** Segments as strings or {value,label,icon} objects. */
  options: (string | SegmentedOption)[];
  /** The currently selected segment's value. */
  value: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md";
  /** Mono type — used when the segments are transform ids / code. */
  mono?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Single-select segmented control (a pill row where one segment is active).
 * Used to switch a page between two mirrored modes — e.g. decodificar ⇄ codificar.
 */
export function Segmented(props: SegmentedProps): JSX.Element;
