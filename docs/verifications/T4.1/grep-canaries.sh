#!/usr/bin/env bash
# Grep del pg_dump COMPLETO por (a) los marcadores decodificados del canario y (b) el
# segmento base64 CRUDO del payload. Espera 0 coincidencias para las fugas, y >0 para los
# controles POSITIVOS (header y host: prueban que la fila se escribio y el grep apunta bien).
DUMP="$1"
c1=/home/developer/projects/devtools/docs/verifications/T4.1/canaries.json
c2=/home/developer/projects/devtools/docs/verifications/T4.1/canaries2.json
fail=0
echo "### FUGAS — se espera 0 coincidencias en cada una"
while IFS=$'\t' read -r name marker pay; do
  m=$(grep -c -- "$marker" "$DUMP" || true); p=$(grep -c -- "$pay" "$DUMP" || true)
  st="OK"; if [ "$m" != "0" ] || [ "$p" != "0" ]; then st="*** FUGA ***"; fail=1; fi
  printf '%-12s marcador=%-18s hits=%s   payload28=%s hits=%s   %s\n' "$name" "$marker" "$m" "${pay:0:16}…" "$p" "$st"
done < <(node -e "
const a=require('$c1'),b=require('$c2');
for(const [k,v] of Object.entries(a.forms)) console.log([k,v.marker,v.payload.slice(0,28)].join('\t'));
for(const k of ['pad1','pad2']) console.log([k,b[k].marker,b[k].payload.slice(0,28)].join('\t'));
")
echo
echo "### CONTROLES POSITIVOS — se espera >0 (la fila existe y el grep apunta bien)"
for probe in 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' 'api.example.com' 'access_token=' 'a1b2c3d4e5f6071829304a5b6c7d8e9f' '550e8400-e29b-41d4-a716-446655440000' 'v20.11.1'; do
  n=$(grep -c -- "$probe" "$DUMP" || true)
  st="OK"; if [ "$n" = "0" ]; then st="*** AUSENTE — el grep no prueba nada ***"; fail=1; fi
  printf '%-40s hits=%-4s %s\n' "$probe" "$n" "$st"
done
echo
echo "### RESIDUAL DECLARADO — se espera >0 (sobrevive A PROPOSITO, PRD lo nombra)"
n=$(grep -c -- "$(node -e "process.stdout.write(require('$c2').residual.b64)")" "$DUMP" || true)
printf 'foo.<b64>.bar  hits=%s  (esperado >0)\n' "$n"
echo
[ "$fail" = "0" ] && echo "VEREDICTO GREP: sin fugas y con controles positivos vivos." || echo "VEREDICTO GREP: *** HAY FALLOS ***"
exit $fail
