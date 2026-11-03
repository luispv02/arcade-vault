# SPEC 09 — Juego Serpentina (Snake) con leaderboard

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-03
> **Objetivo:** Crear desde cero el juego de la serpiente como el juego `serpentina` del catálogo (que hoy es un placeholder), jugable en `/juegos/serpentina/jugar`, con frutas dibujadas desde el spritesheet `fruits.png`, que al chocar permite guardar la puntuación en `scores` con el modal «FIN DEL JUEGO» común.

## Por qué existe esta spec

Es el cuarto juego con motor real (tras Asteroides, Tetris y Arkanoid, SPEC 05, 07 y 08) y el primero **sin código de referencia**: no hay `references/templates/started-games/` de Snake, solo los sprites de fruta. Por eso esta spec define las reglas, la rejilla y el ritmo del juego, que en las anteriores se heredaban del original. El patrón técnico (motor en `lib/games/<id>/`, player cliente, `GameOverModal`, `saveScore`, mapa `PLAYERS` en la página de juego, leaderboard genérico de SPEC 06) no cambia.

Otra diferencia: el catálogo ya contiene la fila `serpentina` (ARCADE, `green`, `cover-snake`, `sort_order` 3) sembrada en SPEC 06 como placeholder. Se **reutiliza** esa fila en vez de crear un id nuevo, para no tener dos juegos de serpiente en `/games`.

Los sprites vienen de `references/source-assets/snake-assets/` (`fruits.png` y el atlas `sprites.js`, obtenidos de The Spriters Resource, hoja del juego de Snake de Google). Se usan solo las frutas; la serpiente, la rejilla, el título y la portada son propios.

## Alcance

**Dentro:**

- **Assets:** `fruits.png` (3790×442, fondo transparente) copiado a `public/games/serpentina/fruits.png`. El motor lo carga desde `/games/serpentina/fruits.png`. El atlas `sprites.js` (global `window.SPRITE_ATLAS`) se reescribe como módulo tipado `sprites.ts`; el archivo original no se copia.
- **Motor** en `lib/games/serpentina/` (`utils.ts`, `sprites.ts`, `game.ts`), sin variables globales de módulo ni acceso a `document`. API `startSerpentina(canvas, { onStateChange }): { destroy(): void }`; lanza un error claro si no hay contexto 2D.
- **Reglas del juego** (definidas aquí, sin original):
  - Canvas interno 800×600 con rejilla de 20 columnas × 15 filas de celdas de 40 px.
  - La serpiente empieza con 3 segmentos en el centro, mirando a la derecha, y se mueve sola, una celda por paso.
  - Controles: flechas y `WASD` para girar; `P` o `Escape` para pausar y reanudar.
  - No se permite girar 180° sobre el propio cuerpo. Se guardan hasta 2 giros pendientes para que giros rápidos consecutivos no se pierdan entre pasos.
  - Siempre hay exactamente una fruta en el tablero, en una celda libre al azar. Cada aparición toma uno de los 22 sprites al azar.
  - Comer una fruta suma 10 puntos y alarga la serpiente en 1 segmento.
  - **Nivel y velocidad:** `nivel = 1 + floor(frutas comidas / 5)`. Intervalo entre pasos: `140 ms` en el nivel 1, `−8 ms` por nivel, mínimo `70 ms`.
  - **Fin de partida:** chocar con una pared (sin envolver) o con el propio cuerpo termina la partida (`won: false`). Llenar las 300 celdas (no queda celda libre para la fruta) también la termina (`won: true`).
  - El avance usa un paso fijo con acumulador de tiempo; el dibujo se hace en cada frame.
