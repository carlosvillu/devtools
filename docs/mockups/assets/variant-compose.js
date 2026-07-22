// Dirección inversa — "Codificar / componer": construyo un texto y lo encadeno hacia
// delante (texto → json.minify → jwt.sign → …) para compartir el resultado.
// Constructor de cadena: el usuario añade pasos uno a uno y elige la transformación.
// Expone en window: ComposeClaro, ComposeOscuro, ComposeClaroM, ComposeOscuroM,
//   PlaceToggle, PlaceRoute, PlaceContextual.

(function () {
  const DS = window.DevtoolsDesignSystem_9d6b47;
  const {
    StepCard,
    Badge,
    Button,
    IconButton,
    Input,
    Textarea,
    Field,
    Select,
    Callout,
    Card,
    Icon,
    CopyButton,
    Kbd,
    Segmented
  } = DS;
  const {
    Wordmark
  } = window;
  const mono = "var(--font-mono)";

  // ── datos del ejemplo ──────────────────────────────────────────────────────
  const SOURCE = '{\n  "sub": "1",\n  "name": "carlos",\n  "role": "admin"\n}';
  const MINIFIED = '{"sub":"1","name":"carlos","role":"admin"}';
  const SIGNED = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjUzNzYwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  const CHAIN_KINDS = ["text", "json", "jwt"];

  // catálogo de transformaciones de codificación (dirección inversa)
  const CATALOG = [{
    group: "json",
    items: [["json.minify", "json"], ["json.stringify", "json"]]
  }, {
    group: "binario",
    items: [["base64.encode", "base64"], ["base64url.encode", "base64"], ["url.encode", "url"]]
  }, {
    group: "hash",
    items: [["sha256", "hash"], ["md5", "hash"]]
  }, {
    group: "firma",
    items: [["jwt.sign", "jwt"]]
  }];
  const ALL_TX = CATALOG.flatMap(g => g.items.map(i => i[0]));

  // ── primitivas locales ──────────────────────────────────────────────────────
  const Eyebrow = ({
    dark,
    accent,
    children,
    style
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      fontFamily: dark ? mono : "var(--font-sans)",
      fontSize: "var(--text-2xs)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-subtle)",
      fontWeight: 600,
      ...style
    }
  }, dark && /*#__PURE__*/React.createElement("span", {
    style: {
      color: accent || "var(--accent)"
    }
  }, ">"), children);

  // conector vertical entre pasos
  const Connector = () => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: 22,
      marginLeft: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 22,
      background: "var(--border-strong)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-down",
    size: 13,
    style: {
      position: "absolute",
      left: -6,
      bottom: -2,
      color: "var(--text-subtle)",
      background: "var(--bg)"
    }
  })));
  const IndexPill = ({
    children,
    tone
  }) => /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 26,
      height: 26,
      borderRadius: "var(--radius-full)",
      background: tone === "accent" ? "var(--accent-subtle-bg)" : "var(--surface-2)",
      border: `1px solid ${tone === "accent" ? "color-mix(in oklab, var(--accent) 30%, transparent)" : "var(--border-strong)"}`,
      fontFamily: mono,
      fontSize: "var(--text-xs)",
      fontWeight: 600,
      color: tone === "accent" ? "var(--accent-subtle-fg)" : "var(--text-muted)",
      flexShrink: 0
    }
  }, children);

  // paso 0 — la fuente que escribo
  const SourceStep = () => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "var(--space-3)",
      padding: "var(--space-4)",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-sm)"
    }
  }, /*#__PURE__*/React.createElement(IndexPill, null, "in"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      fontWeight: 500
    }
  }, "entrada"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-subtle)",
      fontSize: "var(--text-xs)"
    }
  }, "escribe o pega lo que quieras codificar"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      color: "var(--text-muted)",
      fontSize: "var(--text-xs)"
    }
  }, "reconocido ", /*#__PURE__*/React.createElement(Badge, {
    kind: "json",
    size: "sm"
  }))), /*#__PURE__*/React.createElement(Textarea, {
    rows: 4,
    defaultValue: SOURCE,
    style: {
      fontSize: "var(--text-sm)"
    }
  })));

  // un paso de codificación (transformación elegida por el usuario)
  function BuildStep({
    index,
    transform,
    outKind,
    output,
    note,
    secret
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)"
      }
    }, /*#__PURE__*/React.createElement(IndexPill, {
      tone: "accent"
    }, index), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)",
        whiteSpace: "nowrap"
      }
    }, "transforma con"), /*#__PURE__*/React.createElement(Select, {
      mono: true,
      size: "sm",
      value: transform,
      options: ALL_TX,
      onChange: () => {},
      style: {
        maxWidth: 190
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--text-subtle)",
        fontSize: "var(--text-xs)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "corner-down-right",
      size: 13
    }), " produce ", /*#__PURE__*/React.createElement(Badge, {
      kind: outKind,
      size: "sm"
    })), /*#__PURE__*/React.createElement(IconButton, {
      icon: "x",
      label: "Quitar paso",
      size: "sm"
    })), secret && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "var(--space-3)",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 130
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "algoritmo"
    }, /*#__PURE__*/React.createElement(Select, {
      mono: true,
      size: "sm",
      value: "HS256",
      options: ["HS256", "HS384", "HS512", "RS256"],
      onChange: () => {}
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 200
      }
    }, /*#__PURE__*/React.createElement(Field, {
      label: "secreto de firma"
    }, /*#__PURE__*/React.createElement(Input, {
      type: "password",
      mono: true,
      defaultValue: "mi-secreto-de-firma",
      icon: "key"
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "inline-flex",
        alignItems: "flex-start",
        gap: 7,
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "shield",
      size: 13,
      style: {
        color: "var(--text-subtle)",
        marginTop: 1,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", null, "El secreto viaja al servidor solo para firmar y no se guarda \u2014 en BD ni en logs. No uses un secreto de producci\xF3n vivo."))), output != null && /*#__PURE__*/React.createElement("div", {
      style: {
        background: "var(--gray-950)",
        borderRadius: "var(--radius-md)",
        padding: "10px 12px",
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: mono,
        fontSize: "var(--text-2xs)",
        color: "var(--gray-400)"
      }
    }, transform), /*#__PURE__*/React.createElement(CopyButton, {
      value: output,
      label: "Copiar salida",
      size: "sm"
    })), /*#__PURE__*/React.createElement("pre", {
      style: {
        margin: 0,
        fontFamily: mono,
        fontSize: "var(--text-sm)",
        color: "var(--gray-100)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        lineHeight: 1.5
      }
    }, output)), note && /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)",
        fontFamily: mono
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "info",
      size: 12,
      style: {
        color: "var(--accent)"
      }
    }), note)));
  }

  // chip de transformación en la paleta "añadir paso"
  const TxChip = ({
    id,
    kind
  }) => /*#__PURE__*/React.createElement("button", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      padding: "5px 10px",
      background: "var(--surface)",
      border: "1px solid var(--border-strong)",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      font: "inherit"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    kind: kind,
    size: "sm",
    style: {
      background: "transparent",
      border: "none",
      padding: 0,
      height: "auto"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: mono,
      fontSize: "var(--text-xs)",
      color: "var(--text)"
    }
  }, id), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 12,
    style: {
      color: "var(--text-subtle)"
    }
  }));

  // afordancia "añadir paso" — abierta muestra la paleta agrupada
  const AddStep = ({
    open
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 38
    }
  }, !open ? /*#__PURE__*/React.createElement("button", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 14px",
      background: "transparent",
      border: "1px dashed var(--border-strong)",
      borderRadius: "var(--radius-md)",
      color: "var(--text-muted)",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-sm)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 14
  }), " a\xF1adir paso") : /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)",
      background: "var(--surface)",
      boxShadow: "var(--shadow-sm)",
      padding: "var(--space-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      marginBottom: 10
    }
  }, "a\xF1ade un paso \u2014 se aplica sobre la salida anterior"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, CATALOG.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.group,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 62,
      flexShrink: 0,
      fontSize: "var(--text-2xs)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-subtle)",
      fontWeight: 600
    }
  }, g.group), g.items.map(([id, kind]) => /*#__PURE__*/React.createElement(TxChip, {
    key: id,
    id: id,
    kind: kind
  })))))));

  // barra de resultado final — copiar lo que voy a compartir
  const ResultBar = ({
    kind = "jwt",
    value = SIGNED
  }) => /*#__PURE__*/React.createElement(Card, {
    padding: "none",
    style: {
      padding: 0,
      overflow: "hidden",
      borderColor: "color-mix(in oklab, var(--accent) 34%, var(--border))"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px",
      background: "var(--accent-subtle-bg)",
      borderBottom: "1px solid color-mix(in oklab, var(--accent) 22%, transparent)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 15,
    style: {
      color: "var(--accent)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      fontWeight: 600,
      color: "var(--accent-subtle-fg)"
    }
  }, "resultado"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      fontSize: "var(--text-xs)"
    }
  }, "\xB7 2 pasos \xB7 ", /*#__PURE__*/React.createElement(Badge, {
    kind: kind,
    size: "sm"
  }), " listo para compartir")), /*#__PURE__*/React.createElement(CopyButton, {
    value: value,
    withLabel: true,
    label: "Copiar"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--gray-950)",
      padding: "12px 16px"
    }
  }, /*#__PURE__*/React.createElement("pre", {
    style: {
      margin: 0,
      fontFamily: mono,
      fontSize: "var(--text-sm)",
      color: "var(--gray-100)",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      lineHeight: 1.5
    }
  }, value)));

  // ── cadena completa (cuerpo compartido) ─────────────────────────────────────
  const ComposeBody = ({
    dark,
    openPalette
  }) => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 0
    }
  }, /*#__PURE__*/React.createElement(SourceStep, null), /*#__PURE__*/React.createElement(Connector, null), /*#__PURE__*/React.createElement(BuildStep, {
    index: 1,
    transform: "json.minify",
    outKind: "json",
    output: MINIFIED,
    note: "quita espacios y saltos de l\xEDnea"
  }), /*#__PURE__*/React.createElement(Connector, null), /*#__PURE__*/React.createElement(BuildStep, {
    index: 2,
    transform: "jwt.sign",
    outKind: "jwt",
    output: SIGNED,
    secret: true,
    note: "firmado HS256 \xB7 iat a\xF1adido autom\xE1ticamente"
  }), /*#__PURE__*/React.createElement(Connector, null), /*#__PURE__*/React.createElement(AddStep, {
    open: openPalette
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement(ResultBar, null)));

  // segmented decodificar / codificar — ahora provisto por el DS (DS.Segmented)
  const ModeSwitch = ({
    mode = "codificar",
    size = "md"
  }) => /*#__PURE__*/React.createElement(Segmented, {
    size: size,
    value: mode,
    onChange: () => {},
    options: [{
      value: "decodificar",
      label: "decodificar",
      icon: "search"
    }, {
      value: "codificar",
      label: "codificar",
      icon: "git-branch"
    }]
  });

  // ── Shell ────────────────────────────────────────────────────────────────────
  const Shell = ({
    dark,
    children,
    maxWidth = 800,
    mobile
  }) => /*#__PURE__*/React.createElement("div", {
    className: dark ? "dark" : undefined,
    style: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "var(--font-sans)",
      fontSize: "var(--text-base)"
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      flex: "0 0 auto",
      height: mobile ? 52 : dark ? 56 : 60,
      borderBottom: "1px solid var(--border)",
      background: "var(--surface)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: mobile ? "0 16px" : dark ? "0 22px" : "0 28px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    size: mobile ? 16 : dark ? 17 : 19
  }), dark && !mobile && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: mono,
      fontSize: "var(--text-xs)",
      color: "var(--text-subtle)"
    }
  }, "~/ encode")), !mobile && (dark ? /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontFamily: mono,
      fontSize: "var(--text-xs)"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      padding: "5px 9px",
      borderRadius: 6,
      color: "var(--text-muted)"
    }
  }, "/"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      padding: "5px 9px",
      borderRadius: 6,
      color: "var(--text-muted)"
    }
  }, "/history"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary"
  }, "Entrar")) : /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 22,
      fontSize: "var(--text-sm)"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: "var(--text-muted)",
      fontWeight: 500
    }
  }, "el campo"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: "var(--text-muted)",
      fontWeight: 500
    }
  }, "historial"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary"
  }, "Entrar"))), mobile && /*#__PURE__*/React.createElement(IconButton, {
    icon: "reopen",
    label: "Historial",
    variant: "ghost"
  })), /*#__PURE__*/React.createElement("div", {
    className: "dt-scroll",
    style: {
      flex: "1 1 auto",
      overflow: "hidden",
      display: "flex",
      justifyContent: "center",
      padding: mobile ? "20px 16px 26px" : dark ? "34px 26px 40px" : "40px 28px 44px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth
    }
  }, children)));

  // ── pantallas completas de codificar ─────────────────────────────────────────
  const ComposeIntro = ({
    dark,
    mobile
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: mobile ? 18 : 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: mobile ? "flex-start" : "center",
      gap: 16,
      flexDirection: mobile ? "column" : "row",
      justifyContent: "space-between",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "0 0 6px",
      fontFamily: dark ? mono : "var(--font-sans)",
      fontSize: mobile ? "var(--text-xl)" : "var(--text-2xl)",
      fontWeight: 600,
      letterSpacing: "var(--tracking-tight)",
      lineHeight: "var(--leading-tight)"
    }
  }, "Comp\xF3n algo. Lo empaqueta."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "var(--text-muted)",
      fontSize: mobile ? "var(--text-sm)" : "var(--text-md)",
      maxWidth: 520
    }
  }, "La direcci\xF3n inversa: escribe un valor y encadena transformaciones \u2014 minify, base64, url, hash, firma JWT \u2014 hasta lo que quieras compartir.")), /*#__PURE__*/React.createElement(ModeSwitch, {
    mode: "codificar",
    size: mobile ? "sm" : "md"
  })));
  const ComposeScreen = ({
    dark,
    mobile,
    openPalette
  }) => /*#__PURE__*/React.createElement(Shell, {
    dark: dark,
    mobile: mobile,
    maxWidth: mobile ? 9999 : 800
  }, /*#__PURE__*/React.createElement(ComposeIntro, {
    dark: dark,
    mobile: mobile
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    dark: dark,
    accent: "var(--accent)"
  }, "la cadena \xB7 la construyes t\xFA"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 1,
      background: "var(--border)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: mono,
      fontSize: "var(--text-xs)",
      color: "var(--text-subtle)"
    }
  }, "text \u2192 json \u2192 jwt")), /*#__PURE__*/React.createElement(ComposeBody, {
    dark: dark,
    openPalette: openPalette
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement(Callout, {
    tone: "security",
    title: "Comp\xF3n sin miedo, pero no con secretos vivos."
  }, "Lo que escribes y el secreto de firma se procesan en el servidor solo para construir la cadena. No se guarda el dato crudo ni el secreto.")));
  const ComposeClaro = () => /*#__PURE__*/React.createElement(ComposeScreen, {
    dark: false,
    openPalette: true
  });
  const ComposeOscuro = () => /*#__PURE__*/React.createElement(ComposeScreen, {
    dark: true
  });
  const ComposeClaroM = () => /*#__PURE__*/React.createElement(ComposeScreen, {
    dark: false,
    mobile: true
  });
  const ComposeOscuroM = () => /*#__PURE__*/React.createElement(ComposeScreen, {
    dark: true,
    mobile: true
  });

  // ── OPCIONES DE UBICACIÓN (3 formas de encajar con lo existente) ──────────────
  const PlaceFrame = ({
    n,
    title,
    desc,
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 auto",
      overflow: "hidden"
    }
  }, children), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 auto",
      borderTop: "1px solid var(--border)",
      background: "var(--surface)",
      padding: "14px 20px",
      display: "flex",
      gap: 12,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 24,
      height: 24,
      borderRadius: "var(--radius-full)",
      background: "var(--accent)",
      color: "#fff",
      fontFamily: mono,
      fontSize: "var(--text-xs)",
      fontWeight: 600,
      flexShrink: 0
    }
  }, n), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-sm)",
      fontWeight: 600
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, desc))));
  const MiniHeader = ({
    nav
  }) => /*#__PURE__*/React.createElement("header", {
    style: {
      height: 56,
      borderBottom: "1px solid var(--border)",
      background: "var(--surface)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px"
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    size: 18
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 20,
      fontSize: "var(--text-sm)"
    }
  }, nav, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary"
  }, "Entrar")));

  // Opción 1 — un modo dentro del mismo campo (misma URL /)
  const PlaceToggle = () => /*#__PURE__*/React.createElement(PlaceFrame, {
    n: 1,
    title: "Un modo dentro del mismo campo",
    desc: "Misma URL /. Un control segmentado alterna decodificar \u21C4 codificar sin cambiar de p\xE1gina. La entrada m\xE1s ligera: mismo sitio, dos direcciones."
  }, /*#__PURE__*/React.createElement(MiniHeader, {
    nav: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: "var(--text)",
        fontWeight: 600
      }
    }, "el campo"), /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: "var(--text-muted)"
      }
    }, "historial"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "30px 40px",
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 640
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: "var(--text-xl)",
      fontWeight: 600,
      letterSpacing: "var(--tracking-tight)"
    }
  }, "Comp\xF3n algo. Lo empaqueta."), /*#__PURE__*/React.createElement(ModeSwitch, {
    mode: "codificar"
  })), /*#__PURE__*/React.createElement(SourceStep, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      margin: "8px 0"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-down",
    size: 16,
    style: {
      color: "var(--text-subtle)"
    }
  })), /*#__PURE__*/React.createElement(BuildStep, {
    index: 1,
    transform: "json.minify",
    outKind: "json",
    output: MINIFIED
  }))));

  // Opción 2 — ruta propia /build en la nav
  const PlaceRoute = () => /*#__PURE__*/React.createElement(PlaceFrame, {
    n: 2,
    title: "Ruta propia \xB7 /build en la nav",
    desc: "Una tercera entrada de navegaci\xF3n (\u201Cconstruir\u201D) y su URL /build. Codificar es un modo de primera clase, descubrible desde cualquier p\xE1gina. M\xE1s peso, m\xE1s claridad."
  }, /*#__PURE__*/React.createElement(MiniHeader, {
    nav: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: "var(--text-muted)"
      }
    }, "el campo"), /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: "var(--text)",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "git-branch",
      size: 14,
      style: {
        color: "var(--accent)"
      }
    }), "construir"), /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: "var(--text-muted)"
      }
    }, "historial"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "26px 40px",
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 640
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontFamily: mono,
      fontSize: "var(--text-xs)",
      color: "var(--text-subtle)",
      marginBottom: 14,
      padding: "4px 10px",
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "link",
    size: 13
  }), " devtools.app", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--accent)"
    }
  }, "/build")), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "0 0 6px",
      fontSize: "var(--text-xl)",
      fontWeight: 600,
      letterSpacing: "var(--tracking-tight)"
    }
  }, "construir"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 18px",
      color: "var(--text-muted)",
      fontSize: "var(--text-sm)"
    }
  }, "Escribe un valor y encadena transformaciones hacia el resultado que quieres compartir."), /*#__PURE__*/React.createElement(SourceStep, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      margin: "8px 0"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-down",
    size: 16,
    style: {
      color: "var(--text-subtle)"
    }
  })), /*#__PURE__*/React.createElement(BuildStep, {
    index: 1,
    transform: "base64url.encode",
    outKind: "base64",
    output: "eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiJ9"
  }))));

  // Opción 3 — desde un resultado de decodificar, invierte la cadena
  const PlaceContextual = () => /*#__PURE__*/React.createElement(PlaceFrame, {
    n: 3,
    title: "Desde un resultado \xB7 invierte la cadena",
    desc: "No es una entrada nueva, es continuidad: en cualquier resultado de decodificar aparece \u201Cinvertir\u201D, que reconstruye lo pegado. Codificar como el reverso natural del producto."
  }, /*#__PURE__*/React.createElement(MiniHeader, {
    nav: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: "var(--text)",
        fontWeight: 600
      }
    }, "el campo"), /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: "var(--text-muted)"
      }
    }, "historial"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "26px 40px",
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 640
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, {
    style: {
      marginBottom: 12
    }
  }, "resultado de la decodificaci\xF3n"), /*#__PURE__*/React.createElement(StepCard, {
    index: 1,
    kind: "json",
    output: '{\n  "sub": "1",\n  "name": "carlos"\n}',
    terminal: "no_transform"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      border: "1px dashed color-mix(in oklab, var(--accent) 40%, var(--border))",
      borderRadius: "var(--radius-lg)",
      background: "var(--accent-subtle-bg)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "reopen",
    size: 18,
    style: {
      color: "var(--accent)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-sm)",
      fontWeight: 600,
      color: "var(--accent-subtle-fg)"
    }
  }, "\xBFReconstruir en la otra direcci\xF3n?"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-xs)",
      color: "var(--text-muted)"
    }
  }, "Abre esta salida en modo codificar y encad\xE9nala de nuevo.")), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    icon: "git-branch"
  }, "Invertir")))));
  Object.assign(window, {
    ComposeClaro,
    ComposeOscuro,
    ComposeClaroM,
    ComposeOscuroM,
    PlaceToggle,
    PlaceRoute,
    PlaceContextual
  });
})();