// Comprobación INDEPENDIENTE del verifier sobre la guarda de loopback (T2.2, arreglo #4).
// No reutiliza el test del implementer: replica la decisión y añade vectores que aquel NO
// cubre (userinfo, mayúsculas, punto final, subdominio con guion, IPv6 comprimida).
import { assertLoopbackBaseUrl } from '../../../apps/web/src/lib/internal-base-url.ts';

const ACEPTAR = [
  'http://localhost:3000',
  'http://127.0.0.1:3110',
  'http://[::1]:3000',
  'https://localhost:3000',
  'http://LOCALHOST:3000', // la URL normaliza el host a minúsculas
  // Corregido por el verifier: `new URL()` normaliza el punto final de una IPv4, así que
  // el hostname resultante es literalmente `127.0.0.1` — es loopback DE VERDAD y aceptarlo
  // es correcto. Mi expectativa inicial (rechazarlo) era la equivocada, no la guarda.
  'http://127.0.0.1.',
];

const RECHAZAR = [
  'http://example.com',
  'https://devtools.carlosvillu.dev',
  'http://10.0.0.5:3000',
  'http://192.168.1.20',
  // Los dos que el arreglo dice cubrir por IGUALDAD EXACTA (un `includes`/prefijo los dejaría pasar):
  'http://localhost.evil.com',
  'http://127.0.0.1.evil.com',
  // Vectores EXTRA que el test del implementer no prueba:
  'http://localhost@evil.com', // userinfo: el host real es evil.com
  'http://127.0.0.1@evil.com',
  'http://evil.com/localhost', // «localhost» en el path
  'http://evil.com/?h=localhost', // en la query
  'http://evil.com#localhost', // en el fragmento
  'http://sub.localhost.evil.com',
  'http://mylocalhost',
  'http://127.0.0.11', // prefijo numérico de 127.0.0.1
];

let fallos = 0;
for (const url of ACEPTAR) {
  try {
    assertLoopbackBaseUrl(url);
    console.log(`OK   acepta  ${url}`);
  } catch (e) {
    console.log(`FALLO acepta ${url} -> lanzó: ${e.message}`);
    fallos++;
  }
}
for (const url of RECHAZAR) {
  try {
    assertLoopbackBaseUrl(url);
    console.log(`FALLO RECHAZA ${url} -> NO lanzó (la cookie de sesión saldría del proceso)`);
    fallos++;
  } catch {
    console.log(`OK   rechaza ${url}`);
  }
}
console.log(fallos === 0 ? '\nRESULTADO: guarda correcta, 0 fallos' : `\nRESULTADO: ${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
