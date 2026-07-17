One row of the `/history` list. Shows the redacted preview (mono, truncated), the detected kind, a chain summary, a relative time, and reopen/delete actions that appear on hover. Respects D7 — only redacted preview + kind/transform summary, never raw values.

```jsx
<HistoryRow
  preview="Bearer eyJhbGci…"
  kind="jwt"
  chain={["jwt", "json"]}
  time="hace 3 h"
  onReopen={() => reopen(id)}
  onDelete={() => remove(id)}
/>
```

Stack rows directly; each has a bottom border. Props: `preview`, `kind`, `chain`, `time`, `onReopen`, `onDelete`.
