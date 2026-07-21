// Origen PÚBLICO del sitio — la base de la que Next deriva las URLs ABSOLUTAS de los metadatos
// (`metadataBase`), en particular la `og:image`/`twitter:image` (T5.5).
//
// 🔴 LA TRAMPA CENTRAL: si `metadataBase` no se fija, Next emite la `og:image` con
// `http://localhost:3000` y el share se ROMPE en producción aunque el meta-tag exista y todo
// check local pase (familia «el arnés más cómodo que la realidad»). Por eso el default NO es
// localhost sino el dominio real de producción (`DOMAIN` de deploy.env): incluso sin env, la URL
// es correcta en prod.
//
// Deriva de `NEXT_PUBLIC_SITE_URL` (inlined en build; en prod el fallback ya es el dominio real,
// así que es correcto con o sin la variable). Función PURA sobre un env inyectado → testeable en
// ambas ramas (con y sin la variable) sin arrastrar `process.env` global.

/** Origen público por defecto: el `DOMAIN` de deploy.env. NUNCA localhost. */
export const DEFAULT_SITE_URL = 'https://devtools.carlosvillu.dev';

/**
 * Resuelve el origen público del sitio a partir del env. Usa `NEXT_PUBLIC_SITE_URL` si es una URL
 * válida; si falta o es inválida, cae al dominio de producción (`DEFAULT_SITE_URL`). Devuelve un
 * `URL` listo para `metadataBase`.
 */
export function resolveSiteUrl(env: Record<string, string | undefined>): URL {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      const parsed = new URL(raw);
      // Solo orígenes web: un `javascript:`/`ftp:`/`data:` como base envenenaría cada URL de
      // metadatos derivada. Cualquier otro esquema cae al dominio real.
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed;
      }
    } catch {
      // Env mal formado: no arriesgamos un localhost implícito, caemos al dominio real.
    }
  }
  return new URL(DEFAULT_SITE_URL);
}
