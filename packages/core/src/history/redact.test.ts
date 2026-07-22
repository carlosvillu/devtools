// Unit de la redacción de historial (D7 / criterio 14.8). Es lógica pura: aquí se prueba
// la LEY (redactar y truncar), y el control negativo literal «el token no aparece» se
// prueba además contra la fila REAL persistida en la integración de apps/web.
import { describe, expect, it } from 'vitest';
import { analyze } from '../engine';
import {
  PREVIEW_MAX_CHARS,
  buildHistoryRecord,
  buildPreview,
  inputKindOf,
  redactInput,
  summarizeChain,
  truncatePreview,
} from './redact';

// El JWT del ejemplo trabajado del PRD §6.5.
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ.abc';
const JWT_HEADER_SEGMENT = 'eyJhbGciOiJIUzI1NiJ9';
/** Header de un JWT NO ASEGURADO: `{"alg":"none"}`. Valida como header (trae `alg`),
 *  así que el barrido lo reconoce igual que a uno firmado. */
const JWT_NONE_HEADER_SEGMENT = 'eyJhbGciOiJub25lIn0';
const JWT_PAYLOAD_SEGMENT = 'eyJzdWIiOiIxIiwiZXhwIjoxNzUyNjI0MDAwfQ';
const JWT_SIGNATURE_SEGMENT = 'abc';
const NOW = new Date('2025-07-16T04:00:00Z');

describe('redactInput', () => {
  it('sustituye payload y firma del JWT por … y conserva el header', () => {
    expect(redactInput(JWT, 'jwt')).toBe(`${JWT_HEADER_SEGMENT}.….…`);
  });

  it('conserva el prefijo Bearer (que el detector tolera) y redacta igual', () => {
    expect(redactInput(`Bearer ${JWT}`, 'jwt')).toBe(`Bearer ${JWT_HEADER_SEGMENT}.….…`);
  });

  // Con la cabecera entera de 14.1/CU1 el preview conserva el sobre y redacta el token.
  // ⚠️ HONESTIDAD SOBRE LO QUE ESTE CASO PRUEBA: en el camino normal (3 segmentos) reconocer
  // el prefijo o NO reconocerlo dan el MISMO string byte a byte — sin recorte, el prefijo
  // simplemente viaja dentro del segmento 0, que es el que se conserva. Es un PUNTO FIJO: no
  // discrimina la implementación. Se queda porque documenta el preview que produce la entrada
  // de 14.1; quien guarda de verdad el recorte es el test siguiente.
  it('conserva la cabecera entera `Authorization: Bearer ` y redacta el token (14.1)', () => {
    expect(redactInput(`Authorization: Bearer ${JWT}`, 'jwt')).toBe(
      `Authorization: Bearer ${JWT_HEADER_SEGMENT}.….…`,
    );
  });

  // El punto donde las dos implementaciones SÍ divergen: la rama de fallo seguro (<2 segmentos).
  // Reconociendo el prefijo se conserva el sobre y se tapa todo lo demás; sin reconocerlo, el
  // `Authorization: Bearer ` cuenta como parte del token y se va entero. Este caso se pone rojo
  // si alguien devuelve el recorte de `redactInput` a la forma que solo entiende `Bearer `.
  it('en el fallo seguro conserva el prefijo entero, igual que hace con `Bearer ` solo', () => {
    expect(redactInput('Bearer sinpuntos', 'jwt')).toBe('Bearer …');
    expect(redactInput('Authorization: Bearer sinpuntos', 'jwt')).toBe('Authorization: Bearer …');
    expect(redactInput('AUTHORIZATION:BEARER  sinpuntos', 'jwt')).toBe('AUTHORIZATION:BEARER  …');
  });

  it('no filtra el payload ni la firma en ninguna forma del input', () => {
    for (const input of [
      JWT,
      `Bearer ${JWT}`,
      `  bearer ${JWT}  `,
      `Authorization: Bearer ${JWT}`,
      `AUTHORIZATION:   BEARER   ${JWT}`,
    ]) {
      const redacted = redactInput(input, 'jwt');
      // Control POSITIVO: el canal observado LLEVA datos y los literales de abajo apuntan a la
      // misma cadena que se está redactando — sin esto, los dos `not.toContain` pasarían vacuamente.
      expect(redacted).toContain(JWT_HEADER_SEGMENT);
      expect(input).toContain(JWT_PAYLOAD_SEGMENT);
      expect(redacted).not.toContain(JWT_PAYLOAD_SEGMENT);
      expect(redacted).not.toContain(JWT_SIGNATURE_SEGMENT);
    }
  });

  it('falla hacia el lado seguro si un `jwt` no trae los tres segmentos', () => {
    expect(redactInput('sinpuntos', 'jwt')).toBe('…');
  });

  // T2.4 (cambio de alcance aprobado, PRD §8): los kinds NO portadores de secretos siguen
  // verbatim — `text` es el fallback y redactarlo dejaría el historial ilegible entero.
  it('no redacta los kinds que no portan secretos (solo recorta espacios)', () => {
    expect(redactInput('  hola mundo  ', 'text')).toBe('hola mundo');
    expect(redactInput('  1700000000  ', 'unix_timestamp')).toBe('1700000000');
    expect(redactInput('  d9b1d7db-4b5e-4b1f-9c1a-1c2f3d4e5f60  ', 'uuid')).toBe(
      'd9b1d7db-4b5e-4b1f-9c1a-1c2f3d4e5f60',
    );
    // Un hash es un digest: NO descodifica a texto legible, así que se conserva.
    expect(redactInput('  5d41402abc4b2a76b9719d911017c592  ', 'hash')).toBe(
      '5d41402abc4b2a76b9719d911017c592',
    );
  });
});

