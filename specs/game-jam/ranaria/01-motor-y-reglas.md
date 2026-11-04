# SPEC GJ-ranaria-01 — Motor y reglas de Ranaria

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-11-04
> **Objetivo:** Crear el motor TypeScript de `ranaria` (cruzar cinco carriles de tráfico y un río de troncos y tortugas hasta cinco nenúfares) en `lib/games/ranaria/`, con sus reglas cerradas y su snapshot tipado, sin tocar aún la página de juego.

## Por qué existe esta spec

`ranaria` es el quinto juego con motor real (tras Asteroides, Tetris, Arkanoid y Serpentina) y, como Serpentina (SPEC 09), se diseña **sin código de referencia**: no hay carpeta en `references/templates/started-games/`. Esta spec fija las reglas, la geometría y el ritmo con números concretos. El género es el de «cruzar la calle» de los arcades de los años 80 (saltos discretos entre carriles de tráfico y un río con plataformas móviles); aquí se reinterpreta con título, rana, vehículos, troncos y portada propios, sin recrear ningún juego comercial concreto (nombre, personajes, arte, música ni niveles).

Particularidades frente a Serpentina que obligan a decisiones nuevas:

- **Movimiento mixto:** la rana salta por filas discretas (50 px) pero su `x` es continua, porque en el río viaja arrastrada por las plataformas.
- **Entidades deterministas:** los vehículos y las plataformas no se almacenan uno a uno; su posición es una función pura del reloj del mundo, lo que evita desincronizaciones y hace los carriles fáciles de validar.
- **Sin final por victoria:** el juego es infinito (los niveles suben la velocidad) y solo termina al perder las vidas; el snapshot no lleva `won`.

La ficha del juego ya existe: `games` contiene la fila `ranaria` (ARCADE, `green`, `cover-rana`, `sort_order = 8`) desde la migración `20261103191649_games_scores.sql` (línea 51) y `/juegos/ranaria/jugar` hoy muestra el reproductor placeholder `GamePlayer`. **Esta spec no añade ninguna migración de alta.** Atención: la migración `20261103193816_solo_asteroides_sin_scores.sql` borró del catálogo todos los juegos salvo `asteroides`, y las altas posteriores (Tetris, Arkanoid, Serpentina) los reinsertaron uno a uno; por eso el paso 1 **verifica** que la fila siga existiendo antes de seguir (ver Riesgos).

Mecánicas de referencia consultadas para el género: el planteamiento de «carriles con velocidad y sentido propios, plataformas que arrastran y ahogamiento en el agua» es la base común de los juegos de cruce de carretera y río; los valores numéricos de esta spec son propios y se ajustan jugando.

## Alcance

**Dentro:**