- **Aspecto en el canvas:** tablero con celdas en damero oscuro acorde al look neón de la plataforma; serpiente verde neón con cabeza distinguible (ojos orientados a la dirección); frutas con `drawImage` desde el spritesheet, escaladas para caber en la celda sin deformarse y con `imageSmoothingEnabled = false` (el sprite es pixel art). Overlays `GAME OVER`, `¡TABLERO COMPLETO!` y `PAUSA`. **No hay HUD dentro del canvas**: todo el tablero es jugable y la información vive en la barra de la plataforma.
- El motor notifica a React `{ score, length, level, state, won }` con `state: "playing" | "paused" | "gameover"`, al arrancar y solo cuando algún valor cambia (nunca por frame).
- Entrada: `keydown` en `window`, retirado en `destroy()`. `preventDefault` en `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`, `KeyP` y `Escape`.
- Componente cliente `components/serpentina-player.tsx`: barra `player-hud` / `hud-stat` (Jugador, Puntuación, Longitud, Nivel), marco `.crt` / `.crt-screen` / `.crt-bottom` con la leyenda de controles, botón SALIR a `/juegos/serpentina` y `GameOverModal` cuando `state === "gameover"`.
- `app/juegos/[id]/jugar/page.tsx`: se añade `serpentina` al mapa `PLAYERS`.
- Portada: se **rediseña `.cover-snake`** en `app/globals.css` (mismo nombre, que ya apunta la fila `serpentina`) y se añade la clase del canvas `.serpentina-canvas`. La portada nueva es distinta de las existentes y usa solo CSS.
- Migración `supabase/migrations/<timestamp>_add_game_serpentina.sql`, aplicada con `apply_migration` y copiada al repo, que **actualiza** la fila `serpentina` (descripciones reales y `sort_order`).
- Interfaz diseñada con `/frontend-design`, respetando el look actual.

**Fuera de alcance (para otras specs):**

- Sonido y música (los sprites no traen audio y no se añaden assets nuevos).
- Modo con paredes que envuelven, vidas, obstáculos, frutas con valores distintos o efectos de fruta, serpiente con sprites, dificultades o tamaños de tablero alternativos.
- Controles táctiles, gamepad y ratón.
- Botones PAUSA y FIN de la barra de la plataforma; la pausa es solo `P` o `Escape`.
- Que React controle el juego (la comunicación es solo motor → React).
- Autenticación, anti-trampas y moderación, ranking global.
- Cambios en `scores`, `game_stats`, RLS, `lib/data.ts` o `components/game-over-modal.tsx`.
- Pruebas automatizadas.

## Modelo de datos

Esta feature no cambia el esquema de la BD: actualiza una fila de `games` y define la API del motor.

```sql
-- supabase/migrations/<timestamp>_add_game_serpentina.sql
update public.games
set short = '...', long = '...', sort_order = 4
where id = 'serpentina';
```

`id`, `title` (`SERPENTINA`), `cat` (`ARCADE`), `color` (`green`) y `cover` (`cover-snake`) se conservan. `short` y `long` se escriben en español: serpiente que crece al comer frutas, 10 puntos por fruta, velocidad que sube cada 5 frutas, fin al chocar con pared o con su cuerpo. `sort_order` pasa de 3 a 4 porque `arkanoid` ya ocupa el 3. La migración es idempotente (repetirla deja el mismo resultado).

```ts
// lib/games/serpentina/game.ts
export interface SerpentinaSnapshot {
  score: number;
  length: number; // segmentos de la serpiente, empieza en 3
  level: number; // 1 + floor(frutas / 5)
  state: "playing" | "paused" | "gameover";
  won: boolean; // true solo si el gameover llega por llenar el tablero
}
export interface SerpentinaGame {
  destroy(): void;
}
export function startSerpentina(
  canvas: HTMLCanvasElement,
  opts?: { onStateChange?: (s: SerpentinaSnapshot) => void },
): SerpentinaGame;

// lib/games/serpentina/sprites.ts
export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type FruitName =
  "banana" | "orange" | /* ... 22 nombres del atlas */ "melon";
export const FRUITS: Record<FruitName, SpriteRect>; // mismas coordenadas que sprites.js
export const FRUIT_NAMES: FruitName[]; // los 22, para elegir uno al azar
```

Convenciones:

