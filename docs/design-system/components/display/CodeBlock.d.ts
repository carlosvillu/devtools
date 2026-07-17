import * as React from "react";

export interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content to render (string or highlighted nodes). */
  children?: React.ReactNode;
  /** Raw string for the copy button (falls back to string children). */
  value?: string;
  /** Header label. Defaults to `kind` or "output". */
  title?: string;
  /** DataKind shown in the header when no title. */
  kind?: string;
  /** Soft-wrap long lines instead of horizontal scroll. */
  wrap?: boolean;
  /** Show the header + copy button. Default true. */
  copyable?: boolean;
  /** Max px height before scrolling. Default 320. */
  maxHeight?: number;
}

/**
 * Dark, monospace block for displaying a data value — always dark (the terminal
 * motif), with an optional header + copy button. Used for every step output.
 */
export function CodeBlock(props: CodeBlockProps): JSX.Element;