- **Motor** en `lib/games/ranaria/` (`utils.ts`, `lanes.ts`, `game.ts`), TS puro: no importa React, no toca `document`, sin variables globales de módulo mutables. API `startRanaria(canvas, { onStateChange }): { destroy(): void }`; lanza un error claro si el canvas no tiene contexto 2D.
- **Sin assets externos ni sonido:** todo (rana, coches, camión, troncos, tortugas, nenúfares, agua, asfalto) se dibuja con primitivas del canvas.
- **Reglas del juego** (definidas aquí):
  - Canvas interno **800×600** con rejilla de **16 columnas × 12 filas** de celdas de 50 px. Filas de arriba abajo: `0` metas (nenúfares), `1–4` río (4 carriles), `5` mediana segura, `6–10` carretera (5 carriles), `11` salida segura.
  - La rana empieza cada intento en la fila 11, centrada en `x = 400`, mirando hacia arriba. Su `x` es continua; su fila es entera.
  - **Controles** (por `event.code`): `ArrowUp`/`KeyW` salta una fila arriba, `ArrowDown`/`KeyS` abajo, `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD` 50 px al lado. `KeyP` o `Escape` pausan y reanudan. Cada pulsación es un salto: se ignora `event.repeat`.
  - **Salto:** dura 100 ms (animación; la rana interpola entre origen y destino). Una pulsación durante un salto se guarda como **un único** salto pendiente (se ejecuta al aterrizar; una segunda pulsación sustituye a la guardada). No se puede salir del tablero: hacia abajo desde la fila 11 y hacia los lados con la rana en `x ≤ 25` o `x ≥ 775` el salto se ignora; el salto hacia arriba desde la fila 0 no existe porque la rana nunca permanece en ella.
  - **Carretera (filas 6–10):** hay muerte («atropellada») si el rectángulo de la rana (lado 34 px, centrado) se solapa en cualquier momento con un vehículo (rectángulo de `len × 50 − 8` px de ancho y 38 px de alto, centrado en su fila). Se comprueba cada frame, también durante el salto.
  - **Río (filas 1–4):** al **aterrizar** en una fila de río, y en cada frame después, la rana debe estar «sostenida»: su centro `x` debe quedar dentro de una plataforma sustentadora del carril ampliada 4 px por lado. Si no, muerte («ahogada»). Mientras está sostenida y no salta, se desplaza con la velocidad (con signo) del carril. Si su centro sale de `[0, 800]`, muerte («arrastrada»). Durante un salto no se comprueba el apoyo, solo al aterrizar.
  - **Tortugas:** los grupos de tortugas se sumergen cíclicamente a partir del **nivel 2**. Ciclo de 6000 ms por grupo, desfasado `índice × 1500 ms`: 0–4000 ms en superficie, 4000–5000 ms «aviso» (parpadean, aún sostienen) y 5000–6000 ms sumergidas (no sostienen). En el nivel 1 nunca se sumergen. Si la rana está sobre un grupo cuando se sumerge, muere ahogada.
  - **Metas (fila 0):** hay 5 nenúfares con centros en `x = 100, 250, 400, 550, 700` y semiancho de 80/2 = 40 px. Al aterrizar en la fila 0: si el centro de la rana cae en el rango de un nenúfar **libre**, la meta se cumple; si cae en un nenúfar ocupado o fuera de todos (orilla), muerte («meta inválida»).
  - **Tiempo:** cada intento tiene `TIME_LIMIT_MS = 30000`. Al llegar a 0, muerte («tiempo»). El reloj solo corre con la rana viva y el juego en marcha (no en pausa, animación de muerte ni banner de nivel).
  - **Vidas:** 3 al empezar, máximo 5. Cada muerte resta 1; con 0 vidas, `gameover` (sin `won`). Cada **5000 puntos** acumulados da +1 vida (hasta el máximo), una vez por umbral cruzado.
  - **Muerte:** animación de 800 ms (la rana se dibuja como cruz parpadeante en el lugar de la muerte) con las entradas bloqueadas; después reaparece en la salida con el reloj completo, o `gameover` si no quedan vidas. Los carriles siguen moviéndose durante la animación.
  - **Puntuación:** `+10` por cada fila **nueva** más cercana a la meta alcanzada en ese intento (se resetea en cada intento; el máximo posible por intento es 110); `+100` por meta cumplida; `+10 × ceil(segundos restantes)` al cumplir una meta (máximo 300); `+500` al completar las 5 metas.
  - **Niveles:** completar las 5 metas sube el nivel en 1, vacía los nenúfares, reinicia el reloj del mundo, repone el intento y muestra el banner `NIVEL N` durante 1200 ms con el juego congelado (sin reloj de intento). Multiplicador de velocidad de todos los carriles: `min(2.0, 1 + 0.10 × (nivel − 1))`.
  - **Carriles** (tabla `LANES` en `lanes.ts`; velocidades base en px/s, `paso` = celdas entre el inicio de dos objetos consecutivos, `n` = objetos por carril):

    | Fila | Tipo      | Largo (celdas) | Sentido | Velocidad | Paso | n   | Periodo (px) |
    | ---- | --------- | -------------- | ------- | --------- | ---- | --- | ------------ |
    | 1    | tronco    | 3              | +1      | 100       | 7    | 3   | 1050         |
    | 2    | tortugas  | 3              | −1      | 55        | 7    | 3   | 1050         |
    | 3    | tronco    | 4              | +1      | 90        | 8    | 3   | 1200         |
    | 4    | tortugas  | 2              | −1      | 70        | 5    | 4   | 1000         |
    | 6    | deportivo | 1              | +1      | 190       | 6    | 3   | 900          |
    | 7    | coche     | 1              | −1      | 150       | 5    | 4   | 1000         |
    | 8    | camión    | 2              | +1      | 70        | 7    | 3   | 1050         |
    | 9    | coche     | 1              | −1      | 110       | 6    | 3   | 900          |
    | 10   | coche     | 1              | +1      | 80        | 5    | 4   | 1000         |

    Sentido `+1` = hacia la derecha. Invariante de cada carril: `periodo = n × paso × 50 ≥ 800 + (largo + 1) × 50`, de modo que un objeto nunca aparece a la vez por los dos lados.

  - **Posición de un objeto:** `xIzq(i) = mod(base_i + sentido × velocidad × mult × reloj, periodo) − largo × 50`, con `base_i = (i × paso + desfase) × 50` y `desfase = fila mod paso` (evita carriles alineados); `reloj` en segundos. Todo el estado de los carriles es esa función del reloj del mundo.
