// Canarios propios del verifier (T4.1). NO reutiliza los fixtures del implementer.
// Cada payload lleva su marcador ÚNICO al PRINCIPIO del JSON, para que el segmento
// base64 crudo diverja desde los primeros caracteres y el grep sea discriminante.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

function jwt(marker, { alg = 'HS256', sig = 'c2lnbmF0dXJlLXZlcmlmaWVy', pad = false } = {}) {
  let h = b64({ alg, typ: 'JWT' });
  if (pad) h = Buffer.from(JSON.stringify({ alg, typ: 'JWT' })).toString('base64'); // con '='
  const p = b64({ c: marker, sub: 'verifier', exp: 1799999999 });
  return { token: `${h}.${p}${sig === '' ? '.' : `.${sig}`}`, header: h, payload: p, marker };
}

const forms = {
  http:    jwt('CANARYHTTP41'),
  algnone: jwt('CANARYNONE41', { alg: 'none', sig: '' }),
  paseto:  jwt('CANARYPASETO41'),
  padding: jwt('CANARYPADDING41', { pad: true }),
  cookie:  jwt('CANARYCOOKIE41'),
  query:   jwt('CANARYQUERY41'),
  form:    jwt('CANARYFORM41'),
};

const inputs = {
  http: `GET /v1/me HTTP/1.1\nAuthorization: Bearer ${forms.http.token}\nHost: api.example.com\nAccept: application/json`,
  algnone: `GET /v1/me HTTP/1.1\nAuthorization: Bearer ${forms.algnone.token}\nHost: api.example.com`,
  paseto: `GET /v1/me HTTP/1.1\nAuthorization: Bearer v2.local.${forms.paseto.token}\nHost: api.example.com`,
  padding: `GET /v1/me HTTP/1.1\nAuthorization: Bearer ${forms.padding.token}\nHost: api.example.com`,
  cookie: `GET /v1/me HTTP/1.1\nCookie: access_token=${forms.cookie.token}\nHost: api.example.com`,
  query: `GET /cb?id_token=${forms.query.token}&state=x HTTP/1.1\nHost: api.example.com`,
  form: `POST /token HTTP/1.1\ngrant_type=refresh&id_token=${forms.form.token}&x=1\nHost: api.example.com`,
};

const out = { forms, inputs };
console.log(JSON.stringify(out, null, 2));
