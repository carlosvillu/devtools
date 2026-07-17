Styled native `<select>` with a chevron. In devtools it drives the "desvío" — picking an alternative transform on a chain step (O4).

```jsx
<Select
  mono
  value={transformId}
  onChange={(e) => setTransform(e.target.value)}
  options={[
    { value: "base64.decode", label: "base64.decode" },
    { value: "hash.identify", label: "hash.identify" },
  ]}
/>
```

Props: `options` (strings or {value,label}), `size`, `invalid`, `mono`, `placeholder`.