- **Aspecto en el canvas** (neón/CRT de la plataforma): agua azul-cian oscuro con ondas sutiles en las filas 1–4; asfalto casi negro con líneas discontinuas entre carriles en 6–10; mediana y salida con franjas verdes oscuras; troncos ámbar neón con vetas; tortugas como discos verdes con caparazón (parpadean en el aviso y se dibujan hundidas/ausentes al sumergirse); coches y camión como rectángulos con faros, cada carril de un color neón distinto (magenta, cian, amarillo, blanco); nenúfares como discos verdes sobre agua, con la rana pequeña dibujada en los ocupados; rana verde neón con ojos orientados a la última dirección. Barra de tiempo de 6 px en el borde inferior de la fila 11 (verde → amarillo → rojo a < 10 s y < 5 s). Overlays `PAUSA`, `NIVEL N` y `GAME OVER`. **No hay HUD de texto dentro del canvas**: Jugador, Puntuación, Vidas, Nivel y Metas viven en la barra de la plataforma (SPEC GJ-ranaria-02).
- El motor notifica a React `{ score, lives, level, goals, state }` con `state: "playing" | "paused" | "gameover"`, al arrancar y solo cuando algún valor cambia (nunca por frame ni por segundo).
- Entrada: `keydown` en `window`, retirado en `destroy()`. `preventDefault` en `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD`, `KeyP` y `Escape`. `blur` en `window` **pausa** el juego si estaba en marcha (retirado en `destroy()`).
- Bucle con `requestAnimationFrame` y `dt` limitado a 50 ms.
- Interfaz de la portada: se **reutiliza `.cover-rana`**, que ya existe en `app/globals.css` (líneas ~946–962) y la usa la fila `ranaria`; no se modifica.

**Fuera de alcance (para otras specs):**

- Player React, HUD, marco CRT, `GameOverModal`, clase `.ranaria-canvas` y registro en `PLAYERS` (SPEC GJ-ranaria-02).
- Sonido y música, moscas/bonificaciones, cocodrilos, serpientes, bichos en las metas, segundo jugador, dificultades.
- Controles táctiles, gamepad y ratón.
- Botones PAUSA y FIN de la barra de la plataforma.
- Migración de alta en `games` (la fila ya existe), cambios de esquema, RLS, `lib/data.ts` o `components/game-over-modal.tsx`.
- Cambios en `references/game-suggestions-todo.md` y en `references/implemented-games.md`.
- Pruebas automatizadas.

## Modelo de datos

Esta feature **no cambia el esquema ni inserta filas**: la fila de catálogo ya existe y solo se comprueba con `select`.

```sql
-- Solo lectura (paso 1): debe devolver exactamente 1 fila.
select id, title, cat, color, cover, sort_order
from public.games
where id = 'ranaria';
-- Esperado: ('ranaria', 'RANARIA', 'ARCADE', 'green', 'cover-rana', 8)
```

