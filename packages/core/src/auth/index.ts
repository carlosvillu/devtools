// API pública del módulo auth de core (PRD §8, D9): hashing puro de contraseñas
// (scrypt) + contratos Zod compartidos cliente/servidor. Se expone como el subpath
// `@app/core/auth` (no desde la raíz, que es transversal). La orquestación con BD
// (crear usuario, sesión, indistinguibilidad) vive en apps/web/src/server (IO).
export { hashPassword, verifyPassword } from './password';
export {
  SignupSchema,
  LoginSchema,
  AuthResponseSchema,
  LogoutResponseSchema,
  type Signup,
  type Login,
  type AuthUser,
} from './contracts';
