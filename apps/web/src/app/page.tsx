// Página raíz mínima de T0.1: prueba que el App Router sirve.
// La pantalla real de `/` (campo de entrada + cadena de pasos + la advertencia de
// producto del PRD §11/R2) la construye F1 desde su mockup, con las primitivas del
// design system. Aquí no se inventa ni un token: por eso no lleva estilos.
export default function HomePage() {
  return (
    <main>
      <h1>devtools</h1>
      <p>
        Pega cualquier cosa —un JWT, un base64, un timestamp, un JSON ilegible— y devtools detecta
        qué es, lo transforma y encadena pasos hasta llegar a algo legible.
      </p>
      <p>En construcción: el motor y el campo de entrada llegan en la fase F1.</p>
    </main>
  );
}
