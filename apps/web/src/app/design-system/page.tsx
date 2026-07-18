import { Badge, KIND_META, type DataKind } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Card as DsCard } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { ConfidenceBar } from '@/components/ui/confidence-bar';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Icon, iconNames } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ChainSummaryDemo, HistoryRowDemo, StepCardDemo } from './composites-demo';
import { ThemeSwitcher } from './theme-switcher';

const DATA_KINDS = Object.keys(KIND_META) as DataKind[];

// Un JSON de ejemplo con resaltado por spans de token de código (motivo terminal).
const SAMPLE_JSON = (
  <>
    {'{\n  '}
    <span className="text-code-key">&quot;alg&quot;</span>
    <span className="text-code-punc">: </span>
    <span className="text-code-string">&quot;HS256&quot;</span>
    <span className="text-code-punc">,</span>
    {'\n  '}
    <span className="text-code-key">&quot;sub&quot;</span>
    <span className="text-code-punc">: </span>
    <span className="text-code-string">&quot;1234567890&quot;</span>
    <span className="text-code-punc">,</span>
    {'\n  '}
    <span className="text-code-key">&quot;exp&quot;</span>
    <span className="text-code-punc">: </span>
    <span className="text-code-number">1752624000</span>
    {'\n}'}
  </>
);

// Showcase del design system (ruta /design-system): specimens de las fundaciones
// (color, tipografía, espaciado, radios, sombras) + un switcher de tema en vivo.
// Se construye desde los tokens ya volcados en globals.css; espeja la INTENCIÓN de
// docs/design-system/guidelines/*.html (no inventa una presentación nueva).
//
// El chrome (cards, títulos, texto) usa SOLO clases semánticas de token del DS. Los
// swatches de color usan `var(--token)` en `style`: es la excepción sancionada del
// showcase — su trabajo es ENSEÑAR el valor crudo del token (frontend/design-system.md
// §3.1). La sección «Primitivas de formulario» ya renderiza las primitivas reales de
// components/ui que estrena TD.2 (Button, IconButton, Input, Textarea, Select, Field).
// Los helpers locales `Section`/`Card` de este showcase siguen siendo propios hasta
// que TD.3 aporte el `Card` del DS; entonces el chrome migrará a esa primitiva.

export const metadata = {
  title: 'Design system · devtools',
  description:
    'Showcase de las fundaciones del design system de devtools: color, tipografía, espaciado, radios y sombras, con conmutador de tema.',
};

// ── Datos de los specimens (nombres de token = fuente de verdad de globals.css) ──

