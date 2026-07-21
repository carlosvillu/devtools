import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api, ApiError } from '@/lib/api-client';
import { AuthForm } from './auth-form';

// Router y api-client mockeados (patrón de field-analyzer.test): se mockea SOLO `api.post`;
// `ApiError` real, para que el `instanceof` del componente narrowee contra la misma clase.
const { push, refresh, searchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  searchParams: { value: '' }, // el test lo ajusta para ejercitar el guard de `next`
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(searchParams.value),
}));
vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return { ...actual, api: { post: vi.fn() } };
});
const post = vi.mocked(api.post);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  searchParams.value = '';
});

describe('AuthForm', () => {
  it('valida en cliente y NO llama a la API con datos inválidos', async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);

    await user.type(screen.getByLabelText(/email/i), 'no-es-email');
    await user.type(screen.getByLabelText(/contraseña/i), 'corta'); // < 8
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText(/email válido/i)).toBeInTheDocument();
    expect(screen.getByText(/mínimo 8 caracteres/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('envía credenciales válidas y navega a `/analyze`', async () => {
    post.mockResolvedValueOnce({ user: { id: 'u1', email: 'a@b.com' } });
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secreto-123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledTimes(1);
    });
    expect(post).toHaveBeenCalledWith('/api/auth/login', expect.anything(), {
      email: 'a@b.com',
      password: 'secreto-123',
    });
    // Destino por defecto sin `next`: `/analyze` (F5/T5.2, antes `/`). El cambio es deliberado —
    // retirada la redirección de T5.1, `/` es la landing y auth lleva directo a la herramienta.
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/analyze');
    });
  });

  it('un error del servidor se muestra en un alert y re-habilita el submit', async () => {
    post.mockRejectedValueOnce(
      new ApiError('unauthorized', 'Email o contraseña incorrectos.', 401),
    );
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'mala-clave-1');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/incorrectos/i);
    // Submit re-habilitado tras el fallo (RHF resuelve isSubmitting).
    expect(screen.getByRole('button', { name: /entrar/i })).not.toBeDisabled();
    expect(push).not.toHaveBeenCalled();
  });

  it('respeta un `next` interno seguro tras el login', async () => {
    searchParams.value = 'next=/history';
    post.mockResolvedValueOnce({ user: { id: 'u1', email: 'a@b.com' } });
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secreto-123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/history');
    });
  });

  it('NEUTRALIZA un `next` de open-redirect con backslash (`/\\evil.com` → `/analyze`)', async () => {
    // WHATWG normaliza «\»→«/» en esquemas especiales: `new URL('/\\evil.com', origin)`
    // resuelve a `https://evil.com/`. El guard debe rechazarlo y caer al destino por defecto
    // (`/analyze` desde F5/T5.2), nunca al `next` malicioso.
    searchParams.value = 'next=' + encodeURIComponent('/\\evil.com');
    post.mockResolvedValueOnce({ user: { id: 'u1', email: 'a@b.com' } });
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secreto-123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/analyze');
    });
    expect(push).not.toHaveBeenCalledWith(expect.stringContaining('evil.com'));
  });

  it('muestra estado de carga: el botón cambia de nombre y se deshabilita', async () => {
    let resolve!: (v: { user: { id: string; email: string } }) => void;
    post.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'secreto-123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    const loading = await screen.findByRole('button', { name: /entrando/i });
    expect(loading).toBeDisabled();
    resolve({ user: { id: 'u1', email: 'a@b.com' } });
  });
});
