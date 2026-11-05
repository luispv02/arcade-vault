# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online juegos arcade y competir por la mayor puntuación. Estética retro/CRT con neón. Toda la UI y el contenido están en español.

Catálogo actual (tabla `games`, 4 juegos, todos con motor real): **Asteroides**, **Tetris**, **Arkanoid** y **Serpentina**; detalle en `references/implemented-games.md`. `components/game-player.tsx` es solo el placeholder de fallback para ids sin motor registrado en `PLAYERS` (hoy ninguno del catálogo lo usa).

## Comandos

- `npm run dev` — servidor de desarrollo (http://localhost:3000)
- `npm run build` / `npm start` — build de producción / servirlo
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`, con `eslint-config-prettier`)
- No hay test runner configurado.

## Flujo de trabajo: Spec Driven Design

Todo cambio grande pasa por una spec en `specs/NN-slug.md` (estado en la cabecera: Borrador → Aprobado → Implementado). Specs existentes: 01 MVP visual, 02 home, 03 about/contacto, 04 infraestructura Supabase, 05 Asteroides, 06 leaderboard y tabla de juegos, 07 Tetris, 08 Arkanoid, 09 Serpentina, 10 controles táctiles móviles, 11 autenticación con Supabase, 12 seguridad básica. Los borradores de `@game-jam` viven en `specs/game-jam/<game-id>/` (hoy `ranaria`, Borrador) y se numeran en `specs/NN-…` al aprobarlos.

Skills del proyecto (en `.agents/skills/`, enlazadas desde `.claude/skills/`; solo las invoca el usuario):

- `/spec <descripción>` — diseña una spec nueva con preguntas previas (de Klerith/fernando-skills, fijada en `skills-lock.json`; instalar con `npx skills@latest add Klerith/fernando-skills`).
- `/spec-impl <NN-slug>` — implementa una spec **Aprobada**: crea y cambia a la rama `spec-NN-slug` (automático por `specs/.spec-config.yml` → `AutoCreateBranch: true`) y avanza paso a paso.
- `/add-game <carpeta|idea>` — skill propia: genera la spec para añadir un juego con guardado de puntuación y leaderboard, a partir de `references/templates/started-games/` o de una idea nueva. No escribe código. Su checklist (`.agents/skills/add-game/integration-checklist.md`) es la referencia canónica de cómo se integra un juego.

Usa siempre `/frontend-design` para diseñar la interfaz de usuario. Los diseños de referencia (JSX/HTML/CSS del template original) están en `references/templates/`; los juegos originales en JS plano a portar están en `references/templates/started-games/` (`02-asteroids`, `03-tetris`, `04-arkanoid`; los assets de Serpentina, en `references/source-assets/snake-assets/`).

Convención de commits: `feat: …` en español; cada spec se entrega en una PR desde su rama `spec-NN-slug`.

## Agentes

Subagentes en `.claude/agents/` (se invocan con `@nombre`). Reglas, memoria y detalles, en el archivo de cada agente:

- `@game-planner` — investiga y propone el próximo juego del catálogo; memoria en `references/game-suggestions-todo.md` (avísale al aceptar/descartar). Definición: `.claude/agents/game-planner.md`.
- `@game-jam <tema>` — diseña un juego original y escribe sus specs (Borrador) en `specs/game-jam/<game-id>/`. Definición: `.claude/agents/game-jam.md`.
- `@skin-designer <game-id>` — aplica las skins `neon`/`retro`/`clasico` a un juego (solo apariencia); memoria en `references/game-with-themes.md`. Definición: `.claude/agents/skin-designer.md`.
- `@mobile-porter <game-id|ruta>` — audita un juego o página en escritorio y móvil según SPEC 10, sin editar código; memoria en `references/mobile-coverage.md`; necesita `npm run dev` y Playwright. Definición: `.claude/agents/mobile-porter.md`.
- `@security-auditor <db|auth|app|headers|deps|todo>` — audita la seguridad de la base de datos y de la app según SPEC 11 y 12, sin editar código ni aplicar migraciones (Supabase en solo lectura); memoria en `references/security-audit.md`; `headers` necesita `npm run dev`. Definición: `.claude/agents/security-auditor.md`.

Flujo para juegos nuevos: `@game-planner` (o `@game-jam`) → `/add-game` (o revisar/numerar la spec) → `/spec-impl`. Ninguno escribe código de juego.

## Hooks y MCP

- `.claude/settings.json` tiene un hook `PostToolUse` (Write/Edit) → `.claude/hooks/format-and-lint.sh`: **borra todas las líneas en blanco** de archivos JS/TS/CSS, aplica Prettier y `eslint --fix`; si ESLint falla, bloquea con el error. No luches contra él (no reinsertes líneas en blanco).
- `.mcp.json` conecta el MCP de Supabase al proyecto. Úsalo para `list_tables`, `execute_sql` (solo lectura para comprobar), `apply_migration`, `get_advisors` y `generate_typescript_types`.
- MCP de Playwright (configurado a nivel de usuario, no en `.mcp.json`): lo usa `@mobile-porter` para auditar en navegador.

## Advertencia sobre la versión de Next.js

Next.js 16.4.4 con React 19.3: más reciente que los datos de entrenamiento habituales, con cambios incompatibles. Según `AGENTS.md`, lee la guía relevante en `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) antes de escribir código de Next.js, y respeta los avisos de deprecación. `AGENTS.md` es regenerado por `next dev`.

