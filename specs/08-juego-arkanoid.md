# SPEC 08 — Juego Arkanoid con leaderboard

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06, SPEC 07
> **Fecha:** 2026-11-03
> **Objetivo:** Portar a TypeScript el juego `references/templates/started-games/04-arkanoid/` como el juego `arkanoid` del catálogo, jugable en `/juegos/arkanoid/jugar`, que al terminar la partida (por perder las 3 vidas o por limpiar los 5 niveles) permite guardar la puntuación en `scores` con el modal «FIN DEL JUEGO» común.

## Por qué existe esta spec

Con Asteroides (SPEC 05 + 06) y Tetris (SPEC 07) la plataforma ya tiene el patrón completo: motor en `lib/games/<id>/`, player cliente, modal común `components/game-over-modal.tsx`, `saveScore` y mapa `id → player` en la página de juego. Arkanoid es el tercer juego y el primero con **assets externos** (spritesheet PNG y dos sonidos MP3), **ratón** además de teclado, y **dos finales** distintos (perder y ganar). Esas tres cosas son las que obligan a decisiones nuevas; el resto es aplicar el patrón. El leaderboard (`/games`, `/juegos/arkanoid`, `/salon?juego=arkanoid`) no necesita código nuevo: las tablas de SPEC 06 ya son genéricas.

El original (`game.js` de 268 líneas, `levels.js`, `assets/spritesheet.js`) usa estado en variables globales y acceso directo al DOM (`getElementById`, `document.createElement('canvas')`, `document.addEventListener`), por lo que se reescribe siguiendo el patrón en lugar de copiarlo.

## Alcance

**Dentro:**

- **Assets** copiados a `public/games/arkanoid/`: `spritesheet-breakout.png`, `sounds/ball-bounce.mp3` y `sounds/break-sound.mp3`. El motor los carga desde `/games/arkanoid/...`.
- **Motor** en `lib/games/arkanoid/` (`utils.ts`, `levels.ts`, `sprites.ts`, `game.ts`), sin variables globales de módulo ni acceso a `document`. API `startArkanoid(canvas, { onStateChange }): { destroy(): void }`; lanza un error claro si no hay contexto 2D.
- Se porta **todo** el comportamiento del original:
  - Canvas 800×600, paddle de 81×14 y pelota de 16×16, ambos con sprites del spritesheet.
  - Paddle con teclado (← →, 400 px/s) y con ratón (sigue el puntero, limitado a los bordes).
  - Rebote en paredes izquierda, derecha y techo, y en el paddle (solo si la pelota baja).
  - Bloques 64×24 en una parrilla de 10 columnas con origen (80, 80); un bloque destruido por frame, +10 puntos y rebote vertical de la pelota.
  - Animación de explosión de 4 frames (150 ms) al destruir un bloque.
  - 3 vidas: al caer la pelota se pierde una y se recoloca sobre el paddle; con 0 vidas, fin de partida.
  - 5 niveles (`LEVELS`) con sus patrones y multiplicador de velocidad (1.00, 1.10, 1.21, 1.33, 1.46); al limpiar un nivel se carga el siguiente y el score se acumula.
  - Al limpiar el nivel 5, victoria.
  - Efectos de sonido al rebotar (paredes y paddle) y al romper un bloque.
  - Pausa con `P` o `Escape`.
