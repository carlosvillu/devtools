// Unit de la redacción de historial (D7 / criterio 14.8). Es lógica pura: aquí se prueba
// la LEY (redactar y truncar), y el control negativo literal «el token no aparece» se
// prueba además contra la fila REAL persistida en la integración de apps/web.
import { describe, expect, it } from 'vitest';
import { analyze } from '../engine';
import {
  PREVIEW_MAX_CHARS,
  buildHistoryRecord,
  buildPreview,
  inputKindOf,
  redactInput,
  summarizeChain,
  truncatePreview,
} from './redact';

// El JWT del ejemplo trabajado del PRD §6.5.
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc';
const JWT_HEADER_SEGMENT = 'eyJhbGciOiJIUzI1NiJ9';
const JWT_PAYLOAD_SEGMENT = 'eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ';
const JWT_SIGNATURE_SEGMENT = 'abc';
const NOW = new Date('2025-07-16T04:00:00Z');

describe('redactInput', () => {
  it('sustituye payload y firma del JWT por … y conserva el header', () => {
    expect(redactInput(JWT, 'jwt')).toBe(`${JWT_HEADER_SEGMENT}.….…`);
  });

  it('conserva el prefijo Bearer (que el detector tolera) y redacta igual', () => {
    expect(redactInput(`Bearer ${JWT}`, 'jwt')).toBe(`Bearer ${JWT_HEADER_SEGMENT}.….…`);
  });

  it('no filtra el payload ni la firma en ninguna forma del input', () => {
    for (const input of [JWT, `Bearer ${JWT}`, `  bearer ${JWT}  `]) {
      const redacted = redactInput(input, 'jwt');
      expect(redacted).not.toContain(JWT_PAYLOAD_SEGMENT);
      expect(redacted).not.toContain(JWT_SIGNATURE_SEGMENT);
    }
  });

  it('falla hacia el lado seguro si un `jwt` no trae los tres segmentos', () => {
    expect(redactInput('sinpuntos', 'jwt')).toBe('…');
  });

  // T2.4 (cambio de alcance aprobado, PRD §8): los kinds NO portadores de secretos siguen
  // verbatim — `text` es el fallback y redactarlo dejaría el historial ilegible entero.
  it('no redacta los kinds que no portan secretos (solo recorta espacios)', () => {
    expect(redactInput('  hola mundo  ', 'text')).toBe('hola mundo');
    expect(redactInput('  1700000000  ', 'unix_timestamp')).toBe('1700000000');
    expect(redactInput('  d9b1d7db-4b5e-4b1f-9c1a-1c2f3d4e5f60  ', 'uuid')).toBe(
      'd9b1d7db-4b5e-4b1f-9c1a-1c2f3d4e5f60',
    );
    // Un hash es un digest: NO descodifica a texto legible, así que se conserva.
    expect(redactInput('  5d41402abc4b2a76b9719d911017c592  ', 'hash')).toBe(
      '5d41402abc4b2a76b9719d911017c592',
    );
  });
});

// ─── T2.4 · redacción de `base64` ───────────────────────────────────────────────────────
// El base64 ES el texto legible codificado: conservar 4 caracteres ya son 3 bytes de
// plaintext. Por eso no sobrevive NI UN carácter del contenido, solo la longitud.
describe('redactInput · base64', () => {
  const B64 = 'SGVsbG8gV29ybGQgc2VjcmV0'; // → «Hello World secret»
  const DECODED = 'Hello World secret';

  it('no conserva NINGÚN carácter del contenido, solo la longitud', () => {
    expect(redactInput(B64, 'base64')).toBe('… (24 caracteres)');
  });

  it('no filtra ni el base64 (ni un prefijo corto) ni su contenido decodificado', () => {
    const redacted = redactInput(B64, 'base64');
    // El assert que MUERDE hoy: un prefijo corto sobrevive al truncado y estaría presente
    // si la redacción de base64 se desactivara.
    expect(redacted).not.toContain('SGVsbG8');
    expect(redacted).not.toContain(B64);
    // Cinturón y tirantes contra una fuga futura de `steps[i].output`.
    expect(redacted).not.toContain(DECODED);
    expect(redacted).not.toContain('secret');
  });

  it('la longitud distingue entradas distintas (el historial sigue sirviendo)', () => {
    expect(redactInput('SGVsbG8=', 'base64')).toBe('… (8 caracteres)');
    expect(redactInput(B64, 'base64')).not.toBe(redactInput('SGVsbG8=', 'base64'));
  });
});

