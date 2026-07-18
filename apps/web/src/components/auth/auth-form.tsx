'use client';
// Formulario de auth (login/signup) — react-hook-form + zodResolver con el MISMO schema
// de @app/core/auth que re-valida el handler (frontend/forms.md §1): una sola definición
// de "válido", cero drift cliente/servidor. Se compone con las primitivas del DS
// (Field/Input/Button). Submit por el api-client, nunca `fetch` a pelo.
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthResponseSchema, LoginSchema, SignupSchema } from '@app/core/auth';
import { api, ApiError } from '@/lib/api-client';
import { applyEnvelopeToForm } from '@/lib/form-errors';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AuthValues {
  email: string;
  password: string;
}
type Mode = 'login' | 'signup';

const COPY: Record<Mode, { endpoint: string; submit: string; submitting: string }> = {
  login: { endpoint: '/api/auth/login', submit: 'Entrar', submitting: 'Entrando…' },
  signup: { endpoint: '/api/auth/signup', submit: 'Crear cuenta', submitting: 'Creando…' },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = COPY[mode];

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AuthValues>({
    resolver: zodResolver(mode === 'signup' ? SignupSchema : LoginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.post(copy.endpoint, AuthResponseSchema, values);
      // Solo `next` internos: empieza por «/» y el 2º char NO es «/» ni «\». El backslash
      // importa porque WHATWG normaliza «\»→«/» en esquemas especiales, así que `/\evil.com`
      // resuelve a `https://evil.com/` — un open redirect que un guard de solo-«//» deja pasar.
      const next = searchParams.get('next');
      const dest = next && /^\/(?![/\\])/.test(next) ? next : '/';
      router.push(dest);
      router.refresh(); // el header pasa a mostrar la sesión iniciada
    } catch (e) {
      if (e instanceof ApiError) {
        applyEnvelopeToForm<AuthValues>(e, setError);
        return;
      }
      throw e; // red caída u otro: lo captura el error boundary
    }
  });

  return (
    <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4">
      <Field label="Email" htmlFor="auth-email" error={errors.email?.message}>
        <Input
          id="auth-email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          invalid={Boolean(errors.email)}
          aria-invalid={errors.email ? true : undefined}
          {...register('email')}
        />
      </Field>

      <Field
        label="Contraseña"
        htmlFor="auth-password"
        hint={mode === 'signup' ? 'Mínimo 8 caracteres.' : undefined}
        error={errors.password?.message}
      >
        <Input
          id="auth-password"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          invalid={Boolean(errors.password)}
          aria-invalid={errors.password ? true : undefined}
          {...register('password')}
        />
      </Field>

      {errors.root?.server ? (
        <p role="alert" className="text-sm text-danger">
          {errors.root.server.message}
        </p>
      ) : null}

      <Button type="submit" block disabled={isSubmitting}>
        {isSubmitting ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
