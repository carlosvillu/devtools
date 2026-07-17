The main action button. Solid accent = primary action; `secondary` (bordered) and `ghost` for supporting actions; `danger` for destructive.

```jsx
<Button>Analizar</Button>
<Button variant="secondary" icon="reopen">Reabrir</Button>
<Button variant="ghost" size="sm" icon="copy">Copiar</Button>
<Button variant="danger" icon="trash">Borrar todo</Button>
```

Variants: primary · secondary · ghost · danger. Sizes: sm (30px) · md (36px) · lg (44px). Props: `icon`, `iconRight` (Icon names), `block`, `disabled`. Hover darkens (solid) or tints (bordered/ghost).
