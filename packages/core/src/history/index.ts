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
// Contratos HTTP de `GET/DELETE /api/history` (T2.2).
export {
  HistoryChainStepSchema,
  HistoryCursorSchema,
  HistoryDeleteResultSchema,
  HistoryEntryViewSchema,
  HistoryPageSchema,
  type HistoryChainStep,
  type HistoryCursorView,
  type HistoryDeleteResult,
  type HistoryEntryView,
  type HistoryPage,
} from './contracts';
