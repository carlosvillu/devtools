import Link from 'next/link';
import { Wordmark } from '@/components/ui/wordmark';
import { Badge, type DataKind } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { LandingField } from '@/components/landing/landing-field';
import { LandingFooter } from '@/components/landing/landing-footer';

// Landing de `/` («Home estilo Google», docs/mockups/home-google.jsx) — Server Component que
// compone el escenario centrado y monta la isla cliente `LandingField`. El mockup es la vara
// VISUAL del estado vacío; aquí se materializa con las primitivas del DS y tokens (nada de
// inline styles ni marcado crudo del mockup). Ver planning F5 / T5.2.
//
// Header MÍNIMO (no el `SiteHeader` completo): el mockup pone el wordmark grande y centrado en el
// escenario, no arriba. Arriba solo «historial» + «Entrar». «Entrar» es un `<Link>` estilado con
// `buttonVariants` (role=link), NO un `<button>` — `f0.spec.ts`/`auth.spec.ts` esperan
// `getByRole('link', {name: /entrar/i})`.

// Los 7 tipos que devtools reconoce, en el orden del mockup. `text` (el 8.º kind) no es un formato
// que se pegue: no va en la fila.
const KINDS: DataKind[] = ['jwt', 'base64', 'json', 'unix_timestamp', 'url', 'uuid', 'hash'];

export function LandingHome() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <header className="flex items-center justify-end gap-5 px-6 py-4 text-sm">
        <Link
          href="/history"
          className="font-medium text-text-muted transition-colors hover:text-text"
        >
          historial
        </Link>
        <Link href="/login" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
          Entrar
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        {/* El wordmark ES la marca y el h1 de la landing (accesible «devtools»): así el heading de
            `/` es distinto del de `/analyze` («Pega algo. Lo desenreda.») y ningún selector de
            heading los confunde. */}
        <h1 className="flex justify-center leading-none">
          <Wordmark size="lg" />
        </h1>
        <p className="mt-4 mb-8 text-md text-text-muted">Pega algo. Lo desenreda.</p>

        <LandingField />

        <div className="mt-10 flex max-w-140 flex-wrap justify-center gap-2">
          {KINDS.map((k) => (
            <Badge key={k} kind={k} />
          ))}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
