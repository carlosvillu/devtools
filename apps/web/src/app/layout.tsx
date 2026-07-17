import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'devtools',
  description:
    'Pega cualquier cosa —un JWT, un base64, un timestamp, un JSON ilegible— y devtools detecta qué es, lo transforma y encadena pasos hasta llegar a algo legible.',
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
