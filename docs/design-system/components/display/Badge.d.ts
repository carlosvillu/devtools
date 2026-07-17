import * as React from "react";
import type { IconName } from "./Icon";

export type DataKind =
  | "base64" | "jwt" | "json" | "unix_timestamp"
  | "url" | "uuid" | "hash" | "text";

export type BadgeTone =
  | "neutral" | "accent" | "success" | "warning" | "danger" | "violet" | "cyan";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Product shortcut: pass a DataKind to auto-set tone, icon, mono label. */
  kind?: DataKind;
  /** Color tone (ignored when `kind` is set). */
  tone?: BadgeTone;
  /** Leading icon (overrides the kind's default icon). */
  icon?: IconName;
  /** Force mono/sans label. Defaults to mono when `kind` is set. */
  mono?: boolean;
  size?: "sm" | "md";
  /** Transparent background, colored border + text. */
  outline?: boolean;
}

/**
 * Small status/label pill. Pass `kind` for the product's DataKind vocabulary
 * (jwt, json, base64, timestamp, url, uuid, hash, text) — each gets a fixed
 * color + icon so the same type always looks the same across the app.
 */
export function Badge(props: BadgeProps): JSX.Element;

/** DataKind → { tone, icon, label } mapping used by Badge. */
export const KIND_META: Record<DataKind, { tone: BadgeTone; icon: IconName; label: string }>;
