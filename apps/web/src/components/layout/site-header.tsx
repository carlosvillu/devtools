import { Wordmark } from '@/components/ui/wordmark';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';

// Cabecera global de la app (Wordmark + navegación). Server Component: sin estado. Responsive
// según los DOS mockups de `/`: en desktop (docs/mockups/field.html) la nav de texto completa;
// en móvil (docs/mockups/mobile.html) se colapsa a Wordmark + un IconButton, para no desbordar
// los 390px (la nav de texto + botón medía 404px → scroll horizontal, que el móvil no debe tener).
//
// SCOPE T1.5: `/history` (F2) y las cuentas (`/login`, T0.4) todavía NO existen. Siguiendo
// architecture.md §1.2 —«los destinos de fases futuras se MUESTRAN, deshabilitados»— se pintan
// con `aria-disabled`, fuera del orden de tabulación y con el motivo en el nombre accesible (no
// solo en un `title`). Cuando esas fases cierren, pasan a ser enlaces reales; hoy activar uno
// enlazaría a una página inexistente. El registro de rutas (`lib/routes.ts`, §1.2) se introduce
// cuando haya ≥2 destinos vivos que compartir.
export function SiteHeader() {
  return (
    <header className="flex h-15 items-center justify-between border-b border-border bg-surface px-4 sm:px-7">
      <Wordmark size="md" />
      <nav className="flex items-center">
        <div className="hidden items-center gap-6 text-sm sm:flex">
          <span aria-current="page" className="font-semibold text-text">
            el campo
          </span>
          <span
            aria-disabled="true"
            aria-label="historial · llega con las cuentas (fase F2)"
            className="font-medium text-text-subtle"
          >
            historial
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled
            aria-label="Entrar · llega con las cuentas (fase F0)"
          >
            Entrar
          </Button>
        </div>
        <IconButton
          icon="reopen"
          label="Historial · llega con las cuentas (fase F2)"
          variant="ghost"
          disabled
          className="sm:hidden"
        />
      </nav>
    </header>
  );
}