- **HUD del canvas** del original (`Score`, `Nivel`, vidas como pelotas) y overlays `GAME OVER` y `¡Completaste el juego!`. **Se usan los dos HUD:** el del canvas se conserva y la barra de la plataforma muestra además Jugador, Puntuación, Vidas y Nivel.
- **Pausa simplificada:** el overlay de pausa muestra solo «PAUSA» y la indicación de reanudar; se **elimina el selector de nivel 1–5** (ver Decisiones).
- El motor notifica a React `{ score, lives, level, state, won }` con `state: "playing" | "paused" | "gameover"` y `won: boolean` (verdadero solo si `gameover` llega por limpiar el nivel 5), al arrancar y solo cuando algún valor cambia (nunca por frame).
- Entrada: `keydown`/`keyup` y `blur` en `window` y `mousemove` en el canvas, todos retirados en `destroy()`. `preventDefault` en `ArrowLeft`, `ArrowRight`, `KeyP` y `Escape`. El ratón se convierte a coordenadas internas teniendo en cuenta las barras negras que deja `object-fit: contain` (ver Modelo de datos).
- Componente cliente `components/arkanoid-player.tsx`: barra `player-hud` / `hud-stat` (Jugador, Puntuación, Vidas, Nivel), marco `.crt` / `.crt-screen` / `.crt-bottom` con la leyenda de controles, botón SALIR a `/juegos/arkanoid` y `GameOverModal` cuando `state === "gameover"`.
- `app/juegos/[id]/jugar/page.tsx`: se añade `arkanoid` al mapa `PLAYERS` existente.
- Portada `.cover-arkanoid` (nueva, propia, distinta de `.cover-bricks` y del resto) y clase `.arkanoid-canvas` en `app/globals.css`.
- Migración `supabase/migrations/<timestamp>_add_game_arkanoid.sql`, aplicada con `apply_migration` y copiada al repo, que inserta `arkanoid` en `games`.
- Interfaz diseñada con `/frontend-design`, respetando el look actual.

**Fuera de alcance (para otras specs):**

- Selector de nivel de la pausa (se elimina, no se porta).
- Música de fondo, control de volumen o silenciar.
- Más niveles, power-ups, ángulo de rebote según el punto de impacto en el paddle y cualquier cambio de jugabilidad, balance o reglas del original.
- Botones PAUSA y FIN de la barra de la plataforma; la pausa es solo `P` o `Escape`.
- Que React controle el juego (la comunicación es solo motor → React).
- Autenticación, anti-trampas y moderación, controles táctiles o gamepad, ranking global.
- Cambios en `scores`, `game_stats`, RLS, `lib/data.ts` o `components/game-over-modal.tsx`.
- Pruebas automatizadas.

## Modelo de datos

Esta feature no cambia el esquema de la BD: añade una fila a `games` y la API del motor.

```sql
-- supabase/migrations/<timestamp>_add_game_arkanoid.sql
insert into public.games (id, title, short, long, cat, color, cover, sort_order)
values ('arkanoid', 'ARKANOID', '...', '...', 'ARCADE', 'cyan', 'cover-arkanoid', 3)
on conflict (id) do nothing;
```

`short` y `long` se escriben en español a partir del README del juego (3 vidas, 5 niveles con patrones distintos, la pelota gana un 10 % de velocidad por nivel, explosiones y sonido).

```ts
// lib/games/arkanoid/game.ts
export interface ArkanoidSnapshot {
  score: number;
  lives: number;
  level: number; // 1–5
  state: "playing" | "paused" | "gameover";
  won: boolean; // true solo si el gameover llega por limpiar el nivel 5
}
export interface ArkanoidGame {
  destroy(): void;
}
export function startArkanoid(
  canvas: HTMLCanvasElement,
  opts?: { onStateChange?: (s: ArkanoidSnapshot) => void },
): ArkanoidGame;

// lib/games/arkanoid/levels.ts
export interface LevelBlock {
  col: number;
  row: number;
  color: BlockColor;
}
export interface Level {
  speed: number;
  blocks: LevelBlock[];
}
export const LEVELS: Level[]; // 5 niveles, mismos patrones que levels.js

// lib/games/arkanoid/sprites.ts
export type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";
export interface SpriteRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
export const SPRITES: {
  paddle: SpriteRect;
  ball: SpriteRect;
  blocks: Record<BlockColor, SpriteRect>;
};
export const EXPLOSION_FRAMES: Record<BlockColor, SpriteRect[]>; // 4 frames por color
export const EXPLOSION_DURATION = 150; // ms
```

Convenciones:

