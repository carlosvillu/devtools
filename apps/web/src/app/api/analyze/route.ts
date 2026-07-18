// POST /api/analyze (PRD §8 módulo `analyze`): valida la entrada, aplica el límite de
// 128 KB (I7 → 413 sin procesar), invoca el motor puro de `@app/core/engine` con `now`
// explícito (I4: el reloj lo pone el borde, jamás el motor) y devuelve la `Chain` validada
// contra su esquema. Público, sin auth (D6). §11: el input NUNCA se loguea — solo métricas.
import { analyze, AnalyzeRequestSchema, ChainSchema } from '@app/core/engine';
import { AppError } from '@app/core/contracts';
import { withRoute } from '@/server';
import { parseOrThrow } from '@/server/with-route';
import { getRequestLogger } from '@/server/request-context';
import { getAnalyzeRateLimiter } from '@/server/rate-limit';

// El motor usa `Buffer` (base64/JWT): Node runtime obligatorio, nunca Edge (flag anotado en
// el journal de T1.1). `force-dynamic`: la respuesta depende del cuerpo, no se cachea.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// I7: 128 KB. El corte se mide por BYTES del cuerpo recibido (no por longitud del string ni
// por el header content-length, que un `Request` construido a mano ni siquiera lleva —
// testing/SKILL.md principio b): así el `curl` del verifier y el test handler-level recorren
// EXACTAMENTE la misma rama. La defensa en profundidad contra cuerpos gigantes (buffering) es
// de la plataforma (límites de cuerpo de Cloudflare/Caddy), no de este handler en v1.
const MAX_BODY_BYTES = 128 * 1024;

export const POST = withRoute(
  async ({ req }) => {
    const log = getRequestLogger();

    // Rate limit por IP (§11) ANTES de leer el cuerpo: un abusador no debe poder forzarnos a
    // bufferizar su body. La identificación de IP es PROVISIONAL.
    if (!getAnalyzeRateLimiter().check(clientIp(req))) {
      throw new AppError('rate_limited', 'demasiadas peticiones, inténtalo en un momento');
    }

    // I7: leer el cuerpo y medir sus bytes ANTES de parsear nada. Por encima del límite se
    // rechaza SIN invocar `analyze()` (criterio 14.5). `req.text()` puede lanzar si el cliente
    // aborta: su `err.message` no contiene el body, pero por §11 no lo propagamos con detalle.
    let rawBody: string;
    try {
      rawBody = await req.text();
    } catch {
      throw new AppError('internal', 'no se pudo leer el body de la petición');
    }

    const bodyBytes = Buffer.byteLength(rawBody, 'utf8');
    if (bodyBytes > MAX_BODY_BYTES) {
      // §11: se registra el TAMAÑO rechazado, nunca el contenido. La ausencia de un
      // `analyze_completed` posterior es la prueba de que no se procesó (criterio 14.5).
      log.warn(
        { body_bytes: bodyBytes, limit_bytes: MAX_BODY_BYTES },
        'analyze_rejected_payload_too_large',
      );
      throw new AppError('payload_too_large', 'la entrada supera el límite de 128 KB');
    }

    // Parseo del cuerpo: JSON malformado es culpa del cliente → 400, jamás un 500 con stack.
    // El `err.message` de un SyntaxError incluye un prefijo del input (§11): se descarta.
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      throw new AppError('validation_error', 'el body no es JSON');
    }
    const { input, overrides } = parseOrThrow(AnalyzeRequestSchema, json);

    // I4: el `now` lo pone el borde (aquí SÍ es correcto leer el reloj real: es el borde, no el
    // motor puro). El motor es determinista dado (input, now, overrides) — I5. `overrides` son
    // los desvíos de O4/O5 (índices + kinds/ids, validados por Zod): §11 sigue intacto, no
    // llevan el input y no se loguean.
    const startMs = performance.now();
    const chain = analyze(input, { now: new Date(), overrides });
    const durationMs = performance.now() - startMs;

    // Validación de SALIDA contra el contrato (PRD §6.1: «valida entrada y salida»). Un fallo
    // aquí es drift servidor↔contrato (bug nuestro) → 500 opaco. NUNCA se loguea el `chain`: su
    // `steps[0].input` ES el input del usuario (§11) — solo un marcador estático.
    const parsedOut = ChainSchema.safeParse(chain);
    if (!parsedOut.success) {
      log.error({ marker: 'analyze_output_contract_drift' }, 'analyze_output_drift');
      throw new AppError('internal', 'la cadena generada no cumple el contrato');
    }

    // §11: SOLO métricas, nunca el input (ni fragmentos, ni el `chain` que lo contiene).
    log.info(
      {
        input_kind: chain.steps[0]?.detections[0]?.kind ?? null,
        input_bytes: Buffer.byteLength(input, 'utf8'),
        steps: chain.steps.length,
        duration_ms: Math.round(durationMs),
      },
      'analyze_completed',
    );

    return Response.json(parsedOut.data);
  },
  { route: '/api/analyze' },
);

// Identificación de IP PROVISIONAL (nota T3.1). El trust boundary real —dos proxies delante
// (Cloudflare + Caddy), la IP verdadera del cliente en `CF-Connecting-IP`, `TRUST_PROXY=1`—
// se resuelve en T3.1 (PRD §10). Hoy `x-forwarded-for` es controlable por el cliente y esto
// NO es una defensa robusta: solo cablea la superficie del rate limit para no dejarla suelta.
function clientIp(req: Request): string {
  // T3.1: sustituir por CF-Connecting-IP tras validar el trust boundary.
  const xff = req.headers.get('x-forwarded-for');
  return xff ? (xff.split(',')[0]?.trim() ?? 'unknown') : 'unknown';
}
