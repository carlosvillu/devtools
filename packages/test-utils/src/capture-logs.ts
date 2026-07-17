// La costura con la que se prueba la regla §11 del PRD (el input del usuario
// nunca se loguea). Vive AQUÍ y no duplicada en cada paquete: es la pieza que
// decide si el §11 está probado o solo comentado, y una copia por paquete
// garantiza que la siguiente tarea clone la que tenga más a mano.
import { makeLogger, type Logger } from '@app/core/observability';

export interface CapturedLogs {
  /** Pásalo donde el código espere un Logger (o a setRootLoggerForTests). */
  logger: Logger;
  /** Cada línea NDJSON ya parseada, en orden de emisión. */
  lines: Record<string, unknown>[];
  /**
   * Todo lo emitido como un string: para asserts de "esto NO aparece".
   * Declarado como propiedad (`text: () => string`) y no como método
   * (`text(): string`) a propósito: la forma de método hace que destructurarlo
   * (`const { text } = captureLogs()`) dispare `@typescript-eslint/unbound-method`.
   */
  text: () => string;
}

/**
 * Un logger real (mismo `makeLogger` que producción: misma redaction, mismos
 * serializers) que escribe a memoria en vez de a stdout. Nivel `trace` por
 * defecto: en un test quieres ver TODO lo que se emitiría, incluido el debug.
 */
export function captureLogs(opts: { level?: string } = {}): CapturedLogs {
  const lines: Record<string, unknown>[] = [];
  const logger = makeLogger(
    { name: 'web', level: opts.level ?? 'trace' },
    {
      write(chunk: string) {
        lines.push(JSON.parse(chunk) as Record<string, unknown>);
      },
    },
  );

  return { logger, lines, text: () => JSON.stringify(lines) };
}
