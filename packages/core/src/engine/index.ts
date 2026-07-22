// API pública del motor (PRD §6): contratos + detectores. Se expone como el subpath
// export `@app/core/engine` (no se re-exporta desde la raíz de core, que es transversal).
// Las transformaciones (§6.3) llegan en T1.2; el motor de cadena `analyze()` (§6) en T1.3.
export {
  DATA_KINDS,
  DataKindSchema,
  DetectionSchema,
  TransformResultSchema,
  TransformSchema,
  ChainStepSchema,
  CHAIN_TERMINALS,
  ChainTerminalSchema,
  ChainSchema,
  StepOverrideSchema,
  AnalyzeRequestSchema,
  ENCODE_GROUPS,
  EncodeGroupSchema,
  EncodeTransformSchema,
  type DataKind,
  type Detection,
  type TransformResult,
  type Transform,
  type ChainStep,
  type ChainTerminal,
  type Chain,
  type StepOverride,
  type AnalyzeRequest,
  type EncodeGroup,
  type EncodeTransform,
  type EncodeApply,
  type EncodeContext,
} from './contracts';

export {
  detect,
  detectJwt,
  detectJson,
  detectBase64,
  detectUnixTimestamp,
  detectUrl,
  detectUuid,
  detectHash,
  detectText,
  KINDS_COEXISTING_WITH_TEXT,
} from './detectors';

export {
  buildTransforms,
  buildTransformIndex,
  defaultTransformId,
  transformsForKind,
  DEFAULT_TRANSFORM_BY_KIND,
} from './transforms';

// Catálogo de CODIFICACIÓN (§6.6, T6.4): registro separado del de decodificación y sin
// transformación por defecto. `applyJsonMinify` NO se re-exporta desde aquí: la API pública
// de la dirección inversa es el catálogo, y `json.minify` ya viaja dentro de él.
export {
  ENCODE_SPECS,
  buildEncodeTransforms,
  buildEncodeIndex,
  encodeCatalogByGroup,
} from './encode-transforms';

// `runChain` NO se re-exporta: es el bucle interno del motor, consumido por `analyze` en su
// propio módulo y por el test del guard de ciclos (import directo desde `./analyze`, patrón de
// `decodeSegmentJson`). La API pública de `@app/core/engine` es `analyze` + los contratos.
export { analyze, type AnalyzeOptions } from './analyze';