- Constantes del original sin cambios: `W = 800`, `H = 600`, `PADDLE_SPEED = 400`, `BLOCK_COLS = 10`, `BLOCK_ROWS = 6`, `BLOCK_W = 64`, `BLOCK_H = 24`, origen de bloques `(80, 80)`, `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300`, paddle `{ y: 560, w: 81, h: 14 }`, pelota 16×16, 3 vidas, 10 puntos por bloque.
- Estado (`paddle`, `ball`, `blocks`, `explosions`, `score`, `lives`, `currentLevel`, `paused`, `state`, `won`, `keys`) vive dentro de la instancia creada por `startArkanoid`, no en el ámbito del módulo.
- El spritesheet se carga con `new Image()` dentro de la instancia y se dibuja directamente con `drawImage`; no se crea el `<canvas>` auxiliar del original (evita `document`). Los sonidos se crean con `new Audio(url)` dentro de la instancia y se reproducen con `cloneNode()`; el `Promise` de `play()` se captura para que un bloqueo de autoplay del navegador no genere errores en consola.
- El bucle y los listeners no arrancan hasta que la imagen carga; si `destroy()` se llama antes, no se arranca nada.
- Conversión del ratón: el canvas CSS ocupa todo `.crt-screen` con `object-fit: contain`, así que el área dibujada es menor que su `getBoundingClientRect()`. Escala `s = min(rect.width / W, rect.height / H)`; origen del dibujo `ox = (rect.width − W·s) / 2`; coordenada interna `x = (clientX − rect.left − ox) / s`.
- Estado final: perder la última vida → `state: "gameover", won: false`; limpiar el nivel 5 → `state: "gameover", won: true`. Ambos dibujan su overlay del canvas en un último frame y detienen el bucle.
- Orden de despliegue: la fila `arkanoid` se inserta antes de enrutar el player (paso 3) para poder probar la ficha; hasta el paso 8 `/juegos/arkanoid/jugar` muestra el placeholder `GamePlayer`.
- `best` y `plays` siguen derivándose de `game_stats`; nada se guarda en el cliente.

## Plan de implementación

1. Crear `public/games/arkanoid/` y copiar los tres assets del template (`spritesheet-breakout.png`, `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3`). La app arranca sin cambios visibles; los archivos responden en `/games/arkanoid/spritesheet-breakout.png` y en las dos rutas de sonido.
2. Añadir `.cover-arkanoid` a `app/globals.css`, diseñada con `/frontend-design` y distinta de `.cover-bricks`. La app arranca sin cambios visibles (la clase aún no se usa).
3. Escribir la migración `add_game_arkanoid`, aplicarla con `apply_migration` y copiarla a `supabase/migrations/`. Comprobar con `list_tables` / `execute_sql` (solo `select`) que existe la fila, y con `get_advisors` que no hay avisos nuevos. `/games` y `/juegos/arkanoid` muestran la tarjeta y la ficha; jugar usa aún el placeholder.
4. Crear `lib/games/arkanoid/utils.ts` (constantes y rutas de assets), `levels.ts` (los 5 niveles tipados, idénticos a `levels.js`) y `sprites.ts` (`SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`, helpers de dibujo que reciben la imagen). `npm run lint` pasa.
5. Crear `lib/games/arkanoid/game.ts` (parte 1): contexto 2D, estado en closure, carga de imagen y sonidos, `initPaddle`, `initBall`, `loadLevel`, colisión AABB, `update(dt)` (paddle, pelota, paredes, bloques, explosiones, vidas, avance de nivel, victoria) y `notify`. Sin dibujo, bucle ni input. `npm run lint` pasa.
6. Completar `game.ts` (parte 2): dibujo (bloques, explosiones, paddle, pelota, HUD del canvas, overlays `GAME OVER`, `¡Completaste el juego!` y `PAUSA`), bucle con `requestAnimationFrame` y `dt` ≤ 50 ms que arranca al cargar la imagen, input (teclado, `blur`, ratón con la conversión de arriba, `preventDefault`), último frame al terminar y `destroy()`. `npm run lint` pasa.
7. Crear `components/arkanoid-player.tsx` (cliente) y `.arkanoid-canvas` en `app/globals.css`: `useEffect` que llama a `startArkanoid` con la ref del canvas y devuelve `destroy`, barra HUD, marco CRT, botón SALIR y `GameOverModal` con reinicio mediante contador `run`. `npm run lint` pasa.
8. Añadir `arkanoid` al mapa `PLAYERS` de `app/juegos/[id]/jugar/page.tsx`. Jugar en el navegador una partida hasta perder, guardar la puntuación y verla en `/salon?juego=arkanoid`.
9. Ejecutar `npm run lint` y `npm run build` sin errores.

