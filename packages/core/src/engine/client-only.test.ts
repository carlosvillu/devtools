// CONTROL NEGATIVO PERMANENTE (Verificación de T6.4; lo hereda T6.5). El motor de
// COMPOSICIÓN corre entero en el navegador (PRD D10 / §5.3), así que su código de producción
// no puede tocar nada de Node. Este guard grepea el TEXTO de los ficheros listados en
// `COMPOSE_MODULES` y falla si aparece `node:` (cualquier import de la stdlib), `Buffer` o
// `crypto.subtle`/`webcrypto`.
//
// ── QUÉ NO COMPRUEBA (léelo antes de confiar en su verde) ───────────────────────────
// Comprueba FICHEROS, **no el grafo de imports**. Hoy mismo eso es un hueco real y conocido:
// `encode-transforms.ts` importa `applyJsonMinify` de `transforms.ts`, y `transforms.ts` usa
// `Buffer` (en `applyBase64Decode`); los detectores de §6.2, que `compose()` re-ejecuta sobre
// la salida de cada paso (I10), lo usan también. Es decir: **este guard está verde con el cono
// de imports de la composición todavía NO client-safe**, y seguiría verde si mañana alguien
// añadiera `Buffer` a cualquier módulo importado. No es una caída hoy —esos `Buffer` viven
// dentro del cuerpo de funciones que la composición no llama, no en el top level, así que
// importar `encode-transforms` en el navegador no revienta—, pero sí es falsa seguridad.
// **Cerrarlo es trabajo de T6.6** (anotado en `planning.md` como deuda bloqueante de esa
// tarea): allí el guard debe cubrir el CONO REAL de imports de `compose()`, no una lista de
// ficheros. Hasta entonces, este test dice exactamente lo que verifica y nada más.
//
// ALCANCE ACOTADO A PROPÓSITO: solo los módulos de la dirección inversa. El resto de
// `packages/core` (los detectores y las transformaciones de §6.3) SÍ usa `Buffer`
// legítimamente — corre en el servidor, detrás de `POST /api/analyze`. Un grep sobre todo
// `engine/` sería rojo desde el minuto uno y habría que rebajarlo, que es exactamente el
// fallo que este guard existe para impedir.
//
// Web Crypto queda vetado por una razón añadida a la del navegador: es ASÍNCRONO y rompería
// `apply(input): TransformResult`, que es síncrono por contrato (§6.1/§6.6).
//
// El guard debe PROBAR que escaneó algo: si el path resolviera mal, un `readFileSync` vacío
// pasaría en verde guardando nada. Por eso se asserta que cada fichero declarado existe y
// tiene contenido.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Ficheros de PRODUCCIÓN de la dirección inversa que se escanean. T6.5 (hashes + jwt.sign)
// AÑADE aquí los suyos. Ojo con lo que esta lista significa: es "qué ficheros se grepean",
// NO "qué es client-safe" — lo que importan esos ficheros no se sigue (ver cabecera).
const COMPOSE_MODULES = ['encode-transforms.ts'];

const FORBIDDEN: [name: string, pattern: RegExp][] = [
  ['un import de la stdlib de Node (`node:`)', /\bnode:[a-z]/],
  ['`Buffer` (no existe en el navegador)', /\bBuffer\b/],
  ['Web Crypto (asíncrono y no garantizado, §5.3)', /crypto\s*\.\s*subtle|webcrypto/],
];

// El guard vigila CÓDIGO, no prosa: los comentarios de este módulo explican precisamente por
// qué NO se usa `Buffer`, y esa explicación no puede hacer morder al grep. Misma técnica que
// `no-clock.test.ts` (deliberadamente duplicada: cada guard se sostiene solo, sin un helper
// compartido que alguien pueda ablandar para los dos a la vez). El `[^:]` preserva el `//` de
// las URLs, de modo que un `Buffer` real en esa misma línea seguiría siendo visible.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function readModule(file: string): string {
  return readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8');
}

describe('client-only guard — estos FICHEROS no contienen APIs de Node (D10, §5.3; sin seguir imports, ver T6.6)', () => {
  it('la lista de módulos vigilados no está vacía y los ficheros existen', () => {
    expect(COMPOSE_MODULES.length).toBeGreaterThan(0);
    expect(COMPOSE_MODULES).toContain('encode-transforms.ts');
    for (const file of COMPOSE_MODULES) {
      expect(readModule(file).length, `${file} se leyó vacío`).toBeGreaterThan(0);
    }
  });

  it.each(
    COMPOSE_MODULES.flatMap((file) => FORBIDDEN.map(([name, pattern]) => [file, name, pattern])),
  )('%s no contiene %s', (file, _name, pattern) => {
    const src = stripComments(readModule(String(file)));
    expect((pattern as RegExp).test(src), `${String(file)} contiene ${String(pattern)}`).toBe(
      false,
    );
  });

  // El grep solo protege si de verdad muerde: se comprueba que los patrones detectan el
  // código prohibido cuando existe (si alguien los "arreglara" a algo que no matchea nada,
  // este test se pone rojo).
  it('los patrones detectan el código prohibido (el grep muerde)', () => {
    const offending = [
      "import { Buffer } from 'node:buffer';",
      'const b = Buffer.from(s, "base64");',
      'await crypto.subtle.digest("SHA-256", data);',
    ].join('\n');
    for (const [, pattern] of FORBIDDEN) {
      expect(pattern.test(offending), `${String(pattern)} no detecta el código prohibido`).toBe(
        true,
      );
    }
  });
});
