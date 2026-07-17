# Journal del dev-loop — devtools

> Memoria del bucle entre sesiones. Append cronológico; una entrada por evento (tarea iniciada/cerrada, bloqueo, parada, decisión de arnés, cierre de fase, hotfix). **Escribe para el agente que retomará el trabajo sin tu contexto**: lo no obvio, las decisiones y sus porqués, las deudas — no un log de comandos. Nunca se reescriben entradas antiguas.

## Formatos de entrada

```markdown
## <YYYY-MM-DD> · ⏳ T<ID> iniciada
- 1-2 líneas: qué entrega y coste esperado. (Se escribe en el SELECT del ciclo.)

## <YYYY-MM-DD> · T<ID> cerrada — PASS
- Coste: $X (vs estimado $Y) · Ciclos verifier: N · Tests: N · Commit: <sha-corto> · Evidencia: docs/verifications/T<ID>/
- Decisiones no obvias que las siguientes tareas deben heredar: <1-3 líneas>
- Deuda anotada: <o "—">

## <YYYY-MM-DD> · arnés: <qué cambió>
- Qué pieza del arnés se corrigió (skill/agente/hook/gate), por qué (el ciclo que reveló la carencia) y desde cuándo aplica. El arnés evoluciona deliberadamente, nunca por deriva.

## <YYYY-MM-DD> · T<ID> cerrada — PASS · FASE F<N> COMPLETA
- Lo del cierre normal + resumen de fase: qué entrega observable quedó viva, commits de la fase, deudas que pasan a la siguiente, READMEs revisados. Termina en parada: esperar OK del usuario.

## <YYYY-MM-DD> · hotfix: <síntoma>
- Trabajo fuera del planning (bug en producción/uso real): causa raíz, fix, test permanente que lo protege, y si destapa deuda mayor → candidata a fase de deuda (F<N>b) acordada con el usuario.
```

---

## 2026-07-17 · Proyecto bootstrapeado

PRD v1.0 aprobado el 2026-07-16 (subido a v1.1 el 2026-07-17, ver más abajo); planning aprobado el 2026-07-17. Próxima tarea elegible: **T0.1**.

**Qué es esto, y por qué importa para todas las decisiones siguientes**
- El usuario declaró que devtools es, ante todo, un **banco de pruebas del arnés** (decisión D1 del PRD). No se busca tracción ni monetización. Por eso **no se hizo deep research** y las dos tesis de mercado del §1 quedan `[verificar]` para siempre — no hay tarea que las cierre (regla 3 del planning lo dice explícitamente).
- La idea inicial del usuario era "una suite de las típicas utilidades de developer". Se le devolvió que una suite son N features y que el arnés está construido para una sola. Eligió el reencuadre: **un único campo que autodetecta y encadena** (D2, D3). El catálogo de utilidades independientes quedó como no-objetivo explícito.
- **D5 (historial en servidor con cuenta) se eligió a sabiendas de que es peor producto**: se le advirtió que un devtools que pide cuenta para guardar historial añade fricción, y que guardar lo que la gente pega significa guardar sus tokens. Lo eligió igual porque ejercita la capa de datos del arnés, que es el objetivo. La mitigación es **D7**: no se persiste el input crudo, solo una vista previa truncada y redactada. Si alguien "simplifica" D7 en una tarea futura, convierte el producto en el pasivo que R2 describe.
- **D6 contradice el default del template**: el módulo de auth protege todo salvo login/health; aquí el middleware protege ÚNICAMENTE `/history` y `/api/history`. `/` y `/api/analyze` son públicas. T0.4 lleva un test que falla si alguien protege `/` por inercia.

**Módulos de F0 elegidos** (menú cruzado contra el PRD; regla: si el PRD no lo exige, fuera)
- Entran: esqueleto+gate (T0.1), Docker+Postgres (T0.2), Drizzle (T0.3), auth multi-usuario (T0.4).
- **Fuera: worker/pg-boss, máquina de estados, checkpoints, sweeper, SSE, storage, spend ledger, credenciales cifradas.** Justificado en §5.2 del PRD: una cadena se resuelve en milisegundos de CPU, no hay proceso persistido ni progreso que emitir. Es tentador meterlos "porque es un banco de pruebas y hay que ejercitarlos", y por eso está anotado como **riesgo R6**: sería esqueleto muerto que el gate mantiene para nadie. Cualquier módulo nuevo exige cambio de PRD, no un atajo en el planning.
- **Dos desviaciones del menú, aprobadas por el usuario**: (1) el módulo "UI principal v1" NO va en F0 — la pantalla principal *es* la feature y su motor nace en F1; montarla en F0 contra un motor de pega y recablearla después es churn. (2) el deploy NO va en F0 sino en fase propia (F3): desplegar un cascarón no verifica nada. **El coste asumido de (2)**: las roturas exclusivas de producción (el gotcha de `next start` vs `next dev`) se descubrirán al final.

