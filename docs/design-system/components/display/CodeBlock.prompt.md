Dark monospace block for a data value — the "terminal" surface, always dark regardless of theme. Optional header with a kind label and a copy button.

```jsx
<CodeBlock kind="json" value={formattedJson} wrap />
<CodeBlock title="payload" copyable={false}>{"{ \"sub\": \"1\" }"}</CodeBlock>
```

Props: `value`/`children`, `title`, `kind`, `wrap`, `copyable`, `maxHeight`. Pass pre-highlighted nodes as children for syntax colors (see `--code-key/string/number` tokens).
