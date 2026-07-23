// Adaptador DOMINIO → props del DS para `/history` (T2.2).
//
// 🔵 POR QUÉ ESTE FICHERO NO VIVE EN `components/history/`:
// `components/history/` (igual que `components/chain/`) es la zona de composites
// PRESENTACIONALES PUROS del DS —`HistoryRow`—, donde una regla de lint scoped
// (eslint.config.ts §5b, TD.5) PROHÍBE importar de `@app/core`. La cabecera de
// `history-row.tsx` lo anuncia: «el wrapper de dominio … llega con T2.2» y es OTRA CAPA.
// Este directorio es esa capa: aquí sí se habla el dominio (`HistoryEntryView` de
// `@app/core/history`) y se traduce a las props planas que el DS entiende.
//
// Lógica PURA y por tanto unit-testable barata: el reloj entra por parámetro (`now`),
// nunca se lee `Date.now()` aquí dentro — un formateador que lee el reloj no es testeable
// de forma determinista.
//
// D7: aquí solo circula lo que la BD guarda (preview redactado + kinds). El dato crudo no
// existe en `HistoryEntryView`, así que este adaptador no puede filtrarlo ni por error.
import type { HistoryEntryView } from '@app/core/history';
import type { DataKind } from '@/components/ui/badge';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Tiempo relativo en español, con el vocabulario del mockup («hace 3 h», «ayer»,
 * «hace 2 d»). Determinista: `now` es un parámetro.
 */
export function relativeTime(createdAt: Date, now: Date): string {
  const elapsed = now.getTime() - createdAt.getTime();
  // Un reloj que va hacia atrás (fila creada "en el futuro" por skew) se trata como ahora.
  if (elapsed < MINUTE) return 'hace un momento';
  if (elapsed < HOUR) return `hace ${String(Math.floor(elapsed / MINUTE))} min`;
  if (elapsed < DAY) return `hace ${String(Math.floor(elapsed / HOUR))} h`;
  const days = Math.floor(elapsed / DAY);
  if (days === 1) return 'ayer';
  return `hace ${String(days)} d`;
}

/** Los kinds de la cadena, en orden, para el `ChainSummary` de la fila. */
export function chainKinds(entry: HistoryEntryView): DataKind[] {
  // `DataKind` del DS y el del engine son la MISMA unión de literales (el DS es espejo del
  // vocabulario del producto); el contrato ya validó cada valor con `DataKindSchema`, así
  // que aquí no hay coerción que se salte la validación.
  return entry.chain.map((step) => step.kind);
}

export interface HistoryRowViewProps {
  preview: string;
  kind: DataKind;
  chain: DataKind[];
  time: string;
  direction: 'decode' | 'compose';
}

/** Traduce una entrada de la API a las props planas de `HistoryRow`. */
export function toHistoryRowProps(entry: HistoryEntryView, now: Date): HistoryRowViewProps {
  return {
    preview: entry.preview,
    kind: entry.inputKind,
    chain: chainKinds(entry),
    time: relativeTime(new Date(entry.createdAt), now),
    direction: entry.direction,
  };
}
