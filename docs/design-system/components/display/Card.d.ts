import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** Inner padding. Default "md". */
  padding?: "sm" | "md" | "lg";
  /** Sunken variant — no shadow, subtle fill. */
  inset?: boolean;
  /** Lift on hover (for clickable cards). */
  hover?: boolean;
}

/** Generic surface panel — auth forms, content sections, containers. */
export function Card(props: CardProps): JSX.Element;
