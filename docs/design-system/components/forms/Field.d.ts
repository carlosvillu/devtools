import * as React from "react";

export interface FieldProps {
  /** Label text shown above the control. */
  label?: string;
  /** id of the control the label points to. */
  htmlFor?: string;
  /** Muted helper text below the control. */
  hint?: string;
  /** Error text (replaces hint, colored danger). */
  error?: string;
  required?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** Form-field wrapper: label + control + hint/error. Compose around Input, Textarea, Select. */
export function Field(props: FieldProps): JSX.Element;