- Constantes en `utils.ts`: `W = 800`, `H = 600`, `CELL = 40`, `COLS = 20`, `ROWS = 15`, `POINTS_PER_FRUIT = 10`, `FRUITS_PER_LEVEL = 5`, `STEP_BASE_MS = 140`, `STEP_PER_LEVEL_MS = 8`, `STEP_MIN_MS = 70`, `MAX_QUEUED_TURNS = 2`, `INITIAL_LENGTH = 3` y `FRUIT_IMAGE_URL = "/games/serpentina/fruits.png"`.
- Coordenadas de rejilla `{ col, row }` con origen arriba a la izquierda; la cabeza es el primer elemento de la lista de segmentos.
- Estado (`snake`, `dir`, `turnQueue`, `fruit` con su `FruitName`, `fruitsEaten`, `score`, `state`, `won`, acumulador de tiempo) vive dentro de la instancia creada por `startSerpentina`, no en el ámbito del módulo.
- Orden de un paso: 1) se toma el siguiente giro pendiente si es válido; 2) se calcula la nueva cabeza; 3) si cae fuera del tablero o sobre el cuerpo, `gameover` (la celda de la cola **no** cuenta como cuerpo si la serpiente no crece en ese paso, porque la cola se mueve); 4) si la nueva cabeza está en la celda de la fruta, suma 10, la serpiente conserva la cola (crece) y aparece una fruta nueva; si no queda celda libre, `gameover` con `won: true`.
- El sprite de fruta se escala a una altura de ≈ 36 px (`h` de origen 160) manteniendo proporción y centrado en su celda.
- El bucle y el listener no arrancan hasta que la imagen carga; si `destroy()` se llama antes, no se arranca nada. `dt` se limita a 50 ms por frame para que volver de una pestaña oculta no produzca pasos en ráfaga.
- Estado final: se dibuja el último frame con su overlay y se detiene el bucle; el modal toma el relevo.
- Orden de despliegue: la fila `serpentina` ya existe, así que la ficha y `/juegos/serpentina/jugar` funcionan con el placeholder `GamePlayer` hasta el paso 7.
- `best` y `plays` siguen derivándose de `game_stats`; nada se guarda en el cliente.

## Plan de implementación

1. Crear `public/games/serpentina/` y copiar `references/source-assets/snake-assets/fruits.png`. La app arranca sin cambios visibles; el archivo responde en `/games/serpentina/fruits.png`.
2. Rediseñar `.cover-snake` en `app/globals.css` con `/frontend-design`, distinta del resto de portadas y solo con CSS. `/games` y `/juegos/serpentina` muestran la portada nueva sin otros cambios.
3. Escribir la migración `add_game_serpentina`, aplicarla con `apply_migration` y copiarla a `supabase/migrations/`. Comprobar con `execute_sql` (solo `select`) que la fila `serpentina` tiene las descripciones nuevas y `sort_order = 4`, que `arkanoid` y los demás no cambian y que no hay puntuaciones sembradas para `serpentina` que falseen el ranking; ejecutar `get_advisors` y confirmar que no hay avisos nuevos. Jugar sigue usando el placeholder.
4. Crear `lib/games/serpentina/utils.ts` (constantes y funciones puras: dirección opuesta, intervalo de paso según nivel, elección de celda libre) y `sprites.ts` (los 22 recortes del atlas, tipados). `npm run lint` pasa.
5. Crear `lib/games/serpentina/game.ts` (parte 1): contexto 2D, estado en closure, carga de la imagen, serpiente inicial, fruta, cola de giros, `step()` con colisiones, crecimiento, nivel y victoria, y `notify`. Sin dibujo, bucle ni input. `npm run lint` pasa.
6. Completar `game.ts` (parte 2): dibujo (tablero, serpiente, fruta con sprite, overlays), bucle con `requestAnimationFrame`, acumulador y `dt` ≤ 50 ms que arranca al cargar la imagen, entrada de teclado con `preventDefault`, pausa, último frame al terminar y `destroy()`. `npm run lint` pasa.
7. Crear `components/serpentina-player.tsx` (cliente) y `.serpentina-canvas` en `app/globals.css`: `useEffect` que llama a `startSerpentina` con la ref del canvas y devuelve `destroy`, barra HUD, marco CRT, botón SALIR y `GameOverModal` con reinicio mediante contador `run`. Añadir `serpentina` al mapa `PLAYERS` de `app/juegos/[id]/jugar/page.tsx`. Jugar en el navegador una partida hasta chocar, guardar la puntuación y verla en `/salon?juego=serpentina`.
8. Ejecutar `npm run lint` y `npm run build` sin errores.

