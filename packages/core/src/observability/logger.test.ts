// Protege la regla §11 del PRD (el input del usuario nunca se loguea) en su
// capa mecánica: la redaction está CABLEADA en el logger base, no es una lista
// decorativa. La regla completa (no pasarle el input al logger) es de diseño y
// se verifica en real con el criterio 14.9 del PRD.
import { describe, expect, it } from 'vitest';
import { captureLogs } from '@app/test-utils';
import { makeLogger } from './logger';

describe('makeLogger', () => {
  it('redacta el input del usuario en el nivel superior y a un nivel de anidamiento', () => {
    const { logger, lines } = captureLogs();

    logger.info({ input: 'eyJhbGciOiJIUzI1NiJ9.secreto' }, 'analyzed');
    logger.info({ req: { input: 'eyJhbGciOiJIUzI1NiJ9.secreto' } }, 'analyzed');

    expect(lines[0]?.input).toBe('[REDACTED]');
    expect(lines[1]?.req).toEqual({ input: '[REDACTED]' });
    expect(JSON.stringify(lines)).not.toContain('secreto');
  });

  it('redacta credenciales y secretos del payload', () => {
    const { logger, lines } = captureLogs();

    logger.info({ authorization: 'Bearer abc', cfg: { password: 'hunter2' } }, 'req');

    expect(lines[0]?.authorization).toBe('[REDACTED]');
    expect(lines[0]?.cfg).toEqual({ password: '[REDACTED]' });
    expect(JSON.stringify(lines)).not.toContain('hunter2');
  });

  it('deja pasar los campos que §11 SÍ permite loguear de un análisis', () => {
    const { logger, lines } = captureLogs();

    logger.info({ input_kind: 'jwt', input_bytes: 412, steps: 3, duration_ms: 12 }, 'analyzed');

    expect(lines[0]).toMatchObject({
      input_kind: 'jwt',
      input_bytes: 412,
      steps: 3,
      duration_ms: 12,
    });
  });

  it('propaga la correlación a los child loggers y sigue redactando en ellos', () => {
    const { logger, lines } = captureLogs();

    logger.child({ request_id: 'req-42' }).info({ input: 'secreto' }, 'analyzed');

    expect(lines[0]?.request_id).toBe('req-42');
    expect(lines[0]?.input).toBe('[REDACTED]');
  });

  it('respeta el nivel: en `silent` no emite nada (el .env.test de la suite)', () => {
    const lines: unknown[] = [];
    const logger = makeLogger(
      { name: 'web', level: 'silent' },
      {
        write(chunk: string) {
          lines.push(chunk);
        },
      },
    );

    logger.error({ boom: true }, 'no debería salir');

    expect(lines).toHaveLength(0);
  });
});

// LA RAMA QUE NINGÚN TEST INSTANCIABA — y que dejó `pnpm dev` devolviendo 500 en
// TODA ruta con el gate en verde. `pretty: true` se activa con NODE_ENV=development
// (lo que pone `next dev`), y monta un transport `target: 'pino-pretty'`. Como
// pino-pretty no estaba declarado, makeLogger LANZABA al construirse.
//
// Los tests de arriba nunca lo cazaron porque corren con NODE_ENV=test, donde
// `pretty` es false y el transport no se construye jamás: verde y app rota
// conviviendo sin contradecirse. Un camino que ningún test recorre es un camino
// que no existe hasta que un usuario lo pisa.
describe('makeLogger › pretty (la config de desarrollo)', () => {
  it('construye el transport de dev sin lanzar: pino-pretty tiene que RESOLVER', () => {
    // Sin `pino-pretty` instalado esto lanza
    // «unable to determine transport target for "pino-pretty"».
    const logger = makeLogger({ name: 'web', level: 'silent', pretty: true });

    expect(() => {
      logger.info({ request_id: 'req-1' }, 'arranque en dev');
    }).not.toThrow();
  });

  // Comprobado, no supuesto: pino NO lanza al recibir transport + destination.
  // El transport gana y el destination se descarta EN SILENCIO. Se fija aquí
  // porque la trampa es sutil: un test que combine ambos captura 0 líneas y, si
  // afirma sobre el array vacío (`not.toContain('secreto')`), pasa en falso —
  // justo en los tests que protegen §11.
  it('pretty + destination: el transport gana y la captura se queda VACÍA, sin error', () => {
    const lines: string[] = [];

    const logger = makeLogger(
      { name: 'web', level: 'info', pretty: true },
      {
        write(chunk: string) {
          lines.push(chunk);
        },
      },
    );
    logger.info({ a: 1 }, 'esto no llega al destination');

    expect(lines).toHaveLength(0);
  });
});

// Fija un comportamiento CONOCIDO y peligroso, aquí y no solo en apps/web: el
// motor que tocará el input del usuario vive en packages/core (PRD §5.3), así
// que el aviso tiene que morder en el paquete donde se va a escribir ese código.
//
// Estos tests NO celebran el hueco: lo clavan. Si alguien añade un serializer que
// scrubee `err.message`, se pondrán rojos — y eso es exactamente lo que se busca:
// que cambiar la política sea una decisión visible, no un silencio.
describe('makeLogger › hueco conocido: err.message / err.stack NO se redactan', () => {
  it('la redaction NO cubre err.message: opera sobre paths, y un message es texto libre', () => {
    const { logger, lines, text } = captureLogs();

    logger.error({ err: new Error('el token del usuario era SUPERSECRETO') }, 'boom');

    expect((lines[0]?.err as { message: string }).message).toContain('SUPERSECRETO');
    expect(text()).toContain('SUPERSECRETO'); // documentado, no deseado
  });

  it('V8 mete un prefijo del input en el message de un SyntaxError de JSON.parse', () => {
    const { logger, text } = captureLogs();
    let syntaxError: unknown;
    try {
      JSON.parse('eyJhbGciOiJIUzI1NiJ9.SUPERSECRETO');
    } catch (err) {
      syntaxError = err;
    }

    logger.error({ err: syntaxError }, 'boom');

    // Este es el camino real por el que §11 se rompería en T1.2+: no hace falta
    // loguear el input, basta con loguear el ERROR de parsearlo.
    expect(text()).toContain('eyJhbGciOi');
    // Por eso el input se scrubea EN ORIGEN: al logger solo va err.name.
    expect(syntaxError).toBeInstanceOf(SyntaxError);
    expect((syntaxError as Error).name).toBe('SyntaxError'); // literal de V8, sin dato del usuario
  });

  it('err.stack tampoco: arrastra el mismo message', () => {
    const { logger, lines } = captureLogs();

    logger.error({ err: new Error('SUPERSECRETO') }, 'boom');

    expect((lines[0]?.err as { stack: string }).stack).toContain('SUPERSECRETO');
  });
});
