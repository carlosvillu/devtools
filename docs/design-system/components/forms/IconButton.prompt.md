Square icon-only button for compact actions (copy, delete, reveal password, toolbar). Always pass an accessible `label` — it becomes the aria-label and tooltip.

```jsx
<IconButton icon="copy" label="Copiar valor" />
<IconButton icon="trash" label="Borrar entrada" />
<IconButton icon="eye" label="Mostrar" variant="secondary" />
```

Variants: ghost (default) · secondary (bordered). Sizes sm/md/lg. `active` for toggled state.