Cada paso deja la app arrancable. Se consultan las guías de `node_modules/next/dist/docs/` antes de escribir código de Next.js (la ruta de juego mantiene el patrón `cacheComponents`: página síncrona con `params` dentro de `<Suspense>`).

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/games` muestra una única tarjeta «SERPENTINA» (ARCADE, green) con la portada nueva distinta de las demás, y `/juegos/serpentina` muestra su ficha con las descripciones nuevas y un botón de jugar que lleva a `/juegos/serpentina/jugar`.
- [ ] La tabla `games` contiene `serpentina` con `sort_order = 4`, sin ninguna fila `snake` duplicada, y `asteroides`, `tetris` y `arkanoid` no cambian; `get_advisors` (security) no reporta avisos nuevos.
- [ ] `/games/serpentina/fruits.png` responde con 200.
- [ ] `/juegos/serpentina/jugar` muestra el canvas dentro del marco CRT y la partida arranca sola con la serpiente de 3 segmentos mirando a la derecha, una fruta visible con su sprite, score 0, longitud 3 y nivel 1.
- [ ] La barra de la plataforma muestra Jugador (nombre de sesión o `INVITADO`), Puntuación, Longitud y Nivel, y sus valores coinciden en todo momento con el estado del juego.
- [ ] La barra se actualiza solo cuando cambia algún valor, no en cada frame (React no re-renderiza a 60 fps).
- [ ] Las flechas y `WASD` giran la serpiente; pulsar la dirección opuesta a la actual no hace nada y no mata a la serpiente.
- [ ] Dos giros pulsados dentro del mismo paso se ejecutan en pasos consecutivos y un tercero se ignora.
- [ ] Comer una fruta suma exactamente 10 puntos, aumenta la longitud en 1 y coloca una fruta nueva en una celda libre (nunca sobre la serpiente); siempre hay exactamente una fruta en el tablero.
- [ ] Las frutas que aparecen usan sprites distintos del spritesheet, sin deformarse ni difuminarse.
- [ ] El nivel sube a 2 tras 5 frutas y el intervalo entre pasos baja de 140 ms a 132 ms; nunca baja de 70 ms.
- [ ] Chocar con cualquiera de las cuatro paredes termina la partida; chocar con el propio cuerpo la termina; mover la cabeza a la celda que la cola deja libre en ese mismo paso no la termina.
- [ ] Si la serpiente llena las 300 celdas se dibuja `¡TABLERO COMPLETO!` y aparece el modal con `won = true`.
- [ ] `P` y `Escape` pausan y reanudan; en pausa el canvas muestra «PAUSA», la serpiente no avanza, los giros pulsados no se acumulan y al reanudar no hay saltos ni pasos en ráfaga.
- [ ] Al terminar se dibuja `GAME OVER`, se detiene el bucle y aparece el modal «FIN DEL JUEGO» con la puntuación final; no se inserta nada hasta pulsar GUARDAR.
- [ ] GUARDAR inserta exactamente 1 fila con `game_id = 'serpentina'`, la puntuación final y el nombre escrito; no se puede guardar dos veces la misma partida ni con nombre vacío.
- [ ] Escribir un nombre con espacios o pulsar `Espacio`, las flechas, `WASD`, `P` o `Escape` en el modal no gira, pausa ni reinicia el juego.
- [ ] JUGAR DE NUEVO inicia una partida limpia (score 0, longitud 3, nivel 1, intervalo de 140 ms) y permite guardar una segunda fila; VOLVER AL VAULT lleva a `/games`.
- [ ] La puntuación guardada aparece en `/salon?juego=serpentina` sin redeploy y `plays` de Serpentina sube en 1 en `/games`.
- [ ] Si la inserción falla (p. ej. sin red) el modal muestra el error y permite reintentar.
- [ ] Salir antes del fin no inserta nada; tras SALIR no queda listener de teclado ni bucle activo, y volver a entrar inicia una partida nueva sin duplicar velocidad ni giros por tecla (también bajo StrictMode).
- [ ] Salir de la página antes de que cargue el spritesheet no deja bucle ni listener activos.
- [ ] Las flechas, `WASD`, `P` y `Escape` no hacen scroll de la página en `/juegos/serpentina/jugar`.
- [ ] El canvas se ve completo y sin scroll horizontal a 375 px de ancho, manteniendo su proporción 4:3.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos/serpentina/jugar`, `/games` y `/salon`.
- [ ] Asteroides, Tetris y Arkanoid siguen cumpliendo los criterios de SPEC 05, 06, 07 y 08 (modal, guardado único, JUGAR DE NUEVO, error con reintento).
- [ ] Ninguna clave `service_role` aparece en el repositorio y no se modifican el esquema, `lib/data.ts`, `components/game-over-modal.tsx` ni las políticas RLS.

