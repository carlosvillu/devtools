// Clave de sessionStorage que transporta el input pendiente de la landing (`/`) a la pantalla
// del campo (`/analyze`), introducida en F5/T5.1. §11 del PRD: el input JAMÁS viaja por la URL
// (un query param lo filtraría a la barra, al historial del navegador, al `Referer` y a los
// logs de Caddy/Cloudflare — la clase de fuga que F3/F4 cerraron); el único transporte es
// sessionStorage.
//
// Vive en un módulo compartido A PROPÓSITO: productor (la landing de T5.2, que hará
// `sessionStorage.setItem`) y consumidor (`FieldAnalyzer`, que lee+borra) quedan acoplados por
// esta clave. Un string mágico repetido en cada sitio diverge en silencio —un typo y el pending
// nunca se consume, sin error de compilación—, así que la clave tiene una sola fuente de verdad
// (mismo criterio que `JWT_PREFIX_RE` en el motor). Los tests también la importan de aquí.
export const PENDING_INPUT_KEY = 'devtools:pending-input';
