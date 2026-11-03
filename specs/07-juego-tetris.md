# SPEC 07 — Juego Tetris con leaderboard

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-03
> **Objetivo:** Portar a TypeScript el juego `references/templates/started-games/03-tetris/` como el juego `tetris` del catálogo, jugable en `/juegos/tetris/jugar`, que al terminar la partida permite guardar la puntuación en `scores` mediante un modal «FIN DEL JUEGO» común extraído de Asteroides.

## Por qué existe esta spec

Asteroides (SPEC 05 + 06) es hoy el único juego real y su modal de fin de partida, el guardado en `scores` y la lógica de «JUGAR DE NUEVO» viven dentro de `components/asteroids-player.tsx`. Para añadir un segundo juego sin copiar ese bloque, el primer paso extrae el modal y `saveScore` a componentes comunes. Después se porta Tetris (`game.js` de 332 líneas, estado en variables globales, acceso directo al DOM y dos canvas) siguiendo el patrón de SPEC 05: motor en `lib/games/<id>/` + player cliente. El leaderboard (`/games`, `/juegos/tetris`, `/salon?juego=tetris`) no necesita código nuevo: las tablas de SPEC 06 ya son genéricas.

## Alcance

**Dentro:**

- **Extracción común** (paso inicial, porque `components/game-over-modal.tsx` no existe):
  - `components/game-over-modal.tsx` con props `{ gameId, score, onPlayAgain }`: modal «FIN DEL JUEGO» con las clases `.modal` existentes, puntuación final, nombre editable (precargado con `useSession()` o `INVITADO`, máx. 10, mayúsculas), GUARDAR PUNTUACIÓN (una vez por partida; estados guardando / guardada / error con reintento; no con nombre vacío), JUGAR DE NUEVO, VOLVER AL VAULT (`/games`) y bloqueo del teclado hacia el motor mientras está abierto.
  - `lib/save-score.ts` con `saveScore(gameId, name, score)`, que inserta en `scores` con `lib/supabase/client.ts` enviando solo `game_id`, `name` y `score`.
  - `components/asteroids-player.tsx` se migra a ambos sin cambios visibles ni de comportamiento.
- **Motor** en `lib/games/tetris/` (`utils.ts`, `game.ts`), sin variables globales de módulo ni acceso a `document`. API `startTetris(canvas, { onStateChange }): { destroy(): void }`; lanza un error claro si no hay contexto 2D.
- Se porta **todo** el comportamiento de `game.js`:
  - Tablero 10×20 con bloque de 30 px.
  - **8 piezas**: I, O, T, S, Z, J, L y la «N» (tuerca 3×3 hueca, gris `#9e9e9e`), elegidas con `Math.floor(Math.random() * 8) + 1`.
  - Rotación horaria con wall kicks `[0, -1, 1, -2, 2]`.
  - Movimiento lateral, soft drop (↓), hard drop (Espacio), rotación con `↑` o `X`.
  - Pieza fantasma (`globalAlpha` 0.2) y pieza siguiente.
  - Puntuación: líneas `[0, 100, 300, 500, 800] × nivel`, hard drop +2 por celda recorrida, soft drop +1 por fila.
  - Nivel = `floor(líneas / 10) + 1` e intervalo de caída `max(100, 1000 − (nivel − 1) × 90)` ms.
  - Pausa con `P`.
  - Fin de partida cuando una pieza recién generada colisiona al aparecer.
- Las piezas y colores del original se conservan. Se descartan el panel HTML lateral (SCORE/LINES/LEVEL/NEXT/CONTROLS), el overlay HTML y el botón de tema claro/oscuro; ver Decisiones.
- **Canvas de 460×600** de resolución interna fija: tablero 300×600 a la izquierda y, a la derecha, un panel dibujado en el canvas con el recuadro «NEXT» (cuadrícula 4×4 de bloques de 30 px). Escalado por CSS manteniendo proporción.
- El canvas dibuja también la capa «PAUSA» (al pulsar `P`). El fin de partida lo cubre el modal común. **Se usan los dos HUD:** el recuadro NEXT queda en el canvas y la barra de la plataforma muestra el resto.
- El motor notifica a React `{ score, lines, level, state }` con `state: "playing" | "paused" | "gameover"`, al arrancar y solo cuando algún valor cambia (nunca por frame).
- Teclado: `keydown` en `window` con `preventDefault` en `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Space`, `KeyX` y `KeyP`; los listeners y el `requestAnimationFrame` se retiran en `destroy()`.
- Componente cliente `components/tetris-player.tsx`: barra `player-hud` / `hud-stat` (Jugador, Puntuación, Líneas, Nivel), marco `.crt` / `.crt-screen` / `.crt-bottom` con la leyenda de controles, botón SALIR a `/juegos/tetris` y `GameOverModal` cuando `state === "gameover"`.
- `app/juegos/[id]/jugar/page.tsx` pasa a un mapa `id → componente player` (`asteroides`, `tetris`); el resto de ids sigue con `GamePlayer`.
- Portada `.cover-tetris` (nueva, propia, distinta de las existentes) y clase `.tetris-canvas` en `app/globals.css`.
- Migración `supabase/migrations/<timestamp>_add_game_tetris.sql`, aplicada con `apply_migration` y copiada al repo, que inserta `tetris` en `games`.
- Interfaz diseñada con `/frontend-design`, respetando el look actual.

