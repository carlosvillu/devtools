Single-select segmented control: a small pill row where exactly one segment is active. Use it to switch a page between two or three **mirrored modes** that share a surface — the motivating case is `decodificar ⇄ codificar` (paste-to-untangle vs. compose-to-encode). It is not a nav, not a filter set, and not for more than ~3 segments; reach for tabs or a `Select` beyond that.

The active segment lifts onto a white `--surface` chip with a 1px border and `--shadow-sm`; inactive segments are `--text-muted` on the `--surface-2` track. Sentence case, lowercase transform ids stay `mono`. Pass `icon` per option to prefix a Lucide glyph (e.g. `search` for decode, `git-branch` for encode).

```jsx
<Segmented
  value={mode}
  onChange={setMode}
  options={[
    { value: "decodificar", label: "decodificar", icon: "search" },
    { value: "codificar", label: "codificar", icon: "git-branch" },
  ]}
/>
```

Props: `options` (string[] or `{value,label,icon}[]`), `value`, `onChange(value)`, `size` (`sm` | `md`), `mono`. Inherits the theme, so it inverts correctly inside a `.dark` scope.
