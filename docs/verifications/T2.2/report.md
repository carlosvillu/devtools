# Verificación T2.2 — La pantalla `/history`

- **Tarea**: T2.2 · La pantalla `/history` (`planning.md`, fase F2)
- **Fecha**: 2026-07-19
- **Autor de la verificación**: subagente `verifier` (contexto fresco).
  **Nota de procedencia**: el harness bloqueó al verifier la escritura de ficheros `.md`, así
  que el bucle persiste aquí su informe tal como lo emitió. Las evidencias binarias y de
  texto sí las escribió él directamente en esta carpeta. El veredicto y los números son
  suyos, no del bucle.
- **Veredicto de la primera pasada**: **FAIL** (ver el addendum al pie para el estado final)

## Verificación (literal de planning.md)

> en el navegador con sesión, analizar algo → aparece en `/history` con la vista previa
> redactada (criterio 14.8); reabrir muestra la cadena y el aviso de que el dato no se
> restaura; borrar funciona; con una segunda cuenta, `/history` está vacío y un
> `GET /api/history` manipulando el id de usuario **no devuelve entradas ajenas**;
> comparación visual contra `docs/mockups/history.html` (regla 7).

## Resultado por punto

| # | Esperado | Observado | OK |
|---|---|---|---|
| 1 | Analizar con sesión → aparece en `/history`, preview redactada (14.8) | Preview `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.….…` — solo header; payload y firma → `…`. El `name`/`email` del payload no están ni en UI ni en `psql` | ✅ |
| 2 | Reabrir muestra cadena + aviso D7 | Diálogo con `jwt→json→json` y texto explícito «no el dato original… el valor no se restaura» | ✅ |
| 3 | Borrar (una y todas) | Una: fuera de lista y de `psql`. Todas: `EmptyState`, 0 filas de Alice, **las 3 filas ajenas sobrevivieron** | ✅ |
| 4 | 2ª cuenta vacía + `GET` manipulando id no filtra | Bob vacío con 4 usuarios teniendo filas; **11 vectores, 0 fugas** | ✅ |
| 5 | Comparación visual vs mockup | Fidelidad alta; única diferencia = estado de sesión del header | ✅ |

**Coste real**: $0 (vs estimado $0) — ninguna API de pago interviene.

## Causa del FAIL (primera pasada)

**Cookie `devtools_session` malformada (no-UUID) → HTTP 500 en `/api/history`, en vez de 401.**

| Cookie | Esperado | Observado |
|---|---|---|
| uuid válido inexistente | 401 | **401** ✅ |
| vacía | 401 | **401** ✅ |
| `basura` | 401 | **500** `{"code":"internal"}` ❌ |
| `x' OR 1=1--` | 401 | **500** ❌ |

**Por qué bloquea, y no es «fuera de alcance»**: el 🔴 requisito no negociable de T2.2 nombra
literalmente `devtools_session=x` —una cookie **no-uuid**— como el caso canónico de cookie
forjada que `validateSession` debe resolver. Es exactamente la clase que se observó fallando.
Y `withSession` **nace en T2.2**: esta tarea es la que pone viva esa ruta protegida. Además
`with-session.ts` afirma por escrito «Una cookie forjada no encuentra fila → null → 401», lo
cual solo es cierto para UUIDs bien formados.

**La propiedad de seguridad se sostiene**: la cookie forjada **no entra**, no hay bypass ni
fuga. El bloqueo es por **corrección de la ruta de autenticación** (500 vs 401, excepción no
gestionada que contradice el contrato del propio código), no por una brecha.

**Causa raíz**: `withSession` → `validateSession` → `getSessionById` monta
`eq(session.id, <cookie cruda>)` contra una columna `uuid`; Postgres lanza error de cast, cae
en el `catch` genérico y sale como 500. No se valida la **forma** antes de ir a la BD.

**Fix accionable**: en `validateSession`/`resolveSession`, si el valor no es UUID → devolver
`null` (⇒ 401) **sin tocar la BD**. Añadir test «cookie no-UUID ⇒ 401, nunca 500»: la suite
actual solo cubre el uuid bien formado. Incoherencia colateral que el fix cierra: la página
`/history` sí lo gestiona bien (307 a `/login`), la API no.

## Los 5 arreglos previos: verificados, todos hacen lo que dicen

1. **Cursor compuesto**: sembrado por **SQL crudo** (obligatorio: `Date` trunca a ms, JS no
   puede producir el escenario) 6 filas, 3 compartiendo el milisegundo `.500`
   (`.500900/.500500/.500100`). Paginando entera con `limit=2`: **6 recuperadas, 6 distintas,
   6 en BD — sin hueco**. El cursor viaja con los 6 dígitos (`.500900Z`). `before` sin
   `beforeId` → **400**; e inversa → 400; inyección `' OR 1=1--` → 400 `Invalid UUID`.
2. **Vacío ≠ error**: no dice «vacío», «Borrar todo» ausente, **«Reintentar» pulsado 3 veces**
   siempre re-habilitado, y **recupera la lista de verdad** al restaurar el servidor.
