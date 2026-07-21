import { redirect } from 'next/navigation';

// `/` — redirección TEMPORAL a `/analyze` (F5, T5.1). La experiencia de análisis se mudó a
// `/analyze` sin cambio visual; mientras F5 no termina, `/` redirige allí para no dejar la app
// rota entre tareas. T5.2 retira esta redirección y construye aquí la landing («Home estilo
// Google»). `redirect()` de App Router: emite un 307 en el server component, sin renderizar.
export default function HomePage() {
  redirect('/analyze');
}
