# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online juegos arcade y competir por la mayor puntuación. Estética retro/CRT con neón. Toda la UI y el contenido están en español.

Juegos jugables hoy (motor real): **Asteroides**, **Tetris**, **Arkanoid** y **Serpentina**. El resto del catálogo (`bloque-buster`, `caida`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) usa el reproductor placeholder `components/game-player.tsx`.

## Comandos

- `npm run dev` — servidor de desarrollo (http://localhost:3000)
- `npm run build` / `npm start` — build de producción / servirlo
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`, con `eslint-config-prettier`)
- No hay test runner configurado.

## Flujo de trabajo: Spec Driven Design

Todo cambio grande pasa por una spec en `specs/NN-slug.md` (estado en la cabecera: Borrador → Aprobado → Implementado). Specs existentes: 01 MVP visual, 02 home, 03 about/contacto, 04 infraestructura Supabase, 05 Asteroides, 06 leaderboard y tabla de juegos, 07 Tetris, 08 Arkanoid, 09 Serpentina.

Skills del proyecto (en `.agents/skills/`, enlazadas desde `.claude/skills/`; solo las invoca el usuario):

- `/spec <descripción>` — diseña una spec nueva con preguntas previas (de Klerith/fernando-skills, fijada en `skills-lock.json`; instalar con `npx skills@latest add Klerith/fernando-skills`).
- `/spec-impl <NN-slug>` — implementa una spec **Aprobada**: crea y cambia a la rama `spec-NN-slug` (automático por `specs/.spec-config.yml` → `AutoCreateBranch: true`) y avanza paso a paso.
- `/add-game <carpeta|idea>` — skill propia: genera la spec para añadir un juego con guardado de puntuación y leaderboard, a partir de `references/templates/started-games/` o de una idea nueva. No escribe código. Su checklist (`.agents/skills/add-game/integration-checklist.md`) es la referencia canónica de cómo se integra un juego.

Usa siempre `/frontend-design` para diseñar la interfaz de usuario. Los diseños de referencia (JSX/HTML/CSS del template original) están en `references/templates/`; los juegos originales en JS plano a portar están en `references/templates/started-games/`.

Convención de commits: `feat: …` en español; cada spec se entrega en una PR desde su rama `spec-NN-slug`.

## Agentes

Subagentes del proyecto en `.claude/agents/` (se invocan con `@nombre`):

- `@game-planner` (`.claude/agents/game-planner.md`) — investiga (research web) y propone qué juego añadir al catálogo. Puntúa cada candidato /15 según diversidad de categorías, factibilidad en canvas 2D y reconocimiento clásico. No escribe código ni specs. Su memoria es el To-Do `references/game-suggestions-todo.md`, que crea y actualiza él mismo (pendientes, aceptados, implementados, descartados e historial) para no repetir sugerencias. Flujo: `@game-planner` → `/add-game` → `/spec-impl`. Al aceptar o descartar una sugerencia, díselo para que actualice el To-Do.

## Hooks y MCP

- `.claude/settings.json` tiene un hook `PostToolUse` (Write/Edit) → `.claude/hooks/format-and-lint.sh`: **borra todas las líneas en blanco** de archivos JS/TS/CSS, aplica Prettier y `eslint --fix`; si ESLint falla, bloquea con el error. No luches contra él (no reinsertes líneas en blanco).
- `.mcp.json` conecta el MCP de Supabase al proyecto. Úsalo para `list_tables`, `execute_sql` (solo lectura para comprobar), `apply_migration`, `get_advisors` y `generate_typescript_types`.

## Advertencia sobre la versión de Next.js

Next.js 16.4.4 con React 19.3: más reciente que los datos de entrenamiento habituales, con cambios incompatibles. Según `AGENTS.md`, lee la guía relevante en `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) antes de escribir código de Next.js, y respeta los avisos de deprecación. `AGENTS.md` es regenerado por `next dev`.

## Arquitectura

