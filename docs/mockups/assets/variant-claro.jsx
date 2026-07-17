// Variante A — "Claro": light, centered, airy. Uses the devtools DS components.
// Exposes: FieldClaro, HistoryClaro, LoginClaro, SignupClaro on window.

(function () {
  const DS = window.DevtoolsDesignSystem_9d6b47;
  const { StepCard, ChainSummary, HistoryRow, Badge, Button, IconButton, Input, Textarea, Field, Callout, EmptyState, Card, Icon, Kbd, CopyButton } = DS;
  const { Wordmark, JWT_INPUT, CHAIN_JWT, HISTORY_ROWS } = window;

  const Shell = ({ active, children, maxWidth = 760 }) => (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: "var(--text-base)" }}>
      <header style={{ flex: "0 0 auto", height: 60, borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px" }}>
        <Wordmark size={19} />
        <nav style={{ display: "flex", alignItems: "center", gap: 22, fontSize: "var(--text-sm)" }}>
          <a href="#" style={{ color: active === "field" ? "var(--text)" : "var(--text-muted)", fontWeight: active === "field" ? 600 : 500 }}>el campo</a>
          <a href="#" style={{ color: active === "history" ? "var(--text)" : "var(--text-muted)", fontWeight: active === "history" ? 600 : 500 }}>historial</a>
          <Button size="sm" variant="secondary">Entrar</Button>
        </nav>
      </header>
      <div className="dt-scroll" style={{ flex: "1 1 auto", overflow: "hidden", display: "flex", justifyContent: "center", padding: "40px 28px 44px" }}>
        <div style={{ width: "100%", maxWidth }}>{children}</div>
      </div>
    </div>
  );

  const Eyebrow = ({ children }) => (
    <div style={{ fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-subtle)", fontWeight: 600, marginBottom: 10 }}>{children}</div>
  );

  function FieldClaro() {
    return (
      <Shell active="field">
        <div style={{ marginBottom: 26 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: "var(--text-2xl)", fontWeight: 600, letterSpacing: "var(--tracking-tight)", lineHeight: "var(--leading-tight)" }}>Pega algo. Lo desenreda.</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-md)", maxWidth: 560 }}>Un JWT, un base64, un timestamp, un JSON ilegible, una URL con parámetros. devtools detecta qué es y lo decodifica paso a paso.</p>
        </div>
        <Textarea rows={3} defaultValue={JWT_INPUT} style={{ fontSize: "var(--text-sm)" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, marginBottom: 30 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-subtle)", fontSize: "var(--text-xs)" }}>
            <span style={{ display: "inline-flex", gap: 4 }}><Kbd>⌘</Kbd><Kbd>V</Kbd></span>
            pega y analiza — sin botón
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--success)", fontSize: "var(--text-xs)", fontWeight: 500 }}>
            <Icon name="git-branch" size={14} /> 2 pasos · terminal
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Eyebrow>la cadena</Eyebrow>
          <div style={{ flex: 1, height: 1, background: "var(--border)", marginBottom: 8 }} />
          <div style={{ marginBottom: 8 }}><ChainSummary kinds={["jwt", "json"]} size="md" /></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CHAIN_JWT.map((s) => <StepCard key={s.index} {...s} />)}
        </div>
        <div style={{ marginTop: 24 }}>
          <Callout tone="security" title="devtools procesa lo que pegas en el servidor.">No está pensado para secretos de producción vivos. No se guarda el dato crudo ni en base de datos ni en logs.</Callout>
        </div>
      </Shell>
    );
  }

  function HistoryClaro() {
    return (
      <Shell active="history" maxWidth={720}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <Eyebrow>tu cuenta</Eyebrow>
            <h1 style={{ margin: 0, fontSize: "var(--text-2xl)", fontWeight: 600, letterSpacing: "var(--tracking-tight)" }}>Historial</h1>
            <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>Tus últimas 50 entradas — vista previa redactada, nunca el dato crudo.</p>
          </div>
          <Button size="sm" variant="ghost" icon="trash">Borrar todo</Button>
        </div>
        <Card padding="sm" style={{ padding: 0, overflow: "hidden" }}>
          {HISTORY_ROWS.map((r, i) => <HistoryRow key={i} {...r} onReopen={() => {}} onDelete={() => {}} />)}
        </Card>
        <p style={{ marginTop: 14, color: "var(--text-subtle)", fontSize: "var(--text-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="reopen" size={13} /> Reabrir restaura la cadena, no el dato original: vuelve a pegarlo para copiar valores.
        </p>
      </Shell>
    );
  }

  const AuthCard = ({ title, sub, cta, alt, altLabel }) => (
    <Shell active="none" maxWidth={400}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><Wordmark size={22} /></div>
          <h1 style={{ margin: "0 0 4px", fontSize: "var(--text-xl)", fontWeight: 600, letterSpacing: "var(--tracking-tight)" }}>{title}</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>{sub}</p>
        </div>
        <Card padding="lg" style={{ width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Email"><Input type="email" placeholder="tu@correo.com" defaultValue="carlos@dev.local" /></Field>
            <Field label="Contraseña" hint={alt === "signup" ? "Mínimo 8 caracteres." : undefined}>
              <Input type="password" defaultValue="············" />
            </Field>
            <Button block>{cta}</Button>
          </div>
        </Card>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{altLabel} <a href="#" style={{ fontWeight: 500 }}>{alt === "signup" ? "Crea una" : "Entra"}</a></p>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-subtle)", textAlign: "center", maxWidth: 320 }}>La cuenta solo desbloquea el historial. Puedes usar devtools sin registrarte.</p>
      </div>
    </Shell>
  );

  const LoginClaro = () => <AuthCard title="Entra" sub="Accede a tu historial de entradas." cta="Entrar" alt="login" altLabel="¿No tienes cuenta?" />;
  const SignupClaro = () => <AuthCard title="Crea tu cuenta" sub="Guarda y reabre lo que analizas." cta="Crear cuenta" alt="signup" altLabel="¿Ya tienes cuenta?" />;

  Object.assign(window, { FieldClaro, HistoryClaro, LoginClaro, SignupClaro });
})();
