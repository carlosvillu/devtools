Copy-to-clipboard button that flashes a green check on success. Icon-only by default; `withLabel` shows text. Central to the product — every step value is copyable (O3).

```jsx
<CopyButton value={step.output} label="Copiar salida" />
<CopyButton value={token} withLabel label="Copiar" />
```

Props: `value` (required), `label`, `size` sm/md, `withLabel`, `onCopy`.
