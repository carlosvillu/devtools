/* @ds-bundle: {"format":4,"namespace":"DevtoolsDesignSystem_9d6b47","components":[{"name":"ChainSummary","sourcePath":"components/chain/ChainSummary.jsx"},{"name":"StepCard","sourcePath":"components/chain/StepCard.jsx"},{"name":"KIND_META","sourcePath":"components/display/Badge.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"CodeBlock","sourcePath":"components/display/CodeBlock.jsx"},{"name":"ConfidenceBar","sourcePath":"components/display/ConfidenceBar.jsx"},{"name":"CopyButton","sourcePath":"components/display/CopyButton.jsx"},{"name":"Icon","sourcePath":"components/display/Icon.jsx"},{"name":"Kbd","sourcePath":"components/display/Kbd.jsx"},{"name":"Callout","sourcePath":"components/feedback/Callout.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Spinner","sourcePath":"components/feedback/Spinner.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"HistoryRow","sourcePath":"components/history/HistoryRow.jsx"}],"sourceHashes":{"components/chain/ChainSummary.jsx":"eb95eba53e1f","components/chain/StepCard.jsx":"19f330054a2c","components/display/Badge.jsx":"f9f24969b46f","components/display/Card.jsx":"1757252fcdc5","components/display/CodeBlock.jsx":"d90765748183","components/display/ConfidenceBar.jsx":"6274c424724f","components/display/CopyButton.jsx":"a177af810e78","components/display/Icon.jsx":"c65a8ff8d736","components/display/Kbd.jsx":"ee4cff5105fb","components/feedback/Callout.jsx":"ee50413d6bea","components/feedback/EmptyState.jsx":"642129a8e82e","components/feedback/Spinner.jsx":"c21c118dddcd","components/forms/Button.jsx":"6dd3e19dd226","components/forms/Field.jsx":"82c2672878ef","components/forms/IconButton.jsx":"2421b93a2146","components/forms/Input.jsx":"079cb0a4b579","components/forms/Select.jsx":"644b6f1c2af3","components/forms/Textarea.jsx":"4c65ac9a2bb2","components/history/HistoryRow.jsx":"c57114abd53f"},"inlinedExternals":[],"unexposedExports":[{"name":"iconNames","sourcePath":"components/display/Icon.jsx"}]} */

