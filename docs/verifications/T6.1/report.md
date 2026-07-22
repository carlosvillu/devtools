# Verificación T6.1 — Enmienda del PRD: la dirección inversa entra en el producto

- **Tarea**: T6.1 · Enmienda del PRD: la dirección inversa entra en el producto (`planning.md`, F6)
- **Fecha**: 2026-07-22
- **Ejecutor**: agente `verifier` (contexto fresco) · sin navegador (tarea de documento, sin superficie ejecutable)
- **Sistema**: commit base `ffa3e27` + working tree con la enmienda sin commitear (`PRD.md`, `README.md`, `docs/dev-loop/journal.md`, `planning.md`). Superficie verificada: **los documentos** — no hay sistema que levantar (cua.md paso 0).
- **Evidencia en esta carpeta**: `report.md`, `prd.diff` (el `git diff PRD.md` para el juicio humano), `grep-d2.txt`, `jwt-literals-check.txt`, `gate.txt`.

## Verificación esperada (literal de planning.md)

> **Verificación**: lectura cruzada PRD ↔ planning con checklist: cada decisión del bloque de F6 tiene su sección en el PRD y cada sección nueva del PRD tiene su tarea en el planning; el `grep` de las frases de D2/§2.2 devuelve texto que **cita a D10** (control de que la contradicción se cerró donde vivía, criterio de la regla 6); `pnpm gate` verde (incluye `readme:status:check`). **Juicio humano**: el usuario lee el diff del PRD y da el OK (es su producto: parada del bucle).

---

## Cláusula 1 — Checklist bidireccional PRD ↔ planning

### 1(a) Cada decisión cerrada del bloque de F6 → ¿está en el PRD, y dice lo mismo?

| # | Decisión del bloque de F6 (planning) | Dónde en el PRD | ¿Dice lo mismo? |
|---|---|---|---|
| 1 | **El motor de composición corre en el CLIENTE**; no hay `/api/compose`; motivo = el secreto de `jwt.sign` + R2; consecuencia: transformaciones puras y **síncronas** (Web Crypto es asíncrono y rompería `apply(input): TransformResult` de §6.1) | §5.3 ¶2 y ¶3 (l. 171-173), D10 (§4), §11 fila «Componer», §5.1 nota de rutas, §7 fila `/compose` | **Sí, literal**: nombra el disparador (`jwt.sign` + secreto), cita R2, y da la causa síncrona con el nombre del contrato roto (`apply(input): TransformResult`). Añade lo que no cambia: `POST /api/analyze` sigue en servidor ✅ |
| 2 | **Una sola pantalla, dos direcciones, dos URLs**; el `Segmented` cambia la URL **sin recargar**; `/analyze` = la experiencia de hoy | §7 «Nota de ruteo (v1.2)» + fila `/compose` + D10 («la misma pantalla de trabajo en dos modos, con un conmutador arriba y dos URLs») | **Sí**: incluye «cambiando la URL sin recargar», «`/analyze` es exactamente la experiencia de hoy» y «entrar directo a `/compose` da una pantalla limpia» ✅ |
| 3 | **El historial guarda la RECETA, nunca los valores**; ni fuente, ni resultado, ni secreto, **ni un preview del fuente**; reabrir restaura los pasos | §9 (bullets `direction` y «Qué se guarda de una receta»), §8 fila `history`, §7 fila `/history` | **Sí, y con el matiz difícil**: el `preview` es «etiqueta sintética generada en el SERVIDOR … **ni un solo carácter escrito por el usuario**», e `input_kind` = kind del primer paso (dato del motor). Reabrir restaura los pasos ✅ |
| 4 | **«Invertir» desde un resultado de decodificar queda DIFERIDA** — no entra en F6 | Ausencia deliberada: `grep -i "invertir"` sobre `PRD.md` → **0 coincidencias**; ninguna sección promete la afordancia contextual | **Sí (por omisión correcta)**: el PRD no promete lo diferido ✅ |
| 5 | **Sin cuenta, componer funciona entero** (D6); la cuenta solo añade el registro | §7 fila `/compose` Auth = **No**; nota de ruteo: «componer funciona entero sin cuenta (D6), que solo añade el registro de la receta»; §8: «sin sesión no se registra nada (D6)» | **Sí** ✅ |
| 6 | **Adherencia al DS obligatoria**; `ds-reviewer` en toda tarea que toque `apps/web/**` | §7 (preexistente): «Cada pantalla tendrá su mockup aprobado en `docs/mockups/` antes de implementar». No hay mención nueva | **Parcial y aceptable**: es una decisión de **proceso de implementación**, no de producto; su sitio propio es el planning (T6.2/T6.3/T6.7 la ejercen) y el PRD ya tiene la regla de mockup aprobado. No se pierde nada verificable ⚠️ (anotado, no bloqueante) |

