// Invariantes ESTÁTICOS de la infra de producción (T1.8), fijados como test
// permanente del gate (regla 8 del planning: toda cláusula determinista y gratuita
// de una Verificación queda protegida contra regresión para siempre). Esto NO
// sustituye a la Verificación de T1.8 —levantar la imagen y curl-ear el origen la
// ejecuta el verifier—: aquí solo se blindan los invariantes de SEGURIDAD y de
// aislamiento que un `curl` verde no revelaría si se rompieran (un puerto en
// 0.0.0.0 saltaría UFW; un volumen de prod == el de dev mezclaría datos).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const compose = read('../../../docker-compose.prod.yml');
const dockerfile = read('../Dockerfile');
const nextConfig = read('../next.config.ts');

// Líneas no comentadas (los comentarios YAML/# explican las trampas y las nombran
// literalmente; no deben contar como "el compose hace X").
const activeLines = (src: string): string[] =>
  src
    .split('\n')
    .map((l) => l.replace(/#.*$/, ''))
    .filter((l) => l.trim().length > 0);

describe('docker-compose.prod.yml — invariantes de seguridad y aislamiento', () => {
  const lines = activeLines(compose);

  it('el proyecto compose se fija a `devtools` (no colisiona con ugc-factory)', () => {
    expect(lines.some((l) => /^name:\s*devtools\s*$/.test(l.trim()))).toBe(true);
  });

  it('la web publica su puerto SOLO en loopback (127.0.0.1), nunca en 0.0.0.0', () => {
    const portLines = lines.filter((l) => /:3000['"]?\s*$/.test(l) && l.includes(':'));
    expect(portLines.length).toBeGreaterThan(0);
    for (const l of portLines) {
      expect(l).toMatch(/127\.0\.0\.1:.*:3000/);
    }
    // Nunca un mapeo abierto de un puerto de host (docker en 0.0.0.0 salta UFW).
    expect(lines.some((l) => /^\s*-\s*['"]?0\.0\.0\.0:/.test(l))).toBe(false);
    // Un puerto de host "desnudo" (`- '3110:3000'`) también publica en 0.0.0.0.
    expect(lines.some((l) => /^\s*-\s*['"]?\d+:\d+['"]?\s*$/.test(l))).toBe(false);
  });

  it('postgres NO publica ningún puerto de host (solo la red interna del compose)', () => {
    // Ningún mapeo hacia el 5432 en la sección de servicios.
    expect(lines.some((l) => /:5432\b/.test(l) && /['"]?\d+:5432/.test(l))).toBe(false);
  });

  it('NO hay servicio worker (el PRD §5.2 descarta el módulo de cola)', () => {
    expect(lines.some((l) => /^\s{2}worker:\s*$/.test(l))).toBe(false);
  });

  it('el volumen de prod es DISTINTO del de dev (`devtools-pg-data`)', () => {
    expect(compose).toContain('devtools-pg-prod-data');
    // El nombre de dev, a secas, no debe aparecer como volumen de prod.
    expect(lines.some((l) => /\bdevtools-pg-data\b/.test(l))).toBe(false);
  });

  it('las credenciales obligatorias fallan RUIDOSO si faltan (`:?`)', () => {
    for (const v of ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB']) {
      expect(compose).toMatch(new RegExp(`\\$\\{${v}:\\?`));
    }
  });
});

describe('apps/web/Dockerfile — Next standalone en el monorepo', () => {
  it('fija HOSTNAME=0.0.0.0 en el runtime (si no, contenedor verde y sitio caído)', () => {
    expect(dockerfile).toMatch(/HOSTNAME=0\.0\.0\.0/);
  });

  it('activa la salida standalone en el build (NEXT_OUTPUT=standalone)', () => {
    expect(dockerfile).toMatch(/NEXT_OUTPUT=standalone/);
  });

  it('arranca el server trazado del monorepo en exec-form (PID 1)', () => {
    expect(dockerfile).toMatch(/CMD\s*\[\s*"node"\s*,\s*"apps\/web\/server\.js"\s*\]/);
  });

  it('corre como usuario no-root', () => {
    expect(dockerfile).toMatch(/^USER node$/m);
  });
});

describe('next.config.ts — standalone gateado por env', () => {
  it("gatea `output: 'standalone'` por NEXT_OUTPUT (no rompe `next start` del E2E)", () => {
    expect(nextConfig).toMatch(/NEXT_OUTPUT === 'standalone'/);
    expect(nextConfig).toMatch(/output:\s*'standalone'/);
  });

  it('conserva la transpilación de @app/core', () => {
    expect(nextConfig).toMatch(/transpilePackages:\s*\[\s*'@app\/core'\s*\]/);
  });
});
