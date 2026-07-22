'use client';

import { useRef, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Icon, type IconName } from './icon';

// Segmented — espejo 1:1 de docs/design-system/components/forms/Segmented.jsx.
// Control segmentado de selección única: una fila-píldora donde exactamente un segmento
// está activo. Es el conmutador `decodificar ⇄ codificar` de F6 (ver Segmented.prompt.md).
// Presentacional y PURO: controlado por `value` + `onChange`, sin navegación dentro
// (el cableado de rutas es de la pantalla que lo consume, no de la primitiva).
//
// SEMÁNTICA: el espejo lo monta como `role="tablist"` + `role="tab"` con `aria-selected`.
// Se OBEDECE al espejo (no se traduce a radiogroup): esta primitiva conmuta dos vistas
// mirror de la misma superficie, que es justo el caso de uso de tabs.
//
// Medidas 1:1 con el spec, traducidas a spacing FRACCIONARIO (n×4px) — nunca arbitrarios:
//   contenedor: gap 4px → gap-1 · padding 4px → p-1 · radius-lg · border 1px · surface-2
//   segmento sm: padding 5/12px → py-1.25 px-3 · text-xs
//   segmento md: padding 7/16px → py-1.75 px-4 · text-base
//   gap icono-label 7px → gap-1.75 · icono size 14
//   activo: border-border + bg-surface + shadow-sm + font-semibold + text-text
//   inactivo: border-transparent + transparente + font-medium + text-text-muted
//
// DESVIACIÓN DELIBERADA Y AL ALZA (a11y; sancionada por design-system.md §4, cuarto
// bullet): el specimen del DS es demostrativo y deja el patrón de tablist a medias —
// todos sus `<button>` son parada de tabulación y las flechas no hacen nada. Aquí se
// implementa el patrón APG completo:
//   · ROVING TABINDEX — el grupo es UNA sola parada de tabulación (tabIndex 0 solo en el
//     segmento ENFOCADO —que arranca siendo el seleccionado—; -1 en el resto), así Tab
//     entra al control y sale de él. El índice enfocado es ESTADO, no derivada de `value`
//     (razón detallada en el cuerpo: si no, el control se atasca cuando el padre no
//     propaga `value` de forma síncrona).
//   · FLECHAS — ←/↑ anterior, →/↓ siguiente (con wrap), Home/End extremos; activación
//     AUTOMÁTICA (la selección sigue al foco), que es el modo APG para tabs baratas.
//   · `aria-label` / `aria-labelledby` opcionales para nombrar el tablist (el .d.ts del
//     espejo no los declara; un `role="tablist"` sin nombre accesible es un defecto).
// El DS no prohíbe hacer accesible lo que su specimen deja a medias, y la Entrega de T6.3
// lo exige explícitamente («navegable con flechas», «se opera entero con teclado»).
//
// El foco usa el anillo ÚNICO del DS, idéntico a Button/Input: ring-2 + ring-ring.
// El DS NO define estado `disabled` para este control (ni el .jsx, ni el .d.ts, ni el
// card.html): `SegmentedProps` es una interfaz CERRADA que —a diferencia de Button o
// Select— no extiende `ComponentProps<'button'>`, así que no hereda `disabled` nativo.
// No se inventa aquí.
const segmentedOptionVariants = cva(
  'inline-flex cursor-pointer items-center gap-1.75 rounded-base border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      size: {
        sm: 'px-3 py-1.25 text-xs',
        md: 'px-4 py-1.75 text-base',
      },
      selected: {
        true: 'border-border bg-surface font-semibold text-text shadow-sm',
        false: 'border-transparent bg-transparent font-medium text-text-muted shadow-none',
      },
      mono: {
        true: 'font-mono',
        false: 'font-sans',
      },
    },
    defaultVariants: { size: 'md', selected: false, mono: false },
  },
);

// El espejo exporta `SegmentedOption` como tipo público; aquí se mantiene interno hasta
// que un consumidor real lo importe (knip rechaza exports huérfanos) — misma política
// que `SelectOption` en select.tsx.
interface SegmentedOption {
  value: string;
  label: string;
  /** Glifo del inventario del DS mostrado antes del label. */
  icon?: IconName;
}