**Búsqueda activa de contradicciones** (§5.3, §10, §11, §12/R2, §1):

| Sitio | Riesgo buscado | Hallazgo |
|---|---|---|
| §5.3 ¶1 (sin tocar) | «v1 lo ejecuta **en el servidor** … el input viaja al servidor» quedándose sin matizar | **No contradice**: el párrafo inmediatamente adyacente acota la frase a la dirección de decodificar («la mitad de decodificar no cambia») y declara la de componer en cliente |
| §11 fila `POST /api/analyze` | ¿sigue siendo la única superficie de entrada? | Correcto: la fila nueva de componer explicita que **no hay endpoint que reciba fuente ni secreto** |
| §11 «Advertencia … que el README debe llevar»: «devtools procesa lo que pegas en el servidor» | frase absoluta que ahora es falsa para la mitad nueva | **Matizada in situ por adyacencia**: el párrafo siguiente afirma lo contrario para `/compose` y prohíbe expresamente el copy falso del artboard. Queda **rareza de redacción**, no contradicción operativa |
| §10 (infra) | ¿aparece algún endpoint/servicio nuevo para componer? | Sin cambios y **coherente**: componer no añade superficie de red |
| §12 R2 | riesgo declarado como intacto mientras el PRD dice que ya se mitigó | **Correctamente anotado**: «Parcialmente ejecutado en v1.2 (D10) … La de analizar sigue en el servidor, **con este riesgo intacto**». No se sobrevende la mitigación |
| §1 Resumen ejecutivo (l. 35) | «En lugar de un catálogo de herramientas donde el usuario debe saber de antemano cuál necesita, la herramienta lo deduce» | **Tensión, no negación**: la frase describe la dirección de analizar. Lo que sí ocurre es que §1 **no menciona** la inversa. Omisión fuera de los 9 bloques de la Entrega → **rareza para el juicio humano**, no FAIL |

### 1(b) Cada sección nueva/modificada del PRD → ¿tiene tarea en el planning?

