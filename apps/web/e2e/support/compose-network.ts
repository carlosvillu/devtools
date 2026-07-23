// Helper compartido del control de red de COMPONER (e2e.md §1: los helpers viven en `e2e/support/`).
// Lo estrenó T6.7 inline en `compose.spec.ts`; T6.8 lo reusó; T6.11 lo EXTRAE aquí para que el
// recorrido de fase `phases/f6.spec.ts` lo importe sin duplicar la lógica de red (una copia
// divergente sería una promesa de privacidad probada por dos varas distintas).

import { expect } from '@playwright/test';

export interface CapturedRequest {
  method: string;
  url: string;
  body: string | null;
}

// 🔴 EL CONTROL QUE PRUEBA D10/§5.3: componer/firmar NO dispara ni una petición de la aplicación.
// Se parametriza por los textos prohibidos —lo que el usuario escribió, el resultado, el secreto—:
// ninguna petición puede llevarlos.
//
// Se descuenta SOLO tráfico del framework, y se dice por qué:
//   · `?_rsc=` y `/_next/` — el App Router PREFETCHEA las rutas de la cabecera (`/`, `/analyze`,
//     `/history`, `/login`) con peticiones RSC en cuanto el navegador queda ocioso, a veces
//     después del `networkidle`. Son GET del framework por una ruta ya conocida: sin cuerpo y sin
//     un solo byte de lo que el usuario escribe (lo comprueba el bucle de abajo).
//   · `/__nextjs_font/` — deuda de T6.8, endurecida en T6.11: en `next dev` las fuentes se sirven
//     por este endpoint, y una fuente que se cargue DESPUÉS de adjuntar el listener daría un FALSO
//     FAIL sobre un asset benigno. Excluirlo NO enmascara una fuga: el bucle de abajo sigue
//     exigiendo que NINGUNA petición (font incluida) lleve cuerpo, vaya a `/api/` o contenga un
//     texto prohibido; lo único que este filtro evita es contar un GET de fuente como «petición de
//     la aplicación». La fuga rojea por el conteo del cuerpo/URL, no verdea por este filtro.
export function assertNoComposeNetwork(requests: CapturedRequest[], forbidden: string[]): void {
  const appRequests = requests.filter(
    (request) =>
      !request.url.includes('_rsc=') &&
      !request.url.includes('/_next/') &&
      !request.url.includes('/__nextjs_font/'),
  );
  expect(appRequests).toEqual([]);

  // Y ni siquiera el prefetch/las fuentes del framework pueden llevar el dato: ninguna petición
  // tiene cuerpo, ninguna va a la API, y ninguno de los textos prohibidos aparece en ninguna URL.
  for (const request of requests) {
    expect(request.body).toBeNull();
    expect(request.method).toBe('GET');
    expect(request.url).not.toContain('/api/');
    for (const needle of forbidden) {
      expect(request.url).not.toContain(needle);
    }
  }
}
