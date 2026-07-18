import { cn } from '@/lib/utils';
import { Icon, type IconName } from './icon';

// Badge — espejo 1:1 de docs/design-system/components/display/Badge.jsx.
// Pill de etiqueta/estado. El corazón del vocabulario de tipos del producto vive aquí:
// pasa `kind` y el badge fija color + icono + label mono, de modo que un `jwt` SIEMPRE
// se ve igual en toda la app. `KIND_META` (DataKind → identidad visual) se re-exporta.
//
// TOKENS Y DESVIACIÓN DOCUMENTADA: los tonos neutral/accent/success/warning/danger usan
// alias semánticos con clase (`bg-accent-subtle-bg`, `text-danger-subtle-fg`…). Los
// tonos `violet` y `cyan` (hues secundarios de data-kind) NO tienen alias semántico en
// el DS: el propio mirror los pinta con las RAMPAS `--violet-500/700`, `--cyan-500/700`
// vía color-mix. Reproducirlos con `text-violet-700`/`text-cyan-700` + un `background`
// color-mix inline es OBEDECER al DS (esos tokens de rampa están sancionados en
// _adherence x-omelette.tokens), no inventar — es la única excepción a «cero ramps».
// El color de borde (siempre color-mix, o `--border` en neutral) no tiene utilidad de
// clase: va inline vía `borderColor` (excepción sancionada). Cero hex, cero px crudos.

export type DataKind =
  'base64' | 'jwt' | 'json' | 'unix_timestamp' | 'url' | 'uuid' | 'hash' | 'text';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'violet' | 'cyan';

/** DataKind → { tone, icon, label }. El mapa de identidad visual del producto. */
export const KIND_META: Record<DataKind, { tone: BadgeTone; icon: IconName; label: string }> = {
  jwt: { tone: 'accent', icon: 'key', label: 'jwt' },
  json: { tone: 'violet', icon: 'braces', label: 'json' },
  base64: { tone: 'cyan', icon: 'terminal', label: 'base64' },
  unix_timestamp: { tone: 'warning', icon: 'clock', label: 'timestamp' },
  url: { tone: 'success', icon: 'link', label: 'url' },
  uuid: { tone: 'cyan', icon: 'hash', label: 'uuid' },
  hash: { tone: 'danger', icon: 'hash', label: 'hash' },
  text: { tone: 'neutral', icon: 'type', label: 'text' },
};

// Por tono: `bg` = clase de fondo (null cuando el fondo es color-mix inline), `fg` =
// clase de texto, `bgVar` = fondo inline (violet/cyan), `border` = color de borde inline.
const TONE: Record<BadgeTone, { bg: string | null; fg: string; bgVar?: string; border: string }> = {
  neutral: { bg: 'bg-surface-2', fg: 'text-text-muted', border: 'var(--border)' },
  accent: {
    bg: 'bg-accent-subtle-bg',
    fg: 'text-accent-subtle-fg',
    border: 'color-mix(in oklab, var(--accent) 30%, transparent)',
  },
  success: {
    bg: 'bg-success-subtle-bg',
    fg: 'text-success-subtle-fg',
    border: 'color-mix(in oklab, var(--success) 30%, transparent)',
  },
  warning: {
    bg: 'bg-warning-subtle-bg',
    fg: 'text-warning-subtle-fg',
    border: 'color-mix(in oklab, var(--warning) 32%, transparent)',
  },
  danger: {
    bg: 'bg-danger-subtle-bg',
    fg: 'text-danger-subtle-fg',
    border: 'color-mix(in oklab, var(--danger) 32%, transparent)',
  },
  violet: {
    bg: null,
    fg: 'text-violet-700',
    bgVar: 'color-mix(in oklab, var(--violet-500) 14%, var(--surface))',
    border: 'color-mix(in oklab, var(--violet-500) 32%, transparent)',
  },
  cyan: {
    bg: null,
    fg: 'text-cyan-700',
    bgVar: 'color-mix(in oklab, var(--cyan-500) 15%, var(--surface))',
    border: 'color-mix(in oklab, var(--cyan-500) 34%, transparent)',
  },
};

const SIZE = {
  sm: { box: 'h-4.5 gap-0.75 px-1.5 text-2xs', glyph: 11 },
  md: { box: 'h-5.5 gap-1.25 px-2 text-xs', glyph: 13 },
} as const;

interface BadgeProps extends React.ComponentProps<'span'> {
  /** Atajo del producto: pasa un DataKind para fijar tono, icono y label mono. */
  kind?: DataKind;
  /** Tono de color (ignorado cuando `kind` está presente). */
  tone?: BadgeTone;
  /** Icono inicial (sobrescribe el icono por defecto del kind). */
  icon?: IconName;
  /** Fuerza label mono/sans. Por defecto mono cuando hay `kind`. */
  mono?: boolean;
  size?: 'sm' | 'md';
  /** Fondo transparente, borde + texto de color. */
  outline?: boolean;
}

export function Badge({
  children,
  kind,
  tone = 'neutral',
  icon,
  mono,
  size = 'md',
  outline = false,
  className,
  style,
  ...props
}: BadgeProps) {
  const meta = kind ? KIND_META[kind] : null;
  const t = TONE[meta ? meta.tone : tone];
  const glyph = icon ?? meta?.icon;
  const label = children ?? (meta ? meta.label : null);
  const useMono = mono ?? !!kind;
  const sz = SIZE[size];

  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-sm border font-medium leading-none',
        sz.box,
        useMono ? 'font-mono' : 'font-sans',
        t.fg,
        !outline && t.bg ? t.bg : null,
        className,
      )}
      style={{
        borderColor: t.border,
        background: outline ? 'transparent' : (t.bgVar ?? undefined),
        ...style,
      }}
      {...props}
    >
      {glyph ? <Icon name={glyph} size={sz.glyph} /> : null}
      {label}
    </span>
  );
}
