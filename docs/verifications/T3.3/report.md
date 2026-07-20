# Verificación T3.3 — E2E de fase F3 (cierre del proyecto v1)

- **Tarea**: T3.3 · E2E de fase F3 (`planning.md`)
- **Fecha**: 2026-07-20
- **Ejecutor**: agente `verifier` · agent-browser (npx) · sesión `t3.3`
- **Sistema**: árbol de trabajo `6d2c4a9` (limpio) · producción sirviendo `684bc53` · Caddy central + Cloudflare + `docker compose -f docker-compose.prod.yml`
- **Veredicto**: 🔴 **FAIL** — 3 de las 4 cláusulas en verde; falla **el recorrido literal de 14.1 en producción**.

## Verificación esperada (literal de planning.md)

> **cierra el criterio 14.10 del PRD**: desde fuera del VPS, `https://devtools.carlosvillu.dev` con certificado válido, el recorrido de 14.1 (pegar un JWT → cadena) funciona en producción, y el backup produce un dump restaurable. Además, sin regresión: `pnpm test:e2e` completo en verde contra el entorno local. Parada de fin de fase y cierre del proyecto v1.

Criterios del PRD implicados, literales:

> **14.10** — Desde fuera del VPS, `https://devtools.carlosvillu.dev` sirve la app con certificado válido y el recorrido de 14.1 funciona en producción. Forzar el backup produce un dump legible por `pg_restore --list` (F3).
>
> **14.1** — Pegado en `/` un `Authorization: Bearer <JWT>` real, el navegador muestra en < 1 s la cadena `jwt → json` con el payload formateado y la expiración en lenguaje natural, sin que el usuario elija nada (CU1).
>
> **CU1** (PRD §3, línea 86) — **El token opaco.** Está depurando una petición fallida y tiene un `Authorization: Bearer …`. **Lo pega entero (con el prefijo `Bearer`)** y obtiene el payload del JWT formateado y la fecha de expiración en lenguaje natural ("caducó hace 3 horas").

---

## 🔴 El hallazgo que bloquea: producción no reconoce `Authorization: Bearer <JWT>`

