import * as React from "react";
import type { IconName } from "./Icon";

export interface ImageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image URL. When missing or it fails to load, a placeholder is shown. */
  src?: string;
  /** Alt text (also the placeholder caption). */
  alt?: string;
  /** Fixed aspect ratio, or "auto" to follow the image's own size. */
  ratio?: "auto" | "square" | "video" | "wide" | "portrait";
  /** Corner radius. Default "md". */
  radius?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  /** object-fit when a ratio is set. Default "cover". */
  fit?: "cover" | "contain";
  /** 1px border around the frame. */
  bordered?: boolean;
  /** Optional caption rendered below (wraps in a <figure>). */
  caption?: string;
  /** Placeholder icon shown while empty/broken. Default "type". */
  icon?: IconName;
}

/** Framed image with a graceful placeholder + broken-src fallback and optional caption. */
export function Image(props: ImageProps): JSX.Element;
