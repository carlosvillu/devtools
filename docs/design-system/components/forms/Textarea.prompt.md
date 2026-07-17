The paste field — a large monospace textarea, the single entry point of the product. Defaults to `mono` and vertical resize.

```jsx
<Textarea autoFocus rows={5} placeholder="Pega un JWT, base64, JSON, timestamp, URL…" />
```

Props: `mono` (default true), `invalid`, `rows`, plus native textarea attrs. Pair with the paste-to-analyze behaviour in the product, not a submit button.