Cada paso deja la app arrancable. Se consultan las guías de `node_modules/next/dist/docs/` antes de escribir código de Next.js (la ruta de juego mantiene el patrón `cacheComponents`: página síncrona con `params` dentro de `<Suspense>`).

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/games` muestra la tarjeta «ARKANOID» (ARCADE, cyan) con portada propia distinta de «ASTEROIDES» y «TETRIS», y `/juegos/arkanoid` muestra su ficha con un botón de jugar que lleva a `/juegos/arkanoid/jugar`.
- [ ] La tabla `games` contiene `arkanoid` con `sort_order = 3`, y `asteroides` y `tetris` no cambian; `get_advisors` (security) no reporta avisos nuevos.
- [ ] Los tres assets responden con 200 en `/games/arkanoid/spritesheet-breakout.png`, `/games/arkanoid/sounds/ball-bounce.mp3` y `/games/arkanoid/sounds/break-sound.mp3`.
- [ ] `/juegos/arkanoid/jugar` muestra el canvas dentro del marco CRT y la partida arranca sola con 60 bloques (nivel 1), 3 vidas, nivel 1 y score 0.
- [ ] La barra de la plataforma muestra Jugador (nombre de sesión o `INVITADO`), Puntuación, Vidas y Nivel, y sus valores coinciden en todo momento con el HUD del canvas; el HUD del canvas sigue dibujado.
- [ ] La barra se actualiza solo cuando cambia algún valor, no en cada frame (React no re-renderiza a 60 fps).
- [ ] `←` `→` mueven el paddle y el ratón lo sigue, sin salirse de los bordes del canvas.
- [ ] Con el canvas escalado (ventana ancha, estrecha y a 375 px) el paddle queda justo bajo el puntero, también cuando hay barras negras a los lados o arriba y abajo.
- [ ] La pelota rebota en paredes, techo y paddle; no rebota en el paddle cuando va hacia arriba.
- [ ] Destruir un bloque suma exactamente 10 puntos, invierte el rebote vertical de la pelota, reproduce una explosión de 4 frames y quita el bloque; solo se destruye un bloque por frame.
- [ ] Dejar caer la pelota quita una vida y la recoloca sobre el paddle con la velocidad del nivel actual; el HUD muestra una pelota menos.
- [ ] Al limpiar todos los bloques se carga el nivel siguiente (2 pirámide, 3 ajedrez, 4 filas con huecos, 5 marco con cruz), con velocidad ×1.10, ×1.21, ×1.33 y ×1.46, y el score se conserva.
- [ ] Se oye el sonido de rebote en paredes y paddle y el de rotura al destruir un bloque; si el navegador bloquea el audio, la consola no muestra errores.
- [ ] `P` y `Escape` pausan y reanudan; en pausa el canvas muestra «PAUSA» sin selector de nivel, la pelota y el paddle no se mueven y el estado de la barra no cambia sus valores; al reanudar no hay saltos.
- [ ] Hacer clic en el canvas en pausa no cambia de nivel ni reinicia nada.
- [ ] Al perder la última vida se dibuja `GAME OVER`, se detiene el bucle y aparece el modal «FIN DEL JUEGO» con la puntuación final; no se inserta nada hasta pulsar GUARDAR.
- [ ] Al limpiar el nivel 5 se dibuja `¡Completaste el juego!` y aparece el mismo modal con la puntuación final.
- [ ] GUARDAR inserta exactamente 1 fila con `game_id = 'arkanoid'`, la puntuación final y el nombre escrito; no se puede guardar dos veces la misma partida ni con nombre vacío.
- [ ] Escribir un nombre con espacios o pulsar `Espacio`, `←`, `→`, `P` o `Escape` en el modal no mueve, pausa ni reinicia el juego.
- [ ] JUGAR DE NUEVO inicia una partida limpia (score 0, 3 vidas, nivel 1, 60 bloques) y permite guardar una segunda fila; VOLVER AL VAULT lleva a `/games`.
- [ ] La puntuación guardada aparece en `/salon?juego=arkanoid` sin redeploy y `plays` de Arkanoid sube en 1 en `/games`.
- [ ] Si la inserción falla (p. ej. sin red) el modal muestra el error y permite reintentar.
- [ ] Salir antes del fin no inserta nada; tras SALIR no quedan listeners (teclado, `blur`, ratón) ni bucle activo, y volver a entrar inicia una partida nueva sin duplicar velocidad ni acciones por tecla (también bajo StrictMode).
- [ ] Salir de la página antes de que cargue el spritesheet no deja bucle ni listeners activos.
- [ ] `←`, `→`, `P` y `Escape` no hacen scroll de la página en `/juegos/arkanoid/jugar`.
- [ ] El canvas se ve completo y sin scroll horizontal a 375 px de ancho, manteniendo su proporción 4:3.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos/arkanoid/jugar`, `/games` y `/salon`.
- [ ] Asteroides y Tetris siguen cumpliendo los criterios de SPEC 05, 06 y 07 (modal, guardado único, JUGAR DE NUEVO, error con reintento).
- [ ] Ninguna clave `service_role` aparece en el repositorio y no se modifican el esquema, `lib/data.ts`, `components/game-over-modal.tsx` ni las políticas RLS.