```ts
// lib/games/ranaria/game.ts
export interface RanariaSnapshot {
  score: number;
  lives: number; // 3 al empezar, máximo 5
  level: number; // 1 al empezar, sin tope
  goals: number; // nenúfares ocupados en el nivel actual, 0..5
  state: "playing" | "paused" | "gameover";
}
export interface RanariaGame {
  destroy(): void;
}
export function startRanaria(
  canvas: HTMLCanvasElement,
  opts?: { onStateChange?: (s: RanariaSnapshot) => void },
): RanariaGame;

// lib/games/ranaria/lanes.ts
export type LaneKind = "tronco" | "tortugas" | "coche" | "deportivo" | "camion";
export interface Lane {
  row: number; // 1..4 río, 6..10 carretera
  kind: LaneKind;
  len: number; // celdas de largo
  dir: 1 | -1; // 1 = derecha
  speed: number; // px/s base (nivel 1)
  step: number; // celdas entre inicios de objetos consecutivos
  count: number; // objetos del carril
  color: string; // color neón del vehículo (vacío en el río)
}
export const LANES: readonly Lane[]; // 9 carriles, tabla de la sección Alcance
export function lanePeriod(lane: Lane): number; // count * step * CELL

// lib/games/ranaria/utils.ts
export type TurtlePhase = "surface" | "warning" | "submerged";
export function speedMultiplier(level: number): number;
export function laneObjectX(
  lane: Lane,
  index: number,
  clockSec: number,
  mult: number,
): number; // x izquierda del objeto (puede ser negativa)
export function turtlePhase(
  clockMs: number,
  index: number,
  level: number,
): TurtlePhase;
export function supportingObjectAt(
  lane: Lane,
  x: number,
  clockSec: number,
  clockMs: number,
  level: number,
): number | null; // índice del objeto que sostiene x, o null
export function goalSlotAt(x: number): number | null; // 0..4 o null
export function overlapsVehicle(
  lane: Lane,
  frogX: number,
  clockSec: number,
  mult: number,
): boolean;
```

Convenciones:

- Constantes en `utils.ts`: `W = 800`, `H = 600`, `CELL = 50`, `COLS = 16`, `ROWS = 12`, `ROW_GOAL = 0`, `ROW_RIVER_FIRST = 1`, `ROW_RIVER_LAST = 4`, `ROW_MEDIAN = 5`, `ROW_ROAD_FIRST = 6`, `ROW_ROAD_LAST = 10`, `ROW_START = 11`, `START_X = 400`, `FROG_HIT = 34`, `HOP_MS = 100`, `LIVES_START = 3`, `LIVES_MAX = 5`, `EXTRA_LIFE_EVERY = 5000`, `TIME_LIMIT_MS = 30000`, `DEATH_MS = 800`, `LEVEL_BANNER_MS = 1200`, `SCORE_ROW = 10`, `SCORE_GOAL = 100`, `SCORE_TIME_PER_SEC = 10`, `SCORE_LEVEL = 500`, `SPEED_PER_LEVEL = 0.1`, `SPEED_MAX_MULT = 2`, `GOAL_CENTERS = [100, 250, 400, 550, 700]`, `GOAL_HALF_WIDTH = 40`, `SUPPORT_MARGIN = 4`, `VEHICLE_SHRINK = 8`, `VEHICLE_HEIGHT = 38`, `TURTLE_CYCLE_MS = 6000`, `TURTLE_SURFACE_MS = 4000`, `TURTLE_WARNING_MS = 1000`, `TURTLE_STAGGER_MS = 1500`, `DIVE_FROM_LEVEL = 2`.
- `utils.ts` solo contiene funciones puras y constantes; `lanes.ts` solo datos y `lanePeriod`. Ambos importables desde el servidor y el cliente.
- Estado (`frog` con `x`, `row`, `facing`, `hop`, `pendingHop`, `bestRow`, `timeLeftMs`, `phase: "alive" | "dying" | "banner"`, `goalsFilled: boolean[5]`, `clockMs`, `score`, `lives`, `level`, `state`) vive dentro de la instancia creada por `startRanaria`, no en el ámbito del módulo.
- Orden de un frame con `phase = "alive"` y `state = "playing"`: 1) `clockMs += dt`; 2) avance del salto; si termina, se aterriza (comprobación de fila: meta, río o carretera) y se ejecuta el salto pendiente; 3) si no salta y está en el río, apoyo y arrastre; 4) colisión con vehículos si está en la carretera; 5) `timeLeftMs -= dt` y muerte si llega a 0; 6) `notify` si cambió el snapshot. En `dying` y `banner` solo avanzan el reloj del mundo (en `dying`) y sus temporizadores.
- Una muerte comprueba antes el estado: la primera causa del frame gana y no se encadenan dos muertes en el mismo frame.
- `notify` compara el snapshot con el último enviado y solo llama a `onStateChange` si algún campo difiere.
- Estado final: se dibuja el último frame con `GAME OVER` y se detiene el bucle; el modal (SPEC GJ-ranaria-02) toma el relevo.
- `Math.random` no se usa: el juego es determinista (no hay elementos aleatorios).

