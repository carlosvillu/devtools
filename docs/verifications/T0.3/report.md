# Verificación T0.3 — Drizzle y migración inicial

- **Tarea**: T0.3 · Drizzle y migración inicial (`planning.md`)
- **Fecha**: 2026-07-18
- **Ejecutor**: verifier (contexto fresco) · backend-only (psql/scripts, sin navegador)
- **Sistema**: working tree del árbol T0.3 sin commitear (HEAD `1de53fa` + cambios de `packages/db`, `packages/test-utils`, PRD/planning). BD de test = **Postgres 16 VACÍO levantado con Testcontainers** (puerto efímero en loopback). **NO se tocó dev ni prod**: `docker-compose.dev.yml` usa `name: devtools` + contenedor `devtools-postgres-1`, que es EXACTAMENTE el contenedor de PRODUCCIÓN vivo → levantar el dev lo habría recreado. Por eso Testcontainers (aislado, autolimpiante), tal como recomienda la ficha.

## Verificación esperada (literal de planning.md)
> `pnpm db:migrate` sobre una BD vacía crea las 3 tablas (`psql \dt` las lista con sus índices); un script de smoke inserta un `user` y lo lee de vuelta; insertar un segundo `user` con el mismo email en distinta capitalización **falla** (control negativo que prueba la decisión de unicidad).

## Pasos ejecutados (script `verify.mts`, salida en `verify-output.txt`)
1. Levantar Postgres 16 vacío (Testcontainers) → `psql \dt` PRE-migración = "Did not find any relations" (BD limpia confirmada).
2. Ejecutar el `pnpm db:migrate` REAL con `DATABASE_URL` apuntando a esa BD → "migraciones aplicadas".
3. `psql \dt` → lista `history_entry`, `session`, `user` (3 tablas).
4. `psql \di` + `pg_indexes` → los 7 índices; verificados los de §9 (ver tabla).
5. `psql \d <tabla>` de las 3 → columnas, defaults, FKs `ON DELETE CASCADE`.
6. SMOKE: `createUser({ email: '  SmokeUser@Example.COM  ' })` + `getUserById` → roundtrip idéntico; email normalizado a `smokeuser@example.com`.
7. Control negativo 1 (vía repo `createUser`): segundo email misma identidad, distinta caps → SQLSTATE **23505**.
8. Control negativo 2 (INSERT CRUDO sin repo, bypass de la normalización): `Raw@Case.COM` luego `raw@case.com` → SQLSTATE **23505** (lo rechaza el índice funcional `lower(email)`).
9. `pnpm gate` completo (raíz) → verde.

## Resultado observado vs esperado
| # | Esperado | Observado | Evidencia | OK |
|---|---|---|---|---|
| 1 | `pnpm db:migrate` crea las 3 tablas en BD vacía | `user`, `session`, `history_entry` (`\dt` 3 rows) | verify-output.txt | OK |
| 2 | Índice `(user_id, created_at DESC)` en `history_entry` | `history_entry_user_created_idx … (user_id, created_at DESC NULLS LAST)` | verify-output.txt | OK |
| 3 | Índice único case-insensitive en `user` (lower(email)) | `user_email_lower_uq UNIQUE btree (lower(email))`, sin citext | verify-output.txt | OK |
| 4 | Índices de `session` `(user_id)` y `(expires_at)` | `session_user_id_idx`, `session_expires_at_idx` | verify-output.txt | OK |
| 5 | Smoke: insertar user y leerlo de vuelta = coincide | roundtrip `getUserById` idéntico; email normalizado | verify-output.txt | OK |
| 6 | Duplicado en distinta caps FALLA (vía repo) | SQLSTATE 23505 | verify-output.txt | OK |
| 7 | Duplicado en distinta caps FALLA (INSERT crudo, prueba el índice) | SQLSTATE 23505 | verify-output.txt | OK |
| 8 | §11/D7: `history_entry` SIN columna de input crudo | columnas = id, user_id, preview, input_kind, chain, created_at | verify-output.txt | OK |
| 9 | §11: `user.password_hash` única columna de credencial (sin plaintext) | columnas user = id, email, password_hash, created_at | verify-output.txt | OK |
| 10 | FKs `ON DELETE CASCADE` (§9) | ambas FK a `user(id)` ON DELETE CASCADE | verify-output.txt | OK |
| 11 | `runMigrations` con `pg_advisory_lock`, `migrationsFolder` relativa al paquete | `pg_advisory_lock(724_100)` + `require.resolve('@app/db/package.json')`, no cwd | src/migrate.ts | OK |
| 12 | Decisiones anotadas en PRD §9 (unicidad + on-boot con lock) | ambas presentes (PRD §9 líneas ~321-322) | PRD.md | OK |
| 13 | `pnpm gate` verde con conteos | 45 files / 461 tests passed, EXIT=0 | gate.txt | OK |
| 14 | Sin secretos en el árbol; `.env` gitignored | `.env`/`.env.test.local` gitignored; `.env.example/.test/.prod.example` solo literales `*-not-a-secret`/`:?` | git check-ignore | OK |

## Notas
- **Aislamiento de prod**: al terminar, `devtools-web-1` y `devtools-postgres-1` (PRODUCCIÓN) siguen `healthy`; vecinos `ugc-factory-*` y `edge-caddy` intactos. El contenedor de Testcontainers se autodetuvo.
- Los tests de integración permanentes de `packages/db/test/integration/` (repos + schema.constraints) fueron leídos: sus asserts cubren la Verificación (23505 por repo Y por INSERT crudo, índices de §9, ON DELETE CASCADE). Aun así se reprodujo TODO de forma independiente contra una BD migrada desde cero por el `db:migrate` real, no confiando en ellos.
- `verify.mts` es el script del verifier (independiente del implementer); se ejecutó con un symlink temporal `node_modules` (ya eliminado) para resolver `@testcontainers/postgresql`.

## Coste real
$0 — sin APIs de pago (Testcontainers + psql locales).

## Veredicto
**PASS** — `pnpm db:migrate` crea sobre BD vacía las 3 tablas de §9 con todos sus índices (incluido `(user_id, created_at DESC)` y el único funcional `lower(email)`), el smoke roundtrip coincide, y el control negativo de unicidad case-insensitive falla con 23505 por las dos vías (repo e INSERT crudo). §11 respetado (sin input crudo en `history_entry`, sin plaintext). Ambas decisiones anotadas en PRD §9; migración on-boot con `pg_advisory_lock`. Gate 45/461 verde. Producción intacta.
