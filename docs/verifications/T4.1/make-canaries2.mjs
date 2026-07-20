// Lote 2: el padding REAL (el lote 1 fue un fantasma: {"alg":"HS256","typ":"JWT"} son 27
// bytes, divisibles por 3, asi que base64 NO genera '='), el residual declarado y la
// no-regresion.
const b64u = (s) => Buffer.from(s).toString('base64url');
const b64p = (s) => Buffer.from(s).toString('base64'); // con padding '='

const mk = (hdrJson, marker) => {
  const h = b64p(hdrJson);
  const p = b64u(JSON.stringify({ c: marker, sub: 'verifier', exp: 1799999999 }));
  return { headerJson: hdrJson, header: h, payload: p, marker, pads: (h.match(/=/g) || []).length,
           token: `${h}.${p}.c2lnbmF0dXJlLXZlcmlmaWVy` };
};

// 26 bytes -> 1 '='; 25 bytes -> 2 '=='
const pad1 = mk('{"alg":"HS256","typ":"JW"}', 'CANARYPAD1x41');
const pad2 = mk('{"alg":"HS256","typ":"J"}', 'CANARYPAD2x41');

// Residual DECLARADO: ningun segmento decodifica a JSON con `alg` -> SOBREVIVE a proposito.
const secret = b64u('super-secret-CANARYRESIDUAL41-value');
const residual = { marker: 'CANARYRESIDUAL41', b64: secret, input: `foo.${secret}.bar` };

const noRegress = 'Host: api.example.com v20.11.1 semver 1.2.3-rc.1 sha256 a1b2c3d4e5f6071829304a5b6c7d8e9f0a1b2c3d4e5f6071829304a5b6c7d8e9 md5 5d41402abc4b2a76b9719d911017c592 uuid 550e8400-e29b-41d4-a716-446655440000';

console.log(JSON.stringify({ pad1, pad2, residual, noRegress,
  inputs: {
    pad1: `GET /v1/me HTTP/1.1\nAuthorization: Bearer ${pad1.token}\nHost: api.example.com`,
    pad2: `GET /v1/me HTTP/1.1\nAuthorization: Bearer ${pad2.token}\nHost: api.example.com`,
    cookiepad: `GET /v1/me HTTP/1.1\nCookie: access_token=${pad1.token}\nHost: api.example.com`,
    residual: residual.input,
    noRegress,
  } }, null, 2));