// ─── T2.4 · redacción de `base64` ───────────────────────────────────────────────────────
// El base64 ES el texto legible codificado: conservar 4 caracteres ya son 3 bytes de
// plaintext. Por eso no sobrevive NI UN carácter del contenido, solo la longitud.
describe('redactInput · base64', () => {
  const B64 = 'SGVsbG8gV29ybGQgc2VjcmV0'; // → «Hello World secret»
  const DECODED = 'Hello World secret';

  it('no conserva NINGÚN carácter del contenido, solo la longitud', () => {
    expect(redactInput(B64, 'base64')).toBe('… (24 caracteres)');
  });

  it('no filtra ni el base64 (ni un prefijo corto) ni su contenido decodificado', () => {
    const redacted = redactInput(B64, 'base64');
    // El assert que MUERDE hoy: un prefijo corto sobrevive al truncado y estaría presente
    // si la redacción de base64 se desactivara.
    expect(redacted).not.toContain('SGVsbG8');
    expect(redacted).not.toContain(B64);
    // Cinturón y tirantes contra una fuga futura de `steps[i].output`.
    expect(redacted).not.toContain(DECODED);
    expect(redacted).not.toContain('secret');
  });

  it('la longitud distingue entradas distintas (el historial sigue sirviendo)', () => {
    expect(redactInput('SGVsbG8=', 'base64')).toBe('… (8 caracteres)');
    expect(redactInput(B64, 'base64')).not.toBe(redactInput('SGVsbG8=', 'base64'));
  });
});

// ─── T2.4 · redacción de `json` ─────────────────────────────────────────────────────────
// Se conservan claves y estructura (lo reconocible); TODOS los valores se van.
describe('redactInput · json', () => {
  it('sustituye el valor por … y conserva la clave', () => {
    expect(redactInput('{"password":"hunter2"}', 'json')).toBe('{"password":…}');
  });

  it('elide también los valores NUMÉRICOS, booleanos y null', () => {
    expect(redactInput('{"exp":1752624000,"ok":true,"n":null}', 'json')).toBe(
      '{"exp":…,"ok":…,"n":…}',
    );
    expect(redactInput('{"exp":1752624000}', 'json')).not.toContain('1752624000');
  });

  it('recorre objetos anidados y arrays', () => {
    expect(redactInput('{"user":{"email":"a@b.com"}}', 'json')).toBe('{"user":{"email":…}}');
    expect(redactInput('["hunter2","otro"]', 'json')).toBe('[…,…]');
    expect(redactInput('{"a":[]}', 'json')).toBe('{"a":[]}');
    expect(redactInput('{"a":{}}', 'json')).toBe('{"a":{}}');
  });

  it('corta la recursión en profundidad sin filtrar nada', () => {
    const deep = redactInput('{"a":{"b":{"c":{"d":"hunter2"}}}}', 'json');
    expect(deep).toBe('{"a":{"b":{"c":…}}}');
    expect(deep).not.toContain('hunter2');
  });
});

