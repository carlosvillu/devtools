import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { resolveSiteUrl } from '@/lib/site-url';

const DESCRIPTION =
  'Pega cualquier cosa —un JWT, un base64, un timestamp, un JSON ilegible— y devtools detecta qué es, lo transforma y encadena pasos hasta llegar a algo legible.';

// `metadataBase` es LA PIEZA CLAVE de la og:image compartible (T5.5): de ella Next deriva la URL
// ABSOLUTA de cualquier imagen/URL de metadatos. Sin fijarla, esas URLs serían
// `http://localhost:3000/...` y el share se rompería en producción. Se deriva de env con fallback
// al dominio real (ver lib/site-url.ts).
//
// Vive en el layout RAÍZ porque es config INVISIBLE: NO emite ningún meta-tag por sí sola (solo
// resuelve URLs relativas cuando una página las declara). Los tags `openGraph`/`twitter` viven SOLO
// en la landing `app/page.tsx` (la portada que se comparte), no aquí: así el dominio de producción
// NUNCA aparece en el <head> de `/history` ni `/analyze` (páginas privadas donde el escaneo de fuga
// de datos de D7/14.8 no debe toparse con la marca del sitio).
export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(process.env),
  title: 'devtools',
  description: DESCRIPTION,
};

// Root layout: html/body + tokens + fuentes del DS. El chrome global (nav) y el
// grupo de rutas (app) llegan con la fase TD y F1, desde sus mockups.
//
// Fuentes: el DS fija Geist (UI) + Geist Mono (datos/código). El espejo las carga
// por @import de Google Fonts; aquí se sirven SELF-HOSTED con next/font (paquete
// `geist`, que trae los .woff2) — 0 peticiones a CDNs. `GeistSans.variable` publica
// `--font-geist-sans` y `GeistMono.variable` `--font-geist-mono`, que es lo que
// consumen los tokens `--font-sans` / `--font-mono` de globals.css.
//
// Sin `data-theme` en <html>: el default es el tema claro (variante A del DS), que
// es lo que ya pinta `:root`. SSR limpio, sin flash ni hydration mismatch.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
