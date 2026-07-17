Labelled form-field wrapper. Stacks a label, the control, and hint or error text. `error` replaces `hint` and turns red.

```jsx
<Field label="Email" htmlFor="email" error="Ese correo no existe.">
  <Input id="email" type="email" invalid />
</Field>
```

Props: `label`, `htmlFor`, `hint`, `error`, `required`.
