// Contratos Zod del módulo auth (PRD §8 módulo `auth`, D9). El MISMO schema valida
// en el cliente (react-hook-form + zodResolver) y re-valida en el route handler
// (skill backend §1): una sola definición de "válido", cero drift cliente/servidor.
import { z } from 'zod';

// Email: se recorta y se valida el formato. La normalización a minúsculas para
// almacenamiento/búsqueda la hace el repo de @app/db (`normalizeEmail`, decisión de
// unicidad de T0.3); aquí solo se limpia y se valida la forma.
const EmailSchema = z
  .string()
  .trim()
  .min(1, 'Introduce tu email.')
  .max(320, 'El email es demasiado largo.')
  .pipe(z.email('Introduce un email válido.'));

// Contraseña de registro: política mínima (§8 signup, hint del mockup «Mínimo 8
// caracteres»). El tope evita un scrypt sobre una entrada gigante (DoS de CPU).
const SignupPasswordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres.')
  .max(200, 'La contraseña es demasiado larga.');

// Contraseña de login: solo se exige presencia. NO se revela la política de
// longitud en login (§11: las respuestas de login no deben filtrar información).
const LoginPasswordSchema = z.string().min(1, 'Introduce tu contraseña.').max(200);

export const SignupSchema = z.object({
  email: EmailSchema,
  password: SignupPasswordSchema,
});
export type Signup = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: EmailSchema,
  password: LoginPasswordSchema,
});
export type Login = z.infer<typeof LoginSchema>;

// Respuesta de signup/login: el usuario autenticado (sin el hash, obviamente). El
// api-client del frontend valida contra este schema; el handler serializa con él.
const AuthUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({
  user: AuthUserSchema,
});

export const LogoutResponseSchema = z.object({
  ok: z.literal(true),
});