| Bloque del PRD (v1.2) | Tarea(s) que lo ejecutan | OK |
|---|---|---|
| §2.1 **O8** | T6.4–T6.7 (lo materializan), T6.11 (lo cierra en E2E) | ✅ |
| §4 **D10** + D2 matizada | Documental; es la propia T6.1. Vinculante para toda F6 | ✅ |
| §2.2 no-objetivo precisado | Documental (T6.1) | ✅ |
| §5.3 motor en cliente + puras y síncronas | T6.4 (control negativo `node:`/`crypto.subtle`/`Buffer`), T6.5 (SHA-256/MD5/HMAC en TS puro), T6.7 (motor en cliente, cero peticiones) | ✅ |
| §6.6 contratos `ComposeStepSpec`/`ComposeStep`/`ComposeResult`, `compose(source, steps, {now})`, catálogo, I9–I12 | T6.6 (contrato + Zod + I9–I12 + cap 8); catálogo repartido en T6.4 (`json.minify`, `json.stringify`, `base64.encode`, `base64url.encode`, `url.encode`) y T6.5 (`hash.sha256`, `hash.md5`, `jwt.sign`) — **las 8 entradas del catálogo están cubiertas, ninguna huérfana** | ✅ |
| §7 fila `/compose` + conmutador | T6.7 (pantalla + `Segmented` + URL sin recargar), T6.2/T6.3 (primitiva `Segmented`), T6.9 (alcanzable desde la landing) | ✅ |
| §8 `POST /api/history` con Zod estricto | T6.10 (incluye el control negativo del 400 con campo `source`) | ✅ |
| §9 columna `direction` + preview sintético | T6.10 (migración on-boot con lock + preview generado en servidor) | ✅ |
| §11 fila de seguridad de componer + advertencia de pantalla | T6.8 (copy real del `Callout` + canario con control positivo en logs, `pg_dump` y peticiones), T6.7 (cero peticiones) | ✅ |
| §14 criterios 14.14–14.16 | T6.11 (los cita uno a uno como vara del E2E de fase) | ✅ |
| §5.1 diagrama de rutas actualizado | Corrección documental de staleness (T6.1) | ✅ |
| §12 R2 anotado | Documental (T6.1) | ✅ |
| §13 filas F4/F5/F6 + «Estado (2026-07-22)» | Cierre de staleness preexistente (el PRD se había quedado en F3), pedido por el bucle | ✅ |

**Dirección inversa del control** (tareas de F6 → ¿tienen respaldo en el PRD?): T6.2/T6.3 (`Segmented`) → §7; T6.4/T6.5 → §6.6 + §5.3; T6.6 → §6.6; T6.7 → §7; T6.8 → §11; T6.9 → §7/§13; T6.10 → §8+§9; T6.11 → §14.14–14.16. **Ninguna tarea de F6 promete algo que el PRD no diga.**

**Veredicto cláusula 1: OK.**

---

## Cláusula 2 — El `grep` de D2/§2.2 cita a D10

Comando ejecutado por el verifier desde la raíz (salida íntegra en `grep-d2.txt`):

```
$ grep -n -i "una sola feature\|catálogo\|no-objetivo\|isla\|suite" PRD.md
```

Dictamen coincidencia a coincidencia:

| Línea | Texto (recortado; literal completo en `grep-d2.txt`) | ¿Cita a D10? | ¿Niega lo nuevo? |
|---|---|---|---|
| 10 | Nota de versión v1.2: «… **D10** (§4) que reconcilia a D2 sin borrarla … D2 sigue prohibiendo el catálogo navegable de utilidades sueltas (§2.2)» | **Sí** | No |
| 17 | Índice: «2. Objetivos y no-objetivos» | n/a | No |
| 35 | §1: «En lugar de un catálogo de herramientas donde el usuario debe saber de antemano cuál necesita, la herramienta lo deduce» | No | **No niega** (describe la dirección de analizar); §1 se queda sin mencionar la inversa → rareza |
| 50 | §1 tesis 2: «Las suites actuales … tratan cada utilidad como una isla» | No | No — componer refuerza la tesis (cadena vs. islas) |
| 55 / 70 | Encabezados «2. Objetivos y no-objetivos» / «2.2 No-objetivos (v1)» | n/a | No |
| 72 | **La viñeta que era la contradicción**: «Catálogo de herramientas independientes … Esta es la decisión estructural del producto (D2)» | Su sub-viñeta adjunta (l. 73) | No |
| 73 | «**PRECISADO en v1.2 (2026-07-22), por D10.** … sigue vigente y no se relaja … no es un menú de herramientas: es la misma cadena recorrida en el otro sentido … **Ver D10**» | **Sí, dos veces** | No |
| 104 | **La otra contradicción**: fila D2 en §4, con «**MATIZADA por D10 (2026-07-22, v1.2)**: … «una sola feature» hay que leerla como una sola idea … no se reescribe la decisión: se anota su evolución» | **Sí** | No |
| 291 / 325 | §6.6: «Transform.id del catálogo de codificación» / «Catálogo de transformaciones de codificación» | Contexto D10 | No (uso técnico) |
| 388 / 411 | §7 y §8: «la paleta agrupada del catálogo de §6.6» / «ids validados contra el catálogo del motor» | Contexto D10 | No |

