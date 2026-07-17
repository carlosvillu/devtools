function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Mobile versions of all pages, both variants. Phone-width (390px) frames.
// Exposes: M (factory) results on window: FieldClaroM, HistoryClaroM, LoginClaroM, SignupClaroM + Oscuro equivalents.

(function () {
  const DS = window.DevtoolsDesignSystem_9d6b47;
  const {
    StepCard,
    ChainSummary,
    HistoryRow,
    Button,
    IconButton,
    Input,
    Textarea,
    Field,
    Callout,
    Card,
    Icon,
    Kbd
  } = DS;
  const {
    Wordmark,
    JWT_INPUT,
    CHAIN_JWT,
    HISTORY_ROWS
  } = window;
  const isDark = t => t === "oscuro";
  const mono = "var(--font-mono)";
  const Shell = ({
    theme,
    active,
    children,
    center
  }) => /*#__PURE__*/React.createElement("div", {
    className: isDark(theme) ? "dark" : undefined,
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
      height: 52,
      borderBottom: "1px solid var(--border)",
      background: "var(--surface)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px"
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    size: 16
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, isDark(theme) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: mono,
      fontSize: "var(--text-2xs)",
      color: "var(--text-subtle)"
    }
  }, "~/ ", active === "history" ? "history" : active === "none" ? "auth" : "analyze"), /*#__PURE__*/React.createElement(IconButton, {
    icon: "reopen",
    label: "Historial",
    variant: "ghost"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dt-scroll",
    style: {
      flex: "1 1 auto",
      overflow: "hidden",
      padding: center ? 16 : "22px 16px 26px",
      display: center ? "flex" : "block",
      flexDirection: "column",
      justifyContent: center ? "center" : undefined
    }
  }, children));
  const Eyebrow = ({
    theme,
    accent,
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      fontFamily: isDark(theme) ? mono : "var(--font-sans)",
      fontSize: "var(--text-2xs)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-subtle)",
      fontWeight: 600,
      marginBottom: 12
    }
  }, isDark(theme) && /*#__PURE__*/React.createElement("span", {
    style: {
      color: accent || "var(--accent)"
    }
  }, ">"), children);
  const Field_ = theme => () => /*#__PURE__*/React.createElement(Shell, {
    theme: theme,
    active: "field"
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "0 0 6px",
      fontFamily: isDark(theme) ? mono : "var(--font-sans)",
      fontSize: "var(--text-xl)",
      fontWeight: 600,
      letterSpacing: "var(--tracking-tight)",
      lineHeight: "var(--leading-tight)"
    }
  }, "Pega algo.", /*#__PURE__*/React.createElement("br", null), "Lo desenreda."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "0 0 18px",
      color: "var(--text-muted)",
      fontSize: "var(--text-sm)"
    }
  }, "JWT, base64, timestamp, JSON, URL. Detecta qu\xE9 es y lo decodifica paso a paso."), isDark(theme) ? /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      background: "var(--surface)",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 12px",
      borderBottom: "1px solid var(--border)",
      background: "var(--surface-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 4,
      background: "var(--red-500)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 4,
      background: "var(--amber-500)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 4,
      background: "var(--green-500)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 6,
      fontFamily: mono,
      fontSize: "var(--text-2xs)",
      color: "var(--text-muted)"
    }
  }, "stdin")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: mono,
      fontSize: "var(--text-2xs)",
      color: "var(--text-subtle)"
    }
  }, "128 KB m\xE1x")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12
    }
  }, /*#__PURE__*/React.createElement(Textarea, {
    rows: 4,
    defaultValue: JWT_INPUT,
    style: {
      background: "transparent",
      border: "none",
      boxShadow: "none",
      padding: 0,
      fontSize: "var(--text-2xs)"
    }
  }))) : /*#__PURE__*/React.createElement(Textarea, {
    rows: 4,
    defaultValue: JWT_INPUT,
    style: {
      fontSize: "var(--text-2xs)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      margin: "10px 0 26px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      color: "var(--text-subtle)",
      fontSize: "var(--text-2xs)"
    }
  }, /*#__PURE__*/React.createElement(Kbd, null, "\u2318"), /*#__PURE__*/React.createElement(Kbd, null, "V"), " analiza al pegar"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      color: "var(--success)",
      fontSize: "var(--text-2xs)",
      fontFamily: isDark(theme) ? mono : undefined
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "git-branch",
    size: 13
  }), " jwt \u2192 json")), /*#__PURE__*/React.createElement(Eyebrow, {
    theme: theme,
    accent: "var(--success)"
  }, "la cadena"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, CHAIN_JWT.map(s => /*#__PURE__*/React.createElement(StepCard, _extends({
    key: s.index
  }, s)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(Callout, {
    tone: "security",
    title: "Se procesa en el servidor."
  }, "No lo uses con secretos vivos. El dato crudo no se guarda.")));
  const History_ = theme => () => /*#__PURE__*/React.createElement(Shell, {
    theme: theme,
    active: "history"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    theme: theme
  }, "\xFAltimas 50"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: isDark(theme) ? mono : "var(--font-sans)",
      fontSize: "var(--text-xl)",
      fontWeight: 600,
      letterSpacing: "var(--tracking-tight)"
    }
  }, isDark(theme) ? "history" : "Historial")), /*#__PURE__*/React.createElement(IconButton, {
    icon: "trash",
    label: "Borrar todo",
    variant: isDark(theme) ? "secondary" : "ghost"
  })), /*#__PURE__*/React.createElement(Card, {
    padding: "sm",
    style: {
      padding: 0,
      overflow: "hidden"
    }
  }, HISTORY_ROWS.slice(0, 5).map((r, i) => /*#__PURE__*/React.createElement(HistoryRow, _extends({
    key: i
  }, r, {
    onReopen: () => {},
    onDelete: () => {}
  })))), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: 12,
      color: "var(--text-subtle)",
      fontSize: "var(--text-2xs)",
      fontFamily: isDark(theme) ? mono : undefined,
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "reopen",
    size: 12
  }), " reabrir restaura la cadena, no el dato (D7)"));
  const Auth_ = (theme, mode) => () => /*#__PURE__*/React.createElement(Shell, {
    theme: theme,
    active: "none",
    center: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    size: 20
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "0 0 4px",
      fontFamily: isDark(theme) ? mono : "var(--font-sans)",
      fontSize: "var(--text-lg)",
      fontWeight: 600,
      letterSpacing: "var(--tracking-tight)"
    }
  }, mode === "signup" ? isDark(theme) ? "signup" : "Crea tu cuenta" : isDark(theme) ? "login" : "Entra"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "var(--text-muted)",
      fontSize: "var(--text-sm)"
    }
  }, mode === "signup" ? "Guarda y reabre lo que analizas." : "Accede a tu historial.")), /*#__PURE__*/React.createElement(Card, {
    padding: "lg"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Email"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "email",
    mono: isDark(theme),
    placeholder: "tu@correo.com",
    defaultValue: "carlos@dev.local"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Contrase\xF1a",
    hint: mode === "signup" ? "Mínimo 8 caracteres." : undefined
  }, /*#__PURE__*/React.createElement(Input, {
    type: "password",
    mono: isDark(theme),
    defaultValue: "\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7"
  })), /*#__PURE__*/React.createElement(Button, {
    block: true
  }, mode === "signup" ? "Crear cuenta" : "Entrar"))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)",
      textAlign: "center"
    }
  }, mode === "signup" ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontWeight: 500
    }
  }, mode === "signup" ? "Entra" : "Crea una")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-2xs)",
      color: "var(--text-subtle)",
      textAlign: "center",
      fontFamily: isDark(theme) ? mono : undefined
    }
  }, "la cuenta solo desbloquea el historial")));
  Object.assign(window, {
    FieldClaroM: Field_("claro"),
    HistoryClaroM: History_("claro"),
    LoginClaroM: Auth_("claro", "login"),
    SignupClaroM: Auth_("claro", "signup"),
    FieldOscuroM: Field_("oscuro"),
    HistoryOscuroM: History_("oscuro"),
    LoginOscuroM: Auth_("oscuro", "login"),
    SignupOscuroM: Auth_("oscuro", "signup")
  });
})();