// Mide contraste WCAG texto/fondo real. Pinta cada color en un canvas 1x1 y lee el
// pixel sRGB (robusto frente a getComputedStyle devolviendo lab()/oklch()).
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
  const a = lum(fg) + 0.05,
    b = lum(bg) + 0.05;
  return (Math.max(a, b) / Math.min(a, b));
}
function effBg(el) {
  let node = el;
  while (node && node.nodeType === 1) {
    const c = getComputedStyle(node).backgroundColor;
    const rgba = toRGB(c);
    if (rgba[3] > 0.01) return rgba;
    node = node.parentElement;
  }
  return [255, 255, 255, 1];
}
function fontInfo(el) {
  const s = getComputedStyle(el);
  const px = parseFloat(s.fontSize);
  const w = parseInt(s.fontWeight, 10) || 400;
  const large = px >= 24 || (px >= 18.66 && w >= 700);
  return { px: Math.round(px * 10) / 10, w, large, threshold: large ? 3 : 4.5 };
}
function measure(el, label) {
  if (!el) return { label, err: 'no element' };
  const fg = toRGB(getComputedStyle(el).color);
  const bg = effBg(el);
  const r = ratio(fg, bg);
  const fi = fontInfo(el);
  return {
    label,
    fgRGB: fg.slice(0, 3).join(','),
    bgRGB: bg.slice(0, 3).join(','),
    ratio: Math.round(r * 100) / 100,
    px: fi.px,
    weight: fi.w,
    large: fi.large,
    threshold: fi.threshold,
    pass: r >= fi.threshold,
  };
}
const results = [];
const pushSel = (sel, label, textMatch) => {
  const els = [...document.querySelectorAll(sel)];
  let el = els[0];
  if (textMatch) el = els.find((e) => e.textContent.trim() === textMatch) || el;
  results.push(measure(el, label));
};
// switcher activo / inactivo
results.push(measure(document.querySelector('button[aria-pressed="true"]'), 'switcher activo (accent bg + accent-fg)'));
results.push(measure(document.querySelector('button[aria-pressed="false"]'), 'switcher inactivo'));
// texto de la pagina
pushSel('h1', 'H1 Fundaciones (text sobre bg)');
pushSel('main > header p', 'parrafo intro (text-muted)');
pushSel('code.text-text-subtle, .text-text-subtle', 'token name (text-subtle)');
// bloque de codigo (motivo terminal)
results.push(measure(document.querySelector('pre code'), 'code base (code-fg sobre code-bg)'));
results.push(measure(document.querySelector('pre .text-code-key, pre span'), 'code-key (span 1)'));
[...document.querySelectorAll('pre span')].forEach((s, i) => {
  const cls = s.className || '';
  results.push(measure(s, 'code span[' + i + '] ' + cls));
});
JSON.stringify({ theme: document.documentElement.getAttribute('data-theme') || 'light', results }, null, 2);
