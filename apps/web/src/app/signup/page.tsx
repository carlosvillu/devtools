import type { Metadata } from 'next';
import { AuthScreen } from '@/components/auth/auth-screen';

// /signup (PRD §7). Pública (D6). Dinámica: el header lee la sesión actual (cookies).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Crear cuenta · devtools' };

export default function SignupPage() {
  return <AuthScreen mode="signup" />;
}
