// HIGIENE: el grep de la Verificacion corrio contra el pg_dump COMPLETO (requisito
// literal), pero el artefacto que se commitea NO puede llevar password_hash ni ids de
// sesion (CLAUDE.md: ningun secreto en el arbol). Se conserva integra la seccion
// history_entry —que es la evidencia— y se elide el resto.
import { readFileSync, writeFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const lines = readFileSync(f, 'utf8').split('\n');
  const out = []; let skip = false;
  for (const l of lines) {
    if (l.startsWith('COPY public."user"') || l.startsWith('COPY public.session')) {
      skip = true; out.push(`-- [ELIDIDO POR EL VERIFIER: ${l.split(' ')[1]} contiene password_hash / ids de sesion.`);
      out.push('--  El grep de la Verificacion SI corrio sobre estas filas en el dump completo.]'); continue;
    }
    if (skip) { if (l === '\\.') skip = false; continue; }
    out.push(l);
  }
  writeFileSync(f, out.join('\n'));
  console.log(`${f}: filtrado`);
}
