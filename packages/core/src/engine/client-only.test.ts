// CONTROL NEGATIVO PERMANENTE (Verificación de T6.4; heredado por T6.5 y **reforzado en T6.6**).
// El motor de COMPOSICIÓN corre entero en el navegador (PRD D10 / §5.3), así que su código de
// producción no puede tocar nada de Node. Este guard falla si aparece `node:` (cualquier import
// de la stdlib), `Buffer` o `crypto.subtle`/`webcrypto`.
//
// ── QUÉ CAMBIÓ EN T6.6: ahora sigue el GRAFO DE IMPORTS, no una lista ────────────────
// Hasta T6.5 esto grepeaba una lista escrita a mano (`['encode-transforms.ts','hash.ts']`) y su
// propia cabecera admitía el hueco: estaba VERDE con el cono de imports de la composición aún
// NO client-safe, porque `encode-transforms.ts` importa `applyJsonMinify` de `transforms.ts`, y
// ese módulo usaba `Buffer` — igual que los detectores de §6.2, que `compose()` re-ejecuta sobre
// la salida de cada paso (I10). Una lista de ficheros no dice NADA sobre lo que esos ficheros
// importan, así que el guard daba falsa seguridad.
// Ahora el cono se CALCULA: se parte de `compose.ts` (la raíz del motor de composición) y se
// siguen sus imports relativos, recursivamente, hasta el cierre transitivo. Si mañana alguien
// hace que `compose()` alcance un módulo con `Buffer`, este test se pone rojo solo.
//
// ── QUÉ SIGUE SIN COMPROBAR (léelo antes de confiar en su verde) ────────────────────
//   · Solo sigue imports ESTÁTICOS y RELATIVOS (`from './x'`). Un `await import()` dinámico o un
//     `require()` no se resuelven. Hoy no existe ninguno en `packages/core`.
//   · No entra en paquetes EXTERNOS: `zod` (que importa `contracts.ts`) no se escanea. Vigilar
//     dependencias de terceros es otro problema —y otra herramienta— que ninguna regex resuelve.
//   · Detecta por TEXTO, no por semántica: un `globalThis['Buf'+'fer']` se le escapa. Es un
//     guard contra el descuido y la regresión, no contra el sabotaje.
//
// Web Crypto queda vetado por una razón añadida a la del navegador: es ASÍNCRONO y rompería
// `apply(input): TransformResult`, que es síncrono por contrato (§6.1/§6.6).
//
// ALCANCE: el cono de `compose()`, que desde T6.6 incluye `detectors.ts` y `transforms.ts` (la
// dirección de DECODIFICAR). Ya no vale la excusa de T6.4 de que «esos corren en el servidor»:
// I10 los mete en el navegador. Lo que sigue FUERA es el resto de `packages/core` (repos,
// puertos, observabilidad), que nunca cruza al cliente.
//
// El guard debe PROBAR que escaneó algo: si un path resolviera mal, un cono vacío pasaría en
// verde sin mirar nada. Por eso se asserta el contenido MÍNIMO esperado del cono.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ENGINE_DIR = dirname(fileURLToPath(import.meta.url));

// Raíz del cono: el módulo del motor de composición. Todo lo que `compose()` puede ejecutar en
// el navegador es alcanzable desde aquí.
const COMPOSE_ROOT = 'compose.ts';

// Los que el cono DEBE contener. No es la definición del cono (que se calcula), es un candado
// contra el fallo silencioso: si un refactor dejara de importar los detectores, el cono
// encogería y el guard se pondría verde escaneando menos. Estos siete son justamente los
// módulos por los que existe el guard.
const EXPECTED_IN_CONE = [
  'compose.ts',
  'contracts.ts',
  'detectors.ts',
  'transforms.ts', // entra por `json.minify`, reutilizada por el catálogo de §6.6
  'encode-transforms.ts',
  'hash.ts',
  'base64.ts', // el decodificador puro que T6.6 escribió para sacar `Buffer` del cono
];

const FORBIDDEN: [name: string, pattern: RegExp][] = [
  ['un import de la stdlib de Node (`node:`)', /\bnode:[a-z]/],
  ['`Buffer` (no existe en el navegador)', /\bBuffer\b/],
  ['Web Crypto (asíncrono y no garantizado, §5.3)', /crypto\s*\.\s*subtle|webcrypto/],
];

// El guard vigila CÓDIGO, no prosa: los comentarios de estos módulos explican precisamente por
// qué NO se usa `Buffer`, y esa explicación no puede hacer morder al grep. Misma técnica que
// `no-clock.test.ts` (deliberadamente duplicada: cada guard se sostiene solo, sin un helper
// compartido que alguien pueda ablandar para los dos a la vez). El `[^:]` preserva el `//` de
// las URLs, de modo que un `Buffer` real en esa misma línea seguiría siendo visible.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function readModule(file: string): string {
  return readFileSync(resolve(ENGINE_DIR, file), 'utf8');
}

// Imports/re-exports ESTÁTICOS y RELATIVOS del fuente ya sin comentarios. Cubre las tres formas
// que usa el repo: `import x from './y'`, `import type { … } from './y'` y `export … from './y'`.
function relativeImports(src: string): string[] {
  return [...src.matchAll(/\bfrom\s+'(\.[^']+)'/g)].map((m) => m[1] ?? '');
}

