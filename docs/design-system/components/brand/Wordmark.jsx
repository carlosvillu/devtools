import React from "react";

// Wordmark — la marca `devtools` en mono con el bloque-cursor de acento parpadeante.
// Fuente: guidelines/brand-wordmark.html. No hay logo: la marca ES este wordmark.
//
// El specimen (guideline) va blanco sobre fondo oscuro; como COMPONENTE reutilizable
// (header de /, pantallas de auth) el texto usa el token de texto adaptativo al tema y
// el cursor el acento. El parpadeo se detiene bajo prefers-reduced-motion (el bloque se
// queda sólido y visible — el estado no depende del movimiento).

const SIZES = {
  sm: { font: 22, cw: 7, ch: 14 },
  md: { font: 34, cw: 11, ch: 22 },
  lg: { font: 44, cw: 14, ch: 28 },
};

export function Wordmark({ size = "md", blink = true, className = "", style, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-mono)",
        fontSize: s.font,
        fontWeight: "var(--weight-semibold)",
        letterSpacing: "-0.01em",
        color: "var(--text)",
        ...style,
      }}
      {...rest}
    >
      devtools
      <span
        aria-hidden="true"
        style={{
          width: s.cw,
          height: s.ch,
          marginLeft: 6,
          borderRadius: 1,
          background: "var(--accent)",
          animation: blink ? "cursor-blink 1.1s steps(2) infinite" : "none",
        }}
      />
    </span>
  );
}