// ─── T2.4 · redacción de `json` ─────────────────────────────────────────────────────────
// Se conservan claves y estructura (lo reconocible); TODOS los valores se van.
describe('redactInput · json', () => {
  it('sustituye el valor por … y conserva la clave', () => {
    expect(redactInput('{"password":"hunter2"}', 'json')).toBe('{"password":…}');
  });

  it('elide también los valores NUMÉRICOS, booleanos y null', () => {
    expect(redactInput('{"exp":1752624000,"ok":true,"n":null}', 'json')).toBe(
      '{"exp":…,"ok":…,"n":…}',
    );
    expect(redactInput('{"exp":1752624000}', 'json')).not.toContain('1752624000');
  });

  it('recorre objetos anidados y arrays', () => {
    expect(redactInput('{"user":{"email":"a@b.com"}}', 'json')).toBe('{"user":{"email":…}}');
    expect(redactInput('["hunter2","otro"]', 'json')).toBe('[…,…]');
    expect(redactInput('{"a":[]}', 'json')).toBe('{"a":[]}');
    expect(redactInput('{"a":{}}', 'json')).toBe('{"a":{}}');
  });

  it('corta la recursión en profundidad sin filtrar nada', () => {
    const deep = redactInput('{"a":{"b":{"c":{"d":"hunter2"}}}}', 'json');
    expect(deep).toBe('{"a":{"b":{"c":…}}}');
    expect(deep).not.toContain('hunter2');
  });
});

// ─── T2.4 · EL HUECO: lo que PARECE json pero el detector NO llama `json` ────────────────
// 🔴 Estos casos se prueban DESDE EL INPUT CRUDO con la cadena REAL del motor
// (`buildHistoryRecord`), nunca fijando `kind` a mano. Motivo: `detectJson()` exige parseo
// válido Y resultado no escalar, así que un `redactInput(x, 'json')` con un JSON malformado
// es un par (input, kind) que producción NO PUEDE PRODUCIR — un test verde describiendo una
// protección inexistente (el anti-patrón, forma 8 de la skill `testing`, que T2.4 vino a
// matar: dos tests así se colaron en la primera pasada de esta misma tarea).
describe('redactInput · lo que parece json pero cae en `text`', () => {
  /** Recorre el camino REAL: input crudo → motor → registro persistible. */
  const record = (input: string) => buildHistoryRecord(input, analyze(input, { now: NOW }));

  it('un JSON MALFORMADO no lo clasifica el motor como json… y aun así no deja rastro', () => {
    const input = '{"password":"leakme123"';
    // Primero, la premisa que hace válido el test: el kind que produce el DETECTOR.
    expect(inputKindOf(analyze(input, { now: NOW }))).not.toBe('json');
    // Y aun así, la fila que se persistiría no contiene el secreto.
    expect(record(input).preview).toBe('…');
    expect(JSON.stringify(record(input))).not.toContain('leakme123');
  });

  it('un escalar entrecomillado (que el motor llama `text`) tampoco sobrevive', () => {
    const input = '"supersecretvalue"';
    expect(inputKindOf(analyze(input, { now: NOW }))).not.toBe('json');
    expect(record(input).preview).toBe('…');
    expect(JSON.stringify(record(input))).not.toContain('supersecretvalue');
  });

  it('un array malformado también', () => {
    const input = '["leakme123",';
    expect(record(input).preview).toBe('…');
    expect(JSON.stringify(record(input))).not.toContain('leakme123');
  });

  it('un JSON BIEN FORMADO sí llega como `json` y conserva las claves (control positivo)', () => {
    const input = '{"password":"leakme123"}';
    const built = record(input);
    expect(built.inputKind).toBe('json');
    expect(built.preview).toBe('{"password":…}');
    expect(JSON.stringify(built)).not.toContain('leakme123');
  });

  it('el texto normal NO se redacta: la salvedad mira la forma, no traga con todo', () => {
    // Si esta regla se comiera el texto corriente, el historial dejaría de servir.
    expect(record('hola mundo').preview).toBe('hola mundo');
  });
});

