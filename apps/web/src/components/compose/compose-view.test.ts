import { expect, test } from 'vitest';
import { safeCompose, type ComposeResult } from '@app/core/engine';
import {
  composeChainKinds,
  okStepCount,
  recognizedSourceKind,
  showResultBar,
} from './compose-view';

// Los resultados NO se escriben a mano: se producen con el motor REAL (`safeCompose`, el mismo
// que llama la pantalla) para que estos tests hablen del contrato de verdad y no de un fixture
// que podría envejecer sin enterarse. `now` fijo: I11 (mismo `now` ⇒ mismo resultado).
const NOW = new Date('2026-07-22T12:00:00.000Z');

function run(source: string, transforms: string[]): ComposeResult {
  const result = safeCompose(
    source,
    transforms.map((transform) => ({ transform })),
    { now: NOW },
  );
  if (!result.ok) throw new Error('receta inválida en el test');
  return result.result;
}

const JSON_SOURCE = '{\n  "sub": "1",\n  "name": "carlos"\n}';

test('con el campo vacío no hay kind «reconocido» aunque el motor diga `text`', () => {
  const result = run('', []);
  // El motor SÍ dice text (I6, el suelo de la detección): la supresión es de la UI.
  expect(result.sourceKind).toBe('text');
  expect(recognizedSourceKind(result)).toBeNull();
  // Solo espacios sigue siendo «nada escrito».
  expect(recognizedSourceKind(run('   \n ', []))).toBeNull();
});

test('con algo escrito, el kind reconocido es el que detecta el motor', () => {
  expect(recognizedSourceKind(run(JSON_SOURCE, []))).toBe('json');
});

test('sin pasos NO se pinta la barra de resultado, aunque `output` no sea null', () => {
  const result = run(JSON_SOURCE, []);
  // I12: receta vacía ⇒ `output === source`. Sin el gate de `steps.length > 0`, la barra
  // duplicaría la fuente bajo un «· 0 pasos ·».
  expect(result.output).toBe(JSON_SOURCE);
  expect(result.terminal).toBe('ok');
  expect(showResultBar(result)).toBe(false);
  expect(okStepCount(result)).toBe(0);
});

test('con la cadena completa se pinta la barra, con los pasos aplicados y los kinds', () => {
  const result = run(JSON_SOURCE, ['json.minify', 'base64url.encode']);
  expect(showResultBar(result)).toBe(true);
  expect(okStepCount(result)).toBe(2);
  expect(composeChainKinds(result)).toEqual(['json', 'json', 'base64']);
});

test('un paso fallido apaga la barra de resultado y no cuenta como paso aplicado', () => {
  const result = run('no soy json', ['json.minify']);
  expect(result.terminal).toBe('error');
  expect(showResultBar(result)).toBe(false);
  expect(okStepCount(result)).toBe(0);
});

test('🔴 con un fallo TRAS un paso correcto, `output` es el PARCIAL y la barra sigue apagada', () => {
  const result = run(JSON_SOURCE, ['base64.encode', 'json.minify']);
  // El contrato conserva el trabajo previo (I9): `output` es la salida del último paso ok…
  expect(result.terminal).toBe('error');
  expect(result.output).toBe(result.steps[0]?.output);
  expect(result.output).not.toBeNull();
  // …y justo por eso la barra NO puede gatearse con `output != null`: ofrecería copiar un
  // resultado incompleto bajo una pantalla que muestra un fallo.
  expect(showResultBar(result)).toBe(false);
  expect(okStepCount(result)).toBe(1);
  // La cadena de kinds solo incluye lo que se aplicó de verdad (el paso roto no aporta kind).
  expect(composeChainKinds(result)).toEqual(['json', 'base64']);
});

test('un id que no existe en el catálogo es un fallo de paso, no una excepción', () => {
  const result = run(JSON_SOURCE, ['no.existe']);
  expect(result.terminal).toBe('error');
  expect(result.steps[0]?.ok).toBe(false);
  expect(showResultBar(result)).toBe(false);
});
