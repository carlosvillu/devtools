// Config de drizzle-kit (backend/db.md §3). Apunta a la carpeta de schema por
// glob: añadir un dominio no toca esta config. El SQL generado va a `drizzle/`
// y se committea — la historia de migraciones es parte del repo.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/*.ts',
  out: './drizzle',
});
