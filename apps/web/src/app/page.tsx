import type { Metadata } from 'next';
import { LandingHome } from '@/components/landing/landing-home';
import { TAGLINE } from '@/lib/tagline';

// Dinámica: el header de la landing lee la sesión actual (cookies) para reflejar si hay cuenta
// iniciada (T5.4), como `/login`. Sin esto Next intentaría prerenderizar `/` estáticamente y el
// header quedaría congelado al estado del build (siempre «Entrar»).
export const dynamic = 'force-dynamic';

// og:image de la portada para compartir en redes (T5.5). SOLO aquí (no en el layout raíz): la
// tarjeta es de la PORTADA que se comparte, y acotarla a `/` evita que el dominio de producción
// entre en el <head> de `/history`/`/analyze`. La imagen es un PNG estático en `public/`
// (wordmark tinta-oscura + claim sobre blanco); `metadataBase` (layout raíz) la hace ABSOLUTA. Next
// auto-rellena `twitter:image` desde `openGraph.images` (mismo recurso): no se duplica en `twitter`.
const OG_ALT = `devtools — el wordmark de devtools sobre fondo blanco, con el claim «${TAGLINE}».`;

export const metadata: Metadata = {
  openGraph: {
    type: 'website',
    siteName: 'devtools',
    title: 'devtools',
    description: TAGLINE,
    url: '/',
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: OG_ALT }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'devtools',
    description: TAGLINE,
  },
};

// `/` — la LANDING (F5, T5.2). Deja de redirigir a `/analyze` (T5.1 la puso como puente temporal
// mientras F5 no estaba completa): ahora `/` es la «Home estilo Google» y `/analyze` es la
// superficie de análisis. Página delgada (architecture.md §1.3): compone el dominio `LandingHome`,
// cuya isla cliente `LandingField` hace el relevo del input a `/analyze` por sessionStorage (§11:
// el input NUNCA viaja por la URL).
export default function HomePage() {
  return <LandingHome />;
}