## Plan de implementación

1. Comprobar las precondiciones sin escribir nada: con `execute_sql` (solo `select`) confirmar que existe la fila `ranaria` (valores esperados arriba) y que no hay filas en `scores` con `game_id = 'ranaria'`; con `grep` confirmar que `.cover-rana` existe en `app/globals.css`. **Si la fila no existe, detenerse y avisar** (esta spec no la inserta). La app no cambia.
2. Crear `lib/games/ranaria/lanes.ts` con el tipo `Lane`, la tabla `LANES` (9 carriles) y `lanePeriod`. `npm run lint` pasa.
3. Crear `lib/games/ranaria/utils.ts` con las constantes y las funciones puras de la API (`speedMultiplier`, `laneObjectX`, `turtlePhase`, `supportingObjectAt`, `goalSlotAt`, `overlapsVehicle`). `npm run lint` pasa.
4. Crear `lib/games/ranaria/game.ts` (parte 1): contexto 2D, estado en closure, rana, salto con pendiente, aterrizaje por tipo de fila, apoyo y arrastre, colisión con vehículos, tiempo, vidas, vida extra, metas, nivel y `notify`. Sin dibujo, bucle ni input. `npm run lint` pasa.
5. Completar `game.ts` (parte 2): dibujo (agua, asfalto, carriles, rana, nenúfares, barra de tiempo, overlays), bucle con `requestAnimationFrame` y `dt` ≤ 50 ms, entrada de teclado con `preventDefault`, `blur` que pausa, último frame al terminar y `destroy()`. `npm run lint` pasa.
6. Ejecutar `npm run lint` y `npm run build` sin errores. La app arranca, `/games` y `/juegos/ranaria` se ven como antes (portada `cover-rana`) y `/juegos/ranaria/jugar` sigue mostrando el placeholder `GamePlayer`.

