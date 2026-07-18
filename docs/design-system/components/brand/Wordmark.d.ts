import * as React from "react";

export type WordmarkSize = "sm" | "md" | "lg";

/**
 * The devtools brand: a monospace wordmark with a blinking accent cursor block.
 * There is no logo — this is the brand mark. Source: guidelines/brand-wordmark.html.
 * @startingPoint section="Brand" subtitle="The devtools wordmark" viewport="700x150"
 */
export interface WordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Scale. Default "md" (34px, matching the guideline specimen). */
  size?: WordmarkSize;
  /** Whether the cursor block blinks. Default true. Always stops under prefers-reduced-motion. */
  blink?: boolean;
}

/** The monospace `devtools` wordmark with a blinking accent cursor. */
export function Wordmark(props: WordmarkProps): JSX.Element;