(() => {

const __ds_ns = (window.DevtoolsDesignSystem_9d6b47 = window.DevtoolsDesignSystem_9d6b47 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PAD = {
  sm: "var(--space-3)",
  md: "var(--space-4)",
  lg: "var(--space-6)"
};
function Card({
  children,
  padding = "md",
  inset = false,
  hover = false,
  className = "",
  style,
  ...rest
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: hover ? () => setH(true) : undefined,
    onMouseLeave: hover ? () => setH(false) : undefined,
    className: className,
    style: {
      background: inset ? "var(--surface-2)" : "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      boxShadow: inset ? "none" : "var(--shadow-sm)",
      padding: PAD[padding],
      transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)",
      ...(hover && h ? {
        borderColor: "var(--border-strong)",
        boxShadow: "var(--shadow-md)"
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/ConfidenceBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function level(v) {
  if (v >= 0.7) return {
    color: "var(--success)",
    label: "alta"
  };
  if (v >= 0.3) return {
    color: "var(--warning)",
    label: "media"
  };
  return {
    color: "var(--text-subtle)",
    label: "baja"
  };
}
function ConfidenceBar({
  value = 0,
  showValue = true,
  width = 64,
  className = "",
  style,
  ...rest
}) {
  const v = Math.max(0, Math.min(1, value));
  const l = level(v);
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width,
      height: 5,
      borderRadius: "var(--radius-full)",
      background: "var(--surface-inset)",
      overflow: "hidden",
      flexShrink: 0,
      border: "1px solid var(--border)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      width: `${v * 100}%`,
      background: l.color,
      borderRadius: "var(--radius-full)",
      transition: "width var(--dur-slow) var(--ease)"
    }
  })), showValue && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-2xs)",
      color: "var(--text-muted)",
      fontVariantNumeric: "tabular-nums",
      minWidth: 30
    }
  }, v.toFixed(2)));
}
Object.assign(__ds_scope, { ConfidenceBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/ConfidenceBar.jsx", error: String((e && e.message) || e) }); }

// components/display/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Curated Lucide glyphs (ISC-licensed, 24×24, stroke-based). Add more paths as needed.
   Content is JSX so the bundler keeps it inline. */
const PATHS = {
  copy: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    width: "13",
    height: "13",
    x: "9",
    y: "9",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 15a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2"
  })),
  check: /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }),
  "chevron-down": /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }),
  "chevron-right": /*#__PURE__*/React.createElement("path", {
    d: "m9 18 6-6-6-6"
  }),
  "chevron-up": /*#__PURE__*/React.createElement("path", {
    d: "m18 15-6-6-6 6"
  }),
  x: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m6 6 12 12"
  })),
  trash: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 6h18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
  })),
  clock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 6 12 12 16 14"
  })),
  "arrow-down": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 5v14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m19 12-7 7-7-7"
  })),
  "corner-down-right": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("polyline", {
    points: "15 10 20 15 15 20"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 4v7a4 4 0 0 0 4 4h12"
  })),
  "alert-triangle": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 17h.01"
  })),
  info: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16v-4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8h.01"
  })),
  shield: /*#__PURE__*/React.createElement("path", {
    d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
  }),
  loader: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 2v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m16.2 7.8 2.9-2.9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18 12h4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m16.2 16.2 2.9 2.9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 18v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m4.9 19.1 2.9-2.9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M2 12h4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m4.9 4.9 2.9 2.9"
  })),
  terminal: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("polyline", {
    points: "4 17 10 11 4 5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    x2: "20",
    y1: "19",
    y2: "19"
  })),
  key: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16.5",
    cy: "7.5",
    r: ".5",
    fill: "currentColor",
    stroke: "none"
  })),
  braces: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"
  })),
  link: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
  })),
  hash: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
    x1: "4",
    x2: "20",
    y1: "9",
    y2: "9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4",
    x2: "20",
    y1: "15",
    y2: "15"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "10",
    x2: "8",
    y1: "3",
    y2: "21"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    x2: "14",
    y1: "3",
    y2: "21"
  })),
  calendar: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M8 2v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 2v4"
  }), /*#__PURE__*/React.createElement("rect", {
    width: "18",
    height: "18",
    x: "3",
    y: "4",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 10h18"
  })),
  type: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("polyline", {
    points: "4 7 4 4 20 4 20 7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    x2: "15",
    y1: "20",
    y2: "20"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    x2: "12",
    y1: "4",
    y2: "20"
  })),
  eye: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  })),
  "eye-off": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M10.73 5.08a10.74 10.74 0 0 1 11.2 6.57 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.44 2.49"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14.08 14.16a3 3 0 0 1-4.24-4.24"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m2 2 20 20"
  })),
  reopen: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 3v5h5"
  })),
  search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })),
  "git-branch": /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
    x1: "6",
    x2: "6",
    y1: "3",
    y2: "15"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "6",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "18",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18 9a9 9 0 0 1-9 9"
  }))
};
function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  className = "",
  style,
  ...rest
}) {
  const glyph = PATHS[name];
  return /*#__PURE__*/React.createElement("svg", _extends({
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: className,
    style: {
      flexShrink: 0,
      display: "block",
      ...style
    },
    "aria-hidden": "true"
  }, rest), glyph || null);
}
const iconNames = Object.keys(PATHS);
Object.assign(__ds_scope, { Icon, iconNames });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Icon.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONE = {
  neutral: {
    bg: "var(--surface-2)",
    fg: "var(--text-muted)",
    bd: "var(--border)"
  },
  accent: {
    bg: "var(--accent-subtle-bg)",
    fg: "var(--accent-subtle-fg)",
    bd: "color-mix(in oklab, var(--accent) 30%, transparent)"
  },
  success: {
    bg: "var(--success-subtle-bg)",
    fg: "var(--success-subtle-fg)",
    bd: "color-mix(in oklab, var(--success) 30%, transparent)"
  },
  warning: {
    bg: "var(--warning-subtle-bg)",
    fg: "var(--warning-subtle-fg)",
    bd: "color-mix(in oklab, var(--warning) 32%, transparent)"
  },
  danger: {
    bg: "var(--danger-subtle-bg)",
    fg: "var(--danger-subtle-fg)",
    bd: "color-mix(in oklab, var(--danger) 32%, transparent)"
  },
  violet: {
    bg: "color-mix(in oklab, var(--violet-500) 14%, var(--surface))",
    fg: "var(--violet-700)",
    bd: "color-mix(in oklab, var(--violet-500) 32%, transparent)"
  },
  cyan: {
    bg: "color-mix(in oklab, var(--cyan-500) 15%, var(--surface))",
    fg: "var(--cyan-700)",
    bd: "color-mix(in oklab, var(--cyan-500) 34%, transparent)"
  }
};

