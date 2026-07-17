const cv = document.createElement('canvas');
cv.width = cv.height = 1;
const cx = cv.getContext('2d', { willReadFrequently: true });
function toRGB(css) {
  cx.clearRect(0, 0, 1, 1);
  cx.fillStyle = '#000';
  cx.fillStyle = css;
  cx.fillRect(0, 0, 1, 1);
  const d = cx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}
function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) { const x = lum(a) + 0.05, y = lum(b) + 0.05; return Math.max(x, y) / Math.min(x, y); }
const root = document.documentElement;
const V = (name) => toRGB(getComputedStyle(root).getPropertyValue(name).trim());
// pares texto/fondo del DS. thr: 4.5 texto normal. Los token subtle-fg suelen ir
// sobre subtle-bg (chips/badges). code-* sobre code-bg.
const pairs = [
  ['accent-fg / accent (boton primario)', '--accent-fg', '--accent', 4.5],
  ['accent-subtle-fg / accent-subtle-bg (chip)', '--accent-subtle-fg', '--accent-subtle-bg', 4.5],
  ['success-subtle-fg / success-subtle-bg', '--success-subtle-fg', '--success-subtle-bg', 4.5],
  ['warning-subtle-fg / warning-subtle-bg', '--warning-subtle-fg', '--warning-subtle-bg', 4.5],
  ['danger-subtle-fg / danger-subtle-bg', '--danger-subtle-fg', '--danger-subtle-bg', 4.5],
  ['text / bg', '--text', '--bg', 4.5],
  ['text-muted / bg', '--text-muted', '--bg', 4.5],
  ['text-muted / surface', '--text-muted', '--surface', 4.5],
  ['text-subtle / bg', '--text-subtle', '--bg', 4.5],
  ['text-subtle / surface', '--text-subtle', '--surface', 4.5],
  ['code-fg / code-bg', '--code-fg', '--code-bg', 4.5],
  ['code-muted / code-bg', '--code-muted', '--code-bg', 4.5],
  ['code-key / code-bg', '--code-key', '--code-bg', 4.5],
  ['code-string / code-bg', '--code-string', '--code-bg', 4.5],
  ['code-number / code-bg', '--code-number', '--code-bg', 4.5],
  ['code-punc / code-bg', '--code-punc', '--code-bg', 4.5],
];
const out = pairs.map(([label, fgV, bgV, thr]) => {
  const fg = V(fgV), bg = V(bgV);
  const r = ratio(fg, bg);
  return { label, fg: fg.join(','), bg: bg.join(','), ratio: Math.round(r * 100) / 100, thr, pass: r >= thr };
});
JSON.stringify({ theme: root.getAttribute('data-theme') || 'light', results: out }, null, 2);
