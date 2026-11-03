# SPEC 06 — Tabla de juegos y leaderboard en Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 04, SPEC 05
> **Fecha:** 2026-11-03
> **Objetivo:** Crear las tablas `games` y `scores` en Supabase, hacer que el catálogo y el Salón de la Fama (top por juego) lean de ellas en lugar de los datos mock, y guardar en `scores` la puntuación de Asteroides al terminar la partida con el nombre del jugador (o `INVITADO`).

## Por qué existe esta spec

La SPEC 04 dejó la conexión a Supabase sin esquema, y hoy el catálogo vive en `lib/games.ts` (con `best` y `plays` inventados) y los rankings son un generador determinista en `lib/scores.ts`. Esta spec crea el esquema real, lo siembra con el catálogo actual y puntuaciones de ejemplo, y cierra el ciclo con Asteroides, el único juego real: jugar → guardar → aparecer en el leaderboard.

## Alcance

**Dentro:**

- Migración SQL (aplicada con el MCP `apply_migration` al proyecto `exfpljdgpggffqysgyls` y copiada a `supabase/migrations/`) que crea:
  - Tabla `games` sembrada con el catálogo; una migración posterior la deja solo con `asteroides`, el único juego funcional.
  - Tabla `scores` con CHECKs, FK a `games` e índice `(game_id, score desc)`.
  - Vista `game_stats` con `best` (máximo) y `plays` (conteo) por juego, derivados de `scores`.
  - RLS activado en ambas tablas: lectura pública de `games` y `scores`; inserción pública solo en `scores`; sin `update` ni `delete`.
  - `scores` empieza vacía: una migración posterior elimina las puntuaciones de ejemplo y de prueba; solo existen las que guardan los jugadores.
- Tipos TypeScript generados (`generate_typescript_types`) en `lib/supabase/database.types.ts` y clientes de `lib/supabase/` tipados con `Database`.
- Capa de datos en `lib/` (funciones async para servidor): listar juegos con stats, obtener un juego por `id`, top N de un juego.
- Catálogo (`/games`, home, `/juegos/[id]`, `/juegos/[id]/jugar`) leyendo de `games` + `game_stats`. Se elimina el array `GAMES`.
- Salón de la Fama (`/salon`) con selector de juego y top 12 desde `scores`, en la ruta `/salon?juego=<id>`. Se elimina `lib/scores.ts`.
- Pantalla «FIN DEL JUEGO» de Asteroides (modal de la plataforma, estilos `.modal` existentes) al pasar a `state === "gameover"`: muestra la puntuación final, un campo de nombre (precargado con el de `useSession()` o `INVITADO`, máx. 10, mayúsculas), el botón GUARDAR PUNTUACIÓN, JUGAR DE NUEVO y VOLVER AL VAULT. La inserción en `scores` ocurre solo al pulsar GUARDAR, una vez por partida, con estados guardando / guardada / error (con reintento).
- Interfaz diseñada con la skill `/frontend-design`, respetando el look actual.

**Fuera de alcance (para otras specs):**

- Autenticación real, perfiles (`profiles`) y vinculación de puntuaciones a usuarios.
- Anti-trampas, rate limiting y moderación de nombres (riesgo aceptado, ver Riesgos).
- Guardar puntuaciones de los juegos placeholder (solo Asteroides guarda).
- Ranking global entre juegos, «mejor por jugador» y filtros de periodo (hoy/semana).
- Botones PAUSA/FIN de la barra y reintentos offline automáticos del guardado.
- Realtime, Edge Functions y clave `service_role`.
- Edición del catálogo desde la UI (los juegos se gestionan por SQL).
- Cambios en la jugabilidad o en el motor de `lib/games/asteroids/` más allá de exponer la puntuación final ya disponible en `onStateChange`.
- Pruebas automatizadas.

## Modelo de datos

```sql
create table public.games (
  id         text primary key,                       -- "asteroides", "bloque-buster", …
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  cover      text not null,                          -- clase CSS, p. ej. "cover-asteroides"
  sort_order int  not null default 0
);

create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null references public.games(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 10),
  score      integer not null check (score >= 0),
  created_at timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc);

create view public.game_stats with (security_invoker = true) as
  select g.id as game_id,
         coalesce(max(s.score), 0) as best,
         count(s.id)::int          as plays
  from public.games g left join public.scores s on s.game_id = g.id
  group by g.id;
```

RLS: `select` público (`anon`, `authenticated`) en `games` y `scores`; `insert` público solo en `scores`; ninguna política de `update`/`delete`.

```ts
// lib/games.ts — solo tipos y formato (se elimina GAMES)
export type Game = Database["public"]["Tables"]["games"]["Row"];
export interface GameWithStats extends Game {
  best: number;
  plays: number;
}
export function formatPlays(n: number): string; // 12400 → "12.4K"

// lib/data.ts (servidor, usa lib/supabase/server.ts)
export async function getGames(): Promise<GameWithStats[]>;
export async function getGame(id: string): Promise<GameWithStats | null>;
export async function getTopScores(
  gameId: string,
  limit = 12,
): Promise<ScoreRow[]>;

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
} // "DD/MM/YYYY"
```