/* DataKind → visual identity. The heart of the product's type vocabulary. */
const KIND_META = {
  jwt: {
    tone: "accent",
    icon: "key",
    label: "jwt"
  },
  json: {
    tone: "violet",
    icon: "braces",
    label: "json"
  },
  base64: {
    tone: "cyan",
    icon: "terminal",
    label: "base64"
  },
  unix_timestamp: {
    tone: "warning",
    icon: "clock",
    label: "timestamp"
  },
  url: {
    tone: "success",
    icon: "link",
    label: "url"
  },
  uuid: {
    tone: "cyan",
    icon: "hash",
    label: "uuid"
  },
  hash: {
    tone: "danger",
    icon: "hash",
    label: "hash"
  },
  text: {
    tone: "neutral",
    icon: "type",
    label: "text"
  }
};
function Badge({
  children,
  kind,
  tone = "neutral",
  icon,
  mono,
  size = "md",
  outline = false,
  className = "",
  style,
  ...rest
}) {
  const meta = kind ? KIND_META[kind] : null;
  const t = TONE[meta ? meta.tone : tone] || TONE.neutral;
  const glyph = icon || meta && meta.icon;
  const label = children != null ? children : meta ? meta.label : null;
  const useMono = mono != null ? mono : !!kind;
  const sm = size === "sm";
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: sm ? 3 : 5,
      height: sm ? 18 : 22,
      padding: sm ? "0 6px" : "0 8px",
      fontSize: sm ? "var(--text-2xs)" : "var(--text-xs)",
      fontWeight: "var(--weight-medium)",
      lineHeight: 1,
      fontFamily: useMono ? "var(--font-mono)" : "var(--font-sans)",
      color: t.fg,
      background: outline ? "transparent" : t.bg,
      border: `1px solid ${t.bd}`,
      borderRadius: "var(--radius-sm)",
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), glyph && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: glyph,
    size: sm ? 11 : 13
  }), label);
}
Object.assign(__ds_scope, { KIND_META, Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/chain/ChainSummary.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ChainSummary({
  kinds = [],
  size = "sm",
  className = "",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      flexWrap: "wrap",
      ...style
    }
  }, rest), kinds.map((k, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 13,
    style: {
      color: "var(--text-subtle)"
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    kind: k,
    size: size
  }))));
}
Object.assign(__ds_scope, { ChainSummary });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chain/ChainSummary.jsx", error: String((e && e.message) || e) }); }