## Decisiones

- **Sí:** reutilizar la fila `serpentina` (id, título `SERPENTINA`, `cover-snake`) y actualizarla (decidido por el usuario); **No:** crear un id nuevo `snake`. Evita dos juegos de serpiente en `/games`. Es la primera vez que una migración de juego hace `update` en vez de `insert`; por eso la spec verifica que no quedan duplicados.
- **Sí:** `sort_order = 4`. Decisión mía: `arkanoid` ya tiene el 3 y así se evita un empate de orden.
- **Sí:** Snake clásico en rejilla, sin vidas y con paredes que matan (decidido por el usuario); **No:** paredes que envuelven ni 3 vidas. Es el modo más reconocible y la puntuación se resuelve en una sola partida.
- **Sí:** una fruta al azar de las 22 por aparición, siempre 10 puntos (decidido por el usuario); **No:** valores por fruta ni una fruta por nivel. El sprite es solo decoración, así que el ranking no depende de la suerte con las frutas.
- **Sí:** canvas 800×600, celdas de 40 px (20×15), flechas + `WASD`, pausa con `P`/`Escape` (decidido por el usuario). Mantiene la proporción 4:3 de las demás pantallas y el mismo tamaño de canvas que Arkanoid.
- **Sí:** intervalo de paso 140 ms, −8 ms por nivel, mínimo 70 ms, y subida de nivel cada 5 frutas (decidido por el usuario con la opción recomendada). Valores de arranque que se ajustan en juego si resultan injustos; cualquier ajuste se registra en esta spec.
- **Sí:** prohibir el giro de 180° y guardar hasta 2 giros pendientes. Decisión mía: sin ello, pulsar dos teclas rápido mataría a la serpiente por un error de entrada, no de juego.
- **Sí:** la celda de la cola no cuenta como colisión cuando la serpiente no crece en ese paso. Decisión mía: es la regla estándar y evita muertes injustas al perseguirse la cola.
- **Sí:** terminar con `won: true` al llenar el tablero. Decisión mía: es el único final posible sin colisión; el modal es el mismo que al perder, como en Arkanoid (SPEC 08).
- **Sí:** sin HUD dentro del canvas. Decisión mía, distinta de SPEC 05, 07 y 08: la rejilla ocupa los 600 px de alto y un HUD interno taparía filas jugables; Jugador, Puntuación, Longitud y Nivel van en la barra de la plataforma.
- **Sí:** paso fijo con acumulador y `dt` limitado a 50 ms, como en las specs anteriores. Decisión mía: mantiene el movimiento a celdas discretas y evita ráfagas al volver de una pestaña oculta.
- **Sí:** teclas por `event.code`, igual que en Tetris, Asteroides y Arkanoid.
- **Sí:** no registrar `blur`. Decisión mía: es una desviación de la receta de integración, justificada porque Snake no tiene teclas mantenidas que limpiar; los giros son eventos discretos.
- **Sí:** `drawImage` directo desde el `HTMLImageElement` con `imageSmoothingEnabled = false`; sin `<canvas>` auxiliar ni `document`.
- **Sí:** serpiente, tablero, portada y overlays propios, y solo las frutas del spritesheet. Decisión mía: la skill no permite recrear el arte protegido de un juego comercial; usar solo las frutas aportadas por el usuario limita la dependencia de arte de terceros.
- **No:** sonido, controles táctiles, gamepad, power-ups, obstáculos, más tableros ni cambios en el modal o el esquema (fuera de alcance por defecto).

