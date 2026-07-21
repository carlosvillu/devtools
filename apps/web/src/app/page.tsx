import { LandingHome } from '@/components/landing/landing-home';

// `/` — la LANDING (F5, T5.2). Deja de redirigir a `/analyze` (T5.1 la puso como puente temporal
// mientras F5 no estaba completa): ahora `/` es la «Home estilo Google» y `/analyze` es la
// superficie de análisis. Página delgada (architecture.md §1.3): compone el dominio `LandingHome`,
// cuya isla cliente `LandingField` hace el relevo del input a `/analyze` por sessionStorage (§11:
// el input NUNCA viaja por la URL).
export default function HomePage() {
  return <LandingHome />;
}