**Lo que hice**: pegué en `/` de producción, con un **pegado real de portapapeles** (`clipboard write` + `clipboard paste` = evento `paste` del navegador, sin botón), la cadena literal que nombra 14.1:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ2ZXJpZmllci10MzMtbm90LWEtc2VjcmV0Iiwi…
```

**Lo que observé** (`12-cadena-render.txt`, `13-FALLO-authorization-bearer.png`):

```
1 paso · terminal
No se reconoció ningún formato conocido
Se intentó detectar jwt, json, base64, timestamp, url, uuid y hash.
Lo que pegaste se interpreta como texto plano: no hay nada que decodificar.
```

No hay cadena `jwt → json`. No hay payload. No hay expiración. El detector lo clasifica como `text` con confianza **0.01**.

**Aislé la causa** golpeando la API de producción con las dos variantes (`17-api-prefijo-bearer.txt`):

| Entrada pegada | Detección | Cadena |
|---|---|---|
| `Authorization: Bearer eyJ…` | `text` (0.01) | ❌ 1 paso, terminal |
| `Bearer eyJ…` | `jwt` (0.95), `jwt.decode` | ✅ 3 pasos |
| `eyJ…` (desnudo) | `jwt` (0.95), `jwt.decode` | ✅ 3 pasos |

Es decir: **el motor sí sabe quitar el prefijo `Bearer `, pero NO el nombre de cabecera `Authorization: `.** Un solo prefijo de más y el recorrido central del producto muere.

### Por qué esta es la lectura literal y no una exageración

- **14.1 nombra la cadena `Authorization: Bearer <JWT>`**, no `Bearer <JWT>` ni `<JWT>`. Es el string que el criterio manda pegar.
- **CU1 describe al usuario que copia una cabecera de una petición fallida y "la pega entero"**. Lo que se copia del panel Network de unas devtools es exactamente `Authorization: Bearer eyJ…`. Ese es el gesto real del caso de uso, y es el que falla.

**La lectura alternativa, dicha con honestidad**: el paréntesis de CU1 —"(con el prefijo `Bearer`)"— puede leerse como que "entero" significa solo *incluyendo `Bearer`*, y bajo esa lectura el producto cumple. **No resuelvo yo esa ambigüedad**: la reporto y bloquea, porque la decisión de alcance es del bucle/usuario, no del verifier. Lo que sí afirmo sin ambigüedad es el hecho observable: **la cadena literal de 14.1 no produce el recorrido de 14.1 en producción.**

### El agujero de cobertura que lo dejó pasar

Ningún test del repo ejercita la forma con `Authorization: `. **Los 14 sitios que usan un JWT de prueba usan `Bearer <jwt>`** — incluido el E2E de fase F1 que dice cerrar 14.1:

- `apps/web/e2e/phases/f1.spec.ts:31` → `const TEST_JWT = 'Bearer eyJ…'`, bajo el test *"CU1 (14.1): pegar un JWT despliega jwt → json…"*.
- Igual en `field.spec.ts:10`, `field-alternatives.spec.ts:13`, `history.spec.ts:18`, `f2.spec.ts:55`, `analyze/route.test.ts:22`, `analyze-history.test.ts:22`.

El E2E que se declara guardián de 14.1 **verifica una entrada más fácil que la que 14.1 especifica**. Por eso 27 tests en verde conviven con el recorrido roto: la suite nunca pegó la cabecera entera.

### Arreglo accionable para el implementer

En el detector (el mismo punto donde ya se recorta `Bearer `), aceptar un prefijo opcional de **nombre de cabecera HTTP** — como mínimo `Authorization:` con espacios opcionales e insensible a mayúsculas — antes del `Bearer`. Y **añadir el caso a los tests con la cadena literal de 14.1**, no con `Bearer …`: mientras el fixture sea el fácil, la regresión vuelve. Conviene revisar de paso si el mismo recorte debe aplicarse a otros kinds (una línea `Cookie: …`, un `X-Api-Key: …`).

---

## Las 3 cláusulas que SÍ pasan

### 1. Desde fuera del VPS, con certificado válido ✅

**El vantage, dicho explícitamente** (rareza metodológica heredada de T3.1: el bucle corre DENTRO del VPS, así que "desde fuera" exige un vantage prestado). Lo partí en dos y digo qué prueba cada mitad:

- **Alcanzabilidad externa**: `WebFetch` sobre `https://devtools.carlosvillu.dev` desde infraestructura de Anthropic — **genuinamente fuera** del VPS y de su red. Cargó y devolvió el contenido real de la app ("Pega algo. Lo desenreda.", el aviso de privacidad). No es un `curl` a localhost.
- **Certificado**: `openssl s_client` contra el dominio. Antes comprobé que **el dominio resuelve a IPs de Cloudflare** (`172.67.183.119`, `104.21.83.241`, `2606:4700:30…`) y **no** a la IP del VPS (`80.190.75.149`) ni a loopback — así que el certificado inspeccionado es el **público**, el mismo que ve cualquier cliente, no el del origen (`01-dns.txt`).
- **El recorrido de navegador, en cambio, se origina DENTRO del VPS** (el CUA solo puede correr aquí), aunque atraviesa Cloudflare + TLS + Caddy contra la app de producción real. No lo llamo "desde fuera": lo que demuestra es que **la app servida por el dominio funciona**, no la alcanzabilidad externa — esa la cubre el WebFetch.

Cadena verificada de verdad, no "el TLS no dio error" (`02-tls-cert.txt`):

