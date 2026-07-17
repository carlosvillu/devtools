import * as React from "react";
import type { IconName } from "../display/Icon";

/**
 * Inline notice banner.
 * @startingPoint section="Feedback" subtitle="Callout tones" viewport="700x180"
 */
export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tone. "security" is the muted grey variant for the privacy notice. */
  tone?: "info" | "warning" | "danger" | "success" | "security";
  title?: string;
  /** Override the tone's default icon. */
  icon?: IconName;
  children?: React.ReactNode;
}

/** Inline banner for notices — errors, the "no se detectó nada" message, and the mandatory privacy warning. */
export function Callout(props: CalloutProps): JSX.Element;
