import { SiteHeader } from '@/components/layout/site-header';
import { FieldAnalyzer } from '@/components/field/field-analyzer';

// `/analyze` — la pantalla del campo (PRD §7), construida desde docs/mockups/field.html con las
// primitivas del DS. Server Component delgado (architecture.md §1.3): compone la cabecera y
// el encabezado estáticos y monta la hoja interactiva `FieldAnalyzer`, que es donde vive la
// frontera `'use client'` (campo de pegado + cadena en vivo). Sin fetch en la página: el
// análisis se dispara en cliente al pegar/escribir contra `POST /api/analyze`.
//
// F5: esta es la superficie de análisis (antes vivía en `/`). La landing pasa a ser `/` y la
// experiencia de análisis se muda aquí sin cambio visual. Al montar, `FieldAnalyzer` lee y
// CONSUME un input pendiente de `sessionStorage['devtools:pending-input']` (lo que la landing
// escribe antes de navegar): §11 del PRD manda que el input NUNCA viaje por la URL, así que el
// transporte es sessionStorage, jamás query param ni fragment.
export default function AnalyzePage() {
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
