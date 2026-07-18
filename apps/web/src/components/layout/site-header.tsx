import Link from 'next/link';
import { Wordmark } from '@/components/ui/wordmark';
import { buttonVariants } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { getServerSession } from '@/server/current-user';
import { LogoutButton } from '@/components/auth/logout-button';

// Cabecera global de la app (Wordmark + navegación). Server Component ASÍNCRONO desde
// T0.4: lee la sesión actual (getServerSession, NON-FATAL) para reflejar si hay cuenta
// iniciada. Responsive según los mockups de `/` (docs/mockups/field.html desktop,
// mobile.html móvil): en desktop la nav de texto; en móvil se colapsa a Wordmark + un
// IconButton para no desbordar los 390px.
//
// T0.4: `/login` ya existe → «Entrar» es un enlace real (link-as-button con las clases
// del DS). Con sesión, «Entrar» se sustituye por el email + «Salir» (logout). `/history`
// (F2) todavía NO existe: se muestra deshabilitado con el motivo en el nombre accesible
// (architecture.md §1.2 — los destinos de fases futuras se muestran, no se ocultan).
export async function SiteHeader() {
  const session = await getServerSession();

  return (
    <header className="flex h-15 items-center justify-between border-b border-border bg-surface px-4 sm:px-7">
      <Link href="/" aria-label="devtools — inicio">
        <Wordmark size="md" />
      </Link>
      <nav className="flex items-center">
        <div className="hidden items-center gap-6 text-sm sm:flex">
          <Link href="/" className="font-medium text-text">
            el campo
          </Link>
          <span
            aria-disabled="true"
            aria-label="historial · llega con las cuentas (fase F2)"
            className="font-medium text-text-subtle"
          >
            historial
          </span>
          {session ? (
            <>
              <span className="text-text-muted" title="Sesión iniciada">
                {session.user.email}
              </span>
              <LogoutButton />
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              Entrar
            </Link>
          )}
        </div>
        {/* Móvil (<640px): la nav de texto está oculta, así que la acción de cuenta debe
            vivir aquí o es INALCANZABLE en móvil — con sesión «Salir», sin sesión
            «Entrar». El historial deshabilitado (afordancia de F2) solo cabe sin sesión. */}
        <div className="flex items-center gap-2 sm:hidden">
          {session ? (
            <LogoutButton />
          ) : (
            <>
              <IconButton
                icon="reopen"
                label="Historial · llega con las cuentas (fase F2)"
                variant="ghost"
                disabled
              />
              <Link href="/login" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                Entrar
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