const RAMPS: { name: string; stops: string[] }[] = [
  {
    name: 'gray',
    stops: ['0', '50', '100', '150', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  },
  { name: 'blue', stops: ['50', '100', '200', '400', '500', '600', '700'] },
  { name: 'green', stops: ['50', '100', '500', '600', '700'] },
  { name: 'amber', stops: ['50', '100', '500', '600', '700'] },
  { name: 'red', stops: ['50', '100', '500', '600', '700'] },
  { name: 'cyan', stops: ['100', '500', '700'] },
  { name: 'violet', stops: ['100', '500', '700'] },
];

const ALIAS_GROUPS: { title: string; tokens: string[] }[] = [
  {
    title: 'Superficies',
    tokens: ['--bg', '--bg-subtle', '--surface', '--surface-2', '--surface-inset'],
  },
  { title: 'Texto', tokens: ['--text', '--text-muted', '--text-subtle', '--text-inverse'] },
  { title: 'Bordes', tokens: ['--border', '--border-strong', '--border-inverse'] },
  {
    title: 'Acento (marca / acción — nunca estado)',
    tokens: [
      '--accent',
      '--accent-hover',
      '--accent-fg',
      '--accent-subtle-bg',
      '--accent-subtle-fg',
    ],
  },
  {
    title: 'Semánticos fijos (no cambian con el tema)',
    tokens: [
      '--success',
      '--success-subtle-bg',
      '--success-subtle-fg',
      '--warning',
      '--warning-subtle-bg',
      '--warning-subtle-fg',
      '--danger',
      '--danger-subtle-bg',
      '--danger-subtle-fg',
    ],
  },
  { title: 'Foco', tokens: ['--ring'] },
  {
    title: 'Código / datos (motivo terminal — siempre oscuro)',
    tokens: [
      '--code-bg',
      '--code-surface',
      '--code-fg',
      '--code-muted',
      '--code-border',
      '--code-key',
      '--code-string',
      '--code-number',
      '--code-punc',
    ],
  },
];

const TYPE_SCALE: { name: string; px: string; className: string }[] = [
  { name: '3xl', px: '44', className: 'text-3xl font-bold tracking-tight' },
  { name: '2xl', px: '32', className: 'text-2xl font-semibold' },
  { name: 'xl', px: '24', className: 'text-xl font-semibold' },
  { name: 'lg', px: '20', className: 'text-lg font-medium' },
  { name: 'md', px: '17', className: 'text-md' },
  { name: 'base', px: '15', className: 'text-base' },
  { name: 'sm', px: '13', className: 'text-sm' },
  { name: 'xs', px: '12', className: 'text-xs' },
  { name: '2xs', px: '11', className: 'text-2xs' },
];

const WEIGHTS: { label: string; value: string; className: string }[] = [
  { label: 'regular', value: '400', className: 'font-regular' },
  { label: 'medium', value: '500', className: 'font-medium' },
  { label: 'semibold', value: '600', className: 'font-semibold' },
  { label: 'bold', value: '700', className: 'font-bold' },
];

const LEADINGS: { label: string; value: string; className: string }[] = [
  { label: 'tight', value: '1.15', className: 'leading-tight' },
  { label: 'snug', value: '1.35', className: 'leading-snug' },
  { label: 'normal', value: '1.55', className: 'leading-normal' },
  { label: 'code', value: '1.6', className: 'leading-code' },
];

const TRACKINGS: { label: string; value: string; className: string }[] = [
  { label: 'tight', value: '-0.02em', className: 'tracking-tight' },
  { label: 'normal', value: '0', className: 'tracking-normal' },
  { label: 'wide', value: '0.04em', className: 'tracking-wide' },
  { label: 'wider', value: '0.08em', className: 'tracking-wider' },
];

// Escala de 4px del DS: `--space-N` === utilidad `size-N` de Tailwind (N × 4px).
const SPACING: { step: string; px: string; sizeClassName: string }[] = [
  { step: '1', px: '4', sizeClassName: 'size-1' },
  { step: '2', px: '8', sizeClassName: 'size-2' },
  { step: '3', px: '12', sizeClassName: 'size-3' },
  { step: '4', px: '16', sizeClassName: 'size-4' },
  { step: '5', px: '20', sizeClassName: 'size-5' },
  { step: '6', px: '24', sizeClassName: 'size-6' },
  { step: '8', px: '32', sizeClassName: 'size-8' },
  { step: '10', px: '40', sizeClassName: 'size-10' },
  { step: '12', px: '48', sizeClassName: 'size-12' },
  { step: '16', px: '64', sizeClassName: 'size-16' },
];

const RADII: { label: string; px: string; className: string }[] = [
  { label: 'sm', px: '4', className: 'rounded-sm' },
  { label: 'base', px: '6', className: 'rounded-base' },
  { label: 'md', px: '8', className: 'rounded-md' },
  { label: 'lg', px: '12', className: 'rounded-lg' },
  { label: 'xl', px: '16', className: 'rounded-xl' },
  { label: 'full', px: '9999', className: 'rounded-full' },
];

const SHADOWS: { label: string; note: string; className: string }[] = [
  { label: 'xs', note: '', className: 'shadow-xs' },
  { label: 'sm', note: 'cards', className: 'shadow-sm' },
  { label: 'md', note: 'hover', className: 'shadow-md' },
  { label: 'lg', note: 'overlay', className: 'shadow-lg' },
];

// ── Componentes de presentación (todos server, sin estado) ──────────────────────

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight text-text">
          {title}
        </h2>
        <p className="text-sm text-text-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
      {title ? (
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-text-subtle">
          {title}
        </h3>
      ) : null}
      {children}
    </div>
  );
}

