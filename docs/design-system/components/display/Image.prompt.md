Framed image with a graceful placeholder (icon + alt) when `src` is missing or fails to load, plus an optional caption. Handles fixed aspect ratios and rounded corners.

```jsx
<Image src="/avatar.png" alt="Foto de perfil" ratio="square" radius="full" bordered />
<Image ratio="video" alt="Sin imagen" caption="Vista previa" />
```

Props: `src`, `alt`, `ratio` (auto/square/video/wide/portrait), `radius`, `fit` (cover/contain), `bordered`, `caption`, `icon`.
