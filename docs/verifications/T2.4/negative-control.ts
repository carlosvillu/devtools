// Control negativo del verifier (T2.4 re-verificación).
// NO toca código de producto: importa el `analyze` REAL del motor y compara la redacción
// REAL contra una réplica de `redactInput` SIN la rama `looksLikeJson` (el hueco).
// Si la rama es load-bearing, la réplica filtra y la real no.
import { analyze } from '../../../packages/core/src/engine/index';
import { buildHistoryRecord, redactInput } from '../../../packages/core/src/history/index';
import { inputKindOf } from '../../../packages/core/src/history/index';

// Réplica EXACTA de la rama json de redact.ts, pero SIN `|| looksLikeJson(trimmed)`.
const ELLIPSIS = '…';
function redactJsonValue(value, depth = 0) {
  if (depth >= 3) return ELLIPSIS;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const shown = value.slice(0, 5).map((i) => redactJsonValue(i, depth + 1));
    if (value.length > 5) shown.push(ELLIPSIS);
    return `[${shown.join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const e = Object.entries(value);
    if (e.length === 0) return '{}';
    return `{${e.map(([k, c]) => `${JSON.stringify(k)}:${redactJsonValue(c, depth + 1)}`).join(',')}}`;
  }
  return ELLIPSIS;
}
function redactWithoutTheFix(input, kind) {
  const trimmed = input.trim();
  if (kind === 'json') {
    try {
      return redactJsonValue(JSON.parse(trimmed));
    } catch {
      return ELLIPSIS;
    }
  }
  if (kind === 'base64') return `${ELLIPSIS} (${String(trimmed.length)} caracteres)`;
  if (kind !== 'jwt') return trimmed; // <-- el hueco: `text` verbatim
  return trimmed;
}

const CASES = [
  ['JSON malformado', '{"password":"leakme123"'],
  ['escalar entrecomillado', '"supersecretvalue"'],
  ['array malformado', '["leakme123",'],
];

let allBite = true;
console.log('caso                      kind      SIN-fix (hueco)            CON-fix (real)');
console.log('='.repeat(92));
for (const [label, input] of CASES) {
  const kind = inputKindOf(analyze(input, { now: new Date('2026-07-19T00:00:00Z') }));
  const without = redactWithoutTheFix(input, kind);
  const withFix = redactInput(input, kind);
  const bites = without !== withFix && withFix === '…';
  if (!bites) allBite = false;
  console.log(
    `${label.padEnd(25)} ${kind.padEnd(9)} ${JSON.stringify(without).padEnd(26)} ${JSON.stringify(withFix)}  ${bites ? '✅ la rama MUERDE' : '❌ inerte'}`,
  );
}
console.log('='.repeat(92));
console.log(allBite ? 'RESULTADO: la rama looksLikeJson es LOAD-BEARING en los 3 casos.' : 'RESULTADO: alguna rama NO muerde.');
