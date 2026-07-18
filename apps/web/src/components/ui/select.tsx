import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Icon } from './icon';

// Select — espejo 1:1 de docs/design-system/components/forms/Select.jsx.
//
// DESVIACIÓN DELIBERADA (sancionada por frontend/design-system.md §4): es un
// `<select>` NATIVO estilado (appearance-none + chevron), NO el Select portalizado de
// Base UI (listbox en popover). El propio SPEC del DS es un `<select>` nativo con prop
// `options`; §4 manda que cuando la fidelidad al espejo Y la a11y/plataforma apuntan al
// control nativo, gana el nativo y se anota la desviación (hecho aquí). Beneficio
// colateral: no arrastra portal/popover, así que no depende de los mocks de
// matchMedia/ResizeObserver que un Select de Base UI exigiría para montar en jsdom.
//
// Alturas/estilos idénticos a Input. El chevron usa el `Icon` SVG del DS (`chevron-down`,
// size 16, 1:1 con Select.jsx; el código de shadcn lo traería como `ChevronDownIcon` de
// lucide, aquí es el SVG-inline del propio DS). `invalid` gana sobre focus, igual que
// Input/Textarea.
const selectVariants = cva(
  'w-full cursor-pointer appearance-none rounded-base border bg-surface pr-8.5 pl-3 text-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60',
  {
    variants: {
      size: {
        sm: 'h-control-sm text-sm',
        md: 'h-control-md text-base',
        lg: 'h-control-lg text-base',
      },
      invalid: {
        true: 'border-danger',
        false: 'border-border-strong focus-visible:border-accent',
      },
      mono: {
        true: 'font-mono',
        false: 'font-sans',
      },
    },
    defaultVariants: { size: 'md', invalid: false, mono: false },
  },
);

// El espejo del DS exporta `SelectOption` como tipo público. Aquí se mantiene interno
// (sin `export`) hasta que un consumidor real lo importe: knip rechaza exports
// huérfanos, y este repo difiere la exportación al primer uso (F1/T1.6 construyen los
// options de transformaciones). Re-exportarlo será un cambio de una línea entonces.
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps
  extends Omit<React.ComponentProps<'select'>, 'size'>, VariantProps<typeof selectVariants> {
  /** Opciones como strings o pares {value,label}. */
  options: (string | SelectOption)[];
  /** Opción-placeholder deshabilitada, mostrada primera. */
  placeholder?: string;
}

export function Select({
  className,
  options,
  size,
  invalid,
  mono,
  placeholder,
  ...props
}: SelectProps) {
  const normalized: SelectOption[] = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );
  // Un `<select>` nativo NO muestra su primera `<option disabled>` de inicio: el
  // navegador auto-selecciona la primera opción HABILITADA. La option-placeholder
  // (value="") solo queda seleccionada de arranque si el valor inicial es "". El spec
  // del DS es CONTROLADO (`value={value}`), por eso allí el placeholder «funciona».
  // En uso NO controlado hay que fijar `defaultValue=""` para seleccionar el
  // placeholder; se hace solo si el consumidor no gobierna el valor (ni value ni
  // defaultValue), para no pisar el caso controlado.
  const controlled = props.value !== undefined || props.defaultValue !== undefined;
  return (
    <div data-slot="select-wrapper" className="relative inline-flex w-full items-center">
      <select
        data-slot="select"
        aria-invalid={invalid ? true : undefined}
        defaultValue={placeholder && !controlled ? '' : undefined}
        className={cn(selectVariants({ size, invalid, mono }), className)}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        size={16}
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-text-muted"
      />
    </div>
  );
}
