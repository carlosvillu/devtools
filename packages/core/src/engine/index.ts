// API pública del motor (PRD §6): contratos + detectores. Se expone como el subpath
// export `@app/core/engine` (no se re-exporta desde la raíz de core, que es transversal).
// Las transformaciones (§6.3) y el motor de cadena (§6) llegan en T1.2/T1.3.
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
  type DataKind,
  type Detection,
  type TransformResult,
  type Transform,
  type ChainStep,
  type ChainTerminal,
  type Chain,
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
} from './detectors';
