# F7.1 · PRD v1.3 + planning — verificación

**Veredicto: PASS** · 2026-07-23 · coste $0 (edición de documentos, sin agentes de pago)

Cambio de alcance mayor autorizado por el usuario ("te compro la idea, actualiza PRD + Planning y desarrollalo"), editado por el bucle en sesión (regla 6). La verificación es la **lectura cruzada PRD↔planning**: cada decisión de F7 tiene su sección en el PRD, y cada sección nueva del PRD tiene su tarea en el planning.

## Cruce PRD ↔ planning

| Elemento PRD (v1.3) | ¿Dónde en el PRD? | ¿Tarea/anclaje en planning? |
|---|---|---|
| O9 — compartir la receta | §2.1 | Cabecera F7 + F7.3 (afordancia) |
| D11 — compartir la receta, nunca el dato | §4 | Cabecera F7, decisiones 1–4 |
| No-objetivo «compartir resultados» **precisado citando a D11** | §2.2 | Cabecera F7 (receta ≠ dato) |
| Afordancia de compartir + lectura de `?r=` | §7 (nota) | F7.3 |
| Imagen OG dinámica por receta | §7 (nota) | F7.4 |
| Codec de la receta (implícito en `?r=<receta>`) | §7/D11 | F7.2 |
| Fila de seguridad «Compartir receta» | §11 | F7.2 (validación estricta) + F7.3 (control negativo URL) |
| F7 en el roadmap + estado | §13 | Estado global + mapa de pantallas |
| Criterio 14.17 (round-trip, fuente/secreto no en URL) | §14 | F7.3 + F7.5 |
| Criterio 14.18 (OG contra imagen de prod, sin JS) | §14 | F7.4 + F7.5 |
| Criterio 14.19 (`?r=` inválido se ignora) | §14 | F7.3 + F7.5 |

Sin sección del PRD huérfana (todas tienen tarea) ni tarea de F7 sin respaldo en el PRD.

## Invariantes de seguridad heredados, escritos en el planning como DoD

- **El fuente y el secreto NUNCA en la URL** (ni query ni fragmento) — control negativo (grep de la URL compartida → 0) con control positivo (los ids sí están), en F7.3 y F7.5. §11/R2 idénticos.
- **La receta va en la query** (decisión del usuario sobre fragmento-solo): permite la OG rica; la receta no es sensible (= lo que §9 persiste).
- **No se aloja nada**: sin endpoint de escritura, sin tabla, sin fila (§9 no cambia). La OG la genera una ruta `opengraph-image` que lee `?r=` y no persiste.
- **Validación estricta al leer `?r=`** contra el catálogo del motor (`ENCODE_TRANSFORM_IDS`, mismo Zod que T6.10): id desconocido → se ignora, nunca un paso no reconocido.

## Juicio humano

El usuario aprobó la idea y **la decisión query-vs-fragmento** (AskUserQuestion, 2026-07-23: «En la URL (query/path) — OG rica»). El diff del PRD queda visible en el commit de este cambio de alcance.

## Gate

`pnpm gate` verde (incluye `readme:status:check`); la tabla de estado del README se regenera con `pnpm readme:status` (F6 → ✅, F7 → en construcción).
