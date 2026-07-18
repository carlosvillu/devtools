The devtools brand mark: the word `devtools` set in monospace with a blinking accent cursor block after it — a terminal caret. There is **no logo**; this wordmark *is* the brand. Use it in the `/` header and on the auth screens.

```jsx
<Wordmark />              {/* md · 34px, blinking */}
<Wordmark size="sm" />    {/* compact header */}
<Wordmark blink={false} /> {/* static — no caret animation */}
```

- Text uses the theme-adaptive text token (dark on light, light on dark); the cursor uses `--accent`.
- The blink is the product's only looping motion (see foundations). It **stops under `prefers-reduced-motion`**, leaving the cursor block solid and visible — the mark never depends on movement to read.
- `size`: sm/md/lg. `blink`: set `false` for a static mark.