Cada paso deja la app arrancable. Se consultan las guías de `node_modules/next/dist/docs/` antes de escribir código de Next.js (esta spec no escribe ninguno; la ruta de juego se toca en la SPEC GJ-ranaria-02).

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] La tabla `games` contiene exactamente una fila `ranaria` (RANARIA, ARCADE, `green`, `cover-rana`, `sort_order = 8`) y esta spec no añade ningún archivo en `supabase/migrations/`.
- [ ] `/games` muestra una única tarjeta «RANARIA» con la portada `cover-rana` y `/juegos/ranaria` muestra su ficha sin errores.
- [ ] `/juegos/ranaria/jugar` sigue mostrando el placeholder `GamePlayer` (la página de juego no cambia en esta spec).
- [ ] Existen `lib/games/ranaria/utils.ts`, `lanes.ts` y `game.ts`, y `game.ts` exporta `startRanaria`, `RanariaSnapshot` y `RanariaGame` con la forma de esta spec.
- [ ] Ningún archivo de `lib/games/ranaria/` importa `react` ni usa `document`, y no hay variables mutables a nivel de módulo (solo constantes y la tabla `LANES` de solo lectura).
- [ ] `startRanaria` lanza un error con mensaje claro si `canvas.getContext("2d")` devuelve `null`.
- [ ] `LANES` define 9 carriles con los valores de la tabla de esta spec y cada uno cumple `lanePeriod(lane) >= 800 + (len + 1) * 50`.
- [ ] `destroy()` cancela el `requestAnimationFrame` y retira los listeners `keydown` y `blur` de `window`.
- [ ] El código del motor fija `dt` a un máximo de 50 ms y llama a `preventDefault` en las diez teclas del juego.
- [ ] `onStateChange` se invoca al arrancar y solo cuando cambia algún campo del snapshot.
- [ ] No se modifican `references/game-suggestions-todo.md`, `references/implemented-games.md`, el esquema, `lib/data.ts`, `components/game-over-modal.tsx` ni las políticas RLS, y ninguna clave `service_role` aparece en el repositorio.
- [ ] Asteroides, Tetris, Arkanoid y Serpentina siguen funcionando como antes.

## Decisiones

- **Sí:** id `ranaria`, título `RANARIA`, `cat = ARCADE`, `color = green`, portada `cover-rana` y `sort_order = 8`, tal como están en el catálogo (decidido por el usuario). **No:** migración de alta ni renombrar nada; la fila se verifica, no se inserta.
- **Sí:** reutilizar `.cover-rana` sin cambios. Decisión mía: ya existe, es distinta del resto de portadas y rediseñarla no aporta al juego; si el usuario la quiere más elaborada, va en otra spec.
- **Sí:** canvas 800×600 con rejilla 16×12 de celdas de 50 px y 12 filas (1 metas, 4 río, 1 mediana, 5 carretera, 1 salida). Decisión mía: es el mismo tamaño de las demás pantallas, la rejilla entera aprovecha los 600 px de alto y deja un reparto equilibrado de riesgo entre río y carretera.
- **Sí:** salto discreto por filas pero `x` continua. Decisión mía: la rana debe poder viajar con troncos y tortugas, así que no se ajusta a columnas; el salto lateral es de 50 px.
- **Sí:** un salto pendiente como máximo durante los 100 ms de otro. Decisión mía: sin buffer, los saltos rápidos se pierden y el control se siente duro; con más de uno, la rana ejecutaría saltos «fantasma» tras morir o aterrizar.
- **Sí:** posición de vehículos y plataformas como función pura del reloj del mundo. Decisión mía: es determinista, no necesita listas mutables, se valida con la invariante de periodo y no depende de `Math.random`.
- **Sí:** 9 carriles con valores de la tabla (velocidades 55–190 px/s, huecos de 3 a 5 celdas). Decisión mía: valores de arranque para dificultad media; se ajustan jugando y cualquier cambio se anota aquí.
- **Sí:** las tortugas solo se sumergen desde el nivel 2, con aviso parpadeante de 1 s. Decisión mía: el nivel 1 enseña las reglas del río; el aviso hace que la muerte sea evitable y no arbitraria.
- **Sí:** 5 nenúfares con centros simétricos (100, 250, 400, 550, 700) y semiancho de 40 px; aterrizar fuera o en uno ocupado mata. Decisión mía: es lo que da riesgo a la última fila; la simetría se consigue con `x` en píxeles, no en columnas.
- **Sí:** 30 s por intento, 3 vidas, tope de 5 y vida extra cada 5000 puntos. Decisión mía: da margen para cruzar con calma pero penaliza la indecisión; el tope evita partidas eternas.
- **Sí:** puntuación `+10` por fila nueva por intento, `+100` por meta, `+10 × segundos restantes` y `+500` por nivel. Decisión mía: premia el avance y la velocidad sin que un solo componente domine; el máximo de un intento limpio ronda 510 puntos.
- **Sí:** juego infinito sin `won`; el multiplicador de velocidad sube 10 % por nivel hasta ×2,0. Decisión mía: el ranking se decide por puntuación, no por una pantalla final; el tope mantiene el juego jugable.
- **Sí:** `blur` pausa el juego. Decisión mía: no hay teclas mantenidas que limpiar (los saltos son eventos discretos), y pausar al perder el foco evita muertes injustas por cambiar de pestaña.
- **Sí:** `event.code` y `preventDefault` en las diez teclas, como en el resto de motores.
- **Sí:** sin HUD de texto dentro del canvas. Decisión mía, como en Serpentina: las 12 filas ocupan los 600 px; solo se dibuja la barra de tiempo, de 6 px, sobre la fila de salida.
- **Sí:** snapshot sin tiempo restante. Decisión mía: poner segundos en el snapshot obligaría a un re-render por segundo; la barra de tiempo del canvas lo cubre.
- **No:** sonido, moscas, cocodrilos, bonificaciones, controles táctiles, gamepad, ratón ni segundo jugador (fuera de alcance por defecto). **No:** spec 03: el único candidato razonable (sonido sintetizado) aporta poco frente a su coste.

