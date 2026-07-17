// Mobile versions of all pages, both variants. Phone-width (390px) frames.
// Exposes: M (factory) results on window: FieldClaroM, HistoryClaroM, LoginClaroM, SignupClaroM + Oscuro equivalents.

(function () {
  const DS = window.DevtoolsDesignSystem_9d6b47;
  const { StepCard, ChainSummary, HistoryRow, Button, IconButton, Input, Textarea, Field, Callout, Card, Icon, Kbd } = DS;
  const { Wordmark, JWT_INPUT, CHAIN_JWT, HISTORY_ROWS } = window;

  const isDark = (t) => t === "oscuro";
  const mono = "var(--font-mono)";

  const Shell = ({ theme, active, children, center }) => (
    <div className={isDark(theme) ? "dark" : undefined} style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: "var(--text-base)" }}>
      <header style={{ flex: "0 0 auto", height: 52, borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
        <Wordmark size={16} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isDark(theme) && <span style={{ fontFamily: mono, fontSize: "var(--text-2xs)", color: "var(--text-subtle)" }}>~/ {active === "history" ? "history" : active === "none" ? "auth" : "analyze"}</span>}
          <IconButton icon="reopen" label="Historial" variant="ghost" />
        </div>
      </header>
      <div className="dt-scroll" style={{ flex: "1 1 auto", overflow: "hidden", padding: center ? 16 : "22px 16px 26px", display: center ? "flex" : "block", flexDirection: "column", justifyContent: center ? "center" : undefined }}>
        {children}
      </div>
    </div>
  );

  const Eyebrow = ({ theme, accent, children }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: isDark(theme) ? mono : "var(--font-sans)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-subtle)", fontWeight: 600, marginBottom: 12 }}>
      {isDark(theme) && <span style={{ color: accent || "var(--accent)" }}>&gt;</span>}{children}
    </div>
  );

  const Field_ = (theme) => () => (
    <Shell theme={theme} active="field">
      <h1 style={{ margin: "0 0 6px", fontFamily: isDark(theme) ? mono : "var(--font-sans)", fontSize: "var(--text-xl)", fontWeight: 600, letterSpacing: "var(--tracking-tight)", lineHeight: "var(--leading-tight)" }}>Pega algo.<br />Lo desenreda.</h1>
      <p style={{ margin: "0 0 18px", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>JWT, base64, timestamp, JSON, URL. Detecta qué es y lo decodifica paso a paso.</p>
      {isDark(theme) ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--surface)", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--red-500)" }} /><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--amber-500)" }} /><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--green-500)" }} />
              <span style={{ marginLeft: 6, fontFamily: mono, fontSize: "var(--text-2xs)", color: "var(--text-muted)" }}>stdin</span>
            </span>
            <span style={{ fontFamily: mono, fontSize: "var(--text-2xs)", color: "var(--text-subtle)" }}>128 KB máx</span>
          </div>
          <div style={{ padding: 12 }}><Textarea rows={4} defaultValue={JWT_INPUT} style={{ background: "transparent", border: "none", boxShadow: "none", padding: 0, fontSize: "var(--text-2xs)" }} /></div>
        </div>
      ) : (
        <Textarea rows={4} defaultValue={JWT_INPUT} style={{ fontSize: "var(--text-2xs)" }} />
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 26px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-subtle)", fontSize: "var(--text-2xs)" }}><Kbd>⌘</Kbd><Kbd>V</Kbd> analiza al pegar</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--success)", fontSize: "var(--text-2xs)", fontFamily: isDark(theme) ? mono : undefined }}><Icon name="git-branch" size={13} /> jwt → json</span>
      </div>
      <Eyebrow theme={theme} accent="var(--success)">la cadena</Eyebrow>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CHAIN_JWT.map((s) => <StepCard key={s.index} {...s} />)}
      </div>
      <div style={{ marginTop: 18 }}>
        <Callout tone="security" title="Se procesa en el servidor.">No lo uses con secretos vivos. El dato crudo no se guarda.</Callout>
      </div>
    </Shell>
  );

  const History_ = (theme) => () => (
    <Shell theme={theme} active="history">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <Eyebrow theme={theme}>últimas 50</Eyebrow>
          <h1 style={{ margin: 0, fontFamily: isDark(theme) ? mono : "var(--font-sans)", fontSize: "var(--text-xl)", fontWeight: 600, letterSpacing: "var(--tracking-tight)" }}>{isDark(theme) ? "history" : "Historial"}</h1>
        </div>
        <IconButton icon="trash" label="Borrar todo" variant={isDark(theme) ? "secondary" : "ghost"} />
      </div>
      <Card padding="sm" style={{ padding: 0, overflow: "hidden" }}>
        {HISTORY_ROWS.slice(0, 5).map((r, i) => <HistoryRow key={i} {...r} onReopen={() => {}} onDelete={() => {}} />)}
      </Card>
      <p style={{ marginTop: 12, color: "var(--text-subtle)", fontSize: "var(--text-2xs)", fontFamily: isDark(theme) ? mono : undefined, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="reopen" size={12} /> reabrir restaura la cadena, no el dato (D7)
      </p>
    </Shell>
  );

  const Auth_ = (theme, mode) => () => (
    <Shell theme={theme} active="none" center>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Wordmark size={20} /></div>
          <h1 style={{ margin: "0 0 4px", fontFamily: isDark(theme) ? mono : "var(--font-sans)", fontSize: "var(--text-lg)", fontWeight: 600, letterSpacing: "var(--tracking-tight)" }}>{mode === "signup" ? (isDark(theme) ? "signup" : "Crea tu cuenta") : (isDark(theme) ? "login" : "Entra")}</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>{mode === "signup" ? "Guarda y reabre lo que analizas." : "Accede a tu historial."}</p>
        </div>
        <Card padding="lg">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Email"><Input type="email" mono={isDark(theme)} placeholder="tu@correo.com" defaultValue="carlos@dev.local" /></Field>
            <Field label="Contraseña" hint={mode === "signup" ? "Mínimo 8 caracteres." : undefined}><Input type="password" mono={isDark(theme)} defaultValue="············" /></Field>
            <Button block>{mode === "signup" ? "Crear cuenta" : "Entrar"}</Button>
          </div>
        </Card>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)", textAlign: "center" }}>{mode === "signup" ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}<a href="#" style={{ fontWeight: 500 }}>{mode === "signup" ? "Entra" : "Crea una"}</a></p>
        <p style={{ margin: 0, fontSize: "var(--text-2xs)", color: "var(--text-subtle)", textAlign: "center", fontFamily: isDark(theme) ? mono : undefined }}>la cuenta solo desbloquea el historial</p>
      </div>
    </Shell>
  );

  Object.assign(window, {
    FieldClaroM: Field_("claro"), HistoryClaroM: History_("claro"), LoginClaroM: Auth_("claro", "login"), SignupClaroM: Auth_("claro", "signup"),
    FieldOscuroM: Field_("oscuro"), HistoryOscuroM: History_("oscuro"), LoginOscuroM: Auth_("oscuro", "login"), SignupOscuroM: Auth_("oscuro", "signup"),
  });
})();
