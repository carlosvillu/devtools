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

- El historial guarda una **vista previa truncada a 120 caracteres**, el tipo
  detectado y la lista de transformaciones. Cuánto se redacta **depende del tipo**:
  de un JWT solo sobrevive la cabecera (ni payload ni firma); de un JSON, las
  claves sin sus valores; de un base64, solo su longitud; de una URL, el dominio.
  **El resto —texto, hashes, UUIDs y timestamps— se guarda tal cual**: son opacos
  o son justo lo útil de ver, pero si pegas un token de 64 hex, se guarda entero.
- Además, antes de guardar se **barre el texto buscando JWTs en cualquier
  posición**, aunque la entrada no se haya detectado como JWT: una petición HTTP
  pegada entera desde el panel Network, una cookie (`access_token=…`), un
  parámetro de URL (`?id_token=…`) o un cuerpo de formulario. De cada uno que
  encuentra quedan la cabecera y nada más. **Qué cuenta como «encontrar»**: que
  **alguna** parte del token descodifique a un JSON con el campo `alg`, que es
  como se reconoce un JWT. Lo que **no** cumpla eso —algo con pinta de JWT que no
  lo sea, o un token opaco como 64 hex o `sk-live-…`— **se guarda entero**. Es una
  red ancha, no una garantía absoluta.
- El **input crudo tampoco se loguea**: los logs registran tipo, longitud en
  bytes, número de pasos y duración.
- Consecuencia honesta: «reabrir» una entrada del historial te devuelve la
  cadena, no el dato. Para copiar valores hay que volver a pegarlo.

La herramienta funciona **sin cuenta**. Registrarse solo desbloquea el historial.

## Estado del desarrollo

<!-- STATUS-TABLE:BEGIN — generado por `pnpm readme:status`, no editar a mano -->

**33 de 34 tareas cerradas (97 %).**

| Fase                         | Qué entrega                                                                                                                                                                                                                                                                                                                | Estado      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **F0** · Fundaciones         | Monorepo con `pnpm gate` verde, Postgres en Docker, migración inicial aplicada y auth email+contraseña operable en el navegador: registrarse, entrar, y que la sesión sobreviva a un refresh                                                                                                                               | ✅ Completa |
| **TD** · Design system       | `/design-system` muestra tokens y componentes fieles a Claude Design, lint de adherencia activo y skill frontend actualizada — se ejecuta tras T0.1, antes de continuar F0                                                                                                                                                 | ✅ Completa |
| **F1** · El motor y el campo | Pegas un JWT (o un base64, o un timestamp) en `/` y ves la cadena desenredada paso a paso, con las alternativas de detección a un clic y el desvío de cualquier paso                                                                                                                                                       | ✅ Completa |
| **F2** · El historial        | Con cuenta iniciada, lo que analizas aparece en `/history` con la vista previa redactada; se puede reabrir y borrar. Sin cuenta, `/` sigue funcionando igual                                                                                                                                                               | ✅ Completa |
| **F3** · Producción          | `https://devtools.carlosvillu.dev` sirve la app con TLS válido, el recorrido completo funciona en producción y el backup diario produce un dump restaurable                                                                                                                                                                | ✅ Completa |
| **F4** · Post-v1             | Pegar una petición HTTP entera en `/` no deja el payload del JWT en la BD: la redacción del preview deja de depender de que el detector acierte con el tipo                                                                                                                                                                | ✅ Completa |
| **F5** · La landing          | `/` es una landing estilo Google (wordmark + campo + badges + footer); pegar o Enter salta a `/analyze`, que es la experiencia de análisis de hoy. El input viaja por sessionStorage, nunca por la URL. El header de `/` refleja la sesión (email + salir, o «Entrar»); la portada trae `og:image` para compartir en redes | 🔨 4/5      |

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
cp .env.example .env                      # Postgres para docker compose
cp apps/web/.env.example apps/web/.env    # DATABASE_URL para la web (Next lee el .env de apps/web, no el de la raíz)
docker compose -f docker-compose.dev.yml up -d
pnpm dev                                  # aplica las migraciones al arrancar
```

Son **dos** ficheros `.env` a propósito, y es la trampa que más se olvida: docker
compose lee el de la raíz y Next el de `apps/web`. Las migraciones se aplican
solas al arrancar la web; `pnpm db:migrate` existe aparte para operarlas a mano
(necesita `DATABASE_URL` en el entorno).

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