**Los dos sitios donde vivía la contradicción — la fila D2 de §4 (l. 104) y el no-objetivo de §2.2 (l. 72-73) — citan a D10 explícitamente, y la reconciliación está escrita ALLÍ, no solo en la sección nueva.** Ninguna coincidencia restante niega la dirección inversa.

**Veredicto cláusula 2: OK.**

---

## Cláusula 3 — `pnpm gate` verde

Ejecutado por el verifier desde la raíz, en aislamiento (`ps aux` previo: **ningún vitest ni gate concurrente**). Salida íntegra en `gate.txt`:

```
$ pnpm lint && pnpm typecheck && pnpm format:check && pnpm knip && pnpm readme:status:check && pnpm test
eslint .                → sin errores (solo el warning conocido de multiple tsconfig)
tsc --noEmit ×5         → Done (root, apps/web, packages/{core,db,test-utils})
prettier --check .      → All matched files use Prettier code style!
knip                    → sin hallazgos
readme:status:check     → la tabla del README coincide con planning.md ✓
vitest run              → Test Files 61 passed (61) · Tests 679 passed (679) · 75.83s
```

Sin flakes: `redact.test.ts` («barrido lineal < 500 ms») pasó a la primera, sin contención.

**Veredicto cláusula 3: OK.**

---

## Cláusula 4 — Juicio humano: **PENDIENTE** (no lo puede dar el verifier)

Evidencia preparada: **`docs/verifications/T6.1/prd.diff`** (el `git diff PRD.md` completo, 148 líneas de cambio).

### Qué promete ahora el PRD que antes no prometía (lenguaje de producto)

1. **devtools deja de ir en una sola dirección.** Además de deshacer capas, se compromete a **construirlas**: el usuario escribe un valor y encadena transformaciones que **elige él** (`json.minify`, `json.stringify`, `base64.encode`, `base64url.encode`, `url.encode`, `hash.sha256`, `hash.md5`, `jwt.sign`) hasta un resultado copiable, viendo cada paso y su tipo. Es el objetivo nuevo **O8**.
2. **Sigue siendo un solo producto, no una caja de herramientas.** D2 **no se borra**: se anota que «una sola feature» significa «una sola idea», y el no-objetivo del catálogo se mantiene vigente — no habrá rejilla, ni buscador de herramientas, ni una página por transformación. Si algún día apareciera un índice navegable de utilidades sueltas, el PRD dice que eso **sí** violaría D2.
3. **Una promesa de privacidad nueva y fuerte, escrita como compromiso verificable**: lo que compones **no sale de tu navegador**. No existe endpoint que reciba el texto fuente ni el secreto de firma; durante una composición completa la pestaña de red debe registrar **cero peticiones**. Convierte una mitigación que el PRD tenía como «fase futura viable» (R2) en algo **ya ejecutado para la mitad nueva** — sin exagerar: analizar sigue en el servidor y su riesgo sigue intacto.
4. **Consecuencia técnica asumida, con causa escrita**: por correr en el navegador, hashes y firma se implementan en TypeScript puro (nada de `node:crypto` ni Web Crypto, asíncrono, que rompería el contrato del motor). Se verifican contra vectores publicados, no contra la propia implementación.
5. **Componer funciona entero sin cuenta.** La cuenta solo añade que el historial guarde la **receta** —la lista de pasos— y **nada más**: ni el texto, ni el resultado, ni el secreto, ni una vista previa con caracteres del usuario (la etiqueta la fabrica el servidor: «compuesto · 2 pasos»). Reabrir una receta devuelve los pasos, no el dato: no se restaura porque nunca se guardó.
6. **Una sola pantalla de trabajo con dos direcciones y dos URLs.** `/analyze` es exactamente la experiencia de hoy; `/compose` es la misma pantalla en el otro modo, y el conmutador cambia la URL sin recargar.
7. **El PRD deja de ir por detrás del desarrollo.** El mapa de fases se había quedado en F3 mientras se trabajaba en F6: ahora incluye F4, F5 y F6 con su estado, y el diagrama de rutas refleja que `/` es la landing y la pantalla de trabajo vive en `/analyze`.
8. **Lo que expresamente NO promete**: nada sobre «invertir» desde un resultado ya decodificado (fuera de esta versión), y ningún algoritmo de firma que no sea HS256.