```
depth=2 C = US, O = Google Trust Services LLC, CN = GTS Root R4    verify return:1
depth=1 C = US, O = Google Trust Services, CN = WE1                verify return:1
depth=0 CN = carlosvillu.dev                                        verify return:1
Verify return code: 0 (ok)

issuer  = C = US, O = Google Trust Services, CN = WE1
subject = CN = carlosvillu.dev
notBefore = Jun 23 07:28:49 2026 GMT
notAfter  = Sep 21 08:26:33 2026 GMT
SAN: DNS:carlosvillu.dev, DNS:*.carlosvillu.dev
```

Emisor real (GTS/WE1, cadena hasta raíz), **SAN `*.carlosvillu.dev` cubre el subdominio**, y `notAfter` 2026-09-21 está **63 días en el futuro** respecto de hoy (2026-07-20). Válido.

### 2. El backup produce un dump restaurable ✅

Ejercitado por mí, **sin citar T3.2** (`20-backup-restore-check.txt`, `21-pg-restore-list-verifier.txt`):

- **Dump nuevo forzado**: `backup.sh --restore-check` → `devtools-20260720T130603Z.dump` (8492 B, sha256 `3351ef93…`).
- **`pg_restore --list` INDEPENDIENTE** (lo corrí yo en un `postgres:16` limpio vía docker, no el del script): **RC=0**, TOC de 27 entradas, formato CUSTOM, las 4 `TABLE DATA` (`__drizzle_migrations`, `history_entry`, `session`, `user`) + constraints, índices y FKs. Legible de verdad, que es el literal de 14.10.
- **"Restaurable" ≠ "listable"**, así que además se restauró: BD desechable `devtools_restore_test` creada vacía, restaurada, comparada con producción (`__drizzle_migrations=1`, `history_entry=0`, `session=3`, `user=1`) y **destruida** al terminar (el script lo comprueba, no lo asume).

### 3. `pnpm test:e2e` completo en verde ✅

Lo ejecuté yo en esta sesión, no me apoyé en la corrida del bucle (`30-e2e.txt`): **27 passed (1.8m)**, exit 0. Incluye los E2E de fase F1 y F2.

> Con la salvedad del §Hallazgo: la suite está verde **y** el recorrido de 14.1 está roto, porque su fixture de CU1 es `Bearer …` y no la cabecera entera. "Sin regresión" se cumple; "cubre 14.1" no.

---

## La premisa producción ↔ `main`: verificada ✅

El bucle afirma que producción (`684bc53`) es funcionalmente idéntica a `main` (`6d2c4a9`), y por eso no redesplegó. **Lo comprobé**: el delta en `apps/` + `packages/` son 3 ficheros —`deploy-backup.test.ts`, `deploy-infra.test.ts` y el helper `deploy-files.ts`— y ese helper **solo lo importan los dos `*.test.ts`** (`grep` sobre `apps`+`packages`: 2 coincidencias, ambas en ficheros de test). **Cero código de runtime.** La premisa se sostiene: certificar producción certifica `main`.

Corolario incómodo pero necesario: **el defecto de 14.1 no es un problema de despliegue**. Está igual en `684bc53` y en `6d2c4a9`. Redesplegar no lo arregla.

---

## Resultado por punto

