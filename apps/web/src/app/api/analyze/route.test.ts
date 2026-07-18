// Tests handler-level de POST /api/analyze (regla 8 del planning: las cláusulas deterministas
// de la Verificación de T1.4 quedan como test permanente del gate). El handler no toca BD —
// es validar → motor puro → serializar + rate limit en memoria + logging —, así que se
// ejercita en proceso llamando a `POST` directo, el mismo patrón que `route.test.ts` de health.
//
// Lo que NO se conserva aquí (y es del verifier, no de este gate):
//  - El grep byte-exacto del input sobre el stdout del server levantado (criterio 14.9): esa
//    es la capa del proceso real. Aquí se prueba, un nivel más adentro, que el handler NUNCA
//    entrega el input al puerto `Logger` — la única vía por la que podría llegar a un log
//    serializado (pino solo redacta/omite; jamás añade lo que no se le pasó).
//  - «/api/analyze es público (D6)»: sin middleware en proceso, un assert aquí sería cobertura
//    falsa. Su guardián real es la allowlist del middleware (T0.4/T3.1). El 200 sin cookie de
//    abajo lo evidencia de pasada, no lo pretende conservar.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChainSchema } from '@app/core/engine';
import type { Logger } from '@app/core/observability';
import { setRootLoggerForTests } from '@/server/logger';
import { makeSlidingWindowRateLimiter, setAnalyzeRateLimiterForTests } from '@/server/rate-limit';
import { POST } from './route';

// JWT del ejemplo trabajado del PRD §6.5 (literal de test, no un secreto real).
const JWT_6_5 = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc';

// Logger que CAPTURA todo lo que se le pasa (independiente de LOG_LEVEL: registra siempre, así
// no lo tapa `LOG_LEVEL=silent`). `child()` comparte el mismo sumidero: withRoute loguea por un
// child con `request_id`, y su salida tiene que caer en los mismos records.
interface LogRecord {
  level: string;
  obj: Record<string, unknown>;
  msg: string | undefined;
}
function makeCapturingLogger(records: LogRecord[]): Logger {
  const at =
    (level: string) =>
    (obj: object, msg?: string): void => {
      records.push({ level, obj: obj as Record<string, unknown>, msg });
    };
  const logger: Logger = {
    trace: at('trace'),
    debug: at('debug'),
    info: at('info'),
    warn: at('warn'),
    error: at('error'),
    child: () => logger,
  };
  return logger;
}

let logs: LogRecord[];

