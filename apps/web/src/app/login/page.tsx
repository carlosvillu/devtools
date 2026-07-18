import type { Metadata } from 'next';
import { AuthScreen } from '@/components/auth/auth-screen';

// /login (PRD §7). Pública (D6). Dinámica: el header lee la sesión actual (cookies).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Entrar · devtools' };

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