Convenciones:

- `best` y `plays` no se guardan: salen de `game_stats`.
- Las inserciones usan el cliente de navegador (`lib/supabase/client.ts`) y solo envían `game_id`, `name` y `score`.
- El nombre se normaliza igual que la sesión actual (máx. 10 caracteres, mayúsculas); sin sesión se guarda `INVITADO`.
- Orden del top: `score desc, created_at asc` (a igualdad gana quien llegó antes).
- Los datos de seed son de ejemplo; no se distinguen de los reales en la BD.

## Plan de implementación

1. Escribir la migración (`supabase/migrations/<timestamp>_games_scores.sql`) y aplicarla con `apply_migration`. Comprobar con `list_tables` y `execute_sql` (solo `select`) que existen las tablas con su seed inicial, y con `get_advisors` que no hay avisos de seguridad (RLS).
2. Generar tipos con `generate_typescript_types` a `lib/supabase/database.types.ts` y tipar `client.ts` y `server.ts` con `Database`. `npm run lint` pasa.
3. Consultar `node_modules/next/dist/docs/` (`cacheComponents`, datos dinámicos, `searchParams`, Suspense). Crear `lib/data.ts` y reducir `lib/games.ts` a tipos + `formatPlays`. `npm run lint` pasa.
4. Migrar catálogo: `/games`, home, `/juegos/[id]` y `/juegos/[id]/jugar` leen de `getGames`/`getGame` dentro de `<Suspense>`; `game-card`, `library`, `home-page` y `lib/home.ts` reciben los datos por props; `notFound()` si el id no existe. La app arranca y las pantallas se ven igual que antes, con `best`/`plays` reales.
5. Migrar el Salón: `/salon?juego=<id>` con pestañas como enlaces, podio y tabla desde `getTopScores`, estado vacío si el juego no tiene puntuaciones; eliminar `lib/scores.ts` y el bloque «tú» simulado (se muestra la mejor posición del nombre de la sesión solo si aparece en el top). Con `?juego` inválido o ausente se usa el primer juego.
6. Pantalla de fin y guardado: en `components/asteroids-player.tsx`, al detectar `state === "gameover"` mostrar el modal con puntuación, nombre editable, GUARDAR PUNTUACIÓN, JUGAR DE NUEVO (reinicia el motor) y VOLVER AL VAULT. Insertar en `scores` solo al pulsar GUARDAR, una vez por partida; el teclado del modal no llega al motor (ESPACIO no reinicia la partida detrás). Un error de red muestra el error y permite reintentar. Una migración final deja solo `asteroides` en `games` y vacía `scores`.
7. Verificar en el navegador: jugar hasta GAME OVER, abrir `/salon?juego=asteroides` y ver la puntuación nueva; comprobar `best`/`plays` en `/games`.
8. Ejecutar `npm run lint` y `npm run build` sin errores.

Cada paso deja la app arrancable.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `list_tables` muestra `games` y `scores` con RLS activo; `game_stats` existe.
- [ ] `games` contiene únicamente `asteroides` y `scores` solo tiene las filas guardadas por jugadores (sin datos de ejemplo).
- [ ] Con la clave `anon`: `select` en `games` y `scores` funciona; `insert` en `games` falla; `update` y `delete` en `scores` fallan.
- [ ] Insertar un score con `name` vacío, de más de 10 caracteres, `score` negativo o `game_id` inexistente es rechazado por la BD.
- [ ] `get_advisors` (security) no reporta tablas sin RLS ni vistas `security definer`.
- [ ] No existen `GAMES` ni `lib/scores.ts` en el repo y ninguna pantalla importa datos mock.
- [ ] `/games`, home y `/juegos/<id>` muestran los mismos juegos y portadas que antes; `best` y `plays` coinciden con `game_stats`.
- [ ] `/juegos/inexistente` devuelve 404.
- [ ] `/salon` muestra podio y tabla ordenados por puntuación descendente del juego seleccionado; cambiar de pestaña cambia la URL a `?juego=<id>` y los datos.
- [ ] `/salon?juego=xyz` cae al primer juego sin error.
- [ ] Al terminar una partida de Asteroides aparece el modal «FIN DEL JUEGO» con la puntuación final, el campo de nombre, GUARDAR PUNTUACIÓN, JUGAR DE NUEVO y VOLVER AL VAULT; no se inserta nada hasta pulsar GUARDAR.
- [ ] Pulsar GUARDAR inserta exactamente 1 fila en `scores` con `game_id = 'asteroides'`, la puntuación final y el nombre escrito; no se puede guardar dos veces la misma partida ni con nombre vacío.
- [ ] JUGAR DE NUEVO inicia una partida nueva (3 vidas, nivel 1, puntos 0) y terminar otra vez permite guardar una segunda fila; VOLVER AL VAULT lleva a `/games`.
- [ ] Escribir un nombre con espacios o pulsar ESPACIO en el modal no reinicia el juego.
- [ ] Una puntuación guardada de ≥ 1.000 puntos aparece en el top 10 de `/juegos/asteroides` y en `/salon?juego=asteroides`.
- [ ] La nueva puntuación aparece en `/salon?juego=asteroides` sin redeploy ni recarga forzada del servidor, y `plays` de Asteroides en `/games` aumenta en 1.
- [ ] Si la inserción falla (p. ej. sin red) el modal muestra el error y permite reintentar o jugar de nuevo.
- [ ] Salir del juego antes del GAME OVER no inserta nada.
- [ ] Ninguna clave `service_role` aparece en el código ni en el repositorio.
- [ ] La consola no muestra errores ni avisos de hidratación en `/games`, `/salon` y `/juegos/asteroides/jugar`.

