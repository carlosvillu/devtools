import { Suspense } from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/ui/wordmark';
import { Card } from '@/components/ui/card';
import { SiteHeader } from '@/components/layout/site-header';
import { AuthForm } from './auth-form';

// Pantallas /login y /signup — construidas desde docs/mockups/{login,signup}.html
// (componente `AuthCard` de variant-claro.js) con las primitivas del DS: Wordmark,
// Card, Field/Input/Button (dentro de AuthForm). UI clara y centrada (variante A).
type Mode = 'login' | 'signup';

const COPY: Record<
  Mode,
  { title: string; sub: string; altLabel: string; altHref: string; altCta: string }
> = {
  login: {
    title: 'Entra',
    sub: 'Accede a tu historial de entradas.',
    altLabel: '¿No tienes cuenta?',
    altHref: '/signup',
    altCta: 'Crea una',
  },
  signup: {
    title: 'Crea tu cuenta',
    sub: 'Guarda y reabre lo que analizas.',
    altLabel: '¿Ya tienes cuenta?',
    altHref: '/login',
    altCta: 'Entra',
  },
};

export function AuthScreen({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-7 py-10">
        <div className="flex w-full max-w-100 flex-col items-center gap-6">
          <div className="text-center">
            <div className="mb-3.5 flex justify-center">
              <Wordmark size="lg" />
            </div>
            <h1 className="mb-1 text-xl font-semibold tracking-tight">{copy.title}</h1>
            <p className="text-sm text-text-muted">{copy.sub}</p>
          </div>

          <Card padding="lg" className="w-full">
            <Suspense>
              <AuthForm mode={mode} />
            </Suspense>
          </Card>

          <p className="text-sm text-text-muted">
            {copy.altLabel}{' '}
            <Link
              href={copy.altHref}
              className="font-medium text-text underline-offset-2 hover:underline"
            >
              {copy.altCta}
            </Link>
          </p>
          <p className="max-w-80 text-center text-xs text-text-subtle">
            La cuenta solo desbloquea el historial. Puedes usar devtools sin registrarte.
          </p>
        </div>
      </main>
    </div>
  );
}