// components/display/CopyButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function CopyButton({
  value = "",
  label = "Copiar",
  size = "md",
  withLabel = false,
  onCopy,
  className = "",
  style,
  ...rest
}) {
  const [copied, setCopied] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const timer = React.useRef(null);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopy?.(value);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    } catch (_) {/* clipboard blocked — no-op */}
  };
  const dim = size === "sm" ? 28 : 32;
  const glyph = size === "sm" ? 14 : 16;
  if (withLabel) {
    return /*#__PURE__*/React.createElement("button", _extends({
      type: "button",
      onClick: copy,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      className: className,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: dim,
        padding: "0 10px",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-medium)",
        color: copied ? "var(--success)" : "var(--text-muted)",
        background: hover ? "var(--surface-2)" : "transparent",
        border: "1px solid transparent",
        borderRadius: "var(--radius)",
        cursor: "pointer",
        transition: "background var(--dur), color var(--dur)",
        ...style
      }
    }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: copied ? "check" : "copy",
      size: glyph
    }), copied ? "Copiado" : label);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    onClick: copy,
    "aria-label": label,
    title: label,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: dim,
      height: dim,
      borderRadius: "var(--radius)",
      cursor: "pointer",
      color: copied ? "var(--success)" : "var(--text-muted)",
      background: hover ? "var(--surface-2)" : "transparent",
      border: "1px solid transparent",
      transition: "background var(--dur), color var(--dur)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: copied ? "check" : "copy",
    size: glyph
  }));
}
Object.assign(__ds_scope, { CopyButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/CopyButton.jsx", error: String((e && e.message) || e) }); }

// components/display/CodeBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function CodeBlock({
  children,
  value,
  title,
  kind,
  wrap = false,
  copyable = true,
  maxHeight = 320,
  className = "",
  style,
  ...rest
}) {
  const text = value != null ? value : typeof children === "string" ? children : "";
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      background: "var(--code-bg)",
      border: "1px solid var(--code-border)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      fontFamily: "var(--font-mono)",
      ...style
    }
  }, rest), (title || copyable) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 34,
      padding: "0 8px 0 12px",
      borderBottom: "1px solid var(--code-border)",
      background: "var(--code-surface)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      color: "var(--code-muted)",
      fontSize: "var(--text-xs)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "terminal",
    size: 13
  }), title || (kind ? kind : "output")), copyable && /*#__PURE__*/React.createElement(__ds_scope.CopyButton, {
    value: text,
    label: "Copiar",
    size: "sm",
    style: {
      color: "var(--code-muted)",
      "--surface-2": "rgba(255,255,255,.08)"
    }
  })), /*#__PURE__*/React.createElement("pre", {
    style: {
      margin: 0,
      padding: "12px 14px",
      color: "var(--code-fg)",
      fontSize: "var(--text-sm)",
      lineHeight: "var(--leading-code)",
      whiteSpace: wrap ? "pre-wrap" : "pre",
      wordBreak: wrap ? "break-word" : "normal",
      overflow: "auto",
      maxHeight,
      tabSize: 2
    }
  }, /*#__PURE__*/React.createElement("code", {
    style: {
      fontFamily: "var(--font-mono)"
    }
  }, children != null ? children : value)));
}
Object.assign(__ds_scope, { CodeBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/CodeBlock.jsx", error: String((e && e.message) || e) }); }

// components/display/Kbd.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Kbd({
  children,
  className = "",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("kbd", _extends({
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 20,
      height: 20,
      padding: "0 6px",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-2xs)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text-muted)",
      background: "var(--surface)",
      border: "1px solid var(--border-strong)",
      borderBottomWidth: 2,
      borderRadius: "var(--radius-sm)",
      lineHeight: 1,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Kbd });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Kbd.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Callout.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONE = {
  info: {
    icon: "info",
    fg: "var(--accent-subtle-fg)",
    bg: "var(--accent-subtle-bg)",
    bd: "color-mix(in oklab, var(--accent) 28%, transparent)",
    accent: "var(--accent)"
  },
  warning: {
    icon: "alert-triangle",
    fg: "var(--warning-subtle-fg)",
    bg: "var(--warning-subtle-bg)",
    bd: "color-mix(in oklab, var(--warning) 32%, transparent)",
    accent: "var(--warning)"
  },
  danger: {
    icon: "alert-triangle",
    fg: "var(--danger-subtle-fg)",
    bg: "var(--danger-subtle-bg)",
    bd: "color-mix(in oklab, var(--danger) 32%, transparent)",
    accent: "var(--danger)"
  },
  success: {
    icon: "check",
    fg: "var(--success-subtle-fg)",
    bg: "var(--success-subtle-bg)",
    bd: "color-mix(in oklab, var(--success) 30%, transparent)",
    accent: "var(--success)"
  },
  security: {
    icon: "shield",
    fg: "var(--text)",
    bg: "var(--surface-2)",
    bd: "var(--border-strong)",
    accent: "var(--text-muted)"
  }
};
function Callout({
  tone = "info",
  title,
  icon,
  children,
  className = "",
  style,
  ...rest
}) {
  const t = TONE[tone] || TONE.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "note",
    className: className,
    style: {
      display: "flex",
      gap: "var(--space-3)",
      padding: "var(--space-3) var(--space-4)",
      background: t.bg,
      border: `1px solid ${t.bd}`,
      borderRadius: "var(--radius-md)",
      color: t.fg,
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || t.icon,
    size: 18,
    style: {
      color: t.accent,
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("strong", {
    style: {
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-semibold)"
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-sm)",
      lineHeight: "var(--leading-snug)",
      color: "var(--text)"
    }
  }, children)));
}
Object.assign(__ds_scope, { Callout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Callout.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function EmptyState({
  icon = "search",
  title,
  description,
  action,
  className = "",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: "var(--space-3)",
      padding: "var(--space-10) var(--space-6)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 44,
      height: 44,
      borderRadius: "var(--radius-lg)",
      background: "var(--surface-2)",
      color: "var(--text-subtle)",
      border: "1px solid var(--border)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20
  })), title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-md)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text)"
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)",
      maxWidth: 380,
      lineHeight: "var(--leading-snug)"
    }
  }, description), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "var(--space-1)"
    }
  }, action));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Spinner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Spinner({
  size = 16,
  label,
  className = "",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      color: "var(--text-muted)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true",
    style: {
      animation: "dtds-spin 0.7s linear infinite",
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9",
    stroke: "currentColor",
    strokeOpacity: "0.2",
    strokeWidth: "2.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 0 0-9-9",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      fontFamily: "var(--font-sans)"
    }
  }, label), /*#__PURE__*/React.createElement("style", null, "@keyframes dtds-spin{to{transform:rotate(360deg)}}"));
}
Object.assign(__ds_scope, { Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const H = {
  sm: "var(--control-h-sm)",
  md: "var(--control-h)",
  lg: "var(--control-h-lg)"
};
const PAD = {
  sm: "0 10px",
  md: "0 14px",
  lg: "0 18px"
};
const FS = {
  sm: "var(--text-sm)",
  md: "var(--text-base)",
  lg: "var(--text-base)"
};
const VARIANTS = {
  primary: {
    background: "var(--accent)",
    color: "var(--accent-fg)",
    border: "1px solid var(--accent)"
  },
  secondary: {
    background: "var(--surface)",
    color: "var(--text)",
    border: "1px solid var(--border-strong)"
  },
  ghost: {
    background: "transparent",
    color: "var(--text)",
    border: "1px solid transparent"
  },
  danger: {
    background: "var(--danger)",
    color: "var(--accent-fg)",
    border: "1px solid var(--danger)"
  }
};
const HOVER = {
  primary: "var(--accent-hover)",
  secondary: "var(--surface-2)",
  ghost: "var(--surface-2)",
  danger: "var(--red-700)"
};
function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  block = false,
  disabled = false,
  type = "button",
  children,
  className = "",
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const v = VARIANTS[variant] || VARIANTS.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    className: className,
    style: {
      display: block ? "flex" : "inline-flex",
      width: block ? "100%" : "auto",
      alignItems: "center",
      justifyContent: "center",
      gap: "var(--space-2)",
      height: H[size],
      padding: PAD[size],
      fontSize: FS[size],
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      lineHeight: 1,
      borderRadius: "var(--radius)",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      userSelect: "none",
      transition: "background var(--dur) var(--ease), border-color var(--dur) var(--ease), opacity var(--dur)",
      opacity: disabled ? 0.5 : 1,
      ...v,
      background: hover && !disabled ? HOVER[variant] : v.background,
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: size === "sm" ? 14 : 16
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: size === "sm" ? 14 : 16
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className = "",
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      fontSize: "var(--text-sm)",
      fontWeight: "var(--weight-medium)",
      color: "var(--text)",
      fontFamily: "var(--font-sans)"
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--danger)",
      marginLeft: 3
    }
  }, "*")), children, error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--danger)",
      fontFamily: "var(--font-sans)"
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      fontFamily: "var(--font-sans)"
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZE = {
  sm: 28,
  md: 32,
  lg: 40
};
const GLYPH = {
  sm: 14,
  md: 16,
  lg: 18
};
function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  disabled = false,
  active = false,
  className = "",
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const bordered = variant === "secondary";
  const bg = active ? "var(--surface-2)" : hover && !disabled ? "var(--surface-2)" : bordered ? "var(--surface)" : "transparent";
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: SIZE[size],
      height: SIZE[size],
      padding: 0,
      borderRadius: "var(--radius)",
      cursor: disabled ? "not-allowed" : "pointer",
      color: active ? "var(--text)" : "var(--text-muted)",
      background: bg,
      border: bordered ? "1px solid var(--border-strong)" : "1px solid transparent",
      transition: "background var(--dur) var(--ease), color var(--dur)",
      opacity: disabled ? 0.45 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: GLYPH[size]
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  size = "md",
  invalid = false,
  mono = false,
  icon,
  type = "text",
  className = "",
  style,
  disabled = false,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === "sm" ? "var(--control-h-sm)" : size === "lg" ? "var(--control-h-lg)" : "var(--control-h)";
  const borderColor = invalid ? "var(--danger)" : focus ? "var(--accent)" : "var(--border-strong)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      width: "100%"
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16,
    style: {
      position: "absolute",
      left: 12,
      color: "var(--text-subtle)",
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    disabled: disabled,
    onFocus: e => {
      setFocus(true);
      rest.onFocus?.(e);
    },
    onBlur: e => {
      setFocus(false);
      rest.onBlur?.(e);
    },
    className: className,
    style: {
      width: "100%",
      height: h,
      padding: icon ? "0 12px 0 36px" : "0 12px",
      fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
      fontSize: size === "sm" ? "var(--text-sm)" : "var(--text-base)",
      color: "var(--text)",
      background: disabled ? "var(--surface-2)" : "var(--surface)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius)",
      outline: "none",
      boxShadow: focus ? "var(--focus-ring)" : "none",
      transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)",
      opacity: disabled ? 0.6 : 1,
      "--ph": "var(--text-subtle)",
      ...style
    }
  }, rest)));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  options = [],
  value,
  onChange,
  size = "md",
  invalid = false,
  mono = false,
  placeholder,
  disabled = false,
  className = "",
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === "sm" ? "var(--control-h-sm)" : size === "lg" ? "var(--control-h-lg)" : "var(--control-h)";
  const borderColor = invalid ? "var(--danger)" : focus ? "var(--accent)" : "var(--border-strong)";
  const norm = options.map(o => typeof o === "string" ? {
    value: o,
    label: o
  } : o);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "inline-flex",
      width: "100%",
      ...style
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    className: className,
    style: {
      appearance: "none",
      WebkitAppearance: "none",
      width: "100%",
      height: h,
      padding: "0 34px 0 12px",
      fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
      fontSize: size === "sm" ? "var(--text-sm)" : "var(--text-base)",
      color: "var(--text)",
      background: disabled ? "var(--surface-2)" : "var(--surface)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius)",
      outline: "none",
      boxShadow: focus ? "var(--focus-ring)" : "none",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)"
    }
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), norm.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 16,
    style: {
      position: "absolute",
      right: 10,
      top: "50%",
      transform: "translateY(-50%)",
      color: "var(--text-muted)",
      pointerEvents: "none"
    }
  }));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/chain/StepCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TERMINAL = {
  text: {
    tone: "neutral",
    label: "Dato de texto — fin de la cadena"
  },
  no_transform: {
    tone: "neutral",
    label: "Sin más transformaciones aplicables"
  },
  max_depth: {
    tone: "warning",
    label: "Profundidad máxima alcanzada (8 pasos)"
  },
  cycle: {
    tone: "warning",
    label: "Ciclo detectado — cadena cortada"
  },
  error: {
    tone: "danger",
    label: "Error en la transformación"
  }
};
function StepCard({
  index,
  kind,
  confidence,
  applied,
  alternatives = [],
  transforms = [],
  output,
  notes = [],
  terminal,
  onSelectTransform,
  className = "",
  style,
  ...rest
}) {
  const hasAlt = alternatives.length > 0;
  const term = terminal ? TERMINAL[terminal] : null;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      position: "relative",
      display: "flex",
      gap: "var(--space-3)",
      padding: "var(--space-4)",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-sm)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 26,
      height: 26,
      borderRadius: "var(--radius-full)",
      background: "var(--surface-2)",
      border: "1px solid var(--border-strong)",
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-xs)",
      fontWeight: "var(--weight-semibold)",
      color: "var(--text-muted)"
    }
  }, index)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      flexWrap: "wrap"
    }
  }, kind && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    kind: kind
  }), confidence != null && /*#__PURE__*/React.createElement(__ds_scope.ConfidenceBar, {
    value: confidence
  }), applied && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      marginLeft: "auto",
      color: "var(--text-muted)",
      fontSize: "var(--text-xs)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "corner-down-right",
    size: 13
  }), /*#__PURE__*/React.createElement("code", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "var(--text)"
    }
  }, applied))), hasAlt && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      flexWrap: "wrap",
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Tambi\xE9n podr\xEDa ser:"), alternatives.map(a => /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    key: a,
    kind: a,
    size: "sm",
    outline: true
  }))), transforms.length > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      maxWidth: 320
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      whiteSpace: "nowrap"
    }
  }, "Transformaci\xF3n:"), /*#__PURE__*/React.createElement(__ds_scope.Select, {
    mono: true,
    size: "sm",
    value: applied,
    options: transforms,
    onChange: e => onSelectTransform?.(e.target.value)
  })), output != null && /*#__PURE__*/React.createElement(__ds_scope.CodeBlock, {
    kind: kind,
    value: output,
    wrap: true
  }), notes.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, notes.map((n, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      fontFamily: "var(--font-mono)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "info",
    size: 12,
    style: {
      color: "var(--accent)"
    }
  }), n))), term && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      fontSize: "var(--text-xs)",
      color: term.tone === "danger" ? "var(--danger)" : term.tone === "warning" ? "var(--warning)" : "var(--text-subtle)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: term.tone === "neutral" ? "check" : "alert-triangle",
    size: 13
  }), term.label)));
}
Object.assign(__ds_scope, { StepCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chain/StepCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea({
  invalid = false,
  mono = true,
  autoFocus = false,
  rows = 6,
  className = "",
  style,
  disabled = false,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const borderColor = invalid ? "var(--danger)" : focus ? "var(--accent)" : "var(--border-strong)";
  return /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows,
    autoFocus: autoFocus,
    disabled: disabled,
    onFocus: e => {
      setFocus(true);
      rest.onFocus?.(e);
    },
    onBlur: e => {
      setFocus(false);
      rest.onBlur?.(e);
    },
    className: className,
    style: {
      width: "100%",
      display: "block",
      resize: "vertical",
      padding: "12px 14px",
      fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
      fontSize: "var(--text-sm)",
      lineHeight: "var(--leading-code)",
      color: "var(--text)",
      background: disabled ? "var(--surface-2)" : "var(--surface)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-md)",
      outline: "none",
      boxShadow: focus ? "var(--focus-ring)" : "none",
      transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)",
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/history/HistoryRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function HistoryRow({
  preview,
  kind,
  chain = [],
  time,
  onReopen,
  onDelete,
  className = "",
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    className: className,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-4)",
      padding: "var(--space-3) var(--space-4)",
      background: hover ? "var(--surface-2)" : "var(--surface)",
      borderBottom: "1px solid var(--border)",
      fontFamily: "var(--font-sans)",
      transition: "background var(--dur)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("code", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "var(--text-sm)",
      color: "var(--text)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "100%"
    }
  }, preview), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      flexWrap: "wrap"
    }
  }, kind && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    kind: kind,
    size: "sm"
  }), chain.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.ChainSummary, {
    kinds: chain,
    size: "sm"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontSize: "var(--text-xs)",
      color: "var(--text-subtle)",
      whiteSpace: "nowrap",
      fontVariantNumeric: "tabular-nums"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 12
  }), time), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 2,
      opacity: hover ? 1 : 0.35,
      transition: "opacity var(--dur)"
    }
  }, onReopen && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "reopen",
    label: "Reabrir",
    size: "sm",
    onClick: onReopen
  }), onDelete && /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "trash",
    label: "Borrar",
    size: "sm",
    onClick: onDelete
  })));
}
Object.assign(__ds_scope, { HistoryRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/history/HistoryRow.jsx", error: String((e && e.message) || e) }); }

// components/forms/Segmented.jsx
try { (() => {
function Segmented({ options = [], value, onChange, size = "md", mono = false, className = "", style }) {
  const pad = size === "sm" ? "5px 12px" : "7px 16px";
  const norm = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    className: className,
    style: {
      display: "inline-flex", gap: 4, padding: 4,
      background: "var(--surface-2)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", ...style
    }
  }, norm.map((o) => {
    const on = o.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      role: "tab",
      type: "button",
      "aria-selected": on,
      onClick: () => onChange && onChange(o.value),
      style: {
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: pad, border: on ? "1px solid var(--border)" : "1px solid transparent",
        borderRadius: "var(--radius)", cursor: "pointer",
        fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        fontSize: size === "sm" ? "var(--text-xs)" : "var(--text-sm)",
        fontWeight: on ? 600 : 500,
        color: on ? "var(--text)" : "var(--text-muted)",
        background: on ? "var(--surface)" : "transparent",
        boxShadow: on ? "var(--shadow-sm)" : "none",
        transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)"
      }
    }, o.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, { name: o.icon, size: 14 }), o.label);
  }));
}
Object.assign(__ds_scope, { Segmented });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Segmented.jsx", error: String((e && e.message) || e) }); }

__ds_ns.ChainSummary = __ds_scope.ChainSummary;

__ds_ns.StepCard = __ds_scope.StepCard;

__ds_ns.KIND_META = __ds_scope.KIND_META;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CodeBlock = __ds_scope.CodeBlock;

__ds_ns.ConfidenceBar = __ds_scope.ConfidenceBar;

__ds_ns.CopyButton = __ds_scope.CopyButton;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Kbd = __ds_scope.Kbd;

__ds_ns.Callout = __ds_scope.Callout;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Segmented = __ds_scope.Segmented;

__ds_ns.HistoryRow = __ds_scope.HistoryRow;

})();