function post(body: unknown, headers?: Record<string, string>): Promise<Response> {
  return POST(
    new Request('http://test.local/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  logs = [];
  setRootLoggerForTests(makeCapturingLogger(logs));
  // Limiter generoso por defecto para no bloquear los tests que no prueban el rate limit; el
  // test de 429 instala uno de umbral bajo. Fresco por test → sin contaminación de estado.
  setAnalyzeRateLimiterForTests(makeSlidingWindowRateLimiter({ limit: 1000, windowMs: 60_000 }));
});

afterEach(() => {
  setRootLoggerForTests(undefined);
  setAnalyzeRateLimiterForTests(undefined);
});

describe('POST /api/analyze', () => {
  it('devuelve la Chain esperada del ejemplo §6.5 sin sesión (D6) y valida el contrato', async () => {
    const res = await post({ input: JWT_6_5 });

    expect(res.status).toBe(200);
    const chain = await res.json();

    // Salida válida contra el contrato (PRD §6.1: se valida entrada y salida).
    expect(ChainSchema.safeParse(chain).success).toBe(true);

    // Conservación del contrato de la API para §6.5: jwt.decode → json.format → no_transform.
    expect(chain.terminal).toBe('no_transform');
    expect(chain.steps).toHaveLength(3);
    expect(chain.steps[0].detections[0].kind).toBe('jwt');
    expect(chain.steps[0].applied).toBe('jwt.decode');
    expect(chain.steps[1].applied).toBe('json.format');
    expect(chain.steps[2].applied).toBeNull();
    expect(chain.steps[2].output).toBeNull();

    // La nota `exp` llega a la UI (criterio 14.1). El ISO es determinista; la frase relativa
    // («caducó hace 4 horas») depende de `now` real, así que NO se asserta byte a byte aquí:
    // ese golden lo protege T1.3.
    expect(chain.steps[0].notes[0]).toContain('2025-07-16T00:00:00Z');
  });

  it('§11: registra métricas (input_kind, bytes, pasos, duración) y NUNCA el input', async () => {
    // Sentinel distintivo: se analiza como `text` (un paso), y su ausencia en los logs es una
    // afirmación con sustancia (principio f: la negativa no debe pasar por trivialidad).
    const sentinel = 'SENTINEL-analyze-input-9f3a2b7c-not-a-secret';
    const res = await post({ input: sentinel });
    expect(res.status).toBe(200);

    // Positivo: la línea de métricas SÍ se emite, con los cuatro campos de §11.
    const completed = logs.find((l) => l.msg === 'analyze_completed');
    expect(completed).toBeDefined();
    expect(completed!.obj.input_kind).toBe('text');
    expect(typeof completed!.obj.input_bytes).toBe('number');
    expect(typeof completed!.obj.steps).toBe('number');
    expect(typeof completed!.obj.duration_ms).toBe('number');

    // Negativo (control §11): el input no aparece en NADA de lo que se pasó al logger.
    expect(JSON.stringify(logs)).not.toContain(sentinel);
  });

  it('un cuerpo > 128 KB devuelve 413 SIN procesar (I7, criterio 14.5)', async () => {
    const sentinel = 'SENTINEL-413-payload-not-a-secret';
    // ~200 KB de cuerpo: por encima del límite de 128 KB.
    const big = sentinel + 'x'.repeat(200 * 1024);
    const res = await post({ input: big });

    expect(res.status).toBe(413);
    expect((await res.json()).code).toBe('payload_too_large');

    // No se procesó: hay línea de rechazo con el tamaño, y NINGUNA de `analyze_completed`.
    expect(logs.some((l) => l.msg === 'analyze_rejected_payload_too_large')).toBe(true);
    expect(logs.some((l) => l.msg === 'analyze_completed')).toBe(false);

    // §11: ni siquiera el input rechazado toca los logs.
    expect(JSON.stringify(logs)).not.toContain(sentinel);
  });

  it('superar el rate limit por IP devuelve 429 (§11)', async () => {
    // El MISMO limiter real de producción, con umbral bajo para no emitir 60 peticiones.
    setAnalyzeRateLimiterForTests(makeSlidingWindowRateLimiter({ limit: 3, windowMs: 60_000 }));

    // Sin x-forwarded-for → misma clave ('unknown') para las cuatro: comparten la cuota.
    expect((await post({ input: 'a' })).status).toBe(200);
    expect((await post({ input: 'b' })).status).toBe(200);
    expect((await post({ input: 'c' })).status).toBe(200);

    const limited = await post({ input: 'd' });
    expect(limited.status).toBe(429);
    expect((await limited.json()).code).toBe('rate_limited');
  });

  it('rechaza body no-JSON con 400 validation_error', async () => {
    const res = await post('esto no es json {{{');
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('validation_error');
  });

  it('rechaza body sin `input` con 400 validation_error', async () => {
    const res = await post({ notInput: 1 });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('validation_error');
  });

  // ── overrides de O4/O5 (T1.6): el desvío viaja como {step, transform|kind}, se valida con
  //    Zod y se pasa al motor. §11 sigue intacto: overrides son ids/kinds/índices, no el input.
  it('aplica un override por id de transformación (O4): fuerza timestamp.to_relative', async () => {
    const res = await post({
      input: '1752624000',
      overrides: [{ step: 0, transform: 'timestamp.to_relative' }],
    });
    expect(res.status).toBe(200);
    const chain = await res.json();
    expect(ChainSchema.safeParse(chain).success).toBe(true);
    expect(chain.steps[0].applied).toBe('timestamp.to_relative');
  });

  it('aplica un override por kind (O5): kind:"text" detiene la cadena (alternativa text)', async () => {
    const res = await post({ input: '1752624000', overrides: [{ step: 0, kind: 'text' }] });
    expect(res.status).toBe(200);
    const chain = await res.json();
    expect(chain.terminal).toBe('text');
    expect(chain.steps).toHaveLength(1);
    expect(chain.steps[0].applied).toBeNull();
  });

  it('rechaza overrides malformados con 400 (ni id ni kind, o step negativo)', async () => {
    const noChoice = await post({ input: 'x', overrides: [{ step: 0 }] });
    expect(noChoice.status).toBe(400);
    expect((await noChoice.json()).code).toBe('validation_error');

    const badStep = await post({ input: 'x', overrides: [{ step: -1, transform: 'x' }] });
    expect(badStep.status).toBe(400);
    expect((await badStep.json()).code).toBe('validation_error');
  });
});