// Resuelve un especificador relativo a un fichero del cono. Los módulos de `engine/` son planos
// y sin extensión en el import; se contempla también `x/index.ts` por si algún día se anidan.
function resolveSpecifier(fromFile: string, spec: string): string | null {
  const base = resolve(dirname(resolve(ENGINE_DIR, fromFile)), spec);
  for (const candidate of [`${base}.ts`, resolve(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate.slice(ENGINE_DIR.length + 1);
  }
  return null;
}

// Cierre transitivo desde la raíz. Determinista: se recorre en orden de descubrimiento y se
// devuelve ordenado alfabéticamente.
function importCone(root: string): string[] {
  const seen = new Set<string>();
  const pending = [root];
  const unresolved: string[] = [];
  while (pending.length > 0) {
    const file = pending.shift() ?? '';
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of relativeImports(stripComments(readModule(file)))) {
      const resolved = resolveSpecifier(file, spec);
      if (resolved === null) unresolved.push(`${file} → ${spec}`);
      else if (!seen.has(resolved)) pending.push(resolved);
    }
  }
  // Un import relativo que no resuelve a un fichero sería un agujero MUDO en el cono: el guard
  // escanearía de menos creyendo que escaneó todo. Se hace explotar aquí, no se ignora.
  if (unresolved.length > 0)
    throw new Error(`imports relativos sin resolver: ${unresolved.join(', ')}`);
  return [...seen].sort();
}

const CONE = importCone(COMPOSE_ROOT);

describe('client-only guard — el CONO DE IMPORTS de compose() no toca APIs de Node (D10, §5.3)', () => {
  it('el cono se calculó de verdad y contiene los módulos críticos', () => {
    expect(CONE).toEqual(expect.arrayContaining(EXPECTED_IN_CONE));
    for (const file of CONE) {
      expect(readModule(file).length, `${file} se leyó vacío`).toBeGreaterThan(0);
    }
  });

  // Lo que T6.4 dejó pendiente, dicho como assert: los módulos de la dirección de DECODIFICAR
  // están DENTRO del cono del cliente porque I10 re-ejecuta los detectores tras cada paso.
  it('los detectores de §6.2 y las transformaciones de §6.3 están en el cono (I10)', () => {
    expect(CONE).toContain('detectors.ts');
    expect(CONE).toContain('transforms.ts');
  });

  it.each(CONE.flatMap((file) => FORBIDDEN.map(([name, pattern]) => [file, name, pattern])))(
    '%s no contiene %s',
    (file, _name, pattern) => {
      const src = stripComments(readModule(String(file)));
      expect((pattern as RegExp).test(src), `${String(file)} contiene ${String(pattern)}`).toBe(
        false,
      );
    },
  );

  // El seguimiento de imports solo protege si de verdad SIGUE. Control negativo del propio
  // mecanismo: sobre un fuente de mentira, `relativeImports` extrae las tres formas y descarta
  // los paquetes externos.
  it('relativeImports extrae los imports relativos y descarta los externos', () => {
    const src = [
      "import { z } from 'zod';",
      "import { detect } from './detectors';",
      "import type { DataKind } from './contracts';",
      "export { compose } from './compose';",
      "import x from '../ports';",
    ].join('\n');
    expect(relativeImports(src)).toEqual(['./detectors', './contracts', './compose', '../ports']);
  });

  // Y que el cono calculado es transitivo de verdad: `hash.ts` NO lo importa `compose.ts`
  // directamente (llega vía `encode-transforms.ts`), así que su presencia prueba la recursión.
  it('el cono es transitivo: alcanza módulos que la raíz no importa directamente', () => {
    const direct = relativeImports(stripComments(readModule(COMPOSE_ROOT))).map((s) =>
      s.replace('./', '').concat('.ts'),
    );
    expect(direct).not.toContain('hash.ts');
    expect(CONE).toContain('hash.ts');
  });

  // El grep muerde por una RUTA, no por un patrón suelto: el texto real pasa antes por
  // `stripComments`, así que el bite-test tiene que pasar por ahí también. Cuando evaluaba los
  // patrones contra el texto crudo, debilitar `stripComments` (p. ej. hacerle borrar más de la
  // cuenta) dejaba ciegos a los tres greps y este test seguía VERDE. Importa especialmente con
  // `hash.ts` y `base64.ts`, los ficheros con más prosa que menciona `node:crypto`,
  // `crypto.subtle` y `Buffer` —explicando justamente por qué NO se usan.
  it('los patrones detectan el código prohibido tras pasar por stripComments (el grep muerde)', () => {
    const offending = [
      "import { Buffer } from 'node:buffer';",
      'const b = Buffer.from(s, "base64");',
      'await crypto.subtle.digest("SHA-256", data);',
    ].join('\n');
    const scanned = stripComments(offending); // LA RUTA REAL, no el texto crudo
    for (const [, pattern] of FORBIDDEN) {
      expect(pattern.test(scanned), `${String(pattern)} no detecta el código prohibido`).toBe(true);
    }
  });

  // La otra mitad de `stripComments`: debe borrar la PROSA (si no, los comentarios de `hash.ts`
  // harían fallar el guard) pero NO puede tragarse código. Las dos direcciones a la vez, que es
  // lo único que fija su contrato.
  it('stripComments borra la prosa pero conserva el código de la misma línea', () => {
    expect(
      stripComments('// esto explica por qué no usamos node:crypto\nconst a = 1;'),
    ).not.toMatch(/\bnode:[a-z]/);
    expect(stripComments('/* Buffer y crypto.subtle quedan vetados */\nconst a = 1;')).not.toMatch(
      /\bBuffer\b/,
    );
    // Código con una URL en la misma línea: el `//` de `https://` no es un comentario.
    expect(stripComments('const b = Buffer.from(u); // ver https://ejemplo.com/x')).toContain(
      'Buffer.from',
    );
    // Y lo esencial: el código NO se borra.
    expect(stripComments('const b = Buffer.from(s);')).toContain('Buffer');
  });
});
