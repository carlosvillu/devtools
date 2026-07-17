const cv = document.createElement('canvas');
cv.width = cv.height = 1;
const cx = cv.getContext('2d', { willReadFrequently: true });
function toRGB(css) {
  cx.clearRect(0, 0, 1, 1);
  cx.fillStyle = '#000';
  cx.fillStyle = css;
  cx.fillRect(0, 0, 1, 1);
  const d = cx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2], d[3] / 255];
}
function lum([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(fg, bg) {
  const a = lum(fg) + 0.05, b = lum(bg) + 0.05;
  return Math.max(a, b) / Math.min(a, b);
}
function effBg(el) {
  let n = el;
  while (n && n.nodeType === 1) {
    const rgba = toRGB(getComputedStyle(n).backgroundColor);
    if (rgba[3] > 0.01) return rgba;
    n = n.parentElement;
  }
  return [255, 255, 255, 1];
}
function measure(el, label) {
  if (!el) return { label, err: 'no element' };
  const s = getComputedStyle(el);
  const fg = toRGB(s.color);
  const bg = effBg(el);
  const px = parseFloat(s.fontSize);
  const w = parseInt(s.fontWeight, 10) || 400;
  const large = px >= 24 || (px >= 18.66 && w >= 700);
  const r = ratio(fg, bg);
  const thr = large ? 3 : 4.5;
  return { label, fg: fg.slice(0, 3).join(','), bg: bg.slice(0, 3).join(','), ratio: Math.round(r * 100) / 100, px: Math.round(px * 10) / 10, w, thr, pass: r >= thr };
}
const R = [];
const first = (sel) => document.querySelector(sel);
const byText = (sel, t) => [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().startsWith(t));
R.push(measure(first('button[aria-pressed="true"]'), 'switcher ACTIVO accent-fg/accent'));
R.push(measure(first('button[aria-pressed="false"]'), 'switcher inactivo text-muted/surface'));
R.push(measure(first('h1'), 'H1 text/bg'));
R.push(measure(first('.text-text-muted'), 'text-muted (1er uso)'));
R.push(measure(byText('.text-text-muted', 'Los tokens'), 'intro parrafo text-muted'));
R.push(measure(first('.text-text-subtle'), 'text-subtle (eyebrow/token name)'));
// semantic subtle chips: swatches are bg-only (sin texto). El unico texto semantico
// con fg-sobre-bg-subtle no existe como chip en TD.1; se documenta.
R.push(measure(first('pre code'), 'code-fg/code-bg'));
JSON.stringify({ theme: document.documentElement.getAttribute('data-theme') || 'light', results: R }, null, 2);
