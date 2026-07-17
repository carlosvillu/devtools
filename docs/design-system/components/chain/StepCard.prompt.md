The signature unit of devtools: one step of the untangling chain. Stacks the step index, detected kind + confidence, applied transform, ambiguity alternatives (O5), an optional transform picker to divert the chain (O4), the output value, transform notes, and — on the last step — the terminal reason.

```jsx
<StepCard
  index={0}
  kind="jwt"
  confidence={0.95}
  applied="jwt.decode"
  alternatives={["text"]}
  transforms={["jwt.decode"]}
  output={'{ "alg": "HS256" }'}
  notes={["exp: 2026-07-16T00:00:00Z (caducó hace 4 horas)"]}
  onSelectTransform={(id) => rerun(id)}
/>
<StepCard index={2} kind="json" output="{\n  …\n}" terminal="no_transform" />
```

Terminal values: text · no_transform · max_depth · cycle · error. Stack several StepCards to render a full Chain.
