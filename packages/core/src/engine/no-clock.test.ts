// CONTROL NEGATIVO PERMANENTE (Verificación de T1.2, I4): ninguna función del motor
// referencia el reloj del sistema. Grep sobre el código de producción de `engine/` que falla
// si aparece `Date.now(` o `new Date()` sin argumento. El tiempo SIEMPRE se inyecta (I4): un
// `new Date(ms)` con argumento sí es legítimo (convierte un epoch inyectado), un `new Date()`
// vacío NO. Vive dentro de `pnpm test` ⇒ dentro de `pnpm gate`.
//
// El guard debe PROBAR que escaneó algo: si `readdirSync` resolviera mal el path y devolviera
// una lista vacía, el grep pasaría en vacío (verde guardando nada). Por eso se asserta que la
// lista de ficheros escaneados no está vacía e incluye los módulos que de verdad podrían leer
// el reloj (`transforms.ts`, `detectors.ts`).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ENGINE_DIR = fileURLToPath(new URL('.', import.meta.url));

// Ficheros de PRODUCCIÓN de engine/ (los *.test.ts se excluyen: contienen estos patrones a
// propósito, y no son código que corra en producción).
const sourceFiles = readdirSync(ENGINE_DIR)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .sort();

const DATE_NOW = /Date\.now\s*\(/;
const NEW_DATE_NO_ARG = /new\s+Date\s*\(\s*\)/;

// El guard vigila CÓDIGO, no prosa: un `Date.now()` citado en un comentario que documenta el
// propio invariante no es una lectura del reloj. Se eliminan comentarios de bloque y de línea
// antes de grepear. El `[^:]` preserva el `//` de literales como 'https://…' (no lo trata como
// comentario), de modo que un `new Date()` real en esa misma línea seguiría siendo visible.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('no-clock guard — el motor nunca lee el reloj del sistema (I4)', () => {
  it('escaneó los módulos reales de engine/ (el guard no corre en vacío)', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
    expect(sourceFiles).toContain('transforms.ts');
    expect(sourceFiles).toContain('detectors.ts');
  });

  it.each(sourceFiles)('%s no referencia Date.now() ni new Date() sin argumento', (file) => {
    const src = stripComments(readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8'));
    expect(DATE_NOW.test(src), `${file} contiene Date.now(`).toBe(false);
    expect(NEW_DATE_NO_ARG.test(src), `${file} contiene new Date() sin argumento`).toBe(false);
  });
});