// ─── T2.4 · redacción de `url` ──────────────────────────────────────────────────────────
describe('redactInput · url', () => {
  it('conserva esquema y host, y elide path, query y fragment', () => {
    expect(redactInput('https://api.example.com/reset?access_token=hunter2#frag', 'url')).toBe(
      'https://api.example.com/…',
    );
    expect(redactInput('https://api.example.com/reset?access_token=hunter2', 'url')).not.toContain(
      'hunter2',
    );
  });

  it('sin path ni query, el host solo', () => {
    expect(redactInput('https://example.com/', 'url')).toBe('https://example.com');
  });
});

describe('truncatePreview', () => {
  it('deja intacto lo que cabe', () => {
    expect(truncatePreview('corto')).toBe('corto');
  });

  it('trunca a 120 caracteres contando el marcador', () => {
    const long = 'a'.repeat(500);
    const out = truncatePreview(long);
    expect(out).toHaveLength(PREVIEW_MAX_CHARS);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('buildPreview', () => {
  it('redacta ANTES de truncar: un JWT con payload gigante no filtra nada', () => {
    // Payload largísimo: si se truncara primero, los primeros 120 chars incluirían
    // trozo de payload. Redactando primero, el preview cabe entero y no lo contiene.
    const hugePayload = 'P'.repeat(400);
    const preview = buildPreview(`${JWT_HEADER_SEGMENT}.${hugePayload}.sig`, 'jwt');
    expect(preview).toBe(`${JWT_HEADER_SEGMENT}.….…`);
    expect(preview).not.toContain('PPP');
    expect(preview.length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS);
  });

  it('nunca excede 120 caracteres, sea cual sea el kind', () => {
    expect(buildPreview('x'.repeat(1000), 'text').length).toBe(PREVIEW_MAX_CHARS);
    // T2.4: un `base64` de 1000 chars YA NO llega al truncado — la redacción lo deja en su
    // descriptor de longitud, que además no contiene ni un carácter del contenido. El
    // invariante que se protege sigue siendo el mismo (≤120), reforzado con el no-leak.
    const b64 = buildPreview('x'.repeat(1000), 'base64');
    expect(b64.length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS);
    expect(b64).not.toContain('xxx');
    expect(buildPreview(`{"k":"${'x'.repeat(1000)}"}`, 'json').length).toBeLessThanOrEqual(
      PREVIEW_MAX_CHARS,
    );
  });

  it('redacta ANTES de truncar también en json: un valor gigante no sobrevive al corte', () => {
    // Si se truncara primero, los primeros 120 chars serían valor puro. Redactando
    // primero, tras la redacción NO QUEDA ningún valor que el corte pueda reintroducir.
    const preview = buildPreview(`{"secret":"${'S'.repeat(400)}"}`, 'json');
    expect(preview).toBe('{"secret":…}');
    expect(preview).not.toContain('SSS');
  });
});

describe('summarizeChain / buildHistoryRecord', () => {
  it('el resumen solo lleva {kind, transformId} — ningún valor intermedio', () => {
    const chain = analyze(`Bearer ${JWT}`, { now: NOW });
    const summary = summarizeChain(chain);

    expect(summary.length).toBe(chain.steps.length);
    for (const entry of summary) {
      expect(Object.keys(entry).sort()).toEqual(['kind', 'transformId']);
    }
    // Control negativo sobre el resumen serializado: ni el token codificado ni el
    // payload YA DECODIFICADO (que es `steps[1].input`) pueden aparecer.
    const dump = JSON.stringify(summary);
    expect(dump).not.toContain(JWT_PAYLOAD_SEGMENT);
    expect(dump).not.toContain(JWT_SIGNATURE_SEGMENT);
    expect(dump).not.toContain('1752624000');
    expect(dump).not.toContain('sub');
  });

  it('input_kind es el kind del paso 0 y el registro completo no contiene el dato', () => {
    const input = `Bearer ${JWT}`;
    const chain = analyze(input, { now: NOW });
    const record = buildHistoryRecord(input, chain);

    expect(record.inputKind).toBe('jwt');
    expect(record.chain[0]?.transformId).toBe('jwt.decode');

    const dump = JSON.stringify(record);
    expect(dump).not.toContain(JWT);
    expect(dump).not.toContain(JWT_PAYLOAD_SEGMENT);
    expect(dump).not.toContain('1752624000');
  });
});