**Fuera de alcance (para otras specs):**

- Sonido y música (el original no tiene).
- Botones PAUSA y FIN de la barra de la plataforma; la pausa es solo la tecla `P`.
- Selector de tema claro/oscuro del original y su clave `localStorage` `tetris-theme`.
- Que React controle el juego (la comunicación es solo motor → React).
- Cambios de jugabilidad, balance o reglas del original (incluida la pieza «N»).
- Autenticación, anti-trampas y moderación, controles táctiles o gamepad, ranking global.
- Cambios en `scores`, `game_stats`, RLS o `lib/data.ts`.
- Pruebas automatizadas.

## Modelo de datos

Esta feature no cambia el esquema de la BD: añade una fila a `games` y la API del motor.

```sql
-- supabase/migrations/<timestamp>_add_game_tetris.sql
insert into public.games (id, title, short, long, cat, color, cover, sort_order)
values ('tetris', 'TETRIS', '...', '...', 'PUZZLE', 'magenta', 'cover-tetris', 2)
on conflict (id) do nothing;
```

`short` y `long` se escriben en español a partir del README del juego (tablero 10×20, 8 piezas incluida la tuerca, fantasma, niveles cada 10 líneas).

```ts
// lib/games/tetris/game.ts
export interface TetrisSnapshot {
  score: number;
  lines: number;
  level: number;
  state: "playing" | "paused" | "gameover";
}
export interface TetrisGame {
  destroy(): void;
}
export function startTetris(
  canvas: HTMLCanvasElement,
  opts?: { onStateChange?: (s: TetrisSnapshot) => void },
): TetrisGame;

// lib/save-score.ts
export async function saveScore(
  gameId: string,
  name: string,
  score: number,
): Promise<{ ok: boolean }>;

// components/game-over-modal.tsx
export function GameOverModal(props: {
  gameId: string;
  score: number;
  onPlayAgain: () => void;
}): JSX.Element;
```

Convenciones:

