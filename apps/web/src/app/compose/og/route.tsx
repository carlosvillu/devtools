import { readFile } from 'node:fs/promises';
import { ImageResponse } from 'next/og';
import { decodeRecipe } from '@app/core/recipe';
import { getRootLogger } from '@/server/logger';
import { recipeHeadline, recipeTransformIds } from './recipe-og-content';

// ── La imagen OG DINÁMICA por receta (T7.4) ──────────────────────────────────────────────
//
// `/compose/og?r=<receta>` → una `og:image` server-render (satori vía `next/og`) que muestra los
// pasos de la receta compartida, extendiendo el lenguaje visual de la og:image estática de F5
// (wordmark `devtools` + cursor de acento sobre blanco, fuentes Geist embebidas, tokens del DS).
// `generateMetadata` de `/compose` apunta `openGraph.images` aquí cuando `?r=` es una receta
// válida; `metadataBase` (layout raíz) hace la URL ABSOLUTA para el crawler.
//
// ── POR QUÉ UN ROUTE HANDLER Y NO LA CONVENCIÓN `opengraph-image.tsx` ─────────────────────
// La convención de fichero `opengraph-image` de Next recibe SOLO `{ params }`, NUNCA
// `searchParams`. Una imagen dirigida por `?r=` (query) es imposible con ella. Un route handler
// `GET` sí lee la query (`new URL(request.url).searchParams`), así que es el mecanismo correcto y
// único limpio. Vive COLOCADO en `compose/og/` (no bajo `app/api/`) porque es el endpoint de
// imagen de la ruta `/compose` —espeja la ubicación de la convención `opengraph-image`— y el
// planning nombró esta ruta. No usa el HOF `withRoute` (api.md §1): no hay body JSON ni envelope
// de error; su contrato de fallo es «redirige a la OG genérica», jamás un 500 con envelope.
//
// ── NUNCA UN 500: el suelo es la OG ESTÁTICA de F5 ───────────────────────────────────────
// Un crawler que reciba 500 no pinta preview —peor que la genérica—. Este handler solo
// server-renderiza `ImageResponse` para una receta VÁLIDA; CUALQUIER otra cosa (sin `?r=`, `?r=`
// inválido, o CUALQUIER excepción —incluida la carga de fuente, que es justo lo que puede fallar
// en el empaquetado standalone, la lección de F5/T5.5—) → redirige a `/opengraph-image.png`, la
// og genérica estática que NO necesita fuente ni satori. Así la superficie de satori se reduce a
// un solo camino y el fallback es infalible. El redirect resuelve 200 `image/png` (14.18 local:
// `?r=` inválido → 200 `image/*`, nunca 500).
//
// `runtime = 'nodejs'`: la carga de fuente usa `fs` (no existe en `edge`), y el server corre en
// Node (standalone), no en edge.
export const runtime = 'nodejs';
// Lee la query en cada petición: el resultado depende de `?r=`, no se cachea estático.
export const dynamic = 'force-dynamic';

const WIDTH = 1200;
const HEIGHT = 630;

// ── PALETA: hex LITERAL que espeja los tokens del DS ─────────────────────────────────────
// satori (motor de `ImageResponse`) NO resuelve `var(--token)` —no hay `:root` en el DOM de la
// imagen— ni `oklch(...)` de forma fiable, así que los colores van como hex derivados 1:1 de los
// tokens crudos de `globals.css`. NO es un valor «inventado» que se salte el DS (lo que el
// `ds-reviewer` veta en className/Tailwind): es el mismo token, transportado al único formato que
// el lienzo satori entiende. Cada constante anota su token de origen.
const INK = '#15171b'; // --gray-900 (text)
const MUTED = '#51545c'; // --gray-600 (text-muted)
const SUBTLE = '#6e727a'; // --gray-500 (text-subtle)
const ACCENT = '#0061d7'; // --blue-600 (accent) — el cursor del wordmark
const BG = '#ffffff'; // --gray-0 (surface) — mismo fondo blanco que la og de F5
const CHIP_BG = '#f3f4f6'; // --gray-100 (surface-2)
const CHIP_BORDER = '#e3e5e8'; // --gray-200 (border)

