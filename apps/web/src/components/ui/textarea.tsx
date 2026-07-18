import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Textarea — espejo 1:1 de docs/design-system/components/forms/Textarea.jsx.
// El campo de pegado principal de devtools. `mono` por defecto TRUE (se pegan tokens,
// JSON, base64…). Radio `rounded-md` (8px), padding 12/14px = py-3 px-3.5, resize
// vertical, interlineado de código. `invalid` → borde danger (gana sobre focus, igual
// que Input). El anillo de foco (--ring) se muestra en ambos casos.
const textareaVariants = cva(
  'block w-full resize-y rounded-md border bg-surface px-3.5 py-3 text-sm leading-code text-text outline-none transition-colors placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60',
  {
    variants: {
      invalid: {
        true: 'border-danger',
        false: 'border-border-strong focus-visible:border-accent',
      },
      mono: {
        true: 'font-mono',
        false: 'font-sans',
      },
    },
    defaultVariants: { invalid: false, mono: true },
  },
);

interface TextareaProps
  extends React.ComponentProps<'textarea'>, VariantProps<typeof textareaVariants> {}

export function Textarea({ className, invalid, mono, rows = 6, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      data-slot="textarea"
      aria-invalid={invalid ? true : undefined}
      className={cn(textareaVariants({ invalid, mono }), className)}
      {...props}
    />
  );
}