// ─── T2.4 · EL HUECO: lo que PARECE json pero el detector NO llama `json` ────────────────
// 🔴 Estos casos se prueban DESDE EL INPUT CRUDO con la cadena REAL del motor
// (`buildHistoryRecord`), nunca fijando `kind` a mano. Motivo: `detectJson()` exige parseo
// válido Y resultado no escalar, así que un `redactInput(x, 'json')` con un JSON malformado
// es un par (input, kind) que producción NO PUEDE PRODUCIR — un test verde describiendo una
// protección inexistente (el anti-patrón, forma 8 de la skill `testing`, que T2.4 vino a
// matar: dos tests así se colaron en la primera pasada de esta misma tarea).
describe('redactInput · lo que parece json pero cae en `text`', () => {
  /** Recorre el camino REAL: input crudo → motor → registro persistible. */
  const record = (input: string) => buildHistoryRecord(input, analyze(input, { now: NOW }));

  it('un JSON MALFORMADO no lo clasifica el motor como json… y aun así no deja rastro', () => {
    const input = '{"password":"leakme123"';
    // Primero, la premisa que hace válido el test: el kind que produce el DETECTOR.
    expect(inputKindOf(analyze(input, { now: NOW }))).not.toBe('json');
    // Y aun así, la fila que se persistiría no contiene el secreto.
    expect(record(input).preview).toBe('…');
    expect(JSON.stringify(record(input))).not.toContain('leakme123');
  });

  it('un escalar entrecomillado (que el motor llama `text`) tampoco sobrevive', () => {
    const input = '"supersecretvalue"';
    expect(inputKindOf(analyze(input, { now: NOW }))).not.toBe('json');
    expect(record(input).preview).toBe('…');
    expect(JSON.stringify(record(input))).not.toContain('supersecretvalue');
  });

  it('un array malformado también', () => {
    const input = '["leakme123",';
    expect(record(input).preview).toBe('…');
    expect(JSON.stringify(record(input))).not.toContain('leakme123');
  });

  it('un JSON BIEN FORMADO sí llega como `json` y conserva las claves (control positivo)', () => {
    const input = '{"password":"leakme123"}';
    const built = record(input);
    expect(built.inputKind).toBe('json');
    expect(built.preview).toBe('{"password":…}');
    expect(JSON.stringify(built)).not.toContain('leakme123');
  });

  it('el texto normal NO se redacta: la salvedad mira la forma, no traga con todo', () => {
    // Si esta regla se comiera el texto corriente, el historial dejaría de servir.
    expect(record('hola mundo').preview).toBe('hola mundo');
  });
});

// ─── T2.4 · redacción de `url` ──────────────────────────────────────────────────────────
describe('redactInput · url', () => {
  it('conserva esquema y host, y elide path, query y fragment', () => {
    expect(redactInput('https://api.example.com/reset?access_token=hunter2#frag', 'url')).toBe(
      'https://api.example.com/…',
    );
    expect(redactInput('https://api.example.com/reset?access_token=hunter2', 'url')).not.toContain(
      'hunter2',
    );
  });

  it('sin path ni query, el host solo', () => {
    expect(redactInput('https://example.com/', 'url')).toBe('https://example.com');
  });
});

