// Contratos del motor de detección y cadena (PRD §6.1). Fuente única: se define el
// schema Zod y el tipo se DERIVA con `z.infer` (convención del repo, architecture.md §4).
// `POST /api/analyze` (F1 posterior) valida entrada y salida contra estos schemas.
import { z } from 'zod';

// Tipos de dato que el motor sabe reconocer (§6.2). El orden del enum es el orden
// de declaración de los detectores, no implica prioridad: la prioridad la da la confianza.
export const DATA_KINDS = [
  'base64',
  'jwt',
  'json',
  'unix_timestamp',
  'url',
  'uuid',
  'hash',
  'text',
] as const;

export const DataKindSchema = z.enum(DATA_KINDS);
export type DataKind = z.infer<typeof DataKindSchema>;

// Un detector responde: "esto podría ser X, con esta confianza en [0,1]".
export const DetectionSchema = z.object({
  kind: DataKindSchema,
  confidence: z.number().min(0).max(1),
  meta: z.record(z.string(), z.unknown()).optional(), // p.ej. { algo: 'sha256' }, { version: 4 }
});
export type Detection = z.infer<typeof DetectionSchema>;

// Resultado de aplicar una transformación. Puro y total (I1): un fallo es un dato,
// no una excepción. Union discriminada por `ok` → narrowing exhaustivo en la UI.
export const TransformResultSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    output: z.string(),
    notes: z.array(z.string()).optional(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);
export type TransformResult = z.infer<typeof TransformResultSchema>;

// Una transformación aplicable a un kind concreto. `apply` es una función pura y total
// (implementada en T1.2): el schema valida los campos serializables y comprueba que
// `apply` es invocable. El tipo se deriva del schema como el resto.
export const TransformSchema = z.object({
  id: z.string().min(1), // 'base64.decode', 'jwt.decode', 'json.format'
  from: DataKindSchema,
  label: z.string().min(1), // texto en español para la UI
  apply: z.custom<(input: string) => TransformResult>((val) => typeof val === 'function', {
    message: 'apply debe ser una función (input: string) => TransformResult',
  }),
});
export type Transform = z.infer<typeof TransformSchema>;

// Un paso de la cadena, tal y como lo consume la UI (§6.1).
// `notes` es una EXTENSIÓN mínima de T1.3 sobre los 5 campos literales del §6.1: el
// ejemplo trabajado del §6.5 y el criterio 14.1 exigen que la nota `exp` del JWT
// ("caducó hace 4 horas") llegue a la UI, y el motor puro es el único que la calcula.
// Lo lleva el paso donde se aplicó la transformación (copiado de `TransformResult.notes`);
// los pasos terminales con `applied:null` no llevan notas. Opcional → compatible con los
// fixtures de T1.1 y con `makeChainStep`. Hueco de contrato §6.1↔§6.5 resuelto en mínimo.
export const ChainStepSchema = z.object({
  index: z.number().int().nonnegative(),
  input: z.string(),
  detections: z.array(DetectionSchema), // ordenadas por confianza desc; [0] es la elegida
  applied: z.string().nullable(), // Transform.id aplicado, o null si es terminal
  output: z.string().nullable(),
  notes: z.array(z.string()).optional(), // notas de la transformación aplicada (p.ej. exp del JWT)
});
export type ChainStep = z.infer<typeof ChainStepSchema>;

// Motivo por el que la cadena terminó (§6.1 + invariantes I2/I3/I6).
export const CHAIN_TERMINALS = ['text', 'no_transform', 'max_depth', 'cycle', 'error'] as const;
export const ChainTerminalSchema = z.enum(CHAIN_TERMINALS);
export type ChainTerminal = z.infer<typeof ChainTerminalSchema>;

export const ChainSchema = z.object({
  steps: z.array(ChainStepSchema),
  terminal: ChainTerminalSchema,
});
export type Chain = z.infer<typeof ChainSchema>;

// Contrato de ENTRADA de `POST /api/analyze` (PRD §8 módulo `analyze`): `{ input: string }`.
// El límite de 128 KB (I7) NO se expresa aquí: se mide por bytes del CUERPO de la petición
// antes de parsear (413 sin procesar), no por longitud del string ya deserializado. `input`
// admite cadena vacía: analizar "" es un `text` terminal legítimo, no un error de validación.
export const AnalyzeRequestSchema = z.object({
  input: z.string(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