## Decisiones

- **Sí:** título `ARKANOID` e id `arkanoid` (decidido por el usuario, pese a que el nombre es comercial); **No:** `BLOQUE BUSTER` o `MURO NEÓN`, que propuse. Los assets del template se usan tal cual vienen en el proyecto; la portada `.cover-arkanoid` es propia.
- **Sí:** `cat = ARCADE`, `color = cyan` y `sort_order = 3` (decisión mía). `cyan` aún no lo usa ningún juego real y el placeholder anterior ya era ARCADE/cyan; el orden sigue a Asteroides (1) y Tetris (2).
- **Sí:** quitar el selector de nivel de la pausa (decidido por el usuario). Volver al nivel 1 regeneraba todos los bloques y permitía farmear puntos sin perder vidas en un juego con ranking. Es el cambio de reglas respecto al original; **No:** mantenerlo igual ni permitirlo solo hacia delante.
- **Sí:** ganar (limpiar el nivel 5) y perder abren el mismo modal «FIN DEL JUEGO» (decidido por el usuario), con `state: "gameover"` y un campo `won`. Así el mejor resultado posible también se puede guardar; **No:** que solo perder abra el modal.
- **Sí:** portar sprites, sonido, ratón y teclado (decidido por el usuario). Los assets van a `public/games/arkanoid/`, que es lo que pide la receta de integración.
- **Sí:** conversión del ratón con las barras negras de `object-fit: contain`. Decisión mía: el original usa `canvas.width / rect.width`, que solo vale cuando el canvas ocupa exactamente su caja; aquí el canvas se escala dentro de `.crt-screen` y el paddle quedaría desplazado.
- **Sí:** dibujar el spritesheet directamente desde un `HTMLImageElement`, sin el canvas auxiliar del original. Decisión mía: el motor no puede usar `document.createElement`, y `drawImage` desde la imagen da el mismo resultado.
- **Sí:** capturar el `Promise` de `Audio.play()`. Decisión mía: los navegadores bloquean el audio hasta la primera interacción y no debe aparecer como error en consola.
- **Sí:** `dt` limitado a 50 ms, como en SPEC 05 y 07. Decisión mía: el original no lo limita, pero a 60 fps el comportamiento es idéntico y evita que la pelota atraviese bloques al volver de una pestaña oculta.
- **Sí:** limpiar las teclas en `blur`, como en Asteroides. Decisión mía: evita que el paddle siga moviéndose si se suelta la tecla fuera de la pestaña.
- **Sí:** dibujar un último frame al terminar la partida y detener el bucle. Decisión mía: el original sigue ejecutando el bucle en `gameover`; aquí el modal toma el relevo y no hay que mantener un bucle inútil.
- **Sí:** teclas por `event.code` (`ArrowLeft`, `ArrowRight`, `KeyP`, `Escape`) en vez de `event.key`. Decisión mía: igual que en Tetris y Asteroides; no depende de mayúsculas ni del idioma del teclado.
- **Sí:** paddle de 81×14 aunque el sprite mide 162×14 y `CLAUDE.md` del template lo describe como 162 px. Decisión mía: se porta el valor real de `game.js` (el sprite se dibuja escalado a la mitad) y no se altera la jugabilidad.
- **Sí:** el HUD del canvas se conserva junto a la barra de la plataforma, como en SPEC 05 y 07. El HUD del original solo se dibuja en `playing`; se porta igual.
- **No:** música, power-ups, ángulo de rebote según el impacto, más niveles, controles táctiles ni cambios de balance (fuera de alcance por defecto).
- **No:** cambios de esquema, `game_stats` ni RLS. Las tablas de SPEC 06 ya son genéricas.

