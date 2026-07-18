'use client';
// Botón de logout: POST /api/auth/logout (invalida la sesión + limpia la cookie) y
// refresca a `/`. Client component porque dispara una mutación por click.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogoutResponseSchema } from '@app/core/auth';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    try {
      await api.post('/api/auth/logout', LogoutResponseSchema, {});
      router.push('/');
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      icon="x"
      onClick={() => void handleClick()}
      disabled={pending}
    >
      {pending ? 'Saliendo…' : 'Salir'}
    </Button>
  );
}
