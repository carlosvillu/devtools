// Precedencia y gating de `clientIp()` — el trust boundary de T3.1 (PRD §10, §11).
//
// ALCANCE de este fichero: SOLO la política en proceso (qué header gana, qué pasa sin
// headers, qué pasa sin `TRUST_PROXY`). NO prueba —ni puede— que el borde borre un
// `CF-Connecting-IP` que mande el cliente: eso vive en el site file de Caddy
// (`deploy/devtools.carlosvillu.dev.caddy`) y se comprueba contra el borde real desde
// fuera del VPS. Un test en proceso que dijera cubrirlo estaría mintiendo.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LOOPBACK_KEY,
  assertTrustProxyConfigured,
  clientIp,
  resetTrustProxyForTests,
} from './client-ip';

const reqWith = (headers: Record<string, string>): Request =>
  new Request('http://localhost/api/analyze', { method: 'POST', headers });

// `vi.stubEnv` + `unstubAllEnvs` y NO asignación directa a `process.env`: este proyecto no
// activa `unstubEnvs` en vitest.config.ts, así que una asignación directa no se revierte y
// se arrastraría al resto del fichero (`.env.test` fija TRUST_PROXY=1 para todos).
// El memoizado de `clientIp()` se descarta en el mismo sitio, o ganaría al stub.
beforeEach(() => {
  resetTrustProxyForTests();
});
afterEach(() => {
  vi.unstubAllEnvs();
  resetTrustProxyForTests();
});

describe('clientIp() con TRUST_PROXY=1', () => {
  // Explícito aunque `.env.test` ya lo fije: el test no debe depender de un fichero lejano.
  beforeEach(() => {
    vi.stubEnv('TRUST_PROXY', '1');
    resetTrustProxyForTests();
  });

  it('CF-Connecting-IP gana sobre X-Forwarded-For: la IP del visitante, no la del borde', () => {
    const key = clientIp(
      reqWith({ 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': '172.64.0.1' }),
    );
    expect(key).toBe('203.0.113.9');
  });

  it('sin CF-Connecting-IP cae a la ÚLTIMA entrada de X-Forwarded-For (la del proxy más cercano)', () => {
    // Caddy SOBRESCRIBE el header con `{client_ip}`, así que en producción hay una sola
    // entrada. La última es la correcta si algún día llegara una cadena: las de la
    // izquierda las puede haber puesto el cliente.
    expect(clientIp(reqWith({ 'x-forwarded-for': '198.51.100.1, 172.64.0.1' }))).toBe('172.64.0.1');
  });

  it('sin ningún header de proxy devuelve LOOPBACK_KEY, no una cadena vacía', () => {
    expect(clientIp(reqWith({}))).toBe(LOOPBACK_KEY);
    expect(LOOPBACK_KEY).not.toBe('');
  });

  it('un CF-Connecting-IP vacío no produce una clave vacía: cae al siguiente eslabón', () => {
    expect(clientIp(reqWith({ 'cf-connecting-ip': '   ', 'x-forwarded-for': '172.64.0.1' }))).toBe(
      '172.64.0.1',
    );
  });
});

describe('clientIp() sin TRUST_PROXY', () => {
  it('ignora los headers por completo: sin proxy declarado delante, son del cliente', () => {
    vi.stubEnv('TRUST_PROXY', undefined);
    resetTrustProxyForTests();
    const key = clientIp(
      reqWith({ 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': '203.0.113.10' }),
    );
    expect(key).toBe(LOOPBACK_KEY);
  });

  it('TRUST_PROXY con cualquier valor que no sea "1" tampoco habilita los headers', () => {
    vi.stubEnv('TRUST_PROXY', 'true');
    resetTrustProxyForTests();
    expect(clientIp(reqWith({ 'cf-connecting-ip': '203.0.113.9' }))).toBe(LOOPBACK_KEY);
  });
});

// `TRUST_PROXY` falla ABIERTA hacia el defecto que T3.1 cierra: si en producción faltara,
// toda petición de internet caería en LOOPBACK_KEY y 5 fallos de cualquiera bloquearían el
// login de todos. Por eso el arranque la exige (instrumentation.ts) en vez de confiar en
// que el compose no cambie nunca.
describe('assertTrustProxyConfigured()', () => {
  it('en producción SIN TRUST_PROXY=1 lanza (el boot no debe seguir en silencio)', () => {
    expect(() => {
      assertTrustProxyConfigured({ NODE_ENV: 'production' });
    }).toThrow(/TRUST_PROXY/);
    expect(() => {
      assertTrustProxyConfigured({ NODE_ENV: 'production', TRUST_PROXY: '0' });
    }).toThrow(/TRUST_PROXY/);
  });

  it('en producción CON TRUST_PROXY=1 no lanza', () => {
    expect(() => {
      assertTrustProxyConfigured({ NODE_ENV: 'production', TRUST_PROXY: '1' });
    }).not.toThrow();
  });

  it('fuera de producción no exige nada (dev y tests arrancan sin proxy delante)', () => {
    expect(() => {
      assertTrustProxyConfigured({ NODE_ENV: 'development' });
    }).not.toThrow();
  });
});
