// Dos superficies afirman la misma promesa de privacidad (el Callout de /analyze y el footer
// de la landing). Fuente única para que no diverjan en silencio (cf. PENDING_INPUT_KEY, y el
// incidente T2.4 de copy de privacidad que mentía).
export const PRIVACY_HEADLINE = 'devtools procesa lo que pegas en el servidor.';
export const PRIVACY_DETAIL =
  'No está pensado para secretos de producción vivos. No se guarda el dato crudo ni en base de datos ni en logs.';

// ── COMPONER dice lo contrario, y por eso tiene copy propio (T6.7) ────────────────────
// El motor de composición corre en el CLIENTE (decisión 1 de F6, PRD §5.3/D10): no existe
// `/api/compose`, así que el texto fuente y el resultado NO viajan a ningún servidor. El aviso
// del artboard afirma justo lo contrario («se procesan en el servidor») — describe un producto
// que decidimos NO construir y está anotado como desviación acordada de la fase: copiarlo sería
// publicar una promesa de privacidad falsa, y peor que la real.
//
// El copy se escribe sobre el DATO, no sobre la red: T6.10 hará que componer CON SESIÓN mande
// la receta (`[{transform_id, kind}]`) a `POST /api/history`, así que un «componer no hace
// ninguna petición» sería cierto hoy y mentira dentro de dos tareas. Lo que sí es permanente —y
// es lo que el usuario necesita saber— es que ni lo que escribe ni el resultado salen de aquí.
export const COMPOSE_PRIVACY_HEADLINE = 'Lo que compones no sale de tu navegador.';
export const COMPOSE_PRIVACY_DETAIL =
  'El motor de composición se ejecuta en esta página: el texto que escribes y el resultado no viajan a ningún servidor. Aun así, no uses secretos de producción vivos.';

// ── EL AVISO DEL PANEL DE FIRMA (T6.8) ────────────────────────────────────────────────
// Copy propio del panel de `jwt.sign`, y ES ENTREGA, no decoración: el artboard `ComposeClaro`
// dice «El secreto viaja al servidor solo para firmar y no se guarda» — describe el producto que
// decidimos NO construir (decisión 1 de F6: no hay `/api/compose`) y publica una promesa de
// privacidad FALSA y peor que la real. La verdad de nuestra implementación, verificada por el
// Playwright permanente de T6.8:
//   · el secreto NO VIAJA a ningún servidor — la firma HMAC se calcula en esta página, en la
//     máquina del usuario (D10/§5.3), y componer no dispara ni una petición de red;
//   · el secreto NO SE GUARDA en ningún sitio — ni en `sessionStorage`/`localStorage`, ni en la
//     URL, ni en logs, ni en el historial (T6.10 persiste la RECETA, jamás las `options`, §11).
// El secreto en claro solo se usa para calcular la firma y muere cuando termina el cálculo; lo
// único que queda de él en el token es la firma, que es una función de un solo sentido, no el
// secreto. Ese matiz no va al copy del panel (no es lo que el usuario necesita leer): la promesa
// accionable es que el secreto no sale de aquí y no se guarda.
export const SIGN_SECRET_NOTICE =
  'El secreto no sale de tu navegador: la firma se calcula aquí, en tu máquina, y no se guarda en ningún sitio —ni en esta pestaña, ni en la URL, ni en el historial—. No uses un secreto de producción vivo.';
