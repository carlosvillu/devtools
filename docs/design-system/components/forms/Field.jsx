import React from "react";

export function Field({ label, htmlFor, hint, error, required = false, children, className = "", style }) {
  // Stable ids so the control can point at its hint/error via aria-describedby.
  // `error` replaces `hint`, so only one message node exists at a time — describe by that one.
  const reactId = React.useId();
  const hintId = `${reactId}-hint`;
  const errorId = `${reactId}-error`;
  const messageId = error ? errorId : hint ? hintId : undefined;

  let control = children;
  if (React.isValidElement(children) && messageId) {
    const existing = children.props["aria-describedby"];
    control = React.cloneElement(children, {
      "aria-describedby": existing ? `${existing} ${messageId}` : messageId,
    });
  }

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", ...style }}>
      {label && (
        <label htmlFor={htmlFor} style={{
          fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)",
          color: "var(--text)", fontFamily: "var(--font-sans)",
        }}>
          {label}
          {required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
        </label>
      )}
      {control}
      {error ? (
        <span id={errorId} style={{ fontSize: "var(--text-xs)", color: "var(--danger)", fontFamily: "var(--font-sans)" }}>{error}</span>
      ) : hint ? (
        <span id={hintId} style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>{hint}</span>
      ) : null}
    </div>
  );
}