## Riesgos

| Riesgo                                                                                                  | Mitigación                                                                                                                           |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| «Arkanoid» es una marca registrada y el nombre podría causar problemas si se publica fuera del proyecto | El usuario lo decidió; si se publica, renombrar es un `update` SQL más el cambio de portada. Se documenta en Decisiones.             |
| Los assets del template (spritesheet y sonidos) podrían tener derechos de terceros                      | Se usan tal cual vienen en el proyecto educativo; no se añaden assets nuevos de origen desconocido. Revisar antes de publicar fuera. |
| El paddle sigue mal al ratón porque el canvas está escalado con barras negras                           | Conversión con escala `min(...)` y desplazamiento; criterio de aceptación a varios tamaños, incluido 375 px.                         |
| El navegador bloquea el audio hasta la primera interacción                                              | `play()` con captura de errores; no es un fallo. El sonido empieza tras la primera pulsación o movimiento del ratón.                 |
| Salir de la página antes de que cargue el spritesheet deja un bucle o listeners activos                 | El bucle y los listeners arrancan dentro de `onload` y solo si `destroy()` no se ha llamado; hay criterio de aceptación.             |
| React StrictMode monta el efecto dos veces y duplica bucles, listeners o sonidos                        | `destroy()` cancela el RAF y retira teclado, `blur` y ratón; hay criterio de aceptación.                                             |
| `Math.random` / estado inicial en el render provoca errores de hidratación                              | `startArkanoid` solo se llama dentro de `useEffect`; el render emite el `<canvas>` vacío.                                            |
| Doble inserción al llegar a `gameover`                                                                  | La guardia por partida vive en `GameOverModal` y se reinicia al volver a jugar.                                                      |
| A dt alto la pelota atraviesa bloques (colisión AABB sin barrido)                                       | `dt` limitado a 50 ms; el original ya tiene este comportamiento a 60 fps y no se altera.                                             |
| Escritura en el proyecto Supabase compartido sin rama de desarrollo                                     | Migración idempotente (`on conflict do nothing`); revisar con `list_migrations` antes y después.                                     |

## Lo que **no** está en esta spec

- Selector de nivel de la pausa.
- Música, control de volumen y silenciar.
- Botones PAUSA/FIN de la barra y control del juego desde React.
- Power-ups, más niveles y cambios de jugabilidad o de balance respecto al original.
- Controles táctiles y gamepad.
- Autenticación, anti-trampas, moderación y ranking global.
- Cambios de esquema, RLS, `lib/data.ts` o `components/game-over-modal.tsx`.
- Tests automatizados.

Cada uno de estos, si se hace, va en su propia spec.