## Arquitectura

- Solo App Router (`app/`), TypeScript estricto, alias `@/*` → raíz del repo. Helpers de tipo globales `LayoutProps<…>` / `PageProps<…>` (typegen de Next, sin import).
- `next.config.ts` habilita `cacheComponents`, `partialPrefetching` y `experimental.agentFeedback`. **Patrón obligatorio:** las páginas son síncronas y leen `params`/datos de Supabase dentro de un componente async envuelto en `<Suspense>` (ver `app/games/page.tsx`, `app/juegos/[id]/jugar/page.tsx`).
- Tailwind CSS v4 vía Turbopack (`turbopack.rules` con `@tailwindcss/turbopack`), configurado en CSS (`app/globals.css`), sin `tailwind.config`. En la práctica casi todo el estilo son clases propias en `app/globals.css` (`.crt`, `.player-hud`, `.hud-stat`, `.modal`, `.btn`, `.cover-<id>`…), portadas del template.
- Fuentes (`app/layout.tsx`, `next/font/google`): Press Start 2P, JetBrains Mono y Courier Prime. El layout envuelve todo en `SessionProvider` con `Nav` y `Footer`.

### Rutas

| Ruta                 | Contenido                                                                         |
| -------------------- | --------------------------------------------------------------------------------- |
| `/`                  | Landing (`components/home/*`, datos estáticos en `lib/home.ts`)                   |
| `/games`             | Biblioteca/catálogo (`components/library.tsx`)                                    |
| `/juegos/[id]`       | Detalle del juego + top de puntuaciones                                           |
| `/juegos/[id]/jugar` | Reproductor: mapa `PLAYERS` id → componente; si no está, placeholder `GamePlayer` |
| `/salon?juego=<id>`  | Salón de la Fama (leaderboard)                                                    |
| `/acceso`            | Login y registro (email + contraseña, Google, GitHub) o invitado                  |
| `/acceso/perfil`     | Elegir el username definitivo (usuarios OAuth, una sola vez); exige sesión        |
| `GET /auth/callback` | Intercambia el `code` por sesión (confirmación de correo y OAuth) y redirige      |
| `/about`             | Acerca de + formulario de contacto                                                |
| `POST /api/contact`  | Envía el formulario con Resend (`lib/contact.ts` valida)                          |

### Datos (Supabase)

- Clientes: `lib/supabase/server.ts` (lee `cookies()`, nueva instancia por petición, solo dentro de `<Suspense>` o Route Handlers) y `lib/supabase/client.ts` (componentes cliente). Tipos generados en `lib/supabase/database.types.ts`.
- Esquema (`supabase/migrations/`): tabla `games` (catálogo; `cat` ∈ ARCADE/PUZZLE/SHOOTER/VERSUS, `color` ∈ cyan/magenta/yellow/green, `cover` = clase CSS, `sort_order`), tabla `scores` (`game_id`, `name` 1–10 chars, `score`, `created_at`, `user_id` nullable), tabla `profiles` (`id` → `auth.users`, `username` único `[A-Z0-9_]{3,10}`, `username_confirmed`; creada por el trigger `handle_new_user`; sin email), vista `game_stats` (`best`, `plays`). RLS: lectura pública de `games`, `scores` y `profiles`; `profiles` solo se actualiza por su dueño mientras `username_confirmed = false`; inserción en `scores` con `user_id` nulo (invitado) o con el `user_id` y el `name` del propio usuario autenticado.
- Lectura en servidor: `lib/data.ts` (`getGames`, `getGame`, `getTopScores`). Escritura desde el cliente: `lib/save-score.ts` (`saveScore(gameId, name, score, userId?)`). Tipos de dominio en `lib/games.ts`.
- Añadir un juego al catálogo = migración `<timestamp>_add_game_<id>.sql` con un `insert … on conflict do nothing`, aplicada con el MCP y copiada al repo. `scores`/`game_stats`/RLS no se tocan.

### Sesión

Auth real con Supabase Auth (SPEC 11): email + contraseña con confirmación por correo, Google y GitHub.

