// ANTI-FANTASMA: simula la redacción SIN barrido para kind `text` (verbatim trim + corte
// a 120) y comprueba que el prefijo del payload SOBREVIVE al truncado. Si no sobreviviera,
// un 0-coincidencias en el pg_dump no probaría nada: lo habría borrado el truncado.
const d = JSON.parse(await (await import('node:fs/promises')).readFile(new URL('./canaries.json', import.meta.url), 'utf8'));
const trunc = (v, max = 120) => (v.length <= max ? v : v.slice(0, max - 1) + '…');
let bad = 0;
for (const [k, input] of Object.entries(d.inputs)) {
  const verbatim = trunc(input.trim());
  const pay = d.forms[k].payload.slice(0, 28);
  const ok = verbatim.includes(pay);
  if (!ok) bad++;
  console.log(`${k.padEnd(9)} payload28=${pay}  sobreviveAlTruncado=${ok ? 'SI' : 'NO ***'}  previewLen=${verbatim.length}`);
}
console.log(bad === 0 ? '\nOK: los 7 objetivos de grep sobreviven al truncado -> el grep es discriminante.'
                      : `\n*** ${bad} objetivos NO sobreviven: ese caso no probaria nada.`);
