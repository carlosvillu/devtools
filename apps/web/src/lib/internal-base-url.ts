// 🔴 GUARDA DE DESTINO de la base URL interna (T2.2).
//
// `api-server.ts` reenvía TODA la cookie jar del visitante —incluida la de sesión— a la
// base URL que resuelve `resolveServerBaseUrl`. Hoy esa base es siempre loopback y el
// reenvío es correcto: la petición no sale del proceso. Pero `INTERNAL_API_URL` es un
// override LIBRE por env, SIN validación de host: si alguien lo apuntara a otra máquina
// (por copiar una config, por un typo en el .env del VPS), las credenciales de sesión de
// cada visitante se enviarían a un tercero — en silencio y sin que ningún test lo notara.
//
// Por eso el destino se comprueba EN CADA LLAMADA y se falla RUIDOSAMENTE si no es
// loopback, en vez de confiar en que nadie tocará esa variable. Fallar es lo correcto: es
// preferible una página rota (con un error explícito en los logs) a una fuga de sesión.
//
// VIVE EN SU PROPIO MÓDULO —y no dentro de `api-server.ts`— porque aquel importa
// `server-only`, que hace IMPOSIBLE cargarlo desde el entorno de tests unit (jsdom). La
// decisión completa es una función pura: separarla la hace testeable sin arrastrar el
// grafo de servidor, y `api-server.ts` sigue siendo el único con `server-only`.

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** Devuelve `baseUrl` si apunta al loopback; lanza si no. */
export function assertLoopbackBaseUrl(baseUrl: string): string {
  let host: string;
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    throw new Error(`api-server: base URL interna inválida (${baseUrl})`);
  }

  // Comparación por igualdad EXACTA contra el conjunto, nunca por `includes`/prefijo:
  // `localhost.evil.com` contiene «localhost» y no es loopback.
  if (!LOOPBACK_HOSTS.has(host)) {
    // El mensaje NO incluye la cookie ni ningún dato del visitante: solo la config.
    throw new Error(
      `api-server: la base URL interna debe ser loopback (recibida: ${host}). ` +
        'Este cliente reenvía la cookie de sesión y no puede apuntar fuera del proceso.',
    );
  }
  return baseUrl;
}