## Riesgos

| Riesgo                                                                                                             | Mitigación                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los sprites proceden del juego de Snake de Google (vía The Spriters Resource) y podrían tener derechos de terceros | Solo se usan las frutas, en un proyecto educativo; serpiente, portada y título son propios. Revisar o sustituir el spritesheet antes de publicar. |
| Las coordenadas del atlas (`y` 136–295) recortan mal algún sprite (se ve cortado o con restos del vecino)          | Verificar visualmente los 22 sprites en el paso 6; ajustar el rect en `sprites.ts` si alguno falla y anotarlo aquí.                               |
| Actualizar en vez de insertar: `update` sobre `games` podría bloquearlo RLS si se ejecutara con rol cliente        | La migración se aplica con `apply_migration` (rol de propietario); se comprueba con `select` después. No se tocan las políticas.                  |
| Puntuaciones sembradas previas para `serpentina` en `scores` que falsean el ranking                                | El paso 3 comprueba con `select`; si existen se avisa al usuario antes de borrar nada (no se borra en esta spec).                                 |
| Escritura en el proyecto Supabase compartido sin rama de desarrollo                                                | Migración idempotente; revisar con `list_migrations` antes y después.                                                                             |
| Giros dobles o rápidos matan injustamente a la serpiente                                                           | Cola de 2 giros y prohibición del giro de 180°; criterios de aceptación específicos.                                                              |
| Salir de la página antes de que cargue el spritesheet deja bucle o listener activos                                | El bucle y el listener arrancan dentro de `onload` y solo si `destroy()` no se ha llamado; hay criterio de aceptación.                            |
| React StrictMode monta el efecto dos veces y duplica bucles o listeners                                            | `destroy()` cancela el RAF y retira el listener de teclado; hay criterio de aceptación.                                                           |
| `Math.random` o estado inicial en el render provocan errores de hidratación                                        | `startSerpentina` solo se llama dentro de `useEffect`; el render emite el `<canvas>` vacío.                                                       |
| Doble inserción al llegar a `gameover`                                                                             | La guardia por partida vive en `GameOverModal` y se reinicia al volver a jugar.                                                                   |
| El tablero se llena y no hay celda libre para la fruta (bucle de búsqueda infinito)                                | La elección toma una celda al azar de la lista de celdas libres; si la lista está vacía, `gameover` con `won: true`.                              |

## Lo que **no** está en esta spec

- Sonido y música.
- Modo con paredes que envuelven, vidas, obstáculos, frutas con valores distintos, serpiente con sprites y tableros alternativos.
- Controles táctiles, gamepad y ratón.
- Botones PAUSA/FIN de la barra y control del juego desde React.
- Borrar o migrar puntuaciones sembradas previas.
- Autenticación, anti-trampas, moderación y ranking global.
- Cambios de esquema, RLS, `lib/data.ts` o `components/game-over-modal.tsx`.
- Tests automatizados.

Cada uno de estos, si se hace, va en su propia spec.
