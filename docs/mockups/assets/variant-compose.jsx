// Dirección inversa — "Codificar / componer": construyo un texto y lo encadeno hacia
// delante (texto → json.minify → jwt.sign → …) para compartir el resultado.
// Constructor de cadena: el usuario añade pasos uno a uno y elige la transformación.
// Expone en window: ComposeClaro, ComposeOscuro, ComposeClaroM, ComposeOscuroM,
//   PlaceToggle, PlaceRoute, PlaceContextual.

(function () {
  const DS = window.DevtoolsDesignSystem_9d6b47;
  const { StepCard, Badge, Button, IconButton, Input, Textarea, Field, Select, Callout, Card, Icon, CopyButton, Kbd, Segmented } = DS;
  const { Wordmark } = window;
  const mono = "var(--font-mono)";

  // ── datos del ejemplo ──────────────────────────────────────────────────────
  const SOURCE = '{\n  "sub": "1",\n  "name": "carlos",\n  "role": "admin"\n}';
  const MINIFIED = '{"sub":"1","name":"carlos","role":"admin"}';
  const SIGNED =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1MjUzNzYwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  const CHAIN_KINDS = ["text", "json", "jwt"];

  // catálogo de transformaciones de codificación (dirección inversa)
  const CATALOG = [
    { group: "json", items: [ ["json.minify", "json"], ["json.stringify", "json"] ] },
    { group: "binario", items: [ ["base64.encode", "base64"], ["base64url.encode", "base64"], ["url.encode", "url"] ] },
    { group: "hash", items: [ ["sha256", "hash"], ["md5", "hash"] ] },
    { group: "firma", items: [ ["jwt.sign", "jwt"] ] },
  ];
  const ALL_TX = CATALOG.flatMap((g) => g.items.map((i) => i[0]));

  // ── primitivas locales ──────────────────────────────────────────────────────
  const Eyebrow = ({ dark, accent, children, style }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: dark ? mono : "var(--font-sans)", fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-subtle)", fontWeight: 600, ...style }}>
      {dark && <span style={{ color: accent || "var(--accent)" }}>&gt;</span>}{children}
    </div>
  );

  // conector vertical entre pasos
  const Connector = () => (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 22, marginLeft: 12 }}>
      <div style={{ width: 1, height: 22, background: "var(--border-strong)", position: "relative" }}>
        <Icon name="arrow-down" size={13} style={{ position: "absolute", left: -6, bottom: -2, color: "var(--text-subtle)", background: "var(--bg)" }} />
      </div>
    </div>
  );

  const IndexPill = ({ children, tone }) => (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "var(--radius-full)", background: tone === "accent" ? "var(--accent-subtle-bg)" : "var(--surface-2)", border: `1px solid ${tone === "accent" ? "color-mix(in oklab, var(--accent) 30%, transparent)" : "var(--border-strong)"}`, fontFamily: mono, fontSize: "var(--text-xs)", fontWeight: 600, color: tone === "accent" ? "var(--accent-subtle-fg)" : "var(--text-muted)", flexShrink: 0 }}>{children}</span>
  );

  // paso 0 — la fuente que escribo
  const SourceStep = () => (
    <div style={{ display: "flex", gap: "var(--space-3)", padding: "var(--space-4)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}>
      <IndexPill>in</IndexPill>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>entrada</span>
          <span style={{ color: "var(--text-subtle)", fontSize: "var(--text-xs)" }}>escribe o pega lo que quieras codificar</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>reconocido <Badge kind="json" size="sm" /></span>
        </div>
        <Textarea rows={4} defaultValue={SOURCE} style={{ fontSize: "var(--text-sm)" }} />
      </div>
    </div>
  );

  // un paso de codificación (transformación elegida por el usuario)
  function BuildStep({ index, transform, outKind, output, note, secret }) {
    return (
      <div style={{ display: "flex", gap: "var(--space-3)", padding: "var(--space-4)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}>
        <IndexPill tone="accent">{index}</IndexPill>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>transforma con</span>
            <Select mono size="sm" value={transform} options={ALL_TX} onChange={() => {}} style={{ maxWidth: 190 }} />
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-subtle)", fontSize: "var(--text-xs)" }}>
              <Icon name="corner-down-right" size={13} /> produce <Badge kind={outKind} size="sm" />
            </span>
            <IconButton icon="x" label="Quitar paso" size="sm" />
          </div>
          {secret && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "var(--space-3)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 130 }}>
                  <Field label="algoritmo"><Select mono size="sm" value="HS256" options={["HS256", "HS384", "HS512", "RS256"]} onChange={() => {}} /></Field>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Field label="secreto de firma">
                    <Input type="password" mono defaultValue="mi-secreto-de-firma" icon="key" />
                  </Field>
                </div>
              </div>
              <div style={{ display: "inline-flex", alignItems: "flex-start", gap: 7, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                <Icon name="shield" size={13} style={{ color: "var(--text-subtle)", marginTop: 1, flexShrink: 0 }} />
                <span>El secreto viaja al servidor solo para firmar y no se guarda — en BD ni en logs. No uses un secreto de producción vivo.</span>
              </div>
            </div>
          )}
          {output != null && (
            <div style={{ background: "var(--gray-950)", borderRadius: "var(--radius-md)", padding: "10px 12px", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: mono, fontSize: "var(--text-2xs)", color: "var(--gray-400)" }}>{transform}</span>
                <CopyButton value={output} label="Copiar salida" size="sm" />
              </div>
              <pre style={{ margin: 0, fontFamily: mono, fontSize: "var(--text-sm)", color: "var(--gray-100)", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5 }}>{output}</pre>
            </div>
          )}
          {note && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)", color: "var(--text-muted)", fontFamily: mono }}>
              <Icon name="info" size={12} style={{ color: "var(--accent)" }} />{note}
            </span>
          )}
        </div>
      </div>
    );
  }

  // chip de transformación en la paleta "añadir paso"
  const TxChip = ({ id, kind }) => (
    <button style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 10px", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-md)", cursor: "pointer", font: "inherit" }}>
      <Badge kind={kind} size="sm" style={{ background: "transparent", border: "none", padding: 0, height: "auto" }} />
      <span style={{ fontFamily: mono, fontSize: "var(--text-xs)", color: "var(--text)" }}>{id}</span>
      <Icon name="chevron-right" size={12} style={{ color: "var(--text-subtle)" }} />
    </button>
  );

  // afordancia "añadir paso" — abierta muestra la paleta agrupada
  const AddStep = ({ open }) => (
    <div style={{ marginLeft: 38 }}>
      {!open ? (
        <button style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "transparent", border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-md)", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)" }}>
          <Icon name="chevron-down" size={14} /> añadir paso
        </button>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--surface)", boxShadow: "var(--shadow-sm)", padding: "var(--space-3)" }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 10 }}>añade un paso — se aplica sobre la salida anterior</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CATALOG.map((g) => (
              <div key={g.group} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ width: 62, flexShrink: 0, fontSize: "var(--text-2xs)", textTransform: "uppercase", letterSpacing: "var(--tracking-wide)", color: "var(--text-subtle)", fontWeight: 600 }}>{g.group}</span>
                {g.items.map(([id, kind]) => <TxChip key={id} id={id} kind={kind} />)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // barra de resultado final — copiar lo que voy a compartir
  const ResultBar = ({ kind = "jwt", value = SIGNED }) => (
    <Card padding="none" style={{ padding: 0, overflow: "hidden", borderColor: "color-mix(in oklab, var(--accent) 34%, var(--border))" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--accent-subtle-bg)", borderBottom: "1px solid color-mix(in oklab, var(--accent) 22%, transparent)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="check" size={15} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--accent-subtle-fg)" }}>resultado</span>
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>· 2 pasos · <Badge kind={kind} size="sm" /> listo para compartir</span>
        </span>
        <CopyButton value={value} withLabel label="Copiar" />
      </div>
      <div style={{ background: "var(--gray-950)", padding: "12px 16px" }}>
        <pre style={{ margin: 0, fontFamily: mono, fontSize: "var(--text-sm)", color: "var(--gray-100)", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5 }}>{value}</pre>
      </div>
    </Card>
  );

  // ── cadena completa (cuerpo compartido) ─────────────────────────────────────
  const ComposeBody = ({ dark, openPalette }) => (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <SourceStep />
        <Connector />
        <BuildStep index={1} transform="json.minify" outKind="json" output={MINIFIED} note="quita espacios y saltos de línea" />
        <Connector />
        <BuildStep index={2} transform="jwt.sign" outKind="jwt" output={SIGNED} secret note="firmado HS256 · iat añadido automáticamente" />
        <Connector />
        <AddStep open={openPalette} />
      </div>
      <div style={{ marginTop: 24 }}><ResultBar /></div>
    </>
  );

  // segmented decodificar / codificar — ahora provisto por el DS (DS.Segmented)
  const ModeSwitch = ({ mode = "codificar", size = "md" }) => (
    <Segmented
      size={size}
      value={mode}
      onChange={() => {}}
      options={[
        { value: "decodificar", label: "decodificar", icon: "search" },
        { value: "codificar", label: "codificar", icon: "git-branch" },
      ]}
    />
  );

  // ── Shell ────────────────────────────────────────────────────────────────────
  const Shell = ({ dark, children, maxWidth = 800, mobile }) => (
    <div className={dark ? "dark" : undefined} style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: "var(--text-base)" }}>
      <header style={{ flex: "0 0 auto", height: mobile ? 52 : dark ? 56 : 60, borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: mobile ? "0 16px" : dark ? "0 22px" : "0 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Wordmark size={mobile ? 16 : dark ? 17 : 19} />
          {dark && !mobile && <span style={{ fontFamily: mono, fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>~/ encode</span>}
        </div>
        {!mobile && (
          dark ? (
            <nav style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: "var(--text-xs)" }}>
              <a href="#" style={{ padding: "5px 9px", borderRadius: 6, color: "var(--text-muted)" }}>/</a>
              <a href="#" style={{ padding: "5px 9px", borderRadius: 6, color: "var(--text-muted)" }}>/history</a>
              <Button size="sm" variant="secondary">Entrar</Button>
            </nav>
          ) : (
            <nav style={{ display: "flex", alignItems: "center", gap: 22, fontSize: "var(--text-sm)" }}>
              <a href="#" style={{ color: "var(--text-muted)", fontWeight: 500 }}>el campo</a>
              <a href="#" style={{ color: "var(--text-muted)", fontWeight: 500 }}>historial</a>
              <Button size="sm" variant="secondary">Entrar</Button>
            </nav>
          )
        )}
        {mobile && <IconButton icon="reopen" label="Historial" variant="ghost" />}
      </header>
      <div className="dt-scroll" style={{ flex: "1 1 auto", overflow: "hidden", display: "flex", justifyContent: "center", padding: mobile ? "20px 16px 26px" : dark ? "34px 26px 40px" : "40px 28px 44px" }}>
        <div style={{ width: "100%", maxWidth }}>{children}</div>
      </div>
    </div>
  );

  // ── pantallas completas de codificar ─────────────────────────────────────────
  const ComposeIntro = ({ dark, mobile }) => (
    <div style={{ marginBottom: mobile ? 18 : 24 }}>
      <div style={{ display: "flex", alignItems: mobile ? "flex-start" : "center", gap: 16, flexDirection: mobile ? "column" : "row", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontFamily: dark ? mono : "var(--font-sans)", fontSize: mobile ? "var(--text-xl)" : "var(--text-2xl)", fontWeight: 600, letterSpacing: "var(--tracking-tight)", lineHeight: "var(--leading-tight)" }}>Compón algo. Lo empaqueta.</h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: mobile ? "var(--text-sm)" : "var(--text-md)", maxWidth: 520 }}>La dirección inversa: escribe un valor y encadena transformaciones — minify, base64, url, hash, firma JWT — hasta lo que quieras compartir.</p>
        </div>
        <ModeSwitch mode="codificar" size={mobile ? "sm" : "md"} />
      </div>
    </div>
  );

  const ComposeScreen = ({ dark, mobile, openPalette }) => (
    <Shell dark={dark} mobile={mobile} maxWidth={mobile ? 9999 : 800}>
      <ComposeIntro dark={dark} mobile={mobile} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Eyebrow dark={dark} accent="var(--accent)">la cadena · la construyes tú</Eyebrow>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontFamily: mono, fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>text → json → jwt</span>
      </div>
      <ComposeBody dark={dark} openPalette={openPalette} />
      <div style={{ marginTop: 22 }}>
        <Callout tone="security" title="Compón sin miedo, pero no con secretos vivos.">Lo que escribes y el secreto de firma se procesan en el servidor solo para construir la cadena. No se guarda el dato crudo ni el secreto.</Callout>
      </div>
    </Shell>
  );

  const ComposeClaro = () => <ComposeScreen dark={false} openPalette />;
  const ComposeOscuro = () => <ComposeScreen dark={true} />;
  const ComposeClaroM = () => <ComposeScreen dark={false} mobile />;
  const ComposeOscuroM = () => <ComposeScreen dark={true} mobile />;

  // ── OPCIONES DE UBICACIÓN (3 formas de encajar con lo existente) ──────────────
  const PlaceFrame = ({ n, title, desc, children }) => (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-sans)" }}>
      <div style={{ flex: "1 1 auto", overflow: "hidden" }}>{children}</div>
      <div style={{ flex: "0 0 auto", borderTop: "1px solid var(--border)", background: "var(--surface)", padding: "14px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "var(--radius-full)", background: "var(--accent)", color: "#fff", fontFamily: mono, fontSize: "var(--text-xs)", fontWeight: 600, flexShrink: 0 }}>{n}</span>
        <div>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>{desc}</div>
        </div>
      </div>
    </div>
  );

  const MiniHeader = ({ nav }) => (
    <header style={{ height: 56, borderBottom: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
      <Wordmark size={18} />
      <nav style={{ display: "flex", alignItems: "center", gap: 20, fontSize: "var(--text-sm)" }}>
        {nav}
        <Button size="sm" variant="secondary">Entrar</Button>
      </nav>
    </header>
  );

  // Opción 1 — un modo dentro del mismo campo (misma URL /)
  const PlaceToggle = () => (
    <PlaceFrame n={1} title="Un modo dentro del mismo campo" desc="Misma URL /. Un control segmentado alterna decodificar ⇄ codificar sin cambiar de página. La entrada más ligera: mismo sitio, dos direcciones.">
      <MiniHeader nav={<><a href="#" style={{ color: "var(--text)", fontWeight: 600 }}>el campo</a><a href="#" style={{ color: "var(--text-muted)" }}>historial</a></>} />
      <div style={{ padding: "30px 40px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: 600, letterSpacing: "var(--tracking-tight)" }}>Compón algo. Lo empaqueta.</h2>
            <ModeSwitch mode="codificar" />
          </div>
          <SourceStep />
          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}><Icon name="arrow-down" size={16} style={{ color: "var(--text-subtle)" }} /></div>
          <BuildStep index={1} transform="json.minify" outKind="json" output={MINIFIED} />
        </div>
      </div>
    </PlaceFrame>
  );

  // Opción 2 — ruta propia /build en la nav
  const PlaceRoute = () => (
    <PlaceFrame n={2} title="Ruta propia · /build en la nav" desc="Una tercera entrada de navegación (“construir”) y su URL /build. Codificar es un modo de primera clase, descubrible desde cualquier página. Más peso, más claridad.">
      <MiniHeader nav={<><a href="#" style={{ color: "var(--text-muted)" }}>el campo</a><a href="#" style={{ color: "var(--text)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="git-branch" size={14} style={{ color: "var(--accent)" }} />construir</a><a href="#" style={{ color: "var(--text-muted)" }}>historial</a></>} />
      <div style={{ padding: "26px 40px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 640 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: mono, fontSize: "var(--text-xs)", color: "var(--text-subtle)", marginBottom: 14, padding: "4px 10px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
            <Icon name="link" size={13} /> devtools.app<span style={{ color: "var(--accent)" }}>/build</span>
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: "var(--text-xl)", fontWeight: 600, letterSpacing: "var(--tracking-tight)" }}>construir</h2>
          <p style={{ margin: "0 0 18px", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>Escribe un valor y encadena transformaciones hacia el resultado que quieres compartir.</p>
          <SourceStep />
          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}><Icon name="arrow-down" size={16} style={{ color: "var(--text-subtle)" }} /></div>
          <BuildStep index={1} transform="base64url.encode" outKind="base64" output="eyJzdWIiOiIxIiwibmFtZSI6ImNhcmxvcyIsInJvbGUiOiJhZG1pbiJ9" />
        </div>
      </div>
    </PlaceFrame>
  );

  // Opción 3 — desde un resultado de decodificar, invierte la cadena
  const PlaceContextual = () => (
    <PlaceFrame n={3} title="Desde un resultado · invierte la cadena" desc="No es una entrada nueva, es continuidad: en cualquier resultado de decodificar aparece “invertir”, que reconstruye lo pegado. Codificar como el reverso natural del producto.">
      <MiniHeader nav={<><a href="#" style={{ color: "var(--text)", fontWeight: 600 }}>el campo</a><a href="#" style={{ color: "var(--text-muted)" }}>historial</a></>} />
      <div style={{ padding: "26px 40px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 640 }}>
          <Eyebrow style={{ marginBottom: 12 }}>resultado de la decodificación</Eyebrow>
          <StepCard index={1} kind="json" output={'{\n  "sub": "1",\n  "name": "carlos"\n}'} terminal="no_transform" />
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "1px dashed color-mix(in oklab, var(--accent) 40%, var(--border))", borderRadius: "var(--radius-lg)", background: "var(--accent-subtle-bg)" }}>
            <Icon name="reopen" size={18} style={{ color: "var(--accent)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--accent-subtle-fg)" }}>¿Reconstruir en la otra dirección?</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Abre esta salida en modo codificar y encadénala de nuevo.</div>
            </div>
            <Button size="sm" icon="git-branch">Invertir</Button>
          </div>
        </div>
      </div>
    </PlaceFrame>
  );

  Object.assign(window, {
    ComposeClaro, ComposeOscuro, ComposeClaroM, ComposeOscuroM,
    PlaceToggle, PlaceRoute, PlaceContextual,
  });
})();
