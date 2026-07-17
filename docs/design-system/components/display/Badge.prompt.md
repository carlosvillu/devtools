Small pill for labels and status. The product's DataKind vocabulary lives here: pass `kind` and the badge picks a fixed color + icon + mono label so a `jwt` always looks like a `jwt` everywhere.

```jsx
<Badge kind="jwt" />
<Badge kind="unix_timestamp" />
<Badge tone="success" icon="check">verificado</Badge>
<Badge tone="neutral" size="sm">50</Badge>
```

`kind`: base64·jwt·json·unix_timestamp·url·uuid·hash·text. Or generic `tone`: neutral·accent·success·warning·danger·violet·cyan. Props: `icon`, `mono`, `size` sm/md, `outline`. Import `KIND_META` for the kind→color map.
