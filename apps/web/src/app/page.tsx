import { SiteHeader } from '@/components/layout/site-header';
import { FieldAnalyzer } from '@/components/field/field-analyzer';

// `/` — la pantalla del campo (PRD §7), construida desde docs/mockups/field.html con las
// primitivas del DS. Server Component delgado (architecture.md §1.3): compone la cabecera y
// el encabezado estáticos y monta la hoja interactiva `FieldAnalyzer`, que es donde vive la
// frontera `'use client'` (campo de pegado + cadena en vivo). Sin fetch en la página: el
// análisis se dispara en cliente al pegar/escribir contra `POST /api/analyze`.
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <SiteHeader />
      <main className="flex flex-1 justify-center px-7 py-10">
        <div className="w-full max-w-190">
          <div className="mb-6">
            <h1 className="mb-2 text-2xl leading-tight font-semibold tracking-tight">
              Pega algo. Lo desenreda.
            </h1>
            <p className="max-w-140 text-md text-text-muted">
              Un JWT, un base64, un timestamp, un JSON ilegible, una URL con parámetros. devtools
              detecta qué es y lo decodifica paso a paso.
            </p>
          </div>
          <FieldAnalyzer />
        </div>
      </main>
    </div>
  );
}