- Solo App Router (`app/`), TypeScript estricto, alias `@/*` → raíz del repo. Helpers de tipo globales `LayoutProps<…>` / `PageProps<…>` (typegen de Next, sin import).
- `next.config.ts` habilita `cacheComponents`, `partialPrefetching` y `experimental.agentFeedback`. **Patrón obligatorio:** las páginas son síncronas y leen `params`/datos de Supabase dentro de un componente async envuelto en `<Suspense>` (ver `app/games/page.tsx`, `app/juegos/[id]/jugar/page.tsx`).
- Tailwind CSS v4 vía Turbopack (`turbopack.rules` con `@tailwindcss/turbopack`), configurado en CSS (`app/globals.css`), sin `tailwind.config`. En la práctica casi todo el estilo son clases propias en `app/globals.css` (`.crt`, `.player-hud`, `.hud-stat`, `.modal`, `.btn`, `.cover-<id>`…), portadas del template.
- Fuentes (`app/layout.tsx`, `next/font/google`): Press Start 2P, JetBrains Mono y Courier Prime. El layout envuelve todo en `SessionProvider` con `Nav` y `Footer`.

### Rutas

| Ruta                 | Contenido                                                                            |
| -------------------- | ------------------------------------------------------------------------------------ |
| `/`                  | Landing (`components/home/*`, datos estáticos en `lib/home.ts`)                      |
| `/games`             | Biblioteca/catálogo (`components/library.tsx`) / (`references implemented-games.md`) |
| `/juegos/[id]`       | Detalle del juego + top de puntuaciones                                              |
| `/juegos/[id]/jugar` | Reproductor: mapa `PLAYERS` id → componente; si no está, placeholder `GamePlayer`    |
| `/salon?juego=<id>`  | Salón de la Fama (leaderboard)                                                       |
| `/acceso`            | "Login" local (solo nombre)                                                          |
| `/about`             | Acerca de + formulario de contacto                                                   |
| `POST /api/contact`  | Envía el formulario con Resend (`lib/contact.ts` valida)                             |

### Datos (Supabase)

- Clientes: `lib/supabase/server.ts` (lee `cookies()`, nueva instancia por petición, solo dentro de `<Suspense>` o Route Handlers) y `lib/supabase/client.ts` (componentes cliente). Tipos generados en `lib/supabase/database.types.ts`.
- Esquema (`supabase/migrations/`): tabla `games` (catálogo; `cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green, `cover` = clase CSS, `sort_order`), tabla `scores` (`game_id`, `name` 1–10 chars, `score`, `created_at`), vista `game_stats` (`best`, `plays`). RLS: lectura pública e inserción pública en `scores`.
- Lectura en servidor: `lib/data.ts` (`getGames`, `getGame`, `getTopScores`). Escritura desde el cliente: `lib/save-score.ts` (`saveScore(gameId, name, score)`). Tipos de dominio en `lib/games.ts`.
- Añadir un juego al catálogo = migración `<timestamp>_add_game_<id>.sql` con un `insert … on conflict do nothing`, aplicada con el MCP y copiada al repo. `scores`/`game_stats`/RLS no se tocan.

### Sesión

No hay auth real: `lib/session.ts` guarda el usuario (`{ name }`, máx. 10, mayúsculas) en `localStorage` (`av_user`) con fallback en memoria, expuesto vía `useSyncExternalStore` en `components/session-provider.tsx` (`useSession()`). Invitado por defecto (`INVITADO`).

### Juegos (patrón fijado por SPEC 05/06)

- Motor en `lib/games/<id>/` (`game.ts`, `utils.ts`, `entities.ts`/`sprites.ts`/`levels.ts` según el juego): TS puro, **nunca importa React ni toca `document`**, sin estado global de módulo. API `start<X>(canvas, { onStateChange }) → { destroy() }`; snapshot con `score`, campos propios y `state` (incluye `"gameover"`), notificado solo cuando cambia. Bucle con `requestAnimationFrame` y `dt` limitado; listeners en `window`; `destroy()` limpia todo (seguro en StrictMode). Canvas de resolución fija escalado por CSS.
- Player `components/<id>-player.tsx` (cliente): HUD `player-hud`, marco `.crt`, arranca el motor solo en `useEffect`, muestra `components/game-over-modal.tsx` (guardar puntuación una vez, jugar de nuevo, volver al vault) al llegar a `gameover`.
- Registro en `PLAYERS` de `app/juegos/[id]/jugar/page.tsx`, portada `.cover-<id>` y clase del canvas en `app/globals.css`, assets en `public/games/<id>/` (audio solo tras interacción del usuario).
- Ports fieles del original: no cambiar jugabilidad; documentar desviaciones en la spec. No recrear juegos comerciales concretos (nombre, arte, assets): usar título y portada propios.

## Variables de entorno

Ver `.env.template` (copiar a `.env.local`, nunca commitear): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`.
