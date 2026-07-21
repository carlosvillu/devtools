// REFERENCIA DE MOCKUP — "Home estilo Google" (proyecto Claude Design "DevTools Mockups",
// 1132e88c-090e-42ad-a121-490714cf7ec5, fichero Home.jsx). Importado el 2026-07-20 para F5.
// NO es código de producción: usa inline styles y marcado crudo. La implementación DEBE usar
// las primitivas del DS (Button, Textarea, Wordmark, Badge, Kbd, Icon) — ver planning F5 y la
// skill frontend. Se guarda solo como la vara visual del estado VACÍO de la landing.
//
// Decisiones de producto tomadas sobre este mockup (ver planning.md F5):
//  - `/` es LANDING; el análisis vive en `/analyze` (= la home de hoy movida).
//  - Sin botón "Analizar" (14.1 intacto): pegar salta a /analyze; Enter salta; teclear espera.
//  - Transporte del input por sessionStorage (nunca en la URL — §11).
//  - "Pega un ejemplo" carga un JWT de juguete y salta a /analyze.
//  - Footer: solo GitHub (blog y privacidad no existen).
//  - Aviso de privacidad COMPLETO (las dos frases de hoy), no la versión corta del mockup.

(function () {
  const DS = window.DevtoolsDesignSystem_9d6b47;
  const { Button, Icon, Kbd, Badge } = DS;
  const { Wordmark } = window;

  const KINDS = ["jwt", "base64", "json", "unix_timestamp", "url", "uuid", "hash"];

  function HomeGoogle() {
    const [val, setVal] = React.useState("");
    const [focus, setFocus] = React.useState(false);
    const has = val.trim().length > 0;
    const ref = React.useRef(null);

    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: "var(--text-base)" }}>
        <header style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 20, padding: "18px 24px", fontSize: "var(--text-sm)" }}>
          <a href="#" style={{ color: "var(--text-muted)", fontWeight: 500 }}>historial</a>
          <Button size="sm" variant="secondary">Entrar</Button>
        </header>

        <main style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", marginTop: -40 }}>
          <div style={{ transform: "scale(1)", marginBottom: 8 }}>
            <Wordmark size={64} />
          </div>
          <p style={{ margin: "10px 0 34px", color: "var(--text-muted)", fontSize: "var(--text-md)" }}>Pega algo. Lo desenreda.</p>

          <div style={{ width: "100%", maxWidth: 620 }}>
            <div
              onClick={() => ref.current && ref.current.focus()}
              style={{
                display: "flex", alignItems: "flex-start", gap: 12, width: "100%",
                background: "var(--surface)", border: "1px solid " + (focus ? "var(--accent)" : "var(--border-strong)"),
                borderRadius: "var(--radius-xl)", padding: "16px 18px", cursor: "text",
                boxShadow: focus ? "var(--focus-ring), var(--shadow-md)" : "var(--shadow-sm)",
                transition: "box-shadow 160ms var(--ease), border-color 160ms var(--ease)",
              }}
            >
              <Icon name="terminal" size={20} style={{ color: "var(--text-subtle)", marginTop: 2, flex: "0 0 auto" }} />
              <textarea
                ref={ref}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                rows={1}
                placeholder="Pega un JWT, base64, JSON, timestamp, URL…"
                style={{
                  flex: 1, border: "none", outline: "none", resize: "none", background: "transparent",
                  color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)",
                  lineHeight: "var(--leading-normal)", minHeight: 24, maxHeight: 220,
                }}
              />
              {has && (
                <button onClick={(e) => { e.stopPropagation(); setVal(""); ref.current && ref.current.focus(); }}
                  aria-label="limpiar"
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", padding: 2, display: "flex", flex: "0 0 auto", marginTop: 1 }}>
                  <Icon name="x" size={18} />
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 22 }}>
              {/* NOTA F5: en producción NO va el botón "Analizar" (14.1). Solo "Pega un ejemplo". */}
              <Button variant="secondary">Pega un ejemplo</Button>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-subtle)", fontSize: "var(--text-xs)" }}>
                <span style={{ display: "inline-flex", gap: 4 }}><Kbd>⌘</Kbd><Kbd>V</Kbd></span>
                pega y analiza — sin botón
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 40, maxWidth: 560 }}>
            {KINDS.map((k) => <Badge key={k} kind={k} />)}
          </div>
        </main>

        <footer style={{ flex: "0 0 auto", borderTop: "1px solid var(--border)", background: "var(--surface)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <span style={{ color: "var(--text-subtle)", fontSize: "var(--text-xs)", maxWidth: 620 }}>
            devtools procesa lo que pegas en el servidor. No está pensado para secretos de producción vivos.
          </span>
          <nav style={{ display: "flex", gap: 18, fontSize: "var(--text-xs)" }}>
            {/* NOTA F5: en producción solo "github" (blog y privacidad no existen). */}
            <a href="#" style={{ color: "var(--text-muted)" }}>github</a>
          </nav>
        </footer>
      </div>
    );
  }

  Object.assign(window, { HomeGoogle });
})();
