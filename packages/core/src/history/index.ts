// Subpath export `@app/core/history`: derivación redactada del registro de historial (D7).
export {
  PREVIEW_MAX_CHARS,
  buildHistoryRecord,
  buildPreview,
  inputKindOf,
  redactInput,
  summarizeChain,
  truncatePreview,
  type ChainSummaryStep,
  type HistoryRecordDraft,
} from './redact';
// Contratos HTTP de `GET/DELETE /api/history` (T2.2) + `POST /api/history` (T6.10).
export {
  HistoryChainStepSchema,
  HistoryComposeBodySchema,
  HistoryComposeStepSchema,
  HistoryCursorSchema,
  HistoryDeleteResultSchema,
  HistoryDirectionSchema,
  HistoryEntryViewSchema,
  HistoryPageSchema,
  type HistoryChainStep,
  type HistoryComposeBody,
  type HistoryComposeStep,
  type HistoryCursorView,
  type HistoryDeleteResult,
  type HistoryDirection,
  type HistoryEntryView,
  type HistoryPage,
} from './contracts';
// Frontera de persistencia de una receta (T6.10, D10, §9/§11): el allowlist que excluye el secreto.
export {
  buildComposeHistoryRecord,
  buildComposePreview,
  type ComposeHistoryRecordDraft,
} from './compose';
