import * as React from "react";
import type { IconName } from "../display/Icon";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  size?: "sm" | "md" | "lg";
  /** Red border for validation errors. */
  invalid?: boolean;
  /** Use the mono type family (for tokens, hashes, technical values). */
  mono?: boolean;
  /** Optional leading icon. */
  icon?: IconName;
}

/** Single-line text input — email, password, search. Wrap with `Field` for label + error. */
export function Input(props: InputProps): JSX.Element;
