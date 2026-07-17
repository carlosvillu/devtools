// Shared data + small primitives for the devtools mockups.
// Exposes on window: Wordmark, CHAIN_JWT, HISTORY_ROWS, JWT_INPUT, TRANSFORMS_BY_KIND.

(function () {
  // one-time keyframes for the wordmark cursor
  if (!document.getElementById("dt-shared-css")) {
    const s = document.createElement("style");
    s.id = "dt-shared-css";
    s.textContent = "@keyframes dtblink{0%,50%{opacity:1}51%,100%{opacity:0}}" + ".dt-scroll::-webkit-scrollbar{width:8px;height:8px}" + ".dt-scroll::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:8px}";
    document.head.appendChild(s);
  }
  function Wordmark({
    size = 20,
    color = "var(--text)",
    accent = "var(--accent)",
    blink = true
  }) {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: size,
        color,
        letterSpacing: "-0.01em",
        lineHeight: 1
      }
    }, "devtools", /*#__PURE__*/React.createElement("span", {
      style: {
        width: Math.round(size * 0.3),
        height: Math.round(size * 0.92),
        background: accent,
        marginLeft: Math.round(size * 0.28),
        borderRadius: 1,
        display: "inline-block",
        animation: blink ? "dtblink 1.1s steps(2) infinite" : "none"
      }
    }));
  }
  const JWT_INPUT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsImlhdCI6MTc1MjUzNzYwMCwiZXhwIjoxNzUyNjI0MDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  const CHAIN_JWT = [{
    index: 0,
    kind: "jwt",
    confidence: 0.95,
    applied: "jwt.decode",
    alternatives: ["text"],
    transforms: ["jwt.decode"],
    output: '{\n  "header": { "alg": "HS256", "typ": "JWT" },\n  "payload": {\n    "sub": "1",\n    "name": "carlos",\n    "iat": 1752537600,\n    "exp": 1752624000\n  },\n  "signature": "SflKxwRJSMeKKF2QT4fwpMeJf36P…"\n}',
    notes: ["exp: 2026-07-16T00:00:00Z (caducó hace 4 horas)"]
  }, {
    index: 1,
    kind: "json",
    confidence: 0.99,
    applied: "json.format",
    transforms: ["json.format", "json.minify", "json.sort_keys"],
    output: '{\n  "header": {\n    "alg": "HS256",\n    "typ": "JWT"\n  },\n  "payload": {\n    "sub": "1",\n    "name": "carlos",\n    "iat": 1752537600,\n    "exp": 1752624000\n  }\n}',
    terminal: "no_transform"
  }];
  const HISTORY_ROWS = [{
    preview: "Bearer eyJhbGciOiJIUzI1Ni…",
    kind: "jwt",
    chain: ["jwt", "json"],
    time: "hace 3 h"
  }, {
    preview: "ZXlKaGJHY2lPaUpJVXpJMU5pSjku…",
    kind: "base64",
    chain: ["base64", "json"],
    time: "ayer"
  }, {
    preview: "1752624000",
    kind: "unix_timestamp",
    chain: ["unix_timestamp"],
    time: "hace 2 d"
  }, {
    preview: "https://app.dev/cb?state=…&code=…",
    kind: "url",
    chain: ["url"],
    time: "hace 4 d"
  }, {
    preview: "550e8400-e29b-41d4-a716-44665544…",
    kind: "uuid",
    chain: ["uuid"],
    time: "la semana pasada"
  }, {
    preview: "9f86d081884c7d659a2feaa0c55ad015…",
    kind: "hash",
    chain: ["hash"],
    time: "hace 2 sem"
  }];
  Object.assign(window, {
    Wordmark,
    JWT_INPUT,
    CHAIN_JWT,
    HISTORY_ROWS
  });
})();