Single-line text input for auth forms and search. Focus shows an accent ring; `invalid` turns the border red. Wrap in `Field` for label + error text.

```jsx
<Input type="email" placeholder="tu@correo.com" icon="search" />
<Input type="password" invalid mono />
```

Props: `size` sm/md/lg, `invalid`, `mono` (technical values), `icon` (leading glyph). All native input attrs pass through.