// Carga de fuentes ROBUSTA EN STANDALONE (la trampa prod de F5). Los `.ttf` viven COLOCADOS con
// el route (`./fonts/*.ttf`) y se resuelven con `new URL('./fonts/<fichero>.ttf', import.meta.url)`
// —relativo al MÓDULO COMPILADO, no a `process.cwd()`—. Esto es deliberado: `process.cwd()` es
// `apps/web` bajo `next start` (el stack E2E) pero `/app` bajo standalone (`node
// apps/web/server.js`); esa divergencia de rutas es EXACTAMENTE la trampa de F5 (el `public/` que
// no viajaba). Al ser module-relative el path es idéntico en ambos modos, y el bundler (Turbopack)
// detecta cada referencia `new URL('./asset', import.meta.url)` LITERAL —una por fichero, sin
// componer un directorio intermedio, que el análisis estático no sigue— y arrastra los `.ttf` al
// bundle standalone (verificado con un build `NEXT_OUTPUT=standalone` real, ver report). satori NO
// soporta `woff2`: por eso `.ttf`. Se cachea la lectura entre peticiones (una sola IO por proceso).
let fontsPromise: Promise<
  { name: string; data: ArrayBuffer; weight: 400 | 600; style: 'normal' }[]
> | null = null;

async function loadFonts() {
  // Se memoiza SOLO el ÉXITO. Un fallo transitorio de IO no debe envenenar el proceso entero: si
  // cacheáramos el rechazo (`fontsPromise ??= build()` a secas), TODAS las peticiones futuras
  // caerían a fallback hasta el próximo restart aunque el `.ttf` ya fuera legible. El `.catch`
  // resetea la caché → el siguiente intento reintenta; el éxito no se relee (una sola IO por
  // proceso, no 3 `.ttf` por request).
  fontsPromise ??= buildFonts().catch((err: unknown) => {
    fontsPromise = null;
    throw err;
  });
  return fontsPromise;
}

function buildFonts() {
  return Promise.all([
    readFile(new URL('./fonts/Geist-Regular.ttf', import.meta.url)),
    readFile(new URL('./fonts/Geist-SemiBold.ttf', import.meta.url)),
    readFile(new URL('./fonts/GeistMono-SemiBold.ttf', import.meta.url)),
  ]).then(([regular, semibold, monoSemibold]) => [
    { name: 'Geist', data: toArrayBuffer(regular), weight: 400 as const, style: 'normal' as const },
    {
      name: 'Geist',
      data: toArrayBuffer(semibold),
      weight: 600 as const,
      style: 'normal' as const,
    },
    {
      name: 'Geist Mono',
      data: toArrayBuffer(monoSemibold),
      weight: 600 as const,
      style: 'normal' as const,
    },
  ]);
}

