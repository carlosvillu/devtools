import Link from 'next/link';
import { Wordmark } from '@/components/ui/wordmark';
import { buttonVariants } from '@/components/ui/button';
import { iconButtonVariants } from '@/components/ui/icon-button';
import { Icon } from '@/components/ui/icon';
import { getServerSession } from '@/server/current-user';
import { LogoutButton } from '@/components/auth/logout-button';
import { SiteNavLinks } from '@/components/layout/site-nav-links';

// Cabecera global de la app (Wordmark + navegación). Server Component ASÍNCRONO desde
// T0.4: lee la sesión actual (getServerSession, NON-FATAL) para reflejar si hay cuenta
// iniciada. Responsive según los mockups de `/` (docs/mockups/field.html desktop,
// mobile.html móvil): en desktop la nav de texto; en móvil se colapsa a Wordmark + un
// IconButton para no desbordar los 390px.
//
// T0.4: `/login` ya existe → «Entrar» es un enlace real (link-as-button con las clases
// del DS). Con sesión, «Entrar» se sustituye por el email + «Salir» (logout).
//
// T2.2: `/history` YA EXISTE, así que el destino se ACTIVA (deja de estar deshabilitado)
// tanto en escritorio como en móvil. Los dos enlaces de la nav de escritorio viven en
// `SiteNavLinks` ('use client'): el mockup resalta el destino de la pantalla en curso y
// eso exige `usePathname()`, que este Server Component asíncrono no puede usar.
export async function SiteHeader() {
  const session = await getServerSession();

  return (
    <header className="flex h-15 items-center justify-between border-b border-border bg-surface px-4 sm:px-7">
      <Link href="/" aria-label="devtools — inicio">
        <Wordmark size="md" />
      </Link>
      <nav className="flex items-center">
        <div className="hidden items-center gap-6 text-sm sm:flex">
          <SiteNavLinks />
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
          {/* `/history` ya existe (T2.2): el atajo es un enlace REAL en ambos estados. Sin
              sesión lleva a `/login` por la guarda de servidor de la página, que es la
              afordancia correcta (el destino existe; lo que falta es la cuenta). */}
          <Link
            href="/history"
            aria-label="Historial"
            className={iconButtonVariants({ variant: 'ghost', size: 'md' })}
          >
            <Icon name="reopen" size={16} />
          </Link>
          {session ? (
            <LogoutButton />
          ) : (
            <Link href="/login" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              Entrar
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
