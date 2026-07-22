// VERIFIER (T6.5) — mide el TIEMPO DE CPU de los 5 casos del test de presupuesto de
// `redact.test.ts`, con el mismo instrumento que el test (`process.cpuUsage()`), para
// comprobar la aritmética que el implementer afirma. Se ejecuta dos veces: con la cota
// `MIN_JWT_HEADER_CHARS` intacta y con la cota desactivada.
import { buildPreview } from '../../../packages/core/src/history/redact';

const cases: [name: string, chunk: string, budgetMs: number][] = [
  ['blob sin puntos', 'a', 200],
  ['run de `=` (padding)', '=', 200],
  ['blob de puntos', '.', 200],
  ['segmentos de 1 char', 'a.', 200],
  ['segmentos de 12 chars', 'aaaaaaaaaaaa.', 1500],
];

const cpuMillisOf = (work: () => unknown): number => {
  const started = process.cpuUsage();
  work();
  const { user, system } = process.cpuUsage(started);
  return (user + system) / 1000;
};

console.log('caso                        CPU ms   presupuesto   margen');
for (const [name, chunk, budget] of cases) {
  const input = chunk.repeat(Math.ceil((128 * 1024) / chunk.length));
  const ms = cpuMillisOf(() => buildPreview(input, 'text'));
  const factor = budget / ms;
  console.log(
    `${name.padEnd(26)} ${ms.toFixed(1).padStart(7)}   ${String(budget).padStart(9)}   ${
      ms > budget ? `EXCEDE (x${(ms / budget).toFixed(2)})` : `x${factor.toFixed(1)}`
    }`,
  );
}
