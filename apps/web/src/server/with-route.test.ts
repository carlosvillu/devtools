// Protege lo que la Entrega de T0.1 promete del logging: `request_id` de
// correlación desde el día 1, presente en el envelope de error y reutilizando el
// header entrante cuando existe.
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { captureLogs } from '@app/test-utils';
import { AppError, ErrorEnvelopeSchema } from '@app/core/contracts';
import { setRootLoggerForTests } from './logger';
import { getRequestId } from './request-context';
import { withRoute } from './with-route';

const url = 'http://localhost:3000/api/x';

/** Redirige el logger base a memoria: así se puede afirmar qué se loguea DE
 *  VERDAD (y, sobre todo, qué no — regla §11). */
function captureRootLogs() {
  const captured = captureLogs();
  setRootLoggerForTests(captured.logger);
  return captured;
}

/** Ruta que anota el request_id que ve cada request y responde 200. */
function makeSpyRoute() {
  const seen: (string | undefined)[] = [];
  const GET = withRoute(
    () => {
      seen.push(getRequestId());
      return Promise.resolve(Response.json({ ok: true }));
    },
    { route: '/api/x' },
  );
  return { GET, seen };
}

afterEach(() => {
  setRootLoggerForTests(undefined);
});

describe('withRoute', () => {
  it('expone un request_id dentro del handler', async () => {
    const { GET, seen } = makeSpyRoute();

    await GET(new Request(url));

    expect(seen[0]).toBeTruthy();
  });

  it.each([
    ['un UUID v4', '3f2504e0-4f89-11d3-9a0c-0305e82c3301'],
    ['un id de traza con charset seguro', 'req-desde_el.proxy-42'],
    ['64 chars (el límite exacto)', 'a'.repeat(64)],
  ])(
    'acepta el x-request-id entrante cuando es %s (correlación con el proxy)',
    async (_c, incoming) => {
      const { GET, seen } = makeSpyRoute();

      await GET(new Request(url, { headers: { 'x-request-id': incoming } }));

      expect(seen[0]).toBe(incoming);
    },
  );

  // El header es entrada NO confiable: /api/health es pública (D6) y ningún proxy
  // lo sanea hoy. Un id basura NO puede llegar a los logs ni al envelope.
  it.each([
    ['65 chars (un carácter por encima del límite)', 'a'.repeat(65)],
    ['un header gigante (1 MB en cada línea de log)', 'x'.repeat(1_000_000)],
    ['charset fuera de contrato', 'req{"level":50,"msg":"falso"}'],
    ['espacios', 'req 42'],
    ['vacío', ''],
    // Un salto de línea (inyección de una línea de log falsa) NO se prueba aquí:
    // `new Headers()` lo rechaza al construirlo, así que no es alcanzable — el
    // runtime ya lo impide antes de que este código lo vea.
  ])('ignora el x-request-id entrante y genera uno nuevo si es %s', async (_caso, incoming) => {
    const { GET, seen } = makeSpyRoute();

    await GET(new Request(url, { headers: { 'x-request-id': incoming } }));

    expect(seen[0]).not.toBe(incoming);
    expect(seen[0]).toMatch(/^[0-9a-f-]{36}$/); // un UUID generado por nosotros
  });

  it('un cliente que repite el mismo id basura no colapsa la correlación', async () => {
    const { GET, seen } = makeSpyRoute();
    const basura = 'id con espacios';

    await GET(new Request(url, { headers: { 'x-request-id': basura } }));
    await GET(new Request(url, { headers: { 'x-request-id': basura } }));

    expect(seen[0]).not.toBe(seen[1]);
  });

  it('genera un request_id distinto por request cuando no viene header', async () => {
    const { GET, seen } = makeSpyRoute();

    await GET(new Request(url));
    await GET(new Request(url));

    expect(seen[0]).not.toBe(seen[1]);
  });

  it('convierte un AppError en su envelope, con status y request_id', async () => {
    const GET = withRoute(() => Promise.reject(new AppError('not_found', 'no existe')), {
      route: '/api/x',
    });

    const res = await GET(new Request(url, { headers: { 'x-request-id': 'req-7' } }));
    const body = ErrorEnvelopeSchema.parse(await res.json());

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ code: 'not_found', message: 'no existe', request_id: 'req-7' });
  });

  it('un error inesperado sale como 500 opaco: el detalle interno nunca viaja al cliente', async () => {
    captureRootLogs();
    const GET = withRoute(
      () => Promise.reject(new Error('SELECT * FROM user; connection string secreta')),
      { route: '/api/x' },
    );

    const res = await GET(new Request(url));
    const body = ErrorEnvelopeSchema.parse(await res.json());

    expect(res.status).toBe(500);
    expect(body.code).toBe('internal');
    expect(JSON.stringify(body)).not.toContain('secreta');
  });

  // La opacidad del 5xx es propiedad del STATUS, no del orden de las ramas.
  // Antes, un AppError('internal', …) esquivaba el fallback opaco por la rama
  // `instanceof AppError` y serializaba message y details VERBATIM al cliente.
  // En F1 eso sería `AppError('internal', `no se pudo parsear ${input}`)`
  // mandando el input del usuario al cliente, por encima de REDACT_PATHS.
  it('§11/architecture §5: un AppError 5xx sale opaco y su detalle va SOLO al log', async () => {
    const logs = captureRootLogs();
    const GET = withRoute(
      () =>
        Promise.reject(
          new AppError('internal', 'SELECT * FROM user; connstring secreta', { sql: 'secreto' }),
        ),
      { route: '/api/x' },
    );

    const res = await GET(new Request(url));
    const body = ErrorEnvelopeSchema.parse(await res.json());

    expect(res.status).toBe(500);
    expect(body.code).toBe('internal');
    expect(body.message).toBe('error interno');
    expect(body.details).toBeUndefined();
    // Ni el message ni los details del AppError viajan al cliente…
    expect(JSON.stringify(body)).not.toContain('secreta');
    expect(JSON.stringify(body)).not.toContain('secreto');
    // …pero SÍ quedan en el log: «el detalle va SOLO al log» (architecture.md §5).
    expect(logs.text()).toContain('secreta');
  });

  // Rama viva que ningún test instanciaba: un ZodError CRUDO llegando al wrapper
  // solo puede ser drift de SALIDA (o de datos internos) — bug nuestro, nunca del
  // cliente. Tiene que salir 500 opaco, jamás disfrazarse de validation_error 400.
  it('un ZodError crudo es drift nuestro: 500 opaco, no un 400 de validación', async () => {
    const logs = captureRootLogs();
    const OutputSchema = z.object({ ok: z.literal(true) });
    const GET = withRoute(
      // simula serializar una salida que ya no cumple su contrato
      () => Promise.resolve(Response.json(OutputSchema.parse({ ok: 'roto' }))),
      { route: '/api/x' },
    );

    const res = await GET(new Request(url));
    const body = ErrorEnvelopeSchema.parse(await res.json());

    expect(res.status).toBe(500);
    expect(body.code).toBe('internal');
    expect(body.message).toBe('error interno');
    expect(logs.text()).toContain('zod_contract_drift');
  });

  it('un AppError 4xx sí conserva message y details: son contrato con el cliente', async () => {
    const GET = withRoute(
      () => Promise.reject(new AppError('validation_error', 'payload inválido', { campo: 'n' })),
      { route: '/api/x' },
    );

    const res = await GET(new Request(url));
    const body = ErrorEnvelopeSchema.parse(await res.json());

    expect(res.status).toBe(400);
    expect(body.message).toBe('payload inválido');
    expect(body.details).toEqual({ campo: 'n' });
  });

  it('un body que no valida es un 400 validation_error, no un 500', async () => {
    const POST = withRoute(({ body }) => Promise.resolve(Response.json(body)), {
      route: '/api/x',
      body: z.object({ n: z.number() }),
    });

    const res = await POST(
      new Request(url, {
        method: 'POST',
        body: JSON.stringify({ n: 'no soy un número' }),
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(res.status).toBe(400);
    expect(ErrorEnvelopeSchema.parse(await res.json()).code).toBe('validation_error');
  });

  it('un body que no es JSON es un 400, no un 500 con stack trace', async () => {
    const POST = withRoute(({ body }) => Promise.resolve(Response.json(body)), {
      route: '/api/x',
      body: z.object({ n: z.number() }),
    });

    const res = await POST(new Request(url, { method: 'POST', body: 'no soy json{' }));

    expect(res.status).toBe(400);
  });

  it('§11: el envelope de un input inválido NO devuelve el valor recibido', async () => {
    const POST = withRoute(({ body }) => Promise.resolve(Response.json(body)), {
      route: '/api/x',
      body: z.object({ input: z.number() }),
    });

    const res = await POST(
      new Request(url, {
        method: 'POST',
        body: JSON.stringify({ input: 'eyJhbGciOiJIUzI1NiJ9.token-del-usuario' }),
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).not.toContain('token-del-usuario');
  });
});

// `req.json()` no falla solo por JSON malformado. Tratarlo todo igual reporta un
// corte de red como culpa del cliente y deja el diagnóstico a ciegas.
describe('withRoute › lectura del body', () => {
  const schema = z.object({ n: z.number() });
  const makePost = () =>
    withRoute(({ body }) => Promise.resolve(Response.json(body)), {
      route: '/api/x',
      body: schema,
    });

  it('JSON malformado: 400 validation_error + traza en debug con el TIPO del error', async () => {
    const { lines } = captureRootLogs();

    const res = await makePost()(new Request(url, { method: 'POST', body: 'no soy json{' }));

    expect(res.status).toBe(400);
    expect(ErrorEnvelopeSchema.parse(await res.json()).code).toBe('validation_error');
    expect(lines).toContainEqual(
      expect.objectContaining({ msg: 'request_body_not_json', err_name: 'SyntaxError' }),
    );
  });

  it('body ilegible (stream roto): NO es culpa del cliente → 500 + traza en error', async () => {
    const { lines } = captureRootLogs();
    const roto = new ReadableStream({
      start(c) {
        c.error(new Error('conexión cortada'));
      },
    });

    const res = await makePost()(
      // @ts-expect-error -- `duplex` es obligatorio con un body de stream y falta en los tipos de Request
      new Request(url, { method: 'POST', body: roto, duplex: 'half' }),
    );

    expect(res.status).toBe(500);
    expect(ErrorEnvelopeSchema.parse(await res.json()).code).toBe('internal');
    expect(lines).toContainEqual(expect.objectContaining({ msg: 'request_body_unreadable' }));
  });

  // EL test de este bloque: el mensaje del SyntaxError de V8 lleva un prefijo de
  // 10 caracteres del input ("Unexpected token 'e', \"eyJhbGciOi\"..."), y la
  // redaction de pino NO cubre err.message. Si alguien "mejora" readJson
  // logueando el error entero, §11 y el criterio 14.9 del PRD se rompen aquí.
  it('§11: parsear input del usuario NO filtra ni un byte suyo a los logs', async () => {
    const captured = captureRootLogs();
    const inputDelUsuario = 'eyJhbGciOiJIUzI1NiJ9.SUPERSECRETO-DEL-USUARIO';

    const res = await makePost()(new Request(url, { method: 'POST', body: inputDelUsuario }));
    const logs = captured.text();

    expect(res.status).toBe(400);
    expect(captured.lines.length).toBeGreaterThan(0); // si no se loguea nada, el test no prueba nada
    expect(logs).not.toContain('SUPERSECRETO');
    expect(logs).not.toContain('eyJhbGciOi'); // el prefijo que V8 mete en el message
    expect(logs).not.toContain('is not valid JSON'); // el message crudo, ni entero ni en trozos
    // Y tampoco viaja al cliente en el envelope.
    expect(JSON.stringify(await res.json())).not.toContain('eyJhbGciOi');
  });
});

// El setup de withRoute (resolver el request_id, construir el child logger) corría
// FUERA de toda costura de errores. pino lanza al CONSTRUIRSE si LOG_LEVEL es
// inválido, así que un typo en el .env del VPS dejaba toda ruta devolviendo un
// 500 crudo de Next: sin envelope, sin log y sin request_id — justo el fallo que
// esta maquinaria existe para diagnosticar.
describe('withRoute › el setup también está cubierto', () => {
  const LOG_LEVEL = process.env.LOG_LEVEL;

  afterEach(() => {
    process.env.LOG_LEVEL = LOG_LEVEL;
    setRootLoggerForTests(undefined);
  });

  it('LOG_LEVEL inválido: responde el envelope opaco, no revienta la ruta', async () => {
    process.env.LOG_LEVEL = 'verboso-que-no-existe';
    setRootLoggerForTests(undefined); // descarta el memoizado: pino se reconstruye con el nivel roto
    const GET = withRoute(() => Promise.resolve(Response.json({ ok: true })), {
      route: '/api/x',
    });

    // Antes del fix esto RECHAZABA (pino lanzando), en vez de responder.
    const res = await GET(new Request(url));

    expect(res.status).toBe(500);
    expect(ErrorEnvelopeSchema.parse(await res.json()).code).toBe('internal');
  });
});
