import * as React from "react";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

/** A keyboard key cap. devtools is keyboard-first, so shortcuts are shown with these. */
export function Kbd(props: KbdProps): JSX.Element;
