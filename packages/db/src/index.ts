// @app/db — schema Drizzle, migraciones, repos y adaptadores de puertos.
//
// El paquete NACE VACÍO en T0.1 a propósito: existe, resuelve como
// `@app/db` y está bajo `pnpm typecheck` desde el primer commit, pero Postgres
// no llega hasta T0.2 y Drizzle + el esquema de §9 (`user`, `session`,
// `history_entry`) hasta T0.3. Meter aquí una conexión o un cliente ahora sería
// adelantar trabajo de otra tarea.
//
// Dirección de dependencias que este paquete respetará (architecture.md §1):
//   core (contratos Zod, puertos) ← db (implementa los puertos) ← apps/web
// Prohibido: db exportando drizzle/pg hacia core.

export {};
