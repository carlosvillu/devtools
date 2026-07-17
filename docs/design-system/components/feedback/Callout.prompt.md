Inline notice banner. Use for errors, the terminal "no se detectó nada" explanation, and the required privacy warning on `/`.

```jsx
<Callout tone="security" title="Sobre tus datos">
  devtools procesa lo que pegas en el servidor. No lo uses con secretos de producción vivos.
</Callout>
<Callout tone="danger" title="No se pudo decodificar">La firma del JWT no es válida.</Callout>
```

Tones: info · warning · danger · success · security (muted grey, shield icon). Props: `title`, `icon`.