describe('truncatePreview', () => {
  it('deja intacto lo que cabe', () => {
    expect(truncatePreview('corto')).toBe('corto');
  });

  it('trunca a 120 caracteres contando el marcador', () => {
    const long = 'a'.repeat(500);
    const out = truncatePreview(long);
    expect(out).toHaveLength(PREVIEW_MAX_CHARS);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('buildPreview', () => {
  it('redacta ANTES de truncar: un JWT con payload gigante no filtra nada', () => {
    // Payload largísimo: si se truncara primero, los primeros 120 chars incluirían
    // trozo de payload. Redactando primero, el preview cabe entero y no lo contiene.
    const hugePayload = 'P'.repeat(400);
    const preview = buildPreview(`${JWT_HEADER_SEGMENT}.${hugePayload}.sig`, 'jwt');
    expect(preview).toBe(`${JWT_HEADER_SEGMENT}.….…`);
    expect(preview).not.toContain('PPP');
    expect(preview.length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS);
  });

  it('nunca excede 120 caracteres, sea cual sea el kind', () => {
    expect(buildPreview('x'.repeat(1000), 'text').length).toBe(PREVIEW_MAX_CHARS);
    // T2.4: un `base64` de 1000 chars YA NO llega al truncado — la redacción lo deja en su
    // descriptor de longitud, que además no contiene ni un carácter del contenido. El
    // invariante que se protege sigue siendo el mismo (≤120), reforzado con el no-leak.
    const b64 = buildPreview('x'.repeat(1000), 'base64');
    expect(b64.length).toBeLessThanOrEqual(PREVIEW_MAX_CHARS);
    expect(b64).not.toContain('xxx');
    expect(buildPreview(`{"k":"${'x'.repeat(1000)}"}`, 'json').length).toBeLessThanOrEqual(
      PREVIEW_MAX_CHARS,
    );
  });

  it('redacta ANTES de truncar también en json: un valor gigante no sobrevive al corte', () => {
    // Si se truncara primero, los primeros 120 chars serían valor puro. Redactando
    // primero, tras la redacción NO QUEDA ningún valor que el corte pueda reintroducir.
    const preview = buildPreview(`{"secret":"${'S'.repeat(400)}"}`, 'json');
    expect(preview).toBe('{"secret":…}');
    expect(preview).not.toContain('SSS');
  });
});

describe('summarizeChain / buildHistoryRecord', () => {
  it('el resumen solo lleva {kind, transformId} — ningún valor intermedio', () => {
    const chain = analyze(`Bearer ${JWT}`, { now: NOW });
    const summary = summarizeChain(chain);

    expect(summary.length).toBe(chain.steps.length);
    for (const entry of summary) {
      expect(Object.keys(entry).sort()).toEqual(['kind', 'transformId']);
    }
    // Control negativo sobre el resumen serializado: ni el token codificado ni el
    // payload YA DECODIFICADO (que es `steps[1].input`) pueden aparecer.
    const dump = JSON.stringify(summary);
    expect(dump).not.toContain(JWT_PAYLOAD_SEGMENT);
    expect(dump).not.toContain(JWT_SIGNATURE_SEGMENT);
    expect(dump).not.toContain('1752624000');
    expect(dump).not.toContain('sub');
  });

  it('input_kind es el kind del paso 0 y el registro completo no contiene el dato', () => {
    const input = `Bearer ${JWT}`;
    const chain = analyze(input, { now: NOW });
    const record = buildHistoryRecord(input, chain);

    expect(record.inputKind).toBe('jwt');
    expect(record.chain[0]?.transformId).toBe('jwt.decode');

    const dump = JSON.stringify(record);
    expect(dump).not.toContain(JWT);
    expect(dump).not.toContain(JWT_PAYLOAD_SEGMENT);
    expect(dump).not.toContain('1752624000');
  });
});

// ─── T4.1 · barrido defensivo de JWT, INDEPENDIENTE del kind ────────────────────────────
// La fuga que cierra: pegar una petición HTTP entera cae en `text` (una cabecera con punto
// como `Host: api.example.com` da 4+ segmentos), y hasta T4.1 `text` se persistía VERBATIM
// → el payload del JWT acababa en claro en la BD. D7 promete lo contrario, y D7 manda.
describe('redactInput · barrido defensivo de JWT (T4.1)', () => {
  // La petición real del caso de uso (CU1: copiar del panel Network). El `Authorization`
  // va PRIMERO a propósito: así el JWT cae dentro de los 120 chars del preview y el
  // control negativo de `buildPreview` puede ponerse rojo de verdad (si el payload cayera
  // más allá del corte, el truncado lo borraría solo y el assert sería un centinela
  // fantasma — la lección literal de T2.3).
  const HTTP_REQUEST = [
    'GET /v1/me HTTP/1.1',
    `Authorization: Bearer ${JWT}`,
    'Host: api.example.com',
    'Accept: application/json',
  ].join('\n');

  it('el motor clasifica la petición entera como `text` (la premisa de la fuga)', () => {
    // Control POSITIVO de la premisa: si esto dejara de ser `text`, el test de abajo
    // estaría probando otra cosa distinta de la que dice probar.
    expect(inputKindOf(analyze(HTTP_REQUEST, { now: NOW }))).toBe('text');
  });

  it('redacta payload y firma del JWT aunque el kind sea `text`', () => {
    const out = redactInput(HTTP_REQUEST, 'text');
    expect(out).not.toContain(JWT_PAYLOAD_SEGMENT);
    expect(out).not.toContain(JWT);
    expect(out).toContain(`Bearer ${JWT_HEADER_SEGMENT}.….…`);
  });

  it('el payload no sobrevive tampoco al registro completo que se persiste', () => {
    const record = buildHistoryRecord(HTTP_REQUEST, analyze(HTTP_REQUEST, { now: NOW }));
    const serialized = JSON.stringify(record);
    // Control POSITIVO: el canal observado lleva datos y el grep apunta bien — algo del
    // preview SÍ aparece. Sin esto, los `not.toContain` de abajo podrían pasar vacuamente.
    expect(serialized).toContain(JWT_HEADER_SEGMENT);
    expect(serialized).not.toContain(JWT_PAYLOAD_SEGMENT);
    // Prefijos del payload: sobreviven al truncado aunque el segmento entero no (T2.3).
    expect(serialized).not.toContain(JWT_PAYLOAD_SEGMENT.slice(0, 12));
    // ⚠️ Los dos de abajo NO son los asserts que muerden: hoy NADA decodifica el payload
    // hacia el record, así que por este canal no pueden casar (son decoración en el sentido
    // de la forma 8). Se conservan a propósito como guarda de una regresión FUTURA —que
    // alguien haga que el preview transporte el JSON decodificado—, y se etiquetan aquí
    // para que nadie los confunda con la protección real, que son los dos `not.toContain`
    // del segmento base64 de arriba.
    expect(serialized).not.toContain('1752624000');
    expect(serialized).not.toContain('"sub"');
  });

  // 🔴 EL CASO QUE ROMPE UNA IMPLEMENTACIÓN INGENUA. El primer candidato con forma de JWT
  // del texto es `api.example.com`, que NO valida. Un barrido que evaluara solo el primer
  // match (o hiciera un único `exec`) se detendría ahí y dejaría pasar el JWT ENTERO.
  it('evalúa TODOS los candidatos: un token con puntos que no es JWT no detiene el barrido', () => {
    // Dos formas del mismo peligro, y la 2.ª es la que de verdad muerde:
    //  · SEPARADAS por espacio → host y JWT son dos matches independientes.
    //  · PEGADAS por punto      → son UN solo match cuyo primer segmento no valida; hasta
    //    la 2.ª vuelta de T4.1 esto devolvía el match intacto y filtraba el payload entero.
    for (const input of [`Host: api.example.com y luego Bearer ${JWT}`, `api.example.com.${JWT}`]) {
      const out = redactInput(input, 'text');
      expect(out).not.toContain(JWT_PAYLOAD_SEGMENT);
      // …y el host, que no es un JWT, sobrevive intacto (no es sobre-redacción por forma).
      expect(out).toContain('api.example.com');
    }
  });

  it('no borra nombres de host ni versiones: el discriminador es el header con `alg`', () => {
    // Si el criterio fuera la FORMA sola, estas tres entradas perderían texto legítimo:
    // el alfabeto base64url incluye letras y dígitos, así que un host ES tres segmentos.
    expect(redactInput('Host: api.example.com', 'text')).toBe('Host: api.example.com');
    expect(redactInput('node v20.11.1 en cdn.jsdelivr.net', 'text')).toBe(
      'node v20.11.1 en cdn.jsdelivr.net',
    );
    expect(redactInput('a.b.c', 'text')).toBe('a.b.c');
  });

  it('redacta varios JWT en el mismo texto, no solo el primero', () => {
    const out = redactInput(`primero ${JWT} y segundo ${JWT}`, 'text');
    expect(out).not.toContain(JWT_PAYLOAD_SEGMENT);
    expect(out).toBe(`primero ${JWT_HEADER_SEGMENT}.….… y segundo ${JWT_HEADER_SEGMENT}.….…`);
  });

  it('un JWT embebido en un `hash`/`uuid`/`unix_timestamp` tampoco filtraría', () => {
    // Estos kinds siguen verbatim A PROPÓSITO, pero el barrido es independiente del kind:
    // si un valor de esos llegara a contener un JWT, el payload no sobreviviría igualmente.
    expect(redactInput(`5d41402abc4b2a76 ${JWT}`, 'hash')).not.toContain(JWT_PAYLOAD_SEGMENT);
  });

  // La ASIMETRÍA asumida, escrita como test para que quede medida y no solo prometida.
  it('SOBRE-redacta: algo con header de JWT válido que no es un JWT pierde el resto', () => {
    // `eyJhbGciOiJub25lIn0` = {"alg":"none"} → valida como header, aunque esto no sea un token.
    const out = redactInput(`${JWT_NONE_HEADER_SEGMENT}.hola.mundo`, 'text');
    expect(out).toBe(`${JWT_NONE_HEADER_SEGMENT}.….…`);
  });

  it('SUB-redacta: forma de JWT con header que NO trae `alg` sobrevive (coste declarado)', () => {
    // Redactar por forma sola es justo lo que borraría todos los hosts; el precio es este.
    expect(redactInput('foo.c2VjcmV0bw.bar', 'text')).toBe('foo.c2VjcmV0bw.bar');
  });

  // Sin regresión: los kinds ya cubiertos por T2.4 conservan su redacción EXACTA.
  it('no cambia la redacción de `jwt`, `json`, `base64` ni `url`', () => {
    expect(redactInput(JWT, 'jwt')).toBe(`${JWT_HEADER_SEGMENT}.….…`);
    expect(redactInput(`Authorization: Bearer ${JWT}`, 'jwt')).toBe(
      `Authorization: Bearer ${JWT_HEADER_SEGMENT}.….…`,
    );
    expect(redactInput('{"password":"leakme"}', 'json')).toBe('{"password":…}');
    expect(redactInput('SGVsbG8gV29ybGQgc2VjcmV0', 'base64')).toBe('… (24 caracteres)');
    expect(redactInput('https://api.example.com/v1/me?token=abc', 'url')).toBe(
      'https://api.example.com/…',
    );
  });
});

// ─── T4.1 (2.ª vuelta) · las tres fugas que encontró `code-review` ──────────────────────
// El barrido de la 1.ª vuelta buscaba runs de 3+ segmentos NO vacíos y probaba SOLO el
// primer segmento como header. Las tres entradas de abajo se le escapaban enteras.
describe('redactInput · fugas del barrido cerradas en la 2.ª vuelta', () => {
  it('🔴 1 · JWT NO ASEGURADO (`alg:none`, firma vacía) — forma canónica del RFC 7515', () => {
    // `header.payload.` con la firma VACÍA: `detectJwt` tampoco lo acepta (segmento vacío),
    // así que cae en `text`. La rama `jwt` de `redactByKind` sí hace safe-fail con <3
    // segmentos; el barrido no lo hacía, y esa asimetría iba contra el propio principio
    // escrito en el módulo («fallar hacia el lado seguro, nunca hacia el dato»).
    const unsecured = `${JWT_NONE_HEADER_SEGMENT}.${JWT_PAYLOAD_SEGMENT}.`;
    const out = redactInput(unsecured, 'text');
    expect(out).not.toContain(JWT_PAYLOAD_SEGMENT);
    expect(out).toBe(`${JWT_NONE_HEADER_SEGMENT}.….…`);
  });

  it('🔴 2 · un prefijo pegado por PUNTO no puede esconder el JWT tras él', () => {
    // El run de puntos es greedy, así que `v2.local.<JWT>` era UN solo match cuyo header
    // (`v2`) no valida → se devolvía intacto. Ahora se prueba CADA segmento como header.
    for (const prefix of ['v2.local', 'refresh', 'api.example.com']) {
      const out = redactInput(`${prefix}.${JWT}`, 'text');
      expect(out).not.toContain(JWT_PAYLOAD_SEGMENT);
      // El prefijo, que no es dato del usuario, se conserva: sigue sin arrasar por forma.
      expect(out).toContain(prefix);
    }
  });

  it('🟡 3 · un JWT con PADDING `=` no se parte en runs que el barrido no ve', () => {
    const paddedPayload = 'eyJzdWIiOiJzZWNyZXQifQ=='; // → {"sub":"secret"}
    const out = redactInput(`${JWT_HEADER_SEGMENT}.${paddedPayload}.abc`, 'text');
    expect(out).not.toContain(paddedPayload);
    expect(out).toBe(`${JWT_HEADER_SEGMENT}.….…`);
  });

  it('el barrido es IDEMPOTENTE: aplicarlo a su propia salida no la cambia', () => {
    // `header.` (payload vacío) NO debe tratarse como un JWT a redactar: si lo hiciera,
    // la salida `Bearer header.….…` acumularía un `…` extra en cada pasada.
    const once = redactInput(`Bearer ${JWT}`, 'jwt');
    expect(redactInput(once, 'text')).toBe(once);
  });
});

// ─── T4.1 (3.ª vuelta) · la CUARTA fuga: `clave=<JWT>` ──────────────────────────────────
// La forma MÁS COMÚN de transportar un token, y la que derrotaba al discriminador. Ironía
// que conviene tener presente: `=` entró en la clase del run para cerrar la fuga del
// PADDING (2.ª vuelta), y es justo lo que pegaba el prefijo `access_token=` al header y
// abría esta. Tres correcciones cerraron tres formas y dejaron la cuarta.
describe('redactInput · `clave=<JWT>` (4.ª fuga)', () => {
  it.each([
    ['cookie', `Cookie: access_token=${JWT}`],
    ['query param', `https://api.example.com/cb?id_token=${JWT}`],
    ['form body', `grant_type=authorization_code&id_token=${JWT}`],
    ['cookie con varios pares', `Cookie: sid=abc; access_token=${JWT}; theme=dark`],
  ])('no filtra el payload cuando el JWT viaja como valor de `%s`', (_name, input) => {
    const out = redactInput(input, 'text');
    expect(out).not.toContain(JWT_PAYLOAD_SEGMENT);
    // El truncado NO rescata: `Cookie: access_token=` (21) + header (36) = 57, así que
    // quedarían ~60 chars de payload perfectamente decodificables dentro de los 120.
    expect(buildPreview(input, 'text')).not.toContain(JWT_PAYLOAD_SEGMENT.slice(0, 20));
    // La clave sigue siendo visible: es lo que hace la entrada reconocible, y no es dato.
    expect(out).toContain(JWT_HEADER_SEGMENT);
  });
});

// ─── T4.1 (3.ª vuelta) · coste ACOTADO del barrido (ReDoS) ──────────────────────────────
// `POST /api/analyze` es PÚBLICO y sin auth, y el límite de entrada (I7) son 128 KB. La
// regex de la 2.ª vuelta (`[A-Za-z0-9_=-]+(?:\.…)+`) retrocedía carácter a carácter desde
// cada posición de arranque: 128 KB sin un solo punto = ~27 s de event loop BLOQUEADO con
// UNA petición. Y el disparo no exige atacante: un dump hex o un base64 largo pegado basta.
//
// ── QUÉ SE MIDE Y POR QUÉ (T6.5: se cambió el INSTRUMENTO, y el test quedó MÁS estricto) ──
// Este test medía RELOJ DE PARED (`performance.now()`) para acotar un coste de **CPU**, y por
// eso saltó en falso tres veces (T5.4, T5.5 y T6.5) sin que nada del algoritmo cambiara: bajo
// contención el reloj de pared incluye el tiempo en que el proceso NI SIQUIERA CORRÍA, así que
// lo que medía era la carga de la máquina. La regla de oro 5 del arnés dice que un flaky se
// arregla con causa raíz, no se reintenta; el reintento era ya el patrón.
//
// Ahora se mide TIEMPO DE CPU del proceso (`process.cpuUsage()`, delta de `user + system`).
// Es inmune a la contención —solo cuenta ciclos gastados por este proceso— y conserva el poder
// de detección, porque tanto la versión cuadrática como la que se salta la cota queman su
// tiempo EN CPU, no esperando.
//
// EL PRESUPUESTO ES POR CASO, y esto NO es una comodidad: es lo que la medición obligó a
// hacer. Números de CPU medidos en la máquina de referencia (T6.5):
//
//   caso                     actual     sin la cota `MIN_JWT_HEADER_CHARS`
//   'a'  (sin puntos)         11 ms      —  (no la toca)
//   '='  (padding)             1 ms      —
//   '.'  (solo puntos)        14 ms      —
//   'a.' (segmentos de 1)     15 ms      975 ms   ← LA regresión que este test caza
//   'aaaaaaaaaaaa.' (12)     242 ms      189 ms   (está por encima de la cota: no le afecta)
//
// Un presupuesto ÚNICO tiene que caber entre 242 (lo legítimo más caro) y 975 (la regresión),
// y ahí estaba la trampa del valor viejo: 500 ms dejaba solo 2× de margen sobre el caso de
// 242 ms, que es de donde salía el flake. Subirlo a un número cómodo (1.500) habría dejado de
// cazar la regresión de 975 ms — habría sido debilitar el test de verdad, no arreglarlo.
//
// Con presupuesto por caso las dos cosas mejoran a la vez: el caso caro pasa de 2× a ~6× de
// margen (se acabó el flake aunque la máquina sea más lenta) y `'a.'` pasa de 500 ms a 200 ms,
// es decir, caza la regresión con **casi 5× de margen** en vez de 2×. Y la regresión
// cuadrática original (~27.000 ms) revienta cualquiera de los cinco presupuestos.

/** CPU (user + system) consumida por `work`, en milisegundos. NO es reloj de pared. */
function cpuMillisOf(work: () => unknown): number {
  const started = process.cpuUsage();
  work();
  const { user, system } = process.cpuUsage(started);
  return (user + system) / 1000;
}

describe('buildPreview · el barrido es lineal, no cuadrático', () => {
  // [nombre, chunk, presupuesto de CPU en ms] — el presupuesto es del CASO, con el margen
  // que justifica la tabla de arriba. Cambiar uno de estos números sin volver a medir las dos
  // columnas (actual / rota) es exactamente lo que este bloque existe para impedir.
  it.each([
    ['blob sin puntos', 'a', 200],
    ['run de `=` (padding)', '=', 200],
    ['blob de puntos', '.', 200],
    // Estas dos NO venían del informe: las encontró el benchmark de la 3.ª vuelta. Con
    // segmentos cortísimos el barrido intentaba decodificar ~65.000 candidatos; la cota
    // `MIN_JWT_HEADER_CHARS` los descarta sin tocar `Buffer.from`. 200 ms contra los 15 ms
    // reales y los 975 ms de la versión sin cota: es el caso que de verdad muerde.
    ['segmentos de 1 char', 'a.', 200],
    // Y el caso adversarial contra esa cota: segmentos JUSTO en el límite de 12. Es el más
    // caro de los cinco (~242 ms) porque su trabajo es REAL y lineal —~10.000 segmentos que
    // sí hay que mirar—, no un síntoma. Su presupuesto es el holgado por ese motivo.
    ['segmentos de 12 chars', 'aaaaaaaaaaaa.', 1500],
  ])('procesa 128 KB de «%s» dentro de su presupuesto de CPU', (_name, chunk, budgetMs) => {
    const input = chunk.repeat(Math.ceil((128 * 1024) / chunk.length));
    expect(cpuMillisOf(() => buildPreview(input, 'text'))).toBeLessThan(budgetMs);
  });

  // CONTROL POSITIVO de la propia medida. `cpuMillisOf` es un canal, y un canal que devuelve
  // siempre 0 haría pasar en vacío los cinco asserts de arriba con el algoritmo cuadrático
  // delante. Se comprueba que un trabajo de CPU deliberado SÍ se registra.
  it('la medida de CPU no está muerta: un bucle costoso sí se registra', () => {
    const busy = cpuMillisOf(() => {
      let acc = 0;
      for (let i = 0; i < 5_000_000; i += 1) acc += i;
      return acc;
    });
    expect(busy).toBeGreaterThan(0);
    expect(Number.isFinite(busy)).toBe(true);
  });
});
