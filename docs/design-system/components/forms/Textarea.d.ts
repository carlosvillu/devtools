import * as React from "react";

/**
 * The primary paste field for devtools.
 * @startingPoint section="Forms" subtitle="The paste field" viewport="700x220"
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  /** Mono type family. Default true — this is the paste field. */
  mono?: boolean;
}

/** A large, mono, auto-focused textarea — the single entry point. Defaults to monospace since users paste tokens, JSON, base64, etc. */
export function Textarea(props: TextareaProps): JSX.Element;