## Riesgos

| Riesgo                                                                                                                                        | Mitigación                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La fila `ranaria` ya no está en `games`: la migración `20261103193816_solo_asteroides_sin_scores.sql` borró todos los juegos salvo asteroides | El paso 1 hace un `select` antes de empezar; si no hay fila, se detiene la implementación y se pide al usuario decidir (p. ej. una migración idempotente en otra spec). |
| Existen puntuaciones antiguas de `ranaria` en `scores` que falsean el ranking                                                                 | El paso 1 lo comprueba con `select`; no se borra nada en esta spec, se avisa al usuario.                                                                                |
| Carriles imposibles o triviales (huecos demasiado cortos o largos, plataformas que nunca coinciden)                                           | La invariante de periodo está en un criterio; los valores se prueban en la SPEC GJ-ranaria-02 y cualquier ajuste se anota en Decisiones.                                |
| La rana viaja con un tronco y sale de pantalla sin aviso                                                                                      | Muerte «arrastrada» definida y dibujada; el tiempo y el aviso visual de bordes lo hacen predecible.                                                                     |
| Colisión inexacta en los bordes (sensación de muerte injusta)                                                                                 | Hitbox de la rana 34 px y vehículos reducidos 8 px; el margen de apoyo de 4 px es generoso con las plataformas.                                                         |
| `dt` grande al volver de una pestaña oculta mata a la rana o la deja fuera del tablero                                                        | `dt` ≤ 50 ms y pausa automática por `blur`.                                                                                                                             |
| React StrictMode monta el efecto dos veces y duplica bucles o listeners                                                                       | `destroy()` cancela el RAF y retira `keydown` y `blur`; criterio específico en la SPEC GJ-ranaria-02.                                                                   |
| Errores de hidratación por estado inicial en el render                                                                                        | `startRanaria` solo se llama en `useEffect` (SPEC GJ-ranaria-02); el render emite el `<canvas>` vacío.                                                                  |
| Derechos de terceros sobre el género                                                                                                          | Mecánica genérica; título, rana, vehículos, portada y niveles propios; sin assets externos.                                                                             |

## Lo que **no** está en esta spec

- Componente `components/ranaria-player.tsx`, HUD, marco CRT, `GameOverModal`, clase `.ranaria-canvas` y entrada en `PLAYERS` (SPEC GJ-ranaria-02).
- Guardado de puntuación y comprobación de `/salon?juego=ranaria` (SPEC GJ-ranaria-02).
- Sonido y música, moscas, cocodrilos, serpientes y cualquier enemigo extra.
- Altas o cambios en la tabla `games`, rediseño de `.cover-rana`, actualización del To-Do o de `implemented-games.md`.
- Controles táctiles, gamepad y ratón.
- Autenticación, anti-trampas, moderación y ranking global.
- Tests automatizados.

Cada uno de estos, si se hace, va en su propia spec.
