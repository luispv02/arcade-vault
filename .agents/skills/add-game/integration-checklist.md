# Checklist de integración de un juego

Todo lo que una spec generada por `/add-game` debe cubrir. Sustituye `<id>` por el slug del juego y `<X>` por su nombre en PascalCase.

## 1. Componente común de fin de juego (solo si no existe `components/game-over-modal.tsx`)

Paso inicial de la spec: extraer de `components/asteroids-player.tsx`:

- `components/game-over-modal.tsx` con props `{ gameId, score, onPlayAgain }`: modal «FIN DEL JUEGO» (clases `.modal` existentes) con puntuación final, nombre editable (precargado con `useSession()` o `INVITADO`, máx. 10, mayúsculas), GUARDAR PUNTUACIÓN (una vez por partida; estados guardando / guardada / error con reintento; no con nombre vacío), JUGAR DE NUEVO, VOLVER AL VAULT (`/games`) y bloqueo del teclado hacia el motor mientras está abierto (ESPACIO no reinicia detrás).
- `saveScore(gameId, name, score)` que inserta en `scores` con `lib/supabase/client.ts` (solo `game_id`, `name`, `score`).
- Asteroides se migra a ellos sin cambios visibles; criterio: sigue cumpliendo los criterios de SPEC 06.

Si ya existe, la spec lo reutiliza y omite este paso.

## 2. Motor en `lib/games/<id>/`

- Archivos `utils.ts`, `entities.ts`, `game.ts` (o los que el juego necesite).
- Sin variables globales de módulo ni acceso a `document`; el estado vive en la instancia.
- API: `start<X>(canvas, { onStateChange }): { destroy(): void }`; lanza error claro si no hay contexto 2D.
- Snapshot con `score`, campos propios (vidas, nivel, líneas…) y `state` que incluya `"gameover"`. `onStateChange` se llama al arrancar y solo cuando algo cambia, nunca por frame.
- `requestAnimationFrame` con `dt` limitado; listeners en `window` con `preventDefault` en las teclas del juego; limpiar teclas en `blur`; `destroy()` cancela el bucle y retira listeners (seguro bajo StrictMode).
- Canvas de resolución interna fija escalado por CSS manteniendo proporción.
- Port fiel del original: no cambiar jugabilidad, balance ni reglas. Anotar en Decisiones cualquier desviación.
- El motor nunca importa React; la comunicación es solo motor → React.

## 3. Assets

Sprites y sonidos a `public/games/<id>/`, cargados desde el motor. El audio solo se reproduce tras una interacción del usuario. Si el original los usa y no se quieren portar, decláralo fuera de alcance.

## 4. Player `components/<id>-player.tsx`

- Cliente. Barra `player-hud`/`hud-stat` (Jugador, Puntuación y los campos propios), marco `.crt` / `.crt-screen` / `.crt-bottom` con la leyenda de controles, botón SALIR a `/juegos/<id>`.
- `GameOverModal` cuando `state === "gameover"`; JUGAR DE NUEVO reinicia el motor (contador en el `useEffect`).
- `startX` solo dentro de `useEffect` (evita errores de hidratación).
- Interfaz diseñada con `/frontend-design`, respetando el look actual.

## 5. Ruta

Añadir `id === "<id>"` en `app/juegos/[id]/jugar/page.tsx` (o un mapa id → player si ya hay varios). Respetar el patrón `cacheComponents`: página síncrona con `params` dentro de `<Suspense>`. Consultar `node_modules/next/dist/docs/` antes de escribir código de Next.js.

## 6. CSS

`.cover-<id>` (portada propia, distinta de las existentes) y la clase del canvas en `app/globals.css`.

## 7. Base de datos

Migración `supabase/migrations/<timestamp>_add_game_<id>.sql`, aplicada con `apply_migration` y copiada al repo:

```sql
insert into public.games (id, title, short, long, cat, color, cover, sort_order)
values ('<id>', '...', '...', '...', 'ARCADE', 'cyan', 'cover-<id>', N)
on conflict (id) do nothing;
```

`scores`, `game_stats` y RLS son genéricos: no se tocan. Comprobar con `list_tables`/`execute_sql` (solo `select`) y `get_advisors`. Regenerar tipos solo si cambia el esquema.

## 8. Leaderboard

Sin código nuevo: `/games`, `/juegos/<id>` y `/salon?juego=<id>` leen de `getGames`/`getGame`/`getTopScores` (`lib/data.ts`).

## 9. Criterios de aceptación estándar

- [ ] `npm run lint` y `npm run build` sin errores.
- [ ] Tarjeta con portada propia en `/games` y ficha en `/juegos/<id>`; el botón de jugar lleva a `/juegos/<id>/jugar`.
- [ ] La partida arranca sola y se puede jugar completa con los controles del original.
- [ ] La barra HUD de la plataforma coincide en todo momento con el estado del juego y no re-renderiza a 60 fps.
- [ ] Las teclas del juego no hacen scroll de la página.
- [ ] Al llegar al fin aparece el modal; no se inserta nada hasta pulsar GUARDAR.
- [ ] GUARDAR inserta exactamente 1 fila con `game_id = '<id>'`, la puntuación y el nombre; no se puede guardar dos veces la misma partida ni con nombre vacío.
- [ ] JUGAR DE NUEVO inicia una partida limpia y permite guardar una segunda fila; VOLVER AL VAULT lleva a `/games`.
- [ ] La puntuación aparece en `/salon?juego=<id>` sin redeploy y `plays` sube en 1.
- [ ] Si la inserción falla, el modal muestra el error y permite reintentar.
- [ ] Salir antes del fin no inserta nada; tras SALIR no quedan listeners ni bucle activo.
- [ ] Sin scroll horizontal a 375 px; consola sin errores ni avisos de hidratación.
- [ ] Asteroides y los demás juegos siguen funcionando; ninguna clave `service_role` en el repo.

## 10. Fuera de alcance por defecto

Autenticación, anti-trampas y moderación, controles táctiles o gamepad, cambios de jugabilidad, ranking global, pruebas automatizadas.
