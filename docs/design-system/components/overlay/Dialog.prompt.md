Modal confirmation dialog for destructive or important actions ("¿Borrar esta entrada?", "¿Borrar todo el historial?"). Built on the **native `<dialog>` element** (`showModal()`/`close()`): focus is trapped, Escape closes it, the `::backdrop` scrim and `aria-modal` semantics are native — no library. Controlled via `open` + `onOpenChange`. Composes the DS `Button` for its actions.

```jsx
<Dialog
  open={open}
  onOpenChange={setOpen}
  title="¿Borrar esta entrada?"
  description="Se elimina de tu historial. Esto no se puede deshacer."
  confirmLabel="Borrar"
  cancelLabel="Cancelar"
  confirmTone="danger"
  onConfirm={() => remove(id)}
/>
```

- `confirmTone="danger"` paints the confirm button red for destructive actions; default `primary`.
- Initial focus lands on **Cancelar** (safe default — no accidental confirm).
- `title` → `aria-labelledby`, `description` → `aria-describedby`.
- Closing (Escape, backdrop click, cancel) restores focus to the trigger — native `<dialog>` behaviour.
- Copy is Spanish, informal ("tú"), sentence case.
