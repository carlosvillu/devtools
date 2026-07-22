import { WorkScreen } from '@/components/layout/work-screen';
import { FieldAnalyzer } from '@/components/field/field-analyzer';
import { TAGLINE } from '@/lib/tagline';

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
//
// F6/T6.7: el chrome (cabecera + encabezado + contenedor) se muda a `WorkScreen`, compartido con
// `/compose` — son la misma pantalla en dos modos (decisión 2 de F6). Las medidas y el copy son
// los de antes: el ÚNICO cambio visible en esta ruta es la aparición del conmutador de dirección,
// y el comportamiento del campo no se toca.
export default function AnalyzePage() {
  return (
    <WorkScreen
      mode="decode"
      title={TAGLINE}
      description="Un JWT, un base64, un timestamp, un JSON ilegible, una URL con parámetros. devtools detecta qué es y lo decodifica paso a paso."
    >
      <FieldAnalyzer />
    </WorkScreen>
  );
}