**Design system y mockups**
- DS: `https://claude.ai/design/p/9d6b478a-191a-4d6c-8071-441488dd195f`. Ya es específico de este producto: `StepCard`, `ChainSummary`, `ConfidenceBar` y `HistoryRow` existen porque el PRD los pide. Eso hizo que TD.2–TD.5 se pudieran repartir contra el inventario real y no contra una plantilla genérica.
- Mockups: `https://claude.ai/design/p/1132e88c-090e-42ad-a121-490714cf7ec5`. **Variante elegida: A "Claro"**. Cuatro pantallas: `FieldClaro` → `/`, `HistoryClaro` → `/history`, `LoginClaro` → `/login`, `SignupClaro` → `/signup`.
- **Desviación deliberada del patrón TD**: TD.1 se encarga también del espejo de `docs/mockups/`. Motivo: los mockups son JSX que necesitan el bundle del DS para renderizar; fabricarlos a mano en el bootstrap habría sido inventar el diseño. TD.1 es la primera tarea que tiene `DesignSync` y el DS en la mano, y la regla 7 exige el mockup local antes de T0.4.
- **Pendiente en TD.1**: confirmar si `variant-mobile.jsx` es de la variante A o de la B (anotado en `docs/mockups/README.md`).
- **Consecuencia de orden que conviene recordar**: el grafo obliga a T0.1 → TD completa → T0.2. La primera parada de revisión humana (el OK visual de TD.7) llega muy pronto.

**El VPS: lo que se descubrió inspeccionándolo (el bucle corre DENTRO del VPS)**
- Topología real, verificada contra `~/infra/caddy` y el proyecto vecino `ugc-factory`: Cloudflare (proxy naranja, SSL Full strict) → Caddy central `edge-caddy` en **`network_mode: host`** → `127.0.0.1:<puerto>`. La fuente de verdad operativa es **`~/AGENTS.md` del VPS**: léelo antes de tocar producción.
- **Bloque de puertos reservado para devtools: 3110–3119 (web=3110)**, según el registro de `~/AGENTS.md` §3. T3.1 debe registrarlo allí en el mismo cambio — ese fichero lo exige.
- **Nunca publicar en `0.0.0.0`**: un puerto abierto por Docker se salta UFW (Docker escribe iptables por debajo del firewall). Solo `127.0.0.1:3110`.
- **Trust boundary**: hay DOS proxies delante. El vecino ya lo resolvió con `header_up X-Forwarded-For {client_ip}` + `TRUST_PROXY=1`, pero con Cloudflare en proxy naranja **eso da la IP de Cloudflare**: la real llega en `CF-Connecting-IP`. Afecta a los dos rate limits (login de T0.4 y `/api/analyze` de T1.4); se cierra en T3.1.
- Por esto el **PRD subió a v1.1** (2026-07-17): §10 y §11 se corrigieron contra el terreno. El §10 original daba VPS y DNS por pendientes de contratar y ambos existían ya. Sin cambio de alcance.
- El directorio del repo se renombró de `~/projects/test-project` a **`~/projects/devtools`** para cumplir la convención `~/projects/<proyecto>` de `~/AGENTS.md` y para que la autodetección local/remote de la skill `deploy` funcione por "ruta del repo == REMOTE_DIR".

**Deudas del arnés detectadas en el bootstrap** (ninguna se tocó: la skill bootstrap prohíbe modificar `scripts/`, hooks y skills)
1. **`scripts/readme-status.mjs` no ve la fase TD.** Detecta fases con `^## (F[\dA-Za-z]+) — (.+)$`, que exige prefijo `F`; `## TD — Design system` no casa y `current` se pone a null, así que sus **7 tareas no se cuentan**. La portada dice "0 de 18" cuando el planning tiene 25. Que el regex de *tareas* sí contemple `TD.1` (con un comentario que lo menciona) indica que es un descuido, no una decisión. Anotado también como nota visible en el README para que la portada no engañe.
2. **`redeploy.sh` asume una red docker `edge` que este VPS no usa.** Hace `docker network create edge` + `docker network connect edge edge-caddy`, y `edge-caddy` corre en modo host: un contenedor en host **no se puede conectar a una red bridge**. La rama es inerte (falla con `warn`, no rompe el deploy). La vía correcta —loopback— la contempla la propia SKILL.md. Configurado en `deploy.env` como `CADDY_UPSTREAM="127.0.0.1:3110"` y documentado allí.
3. **Sin CI todavía**: el repo se creó en el bootstrap (`carlosvillu/devtools`, público). Activar CI cuando haya `package.json` (T0.1 en adelante).

**Decisión pendiente para el usuario (no bloquea T0.1)**
- **AGPL §13 y el enlace a fuente**: devtools es una webapp bajo AGPL-3.0. La §13 obliga a quien despliegue una versión *modificada* a ofrecer su código a los usuarios que interactúen por red — lo habitual es un enlace "Source" visible en la UI. Los mockups de la variante A no lo llevan. No se añadió nada al planning para no meter alcance sin aprobar; si el usuario lo quiere, es un cambio menor en el layout de T1.5 (y en el mockup, que manda).

**Coste del bootstrap**: solo agentes (sin APIs de pago; D8). Ninguna tarea del planning lleva `Coste estimado` por el mismo motivo — si alguna llegara a necesitar una API de pago, es cambio de alcance (regla 6), no improvisación de presupuesto.
