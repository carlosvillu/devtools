A compact bar showing a detector's confidence (0..1). Fill color follows the product thresholds: ≥0.7 green, ≥0.3 amber, below grey.

```jsx
<ConfidenceBar value={0.95} />
<ConfidenceBar value={0.42} width={80} />
```

Props: `value` (0..1), `showValue`, `width`.
