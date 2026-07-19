// Unit de la redacción de historial (D7 / criterio 14.8). Es lógica pura: aquí se prueba
// la LEY (redactar y truncar), y el control negativo literal «el token no aparece» se
// prueba además contra la fila REAL persistida en la integración de apps/web.
import { describe, expect, it } from 'vitest';
import { analyze } from '../engine';
import {
  PREVIEW_MAX_CHARS,
  buildHistoryRecord,
  buildPreview,
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

  it('no redacta por kind cuando no es jwt (solo recorta espacios)', () => {
    expect(redactInput('  {"a":1}  ', 'json')).toBe('{"a":1}');
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
    expect(buildPreview('x'.repeat(1000), 'base64').length).toBe(PREVIEW_MAX_CHARS);
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