## Decisiones

- **Sí:** una sola spec para esquema + lectura + guardado de Asteroides (decidido por el usuario). Cierra el ciclo jugar → ranking.
- **Sí:** modal «FIN DEL JUEGO» con nombre editable y guardado manual (cambio posterior pedido por el usuario tras probar el guardado automático); **No:** guardado automático. Permite elegir el nombre y corrige que las partidas reales quedaban por debajo del top al no haber control del usuario.
- **Sí:** dejar en la BD solo `asteroides` y sin puntuaciones de ejemplo (decidido por el usuario, sustituye al seed y al escalado intermedio). Las puntuaciones de ejemplo (hasta 11.725) dejaban las partidas reales fuera del top 10 y parecía que no se guardaban.
- **Sí:** inserción pública anónima con nombre libre (decidido por el usuario); **No:** Supabase Auth ahora. Auth es una spec propia.
- **Sí:** reemplazar por completo el mock por la BD (decidido por el usuario); **No:** fallback al mock. Dos fuentes de verdad ocultarían fallos de la conexión.
- **Sí:** leaderboard «top por juego» con todas las partidas (decidido por el usuario); **No:** ranking global, mejor-por-jugador ni filtros de periodo.
- **No (revisado):** seed de puntuaciones de ejemplo. Primero se decidió sembrarlas; el usuario pidió después eliminarlas. Los juegos placeholder también salen de la BD hasta que sean jugables.
- **Sí:** `best` y `plays` derivados vía vista `game_stats` (decidido por el usuario); **No:** columnas en `games` con trigger. Evita desincronización.
- **Sí:** CHECKs en columnas como validación mínima (decidido por el usuario); sin rate limit ni anti-trampas.
- **Sí:** `?juego=<id>` con pestañas como enlaces en `/salon`. Decisión mía: URL compartible y datos cargados en servidor en vez de estado cliente.
- **Sí:** consultas dinámicas dentro de `<Suspense>`, sin caché. Decisión mía: la puntuación nueva debe verse al instante y con `cacheComponents` el acceso a datos dinámicos debe ser explícito.
- **Sí:** copiar la migración a `supabase/migrations/` además de aplicarla por MCP. Decisión mía: queda versionada en el repo (la SPEC 04 lo excluía solo porque no había esquema).
- **Sí:** desempate por `created_at asc`. Decisión mía.

## Riesgos

| Riesgo                                                                            | Mitigación                                                                                                 |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Insert público: cualquiera puede inyectar puntuaciones falsas o nombres ofensivos | Aceptado explícitamente; CHECKs limitan formato. Anti-trampas y moderación quedan para otra spec.          |
| `cacheComponents` rompe páginas que leen datos sin Suspense                       | Leer guías de Next antes de codificar; consultas siempre dentro de `<Suspense>` con fallback.              |
| Doble inserción por re-render o StrictMode al llegar a `gameover`                 | Guardia por partida (ref) reiniciada solo al salir de `gameover`; criterio de aceptación comprueba 1 fila. |
| Los seed parecen jugadores reales                                                 | Se documentan como datos de ejemplo; borrables por SQL.                                                    |
| `game_stats` como vista no respeta RLS si es `security definer`                   | Se crea con `security_invoker = true`; `get_advisors` lo verifica.                                         |
| Escritura en proyecto Supabase compartido sin rama de desarrollo                  | Migración idempotente en un solo archivo; revisar con `list_migrations` antes y después.                   |

## Lo que **no** está en esta spec

- Autenticación, perfiles y propiedad de puntuaciones.
- Anti-trampas, moderación y rate limiting.
- Guardado para juegos distintos de Asteroides.
- Ranking global, mejor-por-jugador y filtros de periodo.
- Realtime, Edge Functions y pruebas automatizadas.