### Control de honestidad sobre el token del mockup (trampa conocida)

El ejemplo trabajado de §6.6 **no fija el literal decorativo** `SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c` como salida esperada: lo declara **hueco a propósito** (`<firma HMAC-SHA256 en base64url>`), explica por qué el literal del artboard es irreproducible (firma canónica de jwt.io sobre otro payload) y remite el golden a vectores publicados + **control cruzado con `node:crypto`**.

Los dos segmentos que el PRD **sí** fija como literales exactos fueron recalculados por el verifier (`jwt-literals-check.txt`):

```
header:  {"alg":"HS256","typ":"JWT"}                                   → base64url idéntico al del PRD ✓
payload: {"sub":"1","name":"carlos","role":"admin","iat":1752537600}   → base64url idéntico al del PRD ✓
iat 1752537600 == 2025-07-15T00:00:00.000Z (el `now` declarado)        ✓
```

**No hay ningún dato falso ni ningún golden imposible en el PRD.**

### Lo que el usuario debe mirar en el diff

- La redacción de **D10** y la matización de **D2** (¿es la evolución que quiere para su producto?).
- La **promesa de privacidad de §11** (es pública, y T6.8/T6.11 la van a verificar con canarios).
- El **catálogo de §6.6**: si sobra o falta alguna transformación, este es el momento (T6.4/T6.5 la implementarán tal cual).
- La cabecera: **v1.2 se marca «(aprobado)» con fecha 2026-07-16**, siguiendo la convención que fijó v1.1 (mismo campo, con la nota de cambio fechada aparte) y que la subtarea pedía expresamente («como se hizo en v1.1»). Tu OK todavía está pendiente: confirma que la convención te vale, o ajusta el tag/fecha al aprobar.

---

## Resultado observado vs esperado

| # | Esperado (literal de la Verificación) | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1a | Cada decisión del bloque F6 tiene su sección en el PRD y dice lo mismo | 5 de 6 literalmente; la 6ª (adherencia al DS) es decisión de proceso y vive en el planning, con la regla de mockup ya en §7 | Tabla 1(a) | ✅ |
| 1b | Cada sección nueva del PRD tiene su tarea en el planning | 10/10 bloques con tarea (T6.2–T6.11); 3 correcciones documentales sin tarea, correctamente | Tabla 1(b) | ✅ |
| 1c | Sin frases que nieguen lo nuevo (§5.3, §10, §11, R2) | Ninguna contradicción operativa; 2 rarezas de redacción anotadas | Tabla de contradicciones | ✅ |
| 2 | El grep de D2/§2.2 devuelve texto que cita a D10 | l. 73 y l. 104 citan a D10 explícitamente; ninguna otra coincidencia niega lo nuevo | `grep-d2.txt` | ✅ |
| 3 | `pnpm gate` verde (incluye `readme:status:check`) | Verde entero: 61 ficheros / 679 tests, readme:status ✓ | `gate.txt` | ✅ |
| 4 | **Juicio humano**: el usuario lee el diff del PRD y da el OK | **PENDIENTE** — evidencia preparada (`prd.diff` + resumen en lenguaje de producto) | `prd.diff` | ⏳ |