- `COLS = 10`, `ROWS = 20`, `BLOCK = 30`, `LINE_SCORES` y `COLORS` indexados 1–8, como en el original. Canvas interno `W = 460`, `H = 600`.
- Estado (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`) vive dentro de la instancia creada por `startTetris`, no en el ámbito del módulo.
- Pieza: `{ type, shape, x, y }` con `shape` matriz 2D. El color de la rejilla, que el original leía de una variable CSS del `<body>`, pasa a ser una constante del motor (valor del tema oscuro, `#22222e`).
- Orden de despliegue: la fila `tetris` se inserta antes de enrutar el player (paso 3) para poder probar la ficha; hasta el paso 8 `/juegos/tetris/jugar` muestra el placeholder `GamePlayer`.
- `best` y `plays` siguen derivándose de `game_stats`; nada se guarda en el cliente.

## Plan de implementación

1. Crear `lib/save-score.ts` y `components/game-over-modal.tsx` extrayendo el código de `components/asteroids-player.tsx`; migrar Asteroides a ellos. `npm run lint` pasa; jugar Asteroides hasta el fin y guardar una puntuación funciona igual que antes.
2. Añadir `.cover-tetris` a `app/globals.css`. La app arranca sin cambios visibles (la clase aún no se usa).
3. Escribir la migración `add_game_tetris`, aplicarla con `apply_migration` y copiarla a `supabase/migrations/`. Comprobar con `list_tables` / `execute_sql` (solo `select`) que existe la fila, y con `get_advisors` que no hay avisos nuevos. `/games` y `/juegos/tetris` muestran la tarjeta y la ficha; jugar usa aún el placeholder.
4. Crear `lib/games/tetris/utils.ts`: constantes (`COLS`, `ROWS`, `BLOCK`, `W`, `H`, `COLORS`, `PIECES`, `LINE_SCORES`), `createBoard`, `rotateCW`, `randomPiece`. `npm run lint` pasa.
5. Crear `lib/games/tetris/game.ts` (parte 1): estado en closure, `collide`, `tryRotate`, `merge`, `clearLines`, `spawn`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, puntuación y niveles, sin dibujo ni bucle. `npm run lint` pasa.
6. Completar `game.ts` (parte 2): dibujo del tablero, rejilla, fantasma, pieza actual y panel NEXT en el canvas; capa PAUSA; bucle con `requestAnimationFrame` y `dt` ≤ 50 ms; input con `preventDefault`; `onStateChange`; `destroy()`. `npm run lint` pasa.
7. Crear `components/tetris-player.tsx` (cliente): `useEffect` que llama a `startTetris` con la ref del canvas y devuelve `destroy`, barra HUD, marco CRT, canvas escalado por CSS (`.tetris-canvas`), botón SALIR y `GameOverModal` con reinicio mediante contador `run`. `npm run lint` pasa.
8. Cambiar `app/juegos/[id]/jugar/page.tsx` a un mapa `id → player` con `asteroides` y `tetris`. Jugar una partida completa en el navegador, guardar la puntuación y verla en `/salon?juego=tetris`.
9. Ejecutar `npm run lint` y `npm run build` sin errores.

Cada paso deja la app arrancable. Se consultan las guías de `node_modules/next/dist/docs/` antes de escribir código de Next.js (en particular `cacheComponents` en la página de juego).

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/games` muestra la tarjeta «TETRIS» (PUZZLE, magenta) con portada propia distinta de «ASTEROIDES», y `/juegos/tetris` muestra su ficha con un botón de jugar que lleva a `/juegos/tetris/jugar`.
- [ ] La tabla `games` contiene `tetris` con `sort_order = 2` y `asteroides` no cambia; `get_advisors` (security) no reporta avisos nuevos.
- [ ] `/juegos/tetris/jugar` muestra el canvas dentro del marco CRT y la partida arranca sola con tablero vacío, score 0, líneas 0 y nivel 1.
- [ ] La barra de la plataforma muestra Jugador (nombre de sesión o `INVITADO`), Puntuación, Líneas y Nivel, y sus valores coinciden en todo momento con el estado del juego; el recuadro NEXT del canvas muestra la pieza que será la siguiente.
- [ ] La barra se actualiza solo cuando cambia algún valor, no en cada frame (React no re-renderiza a 60 fps).
- [ ] `←` `→` mueven la pieza, `↑` y `X` la rotan en sentido horario (con wall kick), `↓` la baja una fila y `Espacio` la deja caer al instante.
- [ ] Soft drop suma 1 punto por fila y hard drop 2 puntos por celda recorrida.
- [ ] Limpiar 1, 2, 3 y 4 líneas a la vez suma 100, 300, 500 y 800 multiplicado por el nivel vigente.
- [ ] El nivel sube cada 10 líneas y el intervalo de caída pasa a `max(100, 1000 − (nivel − 1) × 90)` ms.
- [ ] Aparecen las 8 piezas, incluida la «N» hueca gris; la pieza fantasma se dibuja con transparencia en el punto de aterrizaje.
- [ ] `P` pausa (el canvas muestra «PAUSA» y la pieza deja de caer, el estado de la barra no cambia sus valores) y vuelve a pulsarla reanuda sin saltos; con el juego en pausa las demás teclas no hacen nada.
- [ ] Al aparecer una pieza que colisiona se detiene el bucle y aparece el modal «FIN DEL JUEGO» con la puntuación final; no se inserta nada hasta pulsar GUARDAR.
- [ ] GUARDAR inserta exactamente 1 fila con `game_id = 'tetris'`, la puntuación final y el nombre escrito; no se puede guardar dos veces la misma partida ni con nombre vacío.
- [ ] Escribir un nombre con espacios o pulsar `Espacio` en el modal no mueve ni reinicia el juego.
- [ ] JUGAR DE NUEVO inicia una partida limpia (score 0, líneas 0, nivel 1, tablero vacío) y permite guardar una segunda fila; VOLVER AL VAULT lleva a `/games`.
- [ ] La puntuación guardada aparece en `/salon?juego=tetris` sin redeploy y `plays` de Tetris sube en 1 en `/games`.
- [ ] Si la inserción falla (p. ej. sin red) el modal muestra el error y permite reintentar.
- [ ] Salir antes del fin no inserta nada; tras SALIR no quedan listeners de teclado ni bucle activo, y volver a entrar inicia una partida nueva sin duplicar la velocidad de caída ni las acciones por tecla.
- [ ] Las flechas, `Espacio`, `X` y `P` no hacen scroll de la página en `/juegos/tetris/jugar`.
- [ ] El canvas se ve completo y sin scroll horizontal a 375 px de ancho, manteniendo su proporción.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos/tetris/jugar`, `/games` y `/salon`.
- [ ] Asteroides sigue cumpliendo los criterios de SPEC 05 y SPEC 06 tras migrar al modal común (modal, guardado único, JUGAR DE NUEVO, error con reintento).
- [ ] Ninguna clave `service_role` aparece en el repositorio y no se modifican el esquema, `lib/data.ts` ni las políticas RLS.

## Decisiones

- **Sí:** título y `id` `tetris` (decidido por el usuario, pese a que el nombre es comercial); **No:** título genérico (`CAÍDA`, `BLOQUES`), que propuse. Los assets son propios: portada `.cover-tetris` original, sin arte, música ni marcas del juego comercial.
- **Sí:** `cat = PUZZLE`, `color = magenta` (decidido por el usuario), `sort_order = 2` (decisión mía, a continuación de Asteroides).
- **Sí:** mantener las 8 piezas, incluida la «N» (decidido por el usuario). El README dice 7 pero `game.js` elige entre 8; se porta el código real y no se altera la jugabilidad.
- **Sí:** mantener la pausa con `P` y el recuadro NEXT dentro del canvas (decidido por el usuario); **No:** botón de tema claro/oscuro. La plataforma ya tiene su propio estilo.
- **Sí:** canvas único de 460×600 con el panel NEXT dibujado dentro. Decisión mía: el contrato del motor recibe un solo canvas y evita un segundo `<canvas>` desincronizado.
- **Sí:** barra de la plataforma con Jugador, Puntuación, Líneas y Nivel, sin botón PAUSA.
- **Sí:** extraer `GameOverModal` y `saveScore` ahora, antes del segundo juego (lo exige la skill porque aún no existía). Evita duplicar ~100 líneas en cada player.
- **Sí:** `saveScore` en `lib/save-score.ts`. Decisión mía: `lib/scores.ts` se eliminó en SPEC 06 y conviene un nombre distinto.
- **Sí:** el mapa `id → player` en `app/juegos/[id]/jugar/page.tsx`, ya que hay dos juegos reales.
- **Sí:** `dt` limitado a 50 ms, como en SPEC 05. Decisión mía: el original no lo limita, pero a 60 fps el comportamiento es idéntico y evita saltos al volver de una pestaña oculta.
- **Sí:** dibujar un último frame al llegar al fin de partida. Decisión mía: el original no redibuja tras `endGame()`, de modo que el último bloque colocado no se ve detrás del modal; es el único cambio visual respecto al original.
- **Sí:** el color de la rejilla como constante del tema oscuro, porque el motor no puede leer el `<body>`.
- **Sí:** repetición de teclas del sistema operativo sin filtrar, igual que el original (mantener ← mueve varias celdas).
- **No:** sonido, controles táctiles, gamepad ni cambios de balance (fuera de alcance por defecto).
- **No:** cambios de esquema, `game_stats` ni RLS. Las tablas de SPEC 06 ya son genéricas.

## Riesgos

| Riesgo                                                                                       | Mitigación                                                                                                               |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| «Tetris» es una marca registrada y el nombre del juego podría causar problemas si se publica | El usuario lo decidió; los assets son propios. Si se publica fuera del proyecto educativo, renombrar es un `update` SQL. |
| Refactor de Asteroides rompe su guardado o el bloqueo de teclado                             | Paso 1 aislado con prueba manual completa y criterio de aceptación explícito.                                            |
| React StrictMode monta el efecto dos veces y duplica bucles o listeners                      | `destroy()` cancela el RAF y retira todos los listeners; hay criterio de aceptación.                                     |
| `Math.random` / estado inicial en el render provoca errores de hidratación                   | `startTetris` solo se llama dentro de `useEffect`; el render emite el `<canvas>` vacío.                                  |
| Doble inserción al llegar a `gameover`                                                       | La guardia por partida vive en `GameOverModal` y se reinicia al volver a jugar.                                          |
| Escritura en el proyecto Supabase compartido sin rama de desarrollo                          | Migración idempotente (`on conflict do nothing`); revisar con `list_migrations` antes y después.                         |
| Pausa y reanudación acumulan `dt` y la pieza cae de golpe                                    | Al reanudar se reinicia `lastTime` y `dropAccum` conserva el valor previo, como en el original.                          |
| El panel NEXT del canvas queda pequeño en pantallas estrechas                                | El canvas escala con CSS y la leyenda de controles queda fuera del canvas, en `.crt-bottom`.                             |

## Lo que **no** está en esta spec

- Sonido, música y efectos.
- Botones PAUSA/FIN de la barra y control del juego desde React.
- Selector de tema claro/oscuro.
- Controles táctiles y gamepad.
- Cambios de jugabilidad o de balance respecto al original.
- Autenticación, anti-trampas, moderación y ranking global.
- Cambios de esquema, RLS o `lib/data.ts`.
- Tests automatizados.

Cada uno de estos, si se hace, va en su propia spec.
