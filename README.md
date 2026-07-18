# devtools

**Pega cualquier cosa. devtools averigua qué es y te la desenreda paso a paso.**

Un JWT, un base64, un timestamp Unix, un JSON ilegible, una URL llena de
parámetros. Lo pegas en un único campo y devtools detecta qué es, aplica la
transformación que toca y **vuelve a detectar sobre el resultado**, encadenando
pasos hasta llegar a algo legible.

```
  entrada cruda                    cadena de pasos                      salida
 ┌──────────────┐    ┌──────────────────────────────────────┐    ┌──────────────┐
 │ "ZXlKaGJHY2  │───►│ 1 base64      ──decode──►  eyJhbGci…  │───►│  JSON         │
 │  iOiJIUzI1N  │    │ 2 jwt         ──decode──►  {"alg":…}  │    │  formateado   │
 │  iJ9…"       │    │ 3 json        ──format──►  { … }      │    │  + exp legible│
 └──────────────┘    └──────────────────────────────────────┘    └──────────────┘
        cada paso es reversible, inspeccionable y se puede desviar a otra transformación
```

## Por qué existe

El cuello de botella de un devtools no es la transformación, es la elección:
decodificar base64 es trivial, lo que cuesta es acertar con la pestaña correcta
entre veinte. Las suites que ya existen tratan cada utilidad como una isla —
copias la salida de una y la pegas en la siguiente. Aquí no eliges nada: pegas, y
la cadena se construye sola.

**No es un catálogo de utilidades.** Es una sola cosa: detectar → transformar →
volver a detectar → mostrar la cadena entera.

## ⚠️ Antes de pegar nada

**devtools procesa en el servidor lo que le pegas. No lo uses con secretos de
producción vivos.**

Dicho eso, el producto está construido para no convertirse en un pasivo:

- El **input crudo no se guarda nunca**: el historial almacena una vista previa
  truncada a 120 caracteres y redactada (de un JWT no se guardan ni el payload ni
  la firma), el tipo detectado y la lista de transformaciones aplicadas. Nada más.
- El **input crudo tampoco se loguea**: los logs registran tipo, longitud en
  bytes, número de pasos y duración.
- Consecuencia honesta: «reabrir» una entrada del historial te devuelve la
  cadena, no el dato. Para copiar valores hay que volver a pegarlo.

La herramienta funciona **sin cuenta**. Registrarse solo desbloquea el historial.

## Estado del desarrollo

<!-- STATUS-TABLE:BEGIN — generado por `pnpm readme:status`, no editar a mano -->

**14 de 25 tareas cerradas (56 %).**

| Fase                         | Qué entrega                                                                                                                                                                                  | Estado         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **F0** · Fundaciones         | Monorepo con `pnpm gate` verde, Postgres en Docker, migración inicial aplicada y auth email+contraseña operable en el navegador: registrarse, entrar, y que la sesión sobreviva a un refresh | 🔨 1/5         |
| **TD** · Design system       | `/design-system` muestra tokens y componentes fieles a Claude Design, lint de adherencia activo y skill frontend actualizada — se ejecuta tras T0.1, antes de continuar F0                   | ✅ Completa    |
| **F1** · El motor y el campo | Pegas un JWT (o un base64, o un timestamp) en `/` y ves la cadena desenredada paso a paso, con las alternativas de detección a un clic y el desvío de cualquier paso                         | 🔨 6/7         |
| **F2** · El historial        | Con cuenta iniciada, lo que analizas aparece en `/history` con la vista previa redactada; se puede reabrir y borrar. Sin cuenta, `/` sigue funcionando igual                                 | ⬜ No empezada |
| **F3** · Producción          | `https://devtools.carlosvillu.dev` sirve la app con TLS válido, el recorrido completo funciona en producción y el backup diario produce un dump restaurable                                  | ⬜ No empezada |

<!-- STATUS-TABLE:END -->

Las fases y sus tareas viven en [`planning.md`](./planning.md); el producto
completo, en [`PRD.md`](./PRD.md). La tabla de arriba se genera desde el planning
con `pnpm readme:status` y el gate la verifica: la portada de este repo no puede
mentir sobre en qué punto está el desarrollo.

## Cómo está construido

**Stack**: pnpm workspaces + TypeScript · `apps/web` (Next.js App Router +
Tailwind v4) · `packages/core` (el motor de detección y cadena, con Zod) ·
`packages/db` (Postgres + Drizzle) · Vitest + Playwright · Base UI/shadcn · pino.

El corazón es `packages/core`: los detectores, las transformaciones y el motor de
encadenado son **lógica pura y total** — sin I/O, sin excepciones y con el reloj
inyectado como parámetro. Misma entrada y mismo `now` producen la misma cadena
byte a byte, que es lo que permite testearlo con golden files.

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d
pnpm db:migrate
pnpm dev
```

## Este repo lo escribe un bucle de agentes

devtools es, declaradamente, un **banco de pruebas** de un arnés de desarrollo
autónomo: el código lo escribe tarea a tarea un bucle de agentes de Claude Code
gobernado por la skill `dev-loop`, y cada tarea se cierra con evidencia
verificable en `docs/verifications/<ID>/`. El producto es real y funciona; el
objetivo declarado es ejercitar el proceso.

Las reglas que lo gobiernan están en [`CLAUDE.md`](./CLAUDE.md): una tarea por
ciclo con contexto fresco, quien implementa no se evalúa a sí mismo, ninguna
tarea se marca hecha sin evidencia con veredicto PASS, y prohibido debilitar
tests para ponerse en verde.

## Licencia

[AGPL-3.0](./LICENSE) — Copyright (C) 2026 Carlos Villuendas.

Si despliegas una versión modificada de devtools y la ofreces por red, la AGPL te
obliga a ofrecer también su código fuente a quienes la usen.