// `readFile` da un Buffer (vista sobre un ArrayBuffer que puede compartir pool); satori quiere un
// ArrayBuffer. Se copia la porción exacta para no arrastrar bytes ajenos del pool.
function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export async function GET(request: Request): Promise<Response> {
  // Suelo infalible: cualquier fallo del render (carga de fuente incluida) cae a la og genérica
  // estática. NUNCA un 500.
  //
  // 🔴 `Location` RELATIVO, NO absoluto (bug prod-only cazado por la verificación de T7.5 contra el
  // dominio vivo, la lección de F5/T5.5). En el standalone detrás de Caddy, `request.url` lleva el
  // origen INTERNO del contenedor (`https://0.0.0.0:3000`), así que `NextResponse.redirect(new
  // URL('/opengraph-image.png', request.url))` emitía un 307 con `Location: https://0.0.0.0:3000/…`
  // —inalcanzable para un crawler: el fallback redirigía a la nada—. Un `Location` relativo en un
  // 307 es HTTP válido y el crawler lo resuelve contra el host PÚBLICO que ÉL pidió
  // (`devtools.carlosvillu.dev`), no contra el bind interno. `NextResponse.redirect` exige URL
  // absoluta, por eso una `Response` plana con el header a mano. Los DOS caminos que redirigen
  // (—`?r=` inválido/ausente— y el `catch` del never-500) comparten ESTE mismo `fallback` relativo.
  const fallback = new Response(null, {
    status: 307,
    headers: { Location: '/opengraph-image.png' },
  });
  try {
    const r = new URL(request.url).searchParams.get('r');
    // Sin `?r=` o receta inválida → genérica. `decodeRecipe` (core, T7.2) es TOTAL y es la MISMA
    // verdad de «receta válida» que usa la pantalla en `compose/page.tsx` (T7.3): una receta que
    // la pantalla precarga es una que la imagen pinta, y viceversa. No hay validación paralela.
    if (r === null) return fallback;
    const decoded = decodeRecipe(r);
    if (!decoded.ok) return fallback;

    const fonts = await loadFonts();
    const headline = recipeHeadline(decoded.steps);
    const ids = recipeTransformIds(decoded.steps);

    // 🔴 NEVER-500, DE VERDAD: `new ImageResponse(...)` NO renderiza al construirse —satori corre
    // perezosamente cuando se consume el cuerpo—, así que un error de layout de satori escaparía
    // a este try/catch y saldría como 500 al streamear. Forzamos el render aquí con
    // `.arrayBuffer()`: cualquier throw de satori (o de la fuente) se captura y cae al fallback, y
    // devolvemos los bytes ya rasterizados en una Response plana. El `eslint-disable` es correcto:
    // la regla asume render diferido de React, pero aquí el await materializa el error DENTRO del
    // try — que es justo lo que la regla teme que no ocurra.
    // eslint-disable-next-line react-hooks/error-boundaries
    const png = await new ImageResponse(<RecipeCard headline={headline} ids={ids} />, {
      width: WIDTH,
      height: HEIGHT,
      fonts,
    }).arrayBuffer();

    return new Response(png, {
      headers: {
        'content-type': 'image/png',
        // Cacheable por CDN/crawler: la imagen es determinista para un `?r=` dado.
        'cache-control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (err) {
    // NO nos tragamos la causa (el resto de apps/web/src/server loguea toda excepción capturada).
    // El ÚNICO camino que llega aquí es el render de una receta VÁLIDA que reventó —carga de fuente
    // o satori—. En prod, si el `.ttf` no viajó en el standalone (la trampa de F5 que T7.5 audita),
    // TODAS las og:image de receta degradarían EN SILENCIO a la genérica; sin este log el
    // diagnóstico en prod sería imposible. Se registra el tipo/mensaje del error; `r` (input de
    // usuario) NO se loguea (§11: el input del usuario nunca sale en un log).
    getRootLogger().warn(
      {
        err_name: err instanceof Error ? err.name : 'UnknownError',
        err_message: err instanceof Error ? err.message : String(err),
      },
      'compose_og_recipe_render_failed: la og de receta cayó al fallback genérico',
    );
    return fallback;
  }
}

// El lienzo de la receta. Cada `div` con ≥2 hijos lleva `display:flex` EXPLÍCITO: satori lanza si
// falta (la causa nº1 de una ImageResponse que «solo muestra el fallback»). Sin `className`/token
// de Tailwind: satori NO ejecuta Tailwind, se estila con `style` inline y la paleta hex de arriba.
//
// DS-ADHERENCIA: el lint de tipografía (TD.6) prohíbe `fontFamily` en `style` inline porque en el
// DOM Tailwind las familias son clases de token (`font-sans`/`font-mono`). Aquí NO aplica: satori
// no resuelve clases de Tailwind, el nombre de familia (`'Geist'`/`'Geist Mono'`) debe ir en el
// `style` para casar los `fonts` embebidos. Se desactiva la regla SOLO en las líneas de familia
// mono (Geist es el default de satori, primer item de `fonts`), con esta justificación.
function RecipeCard({ headline, ids }: { headline: string; ids: string[] }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: BG,
        padding: '72px 80px',
        // satori-only, no Tailwind (ver cabecera del componente):
        // eslint-disable-next-line no-restricted-syntax
        fontFamily: 'Geist',
      }}
    >
      {/* Wordmark `devtools` + cursor de acento (mono semibold, tinta), como la og de F5. */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            // eslint-disable-next-line no-restricted-syntax
            fontFamily: 'Geist Mono',
            fontWeight: 600,
            fontSize: 44,
            letterSpacing: '-0.01em',
            color: INK,
          }}
        >
          devtools
        </div>
        <div
          style={{
            width: 14,
            height: 28,
            marginLeft: 8,
            borderRadius: 1,
            backgroundColor: ACCENT,
          }}
        />
      </div>

      {/* Título + cadena de pasos. */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontWeight: 600, fontSize: 68, color: INK }}>{headline}</div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px 14px',
            marginTop: 32,
            maxWidth: 1040,
          }}
        >
          {ids.flatMap((id, i) => {
            const chip = (
              <div
                key={`chip-${String(i)}`}
                style={{
                  display: 'flex',
                  // eslint-disable-next-line no-restricted-syntax
                  fontFamily: 'Geist Mono',
                  fontWeight: 600,
                  fontSize: 30,
                  color: INK,
                  backgroundColor: CHIP_BG,
                  border: `1px solid ${CHIP_BORDER}`,
                  borderRadius: 8,
                  padding: '8px 16px',
                }}
              >
                {id}
              </div>
            );
            if (i === ids.length - 1) return [chip];
            return [
              chip,
              <div
                key={`arrow-${String(i)}`}
                style={{ display: 'flex', fontSize: 30, color: ACCENT }}
              >
                →
              </div>,
            ];
          })}
        </div>
      </div>

      {/* Pie: dominio + naturaleza de la receta, en tono apagado (sin datos: solo la cadena). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', fontSize: 26, color: MUTED }}>devtools.carlosvillu.dev</div>
        <div style={{ display: 'flex', fontSize: 26, color: SUBTLE }}>·</div>
        <div style={{ display: 'flex', fontSize: 26, color: SUBTLE }}>una receta compartida</div>
      </div>
    </div>
  );
}