## Rarezas (no bloquean, pero van al report)

1. **§1 (Resumen ejecutivo) no se actualizó.** Sigue describiendo devtools como «una utilidad web de un solo campo … la herramienta lo deduce». No niega la dirección inversa (habla del flujo de pegar), pero quien solo lea §1 no se entera de que existe componer. Fuera de los 9 bloques de la Entrega; candidato a un retoque de una frase cuando el usuario dé el OK.
2. **§11, «Advertencia de producto que el README debe llevar»**: «devtools procesa lo que pegas en el servidor» sigue siendo absoluta. El párrafo siguiente la acota para `/compose`, y el README publicado también, así que no engaña; pero aislada ya no es cierta para todo el producto.
3. **§7: la tabla de rutas no tiene fila `/analyze`.** La fila `/` sigue describiendo la pantalla de trabajo y una nota en prosa aclara que desde F5 esa pantalla vive en `/analyze` mientras `/` es la landing. Está declarado, no oculto, pero la tabla queda menos legible que el diagrama de §5.1 (que sí lista `/analyze`).
4. **Nomenclatura del campo del paso**: §6.6 lo llama `transform` en `ComposeStepSpec`/`ComposeStep`, mientras §8 y §9 hablan de `transform_id` para la receta persistida (coherente con el `chain` preexistente). No es un error —son capas distintas— pero T6.6/T6.10 deben mapear a conciencia.
5. **`planning.md` llega a la verificación con cambios sin commitear** (la desviación del `SIGNED` decorativo en el bloque de F6 y las Verificaciones de T6.5/T6.6 reescritas para no asertar contra ese literal). Son cambios del bucle, no del implementer (que solo tocó `PRD.md` y `README.md`), y van **en la dirección correcta**: eliminan un golden imposible antes de que se escriba el test. Se anota porque el diff de la tarea no es solo el del implementer.

## Coste real

**$0** en APIs de pago (D8: el proyecto no consume ninguna; sin ledger de gasto). Coste estimado en planning: **$0** → sin desviación. Coste de agentes: 1 sesión de verifier, sin navegador, con una ejecución de `pnpm gate`.

## Veredicto

**PASS de la parte automatizable, con el JUICIO HUMANO PENDIENTE.** Las tres cláusulas ejecutables se cumplen: el checklist bidireccional cierra en las dos direcciones (los 9 bloques de la Entrega están escritos y cada uno tiene tarea que lo ejecuta), la reconciliación de D2 está anotada **donde vivía la contradicción** (§4 fila D2 y §2.2, ambas citando a D10) y no solo en la sección nueva, y `pnpm gate` está verde con `readme:status:check` incluido. La pieza de valor de la tarea —reconciliar D2 en vez de limitarse a añadir §6.6— **está hecha**. El ejemplo trabajado de §6.6 **no** fija el literal decorativo del artboard como golden: lo deja como hueco declarado y remite al control cruzado con `node:crypto`, evitando sembrar un test imposible en T6.5/T6.6.

Anotación revisada y **no bloqueante**: la cabecera etiqueta v1.2 como «(aprobado)» antes del OK del usuario, pero es la convención prescrita por la propia subtarea («como se hizo en v1.1») y que v1.1 ya usó con la misma fecha de aprobación original; §13 («F6 en construcción») se refiere a la **fase**, no al estado de aprobación del documento — no hay contradicción interna. Se pone delante del aprobador en la sección de juicio humano, que es donde es accionable.

**La tarea NO puede marcarse `[x]` hasta que el usuario lea `prd.diff` y dé el OK** (parada del bucle prevista por la propia Verificación). Cinco rarezas quedan anotadas arriba por si el usuario quiere resolverlas en el mismo OK.
