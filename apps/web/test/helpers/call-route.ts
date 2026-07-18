// Helper para invocar route handlers de App Router en el proceso del test
// (testing/api.md §2.2). En App Router el handler recibe `(request, ctx)` con
// `ctx.params` asíncrono; se centraliza esa forma aquí para tocar un solo fichero si
// Next cambia la firma.
type Handler = (
  req: Request,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

export async function callRoute(
  handler: Handler,
  path: string,
  {
    params = {},
    json,
    ...init
  }: RequestInit & { params?: Record<string, string>; json?: unknown } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const reqInit: RequestInit = { ...init };
  if (json !== undefined) {
    reqInit.body = JSON.stringify(json);
    headers.set('content-type', 'application/json');
  }
  reqInit.headers = headers;
  const req = new Request(`http://test.local${path}`, reqInit);
  return handler(req, { params: Promise.resolve(params) });
}

/** Extrae el valor de una cookie del header `Set-Cookie` de una respuesta. */
export function getSetCookie(res: Response, name: string): string | undefined {
  const header = res.headers.get('set-cookie');
  if (!header) return undefined;
  const match = new RegExp(`(?:^|,\\s*)${name}=([^;]*)`).exec(header);
  return match?.[1];
}