- `proxy.ts` (raíz; en Next 16 `middleware` está deprecado) + `lib/supabase/proxy.ts` refrescan la sesión con `getClaims()` en cada petición y hacen solo redirecciones optimistas (`/acceso` con sesión → `/games`; `/acceso/perfil` sin sesión → `/acceso`). No consultan la base de datos.
- `components/session-provider.tsx` expone `useSession()` → `{ user, logout, saveScore }`. `user` (`SessionUser` en `lib/session.ts`: `id`, `name` = username del perfil, `email`) sale de `onAuthStateChange` + `profiles`, leído en el cliente; el primer render es siempre invitado (`null`). No existe `login`: lo hace `components/auth-form.tsx` con el cliente de Supabase.
- Validación y mensajes de error en español: `lib/auth.ts` (TS puro; `EMAIL_RE` con TLD de 2+ letras y `PASSWORD_RE = /^.{8,}$/`, aplicadas en login y registro: el formulario no llama a Supabase si no pasan). Menú de cuenta (Usuario, Correo, Cerrar sesión): `components/user-menu.tsx`.
- **Invitado** = sin sesión de Supabase: nombre editable en `GameOverModal` (por defecto `INVITADO`) y puntuación sin `user_id`. Con sesión el nombre es el username, fijo.
- `av_scores` (`localStorage`) solo lo usa el placeholder `GamePlayer`; `av_user` ya no existe y se borra al arrancar.
- Para probar OAuth y el correo de confirmación hay que tener activos los proveedores y las Redirect URLs (`/auth/callback`) en el dashboard de Supabase.

### Seguridad (SPEC 12)

- **Cabeceras HTTP** en `next.config.ts` (`securityHeaders`, `source: "/(.*)"`): `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Strict-Transport-Security` y `Permissions-Policy`. No hay CSP (queda para otra spec).
- **RLS** activo en `games`, `scores` y `profiles`; sin políticas de UPDATE/DELETE en `scores` ni `games`. Los permisos de tabla de `anon`/`authenticated` son los de Supabase por defecto: la barrera es RLS.
- **Ajustes de Auth en el dashboard de Supabase** (no versionados en el repo): contraseña mínima = 8 y límite de signups/inicios de sesión por IP. Valores finales: pendientes de anotar en `specs/12-seguridad-basica.md`.
- **Aviso aceptado:** `auth_leaked_password_protection` en `get_advisors` (exige plan Pro; el proyecto está en Free). Es el único aviso de seguridad esperado.

### Juegos (patrón fijado por SPEC 05/06)

- Motor en `lib/games/<id>/` (`game.ts`, `utils.ts`, `entities.ts`/`sprites.ts`/`levels.ts` según el juego): TS puro, **nunca importa React ni toca `document`**, sin estado global de módulo. API `start<X>(canvas, { onStateChange }) → { destroy() }`; snapshot con `score`, campos propios y `state` (incluye `"gameover"`), notificado solo cuando cambia. Bucle con `requestAnimationFrame` y `dt` limitado; listeners en `window`; `destroy()` limpia todo (seguro en StrictMode). Canvas de resolución fija escalado por CSS.
- Player `components/<id>-player.tsx` (cliente): HUD `player-hud`, marco `.crt`, arranca el motor solo en `useEffect`, muestra `components/game-over-modal.tsx` (guardar puntuación una vez, jugar de nuevo, volver al vault) al llegar a `gameover`.
- Registro en `PLAYERS` de `app/juegos/[id]/jugar/page.tsx`, portada `.cover-<id>` y clase del canvas en `app/globals.css`, assets en `public/games/<id>/` (audio solo tras interacción del usuario).
- Skins (`neon`/`retro`/`clasico`): paletas por juego y store `av_skin` en `lib/skins.ts`; el motor recibe `skin` y expone `setSkin` (cambio en caliente); el player incluye `<SkinSelect />` (`components/skin-select.tsx`); tokens `[data-skin]` en `app/globals.css`. Solo apariencia.
- Móvil (SPEC 10): el player usa `components/touch-pad.tsx` (mando virtual) y `components/mobile-hud-menu.tsx` (menú ☰ con Skin y SALIR); el motor traduce `TouchAction` (`lib/games/touch.ts`) a su propio input.
- Ports fieles del original: no cambiar jugabilidad; documentar desviaciones en la spec. No recrear juegos comerciales concretos (nombre, arte, assets): usar título y portada propios.

## Referencias (`references/`)

`implemented-games.md` (catálogo actual), `game-suggestions-todo.md`, `game-with-themes.md`, `mobile-coverage.md` y `security-audit.md` (memorias de los agentes; las actualizan ellos), `templates/` (diseño original y juegos a portar), `source-assets/` (assets originales).

## Variables de entorno

Ver `.env.template` (copiar a `.env.local`, nunca commitear): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`.