// `selected` es una variante INTERNA (la calcula el componente por opción), así que la
// API pública solo toma `size` y `mono` del cva — de ahí el Pick en vez del VariantProps
// completo que usan Button/Input.
interface SegmentedProps extends Pick<
  VariantProps<typeof segmentedOptionVariants>,
  'size' | 'mono'
> {
  /** Segmentos como strings o {value,label,icon}. */
  options: (string | SegmentedOption)[];
  /** Valor del segmento seleccionado. */
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  /** Nombre accesible del grupo (adición de a11y; ver cabecera). */
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export function Segmented({
  options,
  value,
  onChange,
  size,
  mono,
  className,
  style,
  ...aria
}: SegmentedProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const normalized: SegmentedOption[] = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );

  const selectedIndex = normalized.findIndex((option) => option.value === value);
  // Si el valor no casa ninguna opción, el grupo sigue siendo alcanzable con Tab por su
  // primer segmento (nunca cero paradas de tabulación).
  const valueIndex = selectedIndex === -1 ? 0 : selectedIndex;

  // ROVING STATE REAL: el índice enfocado es ESTADO del componente, no una derivada de
  // `value`. Es la diferencia entre un control usable y uno que se atasca.
  //   Por qué: `activate()` mueve el foco de forma imperativa, pero el padre puede NO
  //   actualizar `value` de forma síncrona (o no actualizarlo en absoluto). Si la flecha
  //   siguiente se calculara desde `value`, tras la primera flecha el foco estaría en `b`
  //   y el cálculo seguiría partiendo de `a`: la segunda flecha volvería a `b` y la
  //   tercera opción sería INALCANZABLE por teclado para siempre.
  //   Esto NO es hipotético aquí: T6.7 cablea este control a navegación de ruta
  //   (/analyze ⇄ /compose), donde el `value` nuevo llega DESPUÉS del commit de la
  //   navegación — el estado transitorio que rompía es el estado normal del caso de uso.
  // Resincronización: cuando `value` cambia POR FUERA, el foco vuelve al seleccionado
  // (patrón documentado de React para ajustar estado durante el render, sin efecto).
  const [syncedValue, setSyncedValue] = useState(value);
  const [focusIndex, setFocusIndex] = useState(valueIndex);
  if (syncedValue !== value) {
    setSyncedValue(value);
    setFocusIndex(valueIndex);
  }
  // Clamp defensivo por si `options` ENCOGE entre renders. Solo por arriba: `focusIndex`
  // no puede ser negativo (sus tres fuentes son `valueIndex` —ya normalizado a 0—, el
  // índice del `map`, y `activate()`, que sale antes si el índice no existe).
  const lastIndex = Math.max(normalized.length - 1, 0);
  const rovingIndex = Math.min(focusIndex, lastIndex);

  // Mueve el foco Y la selección al índice dado (activación automática de APG).
  // El foco se aplica sobre el DOM ya montado: el botón destino existe antes del
  // re-render, así que no hace falta esperar a que `value` se propague.
  function activate(index: number) {
    const target = normalized[index];
    if (!target) return;
    setFocusIndex(index);
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
      '[data-slot="segmented-option"]',
    );
    buttons?.[index]?.focus();
    if (target.value !== value) onChange?.(target.value);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // El origen del movimiento es el índice ENFOCADO, no el seleccionado (ver arriba).
    const current = rovingIndex;
    const last = lastIndex;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        activate(current >= last ? 0 : current + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        activate(current <= 0 ? last : current - 1);
        break;
      case 'Home':
        event.preventDefault();
        activate(0);
        break;
      case 'End':
        event.preventDefault();
        activate(last);
        break;
      default:
        break;
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      data-slot="segmented"
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex gap-1 rounded-lg border border-border bg-surface-2 p-1',
        className,
      )}
      style={style}
      {...aria}
    >
      {normalized.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            data-slot="segmented-option"
            aria-selected={selected}
            tabIndex={index === rovingIndex ? 0 : -1}
            onClick={() => {
              // El clic también mueve el roving focus: si el padre no propaga `value`,
              // las flechas siguientes deben partir del segmento que se acaba de pulsar.
              setFocusIndex(index);
              onChange?.(option.value);
            }}
            className={segmentedOptionVariants({ size, selected, mono })}
          >
            {option.icon ? <Icon name={option.icon} size={14} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
