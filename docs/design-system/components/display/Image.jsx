import React from "react";
import { Icon } from "./Icon.jsx";

const RATIO = { auto: null, square: "1 / 1", video: "16 / 9", wide: "21 / 9", portrait: "3 / 4" };
const RADIUS = { none: "0", sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)", xl: "var(--radius-xl)", full: "var(--radius-full)" };

export function Image({
  src, alt = "", ratio = "auto", radius = "md", fit = "cover",
  bordered = false, caption, icon = "type", className = "", style, ...rest
}) {
  const [failed, setFailed] = React.useState(false);
  const showPlaceholder = !src || failed;

  const frame = {
    position: "relative", overflow: "hidden", width: "100%",
    aspectRatio: RATIO[ratio] || undefined,
    borderRadius: RADIUS[radius] || RADIUS.md,
    background: "var(--surface-2)",
    border: bordered ? "1px solid var(--border)" : "none",
  };

  const media = showPlaceholder ? (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 6,
      color: "var(--text-subtle)", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)",
    }}>
      <Icon name={icon} size={22} />
      {alt ? <span style={{ padding: "0 12px", textAlign: "center" }}>{alt}</span> : null}
    </div>
  ) : (
    <img
      src={src} alt={alt} loading="lazy" onError={() => setFailed(true)}
      style={{ position: RATIO[ratio] ? "absolute" : "static", inset: 0,
        display: "block", width: "100%", height: RATIO[ratio] ? "100%" : "auto",
        objectFit: fit }}
    />
  );

  const el = (
    <div className={caption ? "" : className} style={{ ...frame, ...(caption ? null : style) }} {...(caption ? {} : rest)}>
      {media}
    </div>
  );

  if (!caption) return el;
  return (
    <figure className={className} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 6, ...style }} {...rest}>
      {el}
      <figcaption style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>{caption}</figcaption>
    </figure>
  );
}