function TokenName({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-2xs text-text-subtle">{children}</code>;
}

// Chip que enseña el valor crudo de un token vía var() — excepción sancionada.
function Swatch({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="h-12 w-full rounded-md border border-border"
        style={{ background: `var(${token})` }}
      />
      <TokenName>{token}</TokenName>
    </div>
  );
}

function Ramp({ name, stops }: { name: string; stops: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <TokenName>--{name}-*</TokenName>
      <div className="flex overflow-hidden rounded-md border border-border">
        {stops.map((stop) => (
          <span
            key={stop}
            className="h-14 flex-1"
            style={{ background: `var(--${name}-${stop})` }}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-2xs text-text-subtle">
        {stops.map((stop) => (
          <span key={stop}>{stop}</span>
        ))}
      </div>
    </div>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-12">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-wider text-text-subtle">
            Design system · devtools
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text">Fundaciones</h1>
          <p className="max-w-2xl text-md text-text-muted">
            Los tokens de color, tipografía, espaciado, radios y sombras que gobiernan toda la
            interfaz. Volcados verbatim del espejo del design system; el switcher los recolorea en
            vivo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-text-muted">Tema:</span>
          <ThemeSwitcher />
        </div>
      </header>

      <Section
        id="color"
        title="Color"
        subtitle="Rampas base, alias semánticos y el bloque de código."
      >
        <Card title="Rampas">
          <div className="flex flex-col gap-5">
            {RAMPS.map((ramp) => (
              <Ramp key={ramp.name} name={ramp.name} stops={ramp.stops} />
            ))}
          </div>
        </Card>

        {ALIAS_GROUPS.map((group) => (
          <Card key={group.title} title={group.title}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {group.tokens.map((token) => (
                <Swatch key={token} token={token} />
              ))}
            </div>
          </Card>
        ))}

        <Card title="Bloque de código en uso (motivo terminal)">
          <pre className="overflow-x-auto rounded-md bg-code-bg p-4 font-mono text-sm leading-code text-code-fg">
            <code>
              {'{ '}
              <span className="text-code-key">&quot;alg&quot;</span>
              <span className="text-code-punc">: </span>
              <span className="text-code-string">&quot;HS256&quot;</span>
              <span className="text-code-punc">, </span>
              <span className="text-code-key">&quot;exp&quot;</span>
              <span className="text-code-punc">: </span>
              <span className="text-code-number">1752624000</span>
              {' }'}
            </code>
          </pre>
        </Card>
      </Section>

      <Section
        id="type"
        title="Tipografía"
        subtitle="Geist (UI) y Geist Mono (datos), la escala, los pesos, el interlineado y el tracking."
      >
        <Card title="Familias">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="font-sans text-2xl text-text">Geist</span>
              <TokenName>--font-sans</TokenName>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-2xl text-text">Geist Mono</span>
              <TokenName>--font-mono</TokenName>
            </div>
          </div>
        </Card>

        <Card title="Escala">
          <div className="flex flex-col gap-3">
            {TYPE_SCALE.map((item) => (
              <div key={item.name} className="flex items-baseline gap-4">
                <code className="w-24 shrink-0 font-mono text-2xs text-text-subtle">
                  {item.name} · {item.px}
                </code>
                <span className={`text-text ${item.className}`}>Pega. Detecta. Desenreda.</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Pesos">
            <div className="flex flex-col gap-2">
              {WEIGHTS.map((w) => (
                <div key={w.label} className="flex items-baseline gap-4">
                  <code className="w-28 shrink-0 font-mono text-2xs text-text-subtle">
                    {w.label} · {w.value}
                  </code>
                  <span className={`text-md text-text ${w.className}`}>Aa devtools</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Tracking">
            <div className="flex flex-col gap-2">
              {TRACKINGS.map((t) => (
                <div key={t.label} className="flex items-baseline gap-4">
                  <code className="w-28 shrink-0 font-mono text-2xs text-text-subtle">
                    {t.label} · {t.value}
                  </code>
                  <span className={`text-md text-text ${t.className}`}>DETECTA</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card title="Interlineado">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {LEADINGS.map((l) => (
              <div key={l.label} className="flex flex-col gap-1.5">
                <code className="font-mono text-2xs text-text-subtle">
                  --leading-{l.label} · {l.value}
                </code>
                <p className={`max-w-prose text-sm text-text-muted ${l.className}`}>
                  devtools identifica el tipo de dato, aplica la transformación pertinente y vuelve
                  a detectar sobre el resultado, encadenando pasos hasta llegar a algo legible.
                </p>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section id="spacing" title="Espaciado" subtitle="Rejilla base de 4px (--space-*).">
        <Card>
          <div className="flex flex-wrap items-end gap-6">
            {SPACING.map((s) => (
              <div key={s.step} className="flex flex-col items-center gap-2">
                <span className={`bg-accent ${s.sizeClassName}`} />
                <code className="font-mono text-2xs text-text-subtle">
                  {s.step} · {s.px}
                </code>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section
        id="radii"
        title="Radios"
        subtitle="Esquinas nítidas, de 4 a 16px, más el círculo (--radius-*)."
      >
        <Card>
          <div className="flex flex-wrap items-start gap-6">
            {RADII.map((r) => (
              <div key={r.label} className="flex flex-col items-center gap-2">
                <span
                  className={`h-14 w-16 border border-border-strong bg-surface-2 ${r.className}`}
                />
                <code className="font-mono text-2xs text-text-subtle">
                  {r.label} · {r.px}
                </code>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section
        id="shadows"
        title="Sombras"
        subtitle="Elevaciones bajas y funcionales (--shadow-*)."
      >
        <Card>
          <div className="flex flex-wrap items-start gap-8">
            {SHADOWS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-3">
                <span className={`h-14 w-20 rounded-md bg-surface ${s.className}`} />
                <code className="font-mono text-2xs text-text-subtle">
                  {s.label}
                  {s.note ? ` · ${s.note}` : ''}
                </code>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section
        id="forms"
        title="Primitivas de formulario"
        subtitle="Button · IconButton · Input · Textarea · Select · Field — espejo 1:1 de components/forms/, con clases semánticas de token e iconos SVG del DS."
      >
        <Card title="Botones — variantes">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Analizar</Button>
            <Button variant="secondary" icon="reopen">
              Reabrir
            </Button>
            <Button variant="ghost" icon="copy">
              Copiar
            </Button>
            <Button variant="danger" icon="trash">
              Borrar
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>

        <Card title="Botones — tamaños y block">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">sm · 30px</Button>
            <Button size="md">md · 36px</Button>
            <Button size="lg">lg · 44px</Button>
          </div>
          <Button block icon="terminal">
            Botón block (ancho completo)
          </Button>
        </Card>

        <Card title="IconButton — variantes, tamaños y estado toggled">
          <div className="flex flex-wrap items-center gap-3">
            <IconButton icon="copy" label="Copiar valor" variant="secondary" />
            <IconButton icon="eye" label="Mostrar contraseña" />
            <IconButton icon="trash" label="Borrar entrada" active />
            <IconButton icon="reopen" label="Reintentar" disabled />
            <span className="mx-2 h-6 w-px bg-border" aria-hidden="true" />
            <IconButton icon="eye" label="sm" size="sm" variant="secondary" />
            <IconButton icon="eye" label="md" size="md" variant="secondary" />
            <IconButton icon="eye" label="lg" size="lg" variant="secondary" />
          </div>
        </Card>

        <Card title="Campos de texto">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-56 flex-1">
              <Field label="Email" htmlFor="ds-email" hint="Lo usamos para avisarte.">
                <Input id="ds-email" type="email" placeholder="tu@correo.com" icon="search" />
              </Field>
            </div>
            <div className="min-w-56 flex-1">
              <Field label="Transformación" htmlFor="ds-transform">
                <Select
                  id="ds-transform"
                  mono
                  defaultValue="jwt.decode"
                  options={['jwt.decode', 'base64.decode', 'hash.identify']}
                />
              </Field>
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-56 flex-1">
              <Field label="Contraseña" htmlFor="ds-pass" error="Ese correo no existe." required>
                <Input id="ds-pass" type="password" mono invalid defaultValue="••••••••" />
              </Field>
            </div>
            <div className="min-w-56 flex-1">
              <Field label="Deshabilitado" htmlFor="ds-disabled">
                <Input id="ds-disabled" placeholder="No editable" disabled />
              </Field>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-40">
              <Input aria-label="Tamaño sm" size="sm" placeholder="sm" />
            </div>
            <div className="w-40">
              <Input aria-label="Tamaño md" size="md" placeholder="md" />
            </div>
            <div className="w-40">
              <Input aria-label="Tamaño lg" size="lg" placeholder="lg" />
            </div>
          </div>
        </Card>

        <Card title="Textarea — el campo de pegado (mono por defecto)">
          <Field label="Pega aquí" htmlFor="ds-paste">
            <Textarea
              id="ds-paste"
              rows={3}
              placeholder="Pega un JWT, base64, JSON, timestamp, URL…"
            />
          </Field>
        </Card>
      </Section>

      <Section
        id="display"
        title="Primitivas de display"
        subtitle="Badge · Card · CodeBlock · ConfidenceBar · CopyButton · Icon · Kbd — espejo 1:1 de components/display/, con clases semánticas de token e iconos SVG del DS."
      >
        <Card title="Badge — el vocabulario de DataKind (kind → color + icono + label mono)">
          <div className="flex flex-wrap items-center gap-2">
            {DATA_KINDS.map((kind) => (
              <Badge key={kind} kind={kind} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">neutral</Badge>
            <Badge tone="accent">accent</Badge>
            <Badge tone="success" icon="check">
              verificado
            </Badge>
            <Badge tone="warning" icon="alert-triangle">
              caduca pronto
            </Badge>
            <Badge tone="danger" icon="x">
              inválido
            </Badge>
            <Badge tone="violet">violet</Badge>
            <Badge tone="cyan">cyan</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral" size="sm">
              sm · 50
            </Badge>
            <Badge tone="accent" size="md">
              md
            </Badge>
            <Badge tone="success" outline icon="check">
              outline
            </Badge>
          </div>
        </Card>

        <Card title="Card — superficie genérica (padding · inset · hover)">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <DsCard padding="md">
              <p className="text-sm text-text-muted">padding md · sombra + borde</p>
            </DsCard>
            <DsCard inset>
              <p className="text-sm text-text-muted">inset · hundida, sin sombra</p>
            </DsCard>
            <DsCard hover>
              <p className="text-sm text-text-muted">hover · se eleva al pasar el ratón</p>
            </DsCard>
          </div>
        </Card>

        <Card title="CodeBlock — la superficie «terminal» (siempre oscura), con copia">
          <CodeBlock
            kind="json"
            value={'{ "alg": "HS256", "sub": "1234567890", "exp": 1752624000 }'}
          >
            {SAMPLE_JSON}
          </CodeBlock>
          <CodeBlock title="payload (wrap, sin copia)" copyable={false} wrap>
            eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U
          </CodeBlock>
        </Card>

        <Card title="ConfidenceBar — confianza 0..1 (O5: legible sin depender solo del color)">
          <div className="flex flex-col gap-3">
            {[0.98, 0.72, 0.5, 0.28, 0.05].map((v) => (
              <div key={v} className="flex items-center gap-4">
                <ConfidenceBar value={v} />
                <span className="font-mono text-2xs text-text-subtle">
                  {v >= 0.7 ? 'alta' : v >= 0.3 ? 'media' : 'baja'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted">
            La confianza se lee por la etiqueta numérica y la longitud del relleno, no solo por el
            color — un daltónico distingue 0.98 de 0.05.
          </p>
        </Card>

        <Card title="CopyButton — copiar al portapapeles (icono y con texto)">
          <div className="flex flex-wrap items-center gap-4">
            <CopyButton value="valor-a-copiar" label="Copiar salida" />
            <CopyButton value="valor-a-copiar" label="Copiar" size="sm" />
            <CopyButton value="valor-a-copiar" withLabel label="Copiar" />
          </div>
          <p className="text-xs text-text-muted">
            Es un botón real: foco por <Kbd>Tab</Kbd>, copia con <Kbd>Enter</Kbd> o{' '}
            <Kbd>Espacio</Kbd> y vira a un check verde.
          </p>
        </Card>

        <Card title="Kbd — teclas de atajo (devtools es keyboard-first)">
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
            <span className="inline-flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>V</Kbd> pegar
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>Esc</Kbd> limpiar
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>⌘</Kbd>
              <Kbd>C</Kbd> copiar paso
            </span>
          </div>
        </Card>

        <Card title="Icon — inventario de glifos (SVG del DS, curados de lucide)">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {iconNames.map((name) => (
              <div key={name} className="flex flex-col items-center gap-1.5">
                <span className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-surface-2 text-text">
                  <Icon name={name} size={18} />
                </span>
                <code className="font-mono text-2xs text-text-subtle">{name}</code>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section
        id="feedback"
        title="Primitivas de feedback"
        subtitle="Callout · EmptyState · Spinner — espejo 1:1 de components/feedback/. Avisos, estados cero y carga."
      >
        <Card title="Callout — banners de aviso (info · warning · danger · success · security)">
          <div className="flex flex-col gap-3">
            <Callout tone="info" title="Detección completada">
              Se identificó un JWT y se decodificó su payload.
            </Callout>
            <Callout tone="warning" title="El token caduca pronto">
              El campo <code className="font-mono">exp</code> es dentro de menos de una hora.
            </Callout>
            <Callout tone="danger" title="No se pudo decodificar">
              La firma del JWT no es válida.
            </Callout>
            <Callout tone="success" title="Copiado al portapapeles">
              El valor del paso está en tu portapapeles.
            </Callout>
            <Callout tone="security" title="Sobre tus datos">
              devtools procesa lo que pegas en el servidor. No lo uses con secretos de producción
              vivos.
            </Callout>
          </div>
        </Card>

        <Card title="EmptyState — estado cero (un panel nunca queda en blanco)">
          <EmptyState
            icon="clock"
            title="Sin historial todavía"
            description="Las entradas que analices con la cuenta iniciada aparecerán aquí."
            action={
              <Button variant="secondary" icon="terminal">
                Analizar algo
              </Button>
            }
          />
        </Card>

        <Card title="Spinner — carga indeterminada">
          <div className="flex flex-wrap items-center gap-6">
            <Spinner />
            <Spinner size={20} label="Analizando…" />
            <span className="text-accent">
              <Spinner size={24} />
            </span>
          </div>
        </Card>
      </Section>

      <Section
        id="composites"
        title="Composites de producto"
        subtitle="StepCard · ChainSummary · HistoryRow — presentacionales PUROS (props planas, sin tipos de dominio) que SOLO componen las primitivas del DS. Son las unidades de la cadena y del historial."
      >
        <Card title="ChainSummary — resumen de una cadena (badges de kind unidos por chevron)">
          <ChainSummaryDemo />
        </Card>

        <Card title="StepCard — la unidad estrella: un paso de la cadena (detección · O5 · picker O4 · salida · notas · terminal)">
          <StepCardDemo />
          <p className="text-xs text-text-muted">
            El segundo paso muestra el marcador terminal; el primero, un picker para desviar la
            cadena (O4) — cámbialo y el transform aplicado se actualiza en vivo.
          </p>
        </Card>

        <Card title="HistoryRow — fila del historial (D7: solo el preview redactado, nunca el valor crudo)">
          <HistoryRowDemo />
          <p className="text-xs text-text-muted">
            Reabrir y borrar aparecen al pasar el ratón (o al enfocar por teclado); el preview va
            siempre truncado.
          </p>
        </Card>
      </Section>
    </main>
  );
}
