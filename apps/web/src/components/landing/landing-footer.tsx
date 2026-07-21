import { PRIVACY_HEADLINE, PRIVACY_DETAIL } from '@/lib/privacy-notice';

// Footer de la landing (`/`). Server Component presentacional: SOLO GitHub (blog y privacidad no
// existen como rutas — un enlace a 404 en la portada es peor que no tenerlo) + el aviso de
// privacidad COMPLETO (fuente única en `lib/privacy-notice.ts`, compartida con el Callout de
// seguridad de `field-analyzer.tsx`). Landing-específico: vive en `components/landing/` y NO es un
// `Site*` reusable global (a diferencia de `SiteHeader`). Responsive: en móvil el aviso y el
// enlace se apilan (`flex-wrap`).
export function LandingFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-surface px-6 py-4 text-xs text-text-subtle">
      <p className="max-w-160">
        {PRIVACY_HEADLINE} {PRIVACY_DETAIL}
      </p>
      <nav>
        <a
          href="https://github.com/carlosvillu/devtools"
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-text-muted transition-colors hover:text-text"
        >
          github
        </a>
      </nav>
    </footer>
  );
}