3. **`withSession`**: `request_id` en todos los envelopes de error; logs con
   `route: "/api/history"` + `request_id`.
4. **Guarda de loopback**: comprobación **independiente del verifier**, 0 fallos. Rechaza
   `localhost.evil.com`, `127.0.0.1.evil.com` **y** vectores que el test del implementer no
   cubre (`localhost@evil.com`, `sub.localhost.evil.com`, `mylocalhost`, `127.0.0.11`,
   `evil.com#localhost`). Igualdad exacta confirmada.
5. **DS/a11y**: **0** elementos en `a button, button a, a [role=button], button button`, en
   lista y en `EmptyState`; el CTA es `<a href="/">` con 0 `<button>` dentro.

## Suites (ejecutadas por el verifier)

- `pnpm gate` → **verde**: **575 tests / 58 ficheros** (61.7 s), + lint, typecheck, format,
  knip, readme.
- `pnpm test:e2e` → **verde**: **25 passed** (1.6 m), incluidos los 6 specs nuevos de
  `history.spec.ts`.
- Consola del navegador: **0 `[error]`, 0 `[warning]`**.
- Contraste WCAG en **ambos temas**, normalizando `lab()`/`oklch()` a sRGB por canvas (un
  regex `rgb()` habría dado un falso «todo OK» sobre 2 elementos): todo pasa. Danger
  blanco/rojo **5.41**; badges 6.25–12.58; el más justo, eyebrow «tu cuenta» **4.62** vs 4.5.

## Evidencias en esta carpeta

`01-history-lista-alice.png`, `02-reabrir-aviso-d7.png`, `03-confirmar-borrado-uno.png`,
`04-tras-borrar-uno.png`, `05-emptystate-tras-borrar-todo.png`,
`06-history-vacio-segunda-cuenta.png`, `07-estado-error-bd-caida.png`,
`08`–`10-reintentar-*.png`, `11-recuperado-tras-reintentar.png`, `12-history-tema-oscuro.png`,
`13-dialogo-peligro-{light,dark}.png`, `14-mockup-history.png`, `isolation-attacks.txt`,
`isolation-delete.txt`, `revoked-cookie.txt`, `cookie-malformada.txt`, `pagination-gap.txt`,
`cursor-validation.txt`, `loopback-guard-check.mjs` + `.txt`, `contraste.txt`,
`browser-console.txt`.

## Rarezas y deuda (del verifier; aunque los 5 puntos pasen)

1. **La rama `loadFailed` es inalcanzable por caída de BD.** Parar Postgres **no** produce el
   estado de error: `getServerSession()` captura y devuelve `null` → **redirige a `/login`**.
   El modo de fallo más probable en producción sugiere al usuario que su sesión caducó cuando
   sigue viva. Se provocó el estado con `INTERNAL_API_URL=http://127.0.0.1:9` y la BD sana.
   Merece decisión deliberada.
2. **La redacción del preview es solo para `jwt`.** Un base64 de ≤120 chars se persiste
   **verbatim** (se guardó un `SGVsbG8g…` que descodifica a texto legible). **No
   co-bloqueante**: esa política nació y se verificó en **T2.1**, no es de T2.2 relitigarla,
   mientras que el 500 vive en el `withSession` **nuevo de T2.2** y sobre su ruta 🔴.
3. **Warning preexistente de `instrumentation.ts`** (Edge Runtime / `process.cwd`, `node:fs`):
   de T0.x, reconocido en el propio fichero; las migraciones on-boot funcionan. Que no se
   normalice.
4. Contraste ajustado en el eyebrow (4.62 vs 4.5): cualquier retoque a la baja de
   `text-subtle` lo tumba.
5. Quedan en la BD de **dev** 7 filas de `alice-t22@…` y las cuentas `alice-t22@` /
   `bob-t22@test-not-a-secret.dev`.

**Seguridad del entorno**: el verifier comprobó el cableado de BD **antes** de cualquier
operación destructiva (`apps/web/.env` → 5433; el `.env` de raíz **no define `DATABASE_URL`**).
No tocó el `.env` de raíz, ni `devtools-web-1`, ni `devtools-postgres-1`, ni el volumen de
prod; todo `psql` fue dentro de `devtools-dev-postgres-1`; el único proceso terminado se acotó
**por PID** propio, nunca `pkill`. Producción siguió sirviendo HTTP 200.

---

## Addendum — re-verificación tras el arreglo (2026-07-19)

**Veredicto revisado: PASS.** El defecto que bloqueaba (cookie `devtools_session` malformada ⇒ 500 en vez de 401) está corregido y confirmado contra el sistema levantado. Ningún punto previamente verificado ha regresado.

**Arreglo verificado**: guarda de forma UUID en `resolveSession` (`apps/web/src/server/session.ts`) **antes** de consultar la BD ⇒ `null` ⇒ 401. La altitud es la correcta: `resolveSession` es el cuello de botella común de `validateSession` (API) y `getServerSession` (páginas), así que la guarda cubre `/api/history`, la página `/history` y el registro de historial de T2.1 de una vez; en el handler habría quedado expuesta la próxima ruta protegida. Además queda junto al comentario que declaraba el contrato incumplido.

