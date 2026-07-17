import * as React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** Options as strings or {value,label} objects. */
  options: (string | SelectOption)[];
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  /** Mono type — used when picking between transform ids. */
  mono?: boolean;
  placeholder?: string;
}

/** Styled native select — used to pick an alternative transform on a chain step (O4). */
export function Select(props: SelectProps): JSX.Element;