| # | Cláusula | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|---|
| 1 | Desde fuera del VPS | La app responde desde fuera | 200 + contenido real vía WebFetch (infra de Anthropic) | §1 | ✅ |
| 2 | Certificado válido | Cadena/emisor/caducidad correctos | GTS WE1 → GTS Root R4, verify=0, SAN `*.carlosvillu.dev`, vence 2026-09-21 | `02` | ✅ |
| 3 | **14.1: pegar `Authorization: Bearer <JWT>` → cadena** | Cadena `jwt → json` | **"No se reconoció ningún formato conocido", 1 paso, `text` 0.01** | `12`, `13`, `17` | 🔴 |
| 3b | 14.1 con JWT desnudo / `Bearer …` | Cadena `jwt → json` | 3 pasos, `jwt.decode` → `json.format` → terminal | `14`, `15` | ✅ |
| 3c | payload formateado | JSON pretty | Formateado a 2 espacios | `14` | ✅ |
| 3d | expiración en lenguaje natural | No solo ISO | **`exp: 2026-09-01T12:00:00Z (caduca en 1 mes)`** — el paréntesis ES lenguaje natural | `14` | ✅ |
| 3e | sin que el usuario elija nada | Sin botón ni selección | El pegado dispara el análisis solo ("pega y analiza — sin botón") | `14` | ✅ |
| 3f | < 1 s | Latencia < 1 s | 5 medidas contra producción: **0,079–0,119 s** | `18` | ✅ |
| 4 | Backup → dump legible por `pg_restore --list` | RC=0 y contenido | RC=0, 27 entradas TOC, 4 TABLE DATA; + restore real a BD desechable | `20`, `21` | ✅ |
| 5 | `pnpm test:e2e` completo verde | Suite verde | **27 passed (1.8m)**, exit 0 | `30` | ✅ |

**Estado de los criterios del PRD**: **14.10 NO cerrado** (depende de que "el recorrido de 14.1 funcione en producción"); sus otras dos mitades —dominio con cert válido desde fuera, y dump legible por `pg_restore --list`— sí quedan demostradas. **14.1 NO cerrado** en su forma literal; cerrado en la forma `Bearer <JWT>` / JWT desnudo.

## Producción: sin daño

Verifiqué el recorrido **anónimo** (14.1 no necesita sesión, y 14.8 garantiza que `/` es funcional sin cuenta), así que **no creé ninguna cuenta** ni escribí fila alguna. Estado final (`22-prod-datos-intactos.txt`): **1 usuario** (el real) y **0 filas** en `history_entry` — idéntico al baseline. El ensayo de restore corrió sobre `devtools_restore_test`, **nunca** sobre la BD viva, y esa BD fue destruida. **No se redesplegó nada.**

## Consola del navegador

**Limpia** en todo el recorrido: `console` y `errors` sin una sola entrada (`16-browser-console.txt`, vacío).

## Coste real

**$0** (estimado: $0). Sin APIs de pago: solo tráfico HTTP contra infraestructura propia, un `WebFetch`, y contenedores locales.

## Rarezas y notas

1. **Casi me como un falso PASS.** Mi primer `wait --text "jwt"` dio verde… porque el mensaje de ERROR dice "Se intentó detectar **jwt**, json, base64…". El texto del fallo contiene la palabra del éxito. Solo leer la página entera (`read`) lo destapó. Aviso para futuras verificaciones: **un `wait --text` sobre una palabra que también aparece en el estado de error no es un assert.**
2. El E2E de fase F1 declara en su cabecera que cierra 14.1 y **documenta a propósito** que la medición de "< 1 s" la hace el verifier, no el spec. Razonable. Lo que no documenta es que su fixture es más fácil que el criterio.
3. La poda de retención sigue sin ejercitar su rama de borrado en producción (21 dumps, ninguno > 14 días) — deuda ya anotada en T3.2, no de esta tarea.
4. `14.1` pide "un `Authorization: Bearer <JWT>` **real**". Usé un JWT construido por mí con `exp` elegido (2026-09-01) y firma no válida: el motor no valida firma, así que sirve; pero conviene saber que **ningún test del repo usa un JWT firmado de verdad**.

## Qué debe arreglar el implementer

1. Aceptar el prefijo de nombre de cabecera `Authorization:` (opcional, case-insensitive, espacios flexibles) antes del `Bearer` en el detector de JWT.
2. Añadir el caso a los tests **con la cadena literal de 14.1** (`Authorization: Bearer …`), y alinear el fixture de CU1 en `f1.spec.ts` con lo que el criterio manda pegar.
3. Redesplegar y re-verificar el recorrido en producción.
