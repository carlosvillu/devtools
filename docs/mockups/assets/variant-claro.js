function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Variante A — "Claro": light, centered, airy. Uses the devtools DS components.
// Exposes: FieldClaro, HistoryClaro, LoginClaro, SignupClaro on window.

(function () {
  const DS = window.DevtoolsDesignSystem_9d6b47;
  const {
    StepCard,
    ChainSummary,
    HistoryRow,
    Badge,
    Button,
    IconButton,
    Input,
    Textarea,
    Field,
    Callout,
    EmptyState,
    Card,
    Icon,
    Kbd,
    CopyButton
  } = DS;
  const {
    Wordmark,
    JWT_INPUT,
    CHAIN_JWT,
    HISTORY_ROWS
  } = window;
  const Shell = ({
    active,
    children,
    maxWidth = 760
  }) => /*#__PURE__*/React.createElement("div", {
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
      height: 60,
      borderBottom: "1px solid var(--border)",
      background: "var(--surface)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px"
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    size: 19
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 22,
      fontSize: "var(--text-sm)"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: active === "field" ? "var(--text)" : "var(--text-muted)",
      fontWeight: active === "field" ? 600 : 500
    }
  }, "el campo"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: active === "history" ? "var(--text)" : "var(--text-muted)",
      fontWeight: active === "history" ? 600 : 500
    }
  }, "historial"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "secondary"
  }, "Entrar"))), /*#__PURE__*/React.createElement("div", {
    className: "dt-scroll",
    style: {
      flex: "1 1 auto",
      overflow: "hidden",
      display: "flex",
      justifyContent: "center",
      padding: "40px 28px 44px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth
    }
  }, children)));
  const Eyebrow = ({
    children
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-2xs)",
      textTransform: "uppercase",
      letterSpacing: "var(--tracking-wide)",
      color: "var(--text-subtle)",
      fontWeight: 600,
      marginBottom: 10
    }
  }, children);
  function FieldClaro() {
    return /*#__PURE__*/React.createElement(Shell, {
      active: "field"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 26
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        margin: "0 0 8px",
        fontSize: "var(--text-2xl)",
        fontWeight: 600,
        letterSpacing: "var(--tracking-tight)",
        lineHeight: "var(--leading-tight)"
      }
    }, "Pega algo. Lo desenreda."), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        color: "var(--text-muted)",
        fontSize: "var(--text-md)",
        maxWidth: 560
      }
    }, "Un JWT, un base64, un timestamp, un JSON ilegible, una URL con par\xE1metros. devtools detecta qu\xE9 es y lo decodifica paso a paso.")), /*#__PURE__*/React.createElement(Textarea, {
      rows: 3,
      defaultValue: JWT_INPUT,
      style: {
        fontSize: "var(--text-sm)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10,
        marginBottom: 30
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: "var(--text-subtle)",
        fontSize: "var(--text-xs)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement(Kbd, null, "\u2318"), /*#__PURE__*/React.createElement(Kbd, null, "V")), "pega y analiza \u2014 sin bot\xF3n"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--success)",
        fontSize: "var(--text-xs)",
        fontWeight: 500
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "git-branch",
      size: 14
    }), " 2 pasos \xB7 terminal")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, null, "la cadena"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 1,
        background: "var(--border)",
        marginBottom: 8
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement(ChainSummary, {
      kinds: ["jwt", "json"],
      size: "md"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, CHAIN_JWT.map(s => /*#__PURE__*/React.createElement(StepCard, _extends({
      key: s.index
    }, s)))), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 24
      }
    }, /*#__PURE__*/React.createElement(Callout, {
      tone: "security",
      title: "devtools procesa lo que pegas en el servidor."
    }, "No est\xE1 pensado para secretos de producci\xF3n vivos. No se guarda el dato crudo ni en base de datos ni en logs.")));
  }
  function HistoryClaro() {
    return /*#__PURE__*/React.createElement(Shell, {
      active: "history",
      maxWidth: 720
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 22
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "tu cuenta"), /*#__PURE__*/React.createElement("h1", {
      style: {
        margin: 0,
        fontSize: "var(--text-2xl)",
        fontWeight: 600,
        letterSpacing: "var(--tracking-tight)"
      }
    }, "Historial"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: "6px 0 0",
        color: "var(--text-muted)",
        fontSize: "var(--text-sm)"
      }
    }, "Tus \xFAltimas 50 entradas \u2014 vista previa redactada, nunca el dato crudo.")), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost",
      icon: "trash"
    }, "Borrar todo")), /*#__PURE__*/React.createElement(Card, {
      padding: "sm",
      style: {
        padding: 0,
        overflow: "hidden"
      }
    }, HISTORY_ROWS.map((r, i) => /*#__PURE__*/React.createElement(HistoryRow, _extends({
      key: i
    }, r, {
      onReopen: () => {},
      onDelete: () => {}
    })))), /*#__PURE__*/React.createElement("p", {
      style: {
        marginTop: 14,
        color: "var(--text-subtle)",
        fontSize: "var(--text-xs)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "reopen",
      size: 13
    }), " Reabrir restaura la cadena, no el dato original: vuelve a pegarlo para copiar valores."));
  }
  const AuthCard = ({
    title,
    sub,
    cta,
    alt,
    altLabel
  }) => /*#__PURE__*/React.createElement(Shell, {
    active: "none",
    maxWidth: 400
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Wordmark, {
    size: 22
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "0 0 4px",
      fontSize: "var(--text-xl)",
      fontWeight: 600,
      letterSpacing: "var(--tracking-tight)"
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: "var(--text-muted)",
      fontSize: "var(--text-sm)"
    }
  }, sub)), /*#__PURE__*/React.createElement(Card, {
    padding: "lg",
    style: {
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Email"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "email",
    placeholder: "tu@correo.com",
    defaultValue: "carlos@dev.local"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Contrase\xF1a",
    hint: alt === "signup" ? "Mínimo 8 caracteres." : undefined
  }, /*#__PURE__*/React.createElement(Input, {
    type: "password",
    defaultValue: "\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7\xB7"
  })), /*#__PURE__*/React.createElement(Button, {
    block: true
  }, cta))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-sm)",
      color: "var(--text-muted)"
    }
  }, altLabel, " ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontWeight: 500
    }
  }, alt === "signup" ? "Crea una" : "Entra")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: "var(--text-xs)",
      color: "var(--text-subtle)",
      textAlign: "center",
      maxWidth: 320
    }
  }, "La cuenta solo desbloquea el historial. Puedes usar devtools sin registrarte.")));
  const LoginClaro = () => /*#__PURE__*/React.createElement(AuthCard, {
    title: "Entra",
    sub: "Accede a tu historial de entradas.",
    cta: "Entrar",
    alt: "login",
    altLabel: "\xBFNo tienes cuenta?"
  });
  const SignupClaro = () => /*#__PURE__*/React.createElement(AuthCard, {
    title: "Crea tu cuenta",
    sub: "Guarda y reabre lo que analizas.",
    cta: "Crear cuenta",
    alt: "signup",
    altLabel: "\xBFYa tienes cuenta?"
  });
  Object.assign(window, {
    FieldClaro,
    HistoryClaro,
    LoginClaro,
    SignupClaro
  });
})();