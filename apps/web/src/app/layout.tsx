import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'devtools',
  description:
    'Pega cualquier cosa —un JWT, un base64, un timestamp, un JSON ilegible— y devtools detecta qué es, lo transforma y encadena pasos hasta llegar a algo legible.',
};

// Root layout: html/body + tokens. El chrome global (nav) y el grupo de rutas
// (app) llegan con la fase TD y F1, desde sus mockups.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
