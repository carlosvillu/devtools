function oklchToOklab(L, C, hDeg){const h=(hDeg*Math.PI)/180;return [L, C*Math.cos(h), C*Math.sin(h)];}
function srgbToLinear(c){return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;}
function hexToOklab(hex){const h=hex.replace('#','');const r=srgbToLinear(parseInt(h.slice(0,2),16)/255);const g=srgbToLinear(parseInt(h.slice(2,4),16)/255);const b=srgbToLinear(parseInt(h.slice(4,6),16)/255);const l=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b);const m=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b);const s=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);return [0.2104542553*l+0.793617785*m-0.0040720468*s,1.9779984951*l-2.428592205*m+0.4505937099*s,0.0259040371*l+0.7827717662*m-0.808675766*s];}
function mix(a,pA,b){const w=pA/100;return [a[0]*w+b[0]*(1-w),a[1]*w+b[1]*(1-w),a[2]*w+b[2]*(1-w)];}
function oklabToLinear([L,a,b]){const l=(L+0.3963377774*a+0.2158037573*b)**3;const m=(L-0.1055613458*a-0.0638541728*b)**3;const s=(L-0.0894841775*a-1.291485548*b)**3;return [4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.707614701*s];}
function lum(o){const [r,g,b]=oklabToLinear(o).map(c=>Math.max(0,Math.min(1,c)));return 0.2126*r+0.7152*g+0.0722*b;}
function ratio(fg,bg){const a=lum(fg),b=lum(bg);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);}
const violet100=oklchToOklab(0.930,0.050,295);
const violet500=oklchToOklab(0.585,0.190,295);
const violet700=oklchToOklab(0.470,0.180,296);
const cyan100=oklchToOklab(0.930,0.045,210);
const cyan500=oklchToOklab(0.660,0.120,216);
const cyan700=oklchToOklab(0.490,0.100,220);
const white=hexToOklab('#ffffff');
const gray900=oklchToOklab(0.205,0.008,265);
function report(name,fg,mixSrc,mixPct,surface){const bg=mix(mixSrc,mixPct,surface);const r=ratio(fg,bg);console.log(name.padEnd(34)+'ratio='+r.toFixed(2)+'  '+(r>=4.5?'PASS':'FAIL'));return r;}
console.log('--- LIGHT theme (surface=#fff) ---');
report('json violet (fg=violet-700)',violet700,violet500,14,white);
report('base64/uuid cyan (fg=cyan-700)',cyan700,cyan500,15,white);
console.log('--- DARK theme (surface=gray-900) ---');
report('json violet (fg=violet-100)',violet100,violet500,14,gray900);
report('base64/uuid cyan (fg=cyan-100)',cyan100,cyan500,15,gray900);
console.log('--- Negative control: OLD -700 ramp in DARK (should FAIL) ---');
report('violet-700 on dark bg',violet700,violet500,14,gray900);
report('cyan-700 on dark bg',cyan700,cyan500,15,gray900);
