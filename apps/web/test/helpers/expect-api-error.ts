import { expect } from 'vitest';

// Asserta el envelope de error tipado (testing/api.md §2.4): status + code + presencia
// de message. Nunca el texto exacto (el wording no es contrato)… SALVO cuando la propia
// tarea exige comparar el mensaje literal (indistinguibilidad de login, §11): para eso
// el test lee `body.message` del valor devuelto.
export async function expectApiError(
  res: Response,
  status: number,
  code: string,
): Promise<{ code: string; message: string; details?: unknown }> {
  expect(res.status).toBe(status);
  const body = (await res.json()) as { code: string; message: string; details?: unknown };
  expect(body).toMatchObject({ code, message: expect.any(String) });
  return body;
}