### Batería de cookies malformadas — 16 vectores, 16 × 401, cero 500
`basura`, `x` (el literal del 🔴), `x' OR 1=1--`, uuid a medias, uuid sin guiones, no-hex, demasiado largo, con espacio final, `…::text`, con null byte, unicode, solo guiones, numérica, JSON, path traversal y una de 4 KB. Todas → `401 {"code":"unauthorized"}`. Evidencia: `cookie-malformada-refix.txt`.

Ampliación no solicitada: `DELETE` (borrar todo y borrar fila ajena) con cookie malformada → **401** con recuento global **10 → 10 sin cambios**; página `/history` con cookie malformada → **307 → /login?next=/history** (ni 500 ni acceso). Evidencia: `malformada-delete-y-pagina.txt`.

### Indistinguibilidad (malformada vs forjada bien formada) — se sostiene
- **Cuerpo idéntico** byte a byte normalizando `request_id`.
- **Cabeceras idénticas** (excluyendo `Date`): mismo status, `content-type` y `vary`.
- **Timing no distinguible**: 34.18 ms (malformada) vs 36.36 ms (forjada), ~2.2 ms. El ruido de fondo medido con la MISMA cookie en dos tandas es 29.31 → 35.62 ms (**6.3 ms**), casi el triple de la diferencia entre tipos. La diferencia existe en principio (la malformada se ahorra el viaje a la BD) pero queda enterrada en la varianza; no es un oráculo práctico.
Evidencia: `indistinguibilidad.txt`.

### No-regresión de lo ya verificado
| Comprobación | Resultado |
|---|---|
| Punto 1 · preview redactada | ✅ JWT nuevo con payload distintivo; **0 filas** en la tabla contienen `POSTFIX`/`privado`/`Secreto` |
| Punto 2 · reabrir + aviso D7 | ✅ cadena `jwt→json→json` + aviso explícito |
| Punto 3 · borrar una / todas | ✅ 8→7 con diálogo cerrado; borrar todo → `EmptyState`, Alice 0, **3 filas ajenas intactas** |
| Punto 4 · 2ª cuenta + 11 vectores | ✅ Bob vacío con 4 usuarios con filas; 11/11 sin fuga; `DELETE` ajeno → **404 y la fila sobrevive** |
| Punto 5 · comparación visual | ✅ sin cambios (el arreglo no toca UI) |
| Cookie forjada (uuid válido) | ✅ 401 |
| Cookie revocada tras logout | ✅ sesión 0 en BD; API 401, página 307→/login, `DELETE` 401, datos intactos |
| Hueco de paginación | ✅ re-sembrado con µs en el mismo ms: 6 recuperadas / 6 distintas / 6 en BD; `before` sin `beforeId` → 400 |
| Guarda de loopback | ✅ script independiente: 0 fallos |
| Consola del navegador | ✅ 0 errores, 0 warnings |
| `pnpm gate` | ✅ **579 tests / 58 ficheros** |
| `pnpm test:e2e` | ✅ **25 passed** |

Evidencias: `isolation-attacks-refix.txt`, `revoked-cookie-refix.txt`, `pagination-gap-refix.txt`, `browser-console-refix.txt`, `15-refix-lista-alice.png`, `16-refix-reabrir-d7.png`, `17-refix-tras-borrar-una.png`, `18-refix-emptystate.png`, `19-refix-bob-vacio.png`.

El test añadido (`apps/web/test/integration/api/history.test.ts`) se leyó, no se ejecutó a ciegas: sus asserts muerden (`status 401` + envelope tipado + `not.toHaveProperty('entries')`). No se hizo control negativo mutando código —está prohibido para el verifier— y no hacía falta: el 500 **antes** y el 401 **después** se observaron empíricamente contra el sistema levantado, que es evidencia más fuerte que un test mutado.

### Rareza nueva (menor, PREEXISTENTE, no bloquea)
El 401 de `/api/history` **sin ninguna cookie de sesión** (o con otra cookie cualquiera) sale **sin `request_id`**: lo emite el middleware de Edge (`proxy.ts` líneas 33-36, `Boolean(cookie)` → envelope `{code,message}`), que corta antes de `withSession`. Cuando la cookie **está presente** —malformada o forjada— la petición llega a `withSession` y el 401 **sí** lleva `request_id`. No lo introduce este arreglo (`proxy.ts` no está en el diff) y **no rompe la indistinguibilidad** que importa: malformada y forjada son idénticas entre sí. Es un hueco de observabilidad: ese 401 no se puede correlacionar en los logs. Evidencia: `request-id-401.txt`.

### Rarezas anteriores que siguen abiertas
Siguen vigentes y sin cambios las anotadas arriba: (1) la rama `loadFailed` es inalcanzable por caída de BD, (2) la redacción del preview es solo para `jwt` (base64 verbatim, política de T2.1), (3) el warning de `instrumentation.ts` en Edge Runtime, (4) el contraste ajustado del eyebrow (4.62 vs 4.5).

**Coste real**: $0 (vs estimado $0).
