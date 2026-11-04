# SPEC GJ-ranaria-02 — Player de Ranaria y leaderboard

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06, SPEC GJ-ranaria-01
> **Fecha:** 2026-11-04
> **Objetivo:** Hacer jugable `ranaria` en `/juegos/ranaria/jugar` con un player React (barra HUD, marco CRT y botón SALIR), registrado en `PLAYERS`, que al quedarse sin vidas permite guardar la puntuación en `scores` con el modal «FIN DEL JUEGO» común y verla en `/salon?juego=ranaria`.

## Por qué existe esta spec

La SPEC GJ-ranaria-01 deja el motor `startRanaria` en `lib/games/ranaria/` sin usarlo: `/juegos/ranaria/jugar` sigue mostrando el placeholder `components/game-player.tsx`. Esta spec conecta el motor con la plataforma siguiendo el patrón ya fijado por Asteroides, Tetris, Arkanoid y Serpentina: componente cliente `components/ranaria-player.tsx`, clase de canvas en `app/globals.css`, entrada en el mapa `PLAYERS` de `app/juegos/[id]/jugar/page.tsx` y reutilización de `components/game-over-modal.tsx` y `lib/save-score.ts`. El leaderboard (`/games`, `/juegos/ranaria`, `/salon?juego=ranaria`) no necesita código nuevo: las consultas de SPEC 06 (`getGames`, `getGame`, `getTopScores`) ya son genéricas.

La fila `ranaria` ya existe en `games` (ARCADE, `green`, `cover-rana`, `sort_order = 8`); por eso aquí **tampoco hay migración**. La portada `.cover-rana` ya existe en `app/globals.css` y se reutiliza tal cual.

Como el juego no tiene final por victoria, el modal se muestra solo al perder la última vida y el snapshot no incluye `won`.

## Alcance

**Dentro:**

- Componente cliente `components/ranaria-player.tsx`, exportado como `RanariaPlayer`:
  - Barra `player-hud` / `hud-stat` con cinco datos: **Jugador** (nombre de sesión o `INVITADO`), **Puntuación** (con `toLocaleString("es-ES")`), **Vidas** (dos dígitos, color `--green`), **Nivel** (clase `hud-stat level`, dos dígitos) y **Metas** (formato `n/5`, color `--cyan`).
  - Botón **SALIR** (`btn ghost`) como `Link` a `/juegos/ranaria`.
  - Marco `.crt` / `.crt-screen` con el `<canvas>` de 800×600 y la clase `.ranaria-canvas`; `.crt-bottom` con `led` «SEÑAL OK», la marca «RANARIA · CRT-83 · 60 HZ» y la leyenda de controles «← ↑ → ↓ / WASD SALTAR · P / ESC PAUSA».
  - `startRanaria(canvas, { onStateChange: setSnap })` se llama **solo dentro de `useEffect`**, con dependencia en un contador `run`; la limpieza llama a `destroy()`.
  - `GameOverModal` (`gameId="ranaria"`, `score`, `onPlayAgain`) cuando `snap.state === "gameover"`. JUGAR DE NUEVO restablece el snapshot inicial e incrementa `run` (destruye el motor y arranca otro).
  - Snapshot inicial local (antes de la primera notificación): `{ score: 0, lives: 3, level: 1, goals: 0, state: "playing" }`.
  - El componente nunca controla el juego: la comunicación es solo motor → React.
- `app/globals.css`: clase `.ranaria-canvas` (misma receta que `.serpentina-canvas`: `position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: contain`), con un comentario que indique la resolución interna 800×600.
- `app/juegos/[id]/jugar/page.tsx`: importar `RanariaPlayer` y añadir `ranaria: RanariaPlayer` al mapa `PLAYERS`. La página sigue síncrona con `params` dentro de `<Suspense>` (patrón `cacheComponents`); el placeholder `GamePlayer` se mantiene para el resto de ids que no tengan player.
- Comprobación de la ficha y el leaderboard sin cambios de código: `/games` (tarjeta con portada `cover-rana` y `plays`), `/juegos/ranaria` (top de puntuaciones, botón de jugar) y `/salon?juego=ranaria`.
- Interfaz diseñada con `/frontend-design`, respetando el look actual (neón/CRT, verde de la rana en los acentos, nada de estilos en línea nuevos más allá de los ya usados por los otros players).

**Fuera de alcance (para otras specs):**

- Cambios en el motor `lib/games/ranaria/` (reglas, velocidades, dibujo), salvo corregir un fallo que impida cumplir esta spec, anotándolo en Decisiones.
- Migración de alta en `games`, rediseño de `.cover-rana`, cambios de esquema, `scores`, `game_stats`, RLS o `lib/data.ts`.
- Cambios en `components/game-over-modal.tsx` y `lib/save-score.ts`.
- Botones PAUSA y FIN de la barra; la pausa es solo `P` o `Escape` (y el `blur` automático del motor).
- Sonido, controles táctiles, gamepad y ratón.
- Autenticación, anti-trampas, moderación y ranking global.
- Actualizar `references/implemented-games.md`, `CLAUDE.md` o el To-Do al terminar (lo hace el flujo de implementación del usuario).
- Pruebas automatizadas.

## Modelo de datos

Esta feature **no cambia el esquema ni inserta filas**: usa la tabla `scores` y el motor de la SPEC GJ-ranaria-01.

```ts
// components/ranaria-player.tsx
export function RanariaPlayer(): React.JSX.Element;
// estado local: snap: RanariaSnapshot, run: number

// lib/games/ranaria/game.ts (definido en SPEC GJ-ranaria-01; se consume aquí)
export interface RanariaSnapshot {
  score: number;
  lives: number;
  level: number;
  goals: number; // 0..5
  state: "playing" | "paused" | "gameover";
}
export function startRanaria(
  canvas: HTMLCanvasElement,
  opts?: { onStateChange?: (s: RanariaSnapshot) => void },
): { destroy(): void };

// app/juegos/[id]/jugar/page.tsx
const PLAYERS: Record<string, () => React.JSX.Element>;
// + ranaria: RanariaPlayer

// lib/save-score.ts (existente, sin cambios)
export function saveScore(
  gameId: string,
  name: string,
  score: number,
): Promise<void>;
```

```sql
-- Comprobaciones de solo lectura (sin migración):
select id from public.games where id = 'ranaria';             -- 1 fila
select name, score from public.scores where game_id = 'ranaria'
order by score desc limit 10;                                 -- tras guardar, aparece la fila
select best, plays from public.game_stats where game_id = 'ranaria';
```

Convenciones:

- Reglas del juego resumidas (definidas en la SPEC GJ-ranaria-01): 3 vidas (máx. 5; +1 cada 5000 puntos), 30 s por intento, 5 nenúfares por nivel, +10 por fila nueva, +100 por meta, +10 por segundo restante al cumplir meta, +500 por nivel, velocidad ×(1 + 0,1·(nivel−1)) con tope ×2, tortugas que se sumergen desde el nivel 2. `gameover` al perder la última vida.
- La barra se actualiza solo cuando cambia algún campo del snapshot; no hay temporizador en React.
- La guardia de «guardar una sola vez por partida» vive en `GameOverModal` y se reinicia al volver a jugar (cambia `run`).
- `best` y `plays` siguen derivándose de `game_stats`; nada se guarda en el cliente salvo el nombre de sesión de `lib/session.ts`.
- Ranaria no tiene `won`: el modal es el de siempre y no distingue final por victoria.

## Plan de implementación

1. Comprobar con `execute_sql` (solo `select`) que sigue existiendo la fila `ranaria` y que `lib/games/ranaria/game.ts` exporta `startRanaria` y `RanariaSnapshot` (SPEC GJ-ranaria-01 completada). Si no, detenerse. La app no cambia.
2. Añadir `.ranaria-canvas` a `app/globals.css`, junto a las demás clases de canvas. La app arranca sin cambios visibles.
3. Crear `components/ranaria-player.tsx` con `/frontend-design`: HUD (Jugador, Puntuación, Vidas, Nivel, Metas), SALIR, marco CRT con leyenda, `useEffect` con `startRanaria` y `destroy`, `GameOverModal` y contador `run`. Aún no está registrado: nada cambia en pantalla. `npm run lint` pasa.
4. Registrar `ranaria: RanariaPlayer` en `PLAYERS` de `app/juegos/[id]/jugar/page.tsx`, respetando el patrón `cacheComponents` (consultar antes `node_modules/next/dist/docs/`). `/juegos/ranaria/jugar` muestra el juego real.
5. Jugar en el navegador una partida completa hasta quedarse sin vidas, en este orden: cruzar la carretera, subirse a un tronco y a una tortuga, ahogarse, ser atropellada, agotar el tiempo, cumplir las 5 metas (nivel 2), pausar y reanudar. Guardar la puntuación y verla en `/salon?juego=ranaria`, y comprobar que `plays` sube en `/games`. Ajustar velocidades en `lanes.ts` solo si resultan injustas y anotarlo en Decisiones de la SPEC GJ-ranaria-01.
6. Ejecutar `npm run lint` y `npm run build` sin errores.

Cada paso deja la app arrancable. Se consultan las guías de `node_modules/next/dist/docs/` antes de escribir código de Next.js.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/games` muestra una única tarjeta «RANARIA» (ARCADE, green) con la portada `cover-rana`, y `/juegos/ranaria` muestra su ficha con un botón de jugar que lleva a `/juegos/ranaria/jugar`.
- [ ] `/juegos/ranaria/jugar` muestra el canvas dentro del marco CRT y la partida arranca sola con la rana en la fila de salida, score 0, 3 vidas, nivel 1 y Metas `0/5`.
- [ ] La barra de la plataforma muestra Jugador (nombre de sesión o `INVITADO`), Puntuación, Vidas, Nivel y Metas, y sus valores coinciden en todo momento con el estado del juego.
- [ ] La barra se actualiza solo cuando cambia algún valor, no en cada frame (React no re-renderiza a 60 fps) ni cada segundo.
- [ ] Las flechas y `WASD` saltan una fila o 50 px al lado; mantener la tecla pulsada no encadena saltos.
- [ ] Un vehículo que toca a la rana la mata (atropellada); en la salida y la mediana no hay peligro.
- [ ] En el río, la rana sobre un tronco o unas tortugas es arrastrada a la velocidad del carril; aterrizar sobre agua la mata (ahogada); salir del tablero arrastrada la mata.
- [ ] En el nivel 1 las tortugas no se sumergen; desde el nivel 2 parpadean durante 1 s y se sumergen 1 s, y la rana que las ocupa muere ahogada.
- [ ] Aterrizar en un nenúfar libre suma 100 puntos más 10 por segundo restante y la rana reaparece en la salida con el reloj completo; aterrizar en uno ocupado o en la orilla entre nenúfares la mata.
- [ ] Cada fila nueva alcanzada en un intento suma exactamente 10 puntos (saltar atrás y volver a pasar no puntúa de nuevo).
- [ ] El tiempo de 30 s se ve en la barra del canvas; al agotarse la rana muere. En pausa, durante la animación de muerte y durante el banner de nivel el reloj no avanza.
- [ ] Al morir, el canvas muestra la cruz parpadeante 800 ms con las entradas bloqueadas, la vida baja en 1 y la rana reaparece; la vida extra llega cada 5000 puntos y nunca pasa de 5.
- [ ] Cumplir los 5 nenúfares suma 500, sube el nivel a 2, vacía los nenúfares, muestra el banner `NIVEL 2` 1200 ms y los carriles se mueven un 10 % más rápido.
- [ ] `P` y `Escape` pausan y reanudan; en pausa el canvas muestra «PAUSA», nada se mueve y los saltos pulsados no se acumulan; al perder el foco de la ventana el juego se pausa solo.
- [ ] Al perder la última vida se dibuja `GAME OVER`, se detiene el bucle y aparece el modal «FIN DEL JUEGO» con la puntuación final; no se inserta nada hasta pulsar GUARDAR.
- [ ] GUARDAR inserta exactamente 1 fila con `game_id = 'ranaria'`, la puntuación final y el nombre escrito; no se puede guardar dos veces la misma partida ni con nombre vacío.
- [ ] Escribir un nombre con espacios o pulsar `Espacio`, las flechas, `WASD`, `P` o `Escape` en el modal no salta, pausa ni reinicia el juego.
- [ ] JUGAR DE NUEVO inicia una partida limpia (score 0, 3 vidas, nivel 1, Metas `0/5`, velocidades de nivel 1) y permite guardar una segunda fila; VOLVER AL VAULT lleva a `/games`.
- [ ] La puntuación guardada aparece en `/salon?juego=ranaria` sin redeploy y `plays` de Ranaria sube en 1 en `/games`.
- [ ] Si la inserción falla (p. ej. sin red) el modal muestra el error y permite reintentar.
- [ ] Salir antes del fin no inserta nada; tras SALIR no queda listener de teclado ni de `blur` ni bucle activo, y volver a entrar inicia una partida nueva sin duplicar velocidad ni saltos por tecla (también bajo StrictMode).
- [ ] Las flechas, `WASD`, `P` y `Escape` no hacen scroll de la página en `/juegos/ranaria/jugar`.
- [ ] El canvas se ve completo y sin scroll horizontal a 375 px de ancho, manteniendo su proporción 4:3.
- [ ] La consola no muestra errores ni avisos de hidratación en `/juegos/ranaria/jugar`, `/games` y `/salon`.
- [ ] `PLAYERS` contiene `ranaria` y el resto de ids sin player (`bloque-buster`, `caida`, `gloton`, `invasores`, `rocas`, `duelo-pixel`, si están en el catálogo) siguen con el placeholder `GamePlayer`.
- [ ] Asteroides, Tetris, Arkanoid y Serpentina siguen cumpliendo los criterios de SPEC 05, 06, 07, 08 y 09 (modal, guardado único, JUGAR DE NUEVO, error con reintento).
- [ ] Ninguna clave `service_role` aparece en el repositorio y no se modifican el esquema, `lib/data.ts`, `components/game-over-modal.tsx` ni las políticas RLS.

## Decisiones

- **Sí:** `RanariaPlayer` sin props y registrado en el mapa `PLAYERS` ya existente, como los otros cuatro players (decidido por el usuario: solo registrar el player, sin migración). **No:** una rama `id === "ranaria"` suelta.
- **Sí:** reutilizar `.cover-rana` sin cambios. Decisión mía: existe y es propia; el rediseño no es parte de hacer el juego jugable.
- **Sí:** clase `.ranaria-canvas` calcada de `.serpentina-canvas`. Decisión mía: mismo canvas 800×600 en un contenedor 4:3, misma receta que funciona a 375 px.
- **Sí:** HUD con Jugador, Puntuación, Vidas, Nivel y Metas (`n/5`). Decisión mía: son los datos que cambian con eventos del juego; el tiempo restante se queda en la barra del canvas para no re-renderizar cada segundo.
- **Sí:** snapshot local inicial con 3 vidas, nivel 1 y 0 metas. Decisión mía: evita un parpadeo de valores vacíos antes de la primera notificación del motor.
- **Sí:** el modal y `saveScore` se reutilizan sin cambios; una única fila por partida. **No:** distinguir victoria en el modal: el juego es infinito.
- **Sí:** el motor pausa solo al perder el foco (`blur`), definido en la SPEC GJ-ranaria-01; aquí solo se verifica. Decisión mía.
- **Sí:** la verificación manual incluye la ficha, `/games` y `/salon`, sin cambios de código. Los criterios estándar del §9 de `integration-checklist.md` están incluidos, adaptados (Vidas, Nivel, Metas, `blur`).
- **Sí:** no actualizar `references/implemented-games.md`, `CLAUDE.md` ni el To-Do desde esta spec. Decisión mía: los edita el flujo de implementación del usuario tras revisar.
- **No:** sonido, controles táctiles, gamepad, ratón, botones PAUSA/FIN de la barra ni cambios en el esquema (fuera de alcance por defecto).

## Riesgos

| Riesgo                                                                                                     | Mitigación                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| La fila `ranaria` no existe en `games` (el catálogo se vació salvo `asteroides` en una migración anterior) | El paso 1 lo comprueba; si falta, se detiene y se pide al usuario decidir cómo darla de alta, porque esta spec no la inserta.                      |
| Puntuaciones antiguas de `ranaria` en `scores` que falsean el ranking                                      | Comprobar con `select` en el paso 1; no se borra nada, se avisa al usuario.                                                                        |
| React StrictMode monta el efecto dos veces y duplica bucles o listeners                                    | `destroy()` cancela el RAF y retira `keydown` y `blur`; criterio de aceptación específico.                                                         |
| Errores de hidratación por estado inicial o aleatorio en el render                                         | `startRanaria` solo se llama en `useEffect`; el render emite el `<canvas>` vacío con tamaño fijo y el motor no usa `Math.random`.                  |
| Doble inserción al llegar a `gameover`                                                                     | La guardia por partida vive en `GameOverModal` y se reinicia al cambiar `run`.                                                                     |
| Teclas del modal llegan al motor (ESPACIO o `P` reinician o pausan detrás del modal)                       | `GameOverModal` ya bloquea el teclado hacia el motor y, al estar en `gameover`, el motor ha dejado de escuchar; criterio de aceptación específico. |
| Re-renders a 60 fps por notificar en cada frame                                                            | El motor compara snapshots y solo notifica al cambiar; criterio de aceptación específico.                                                          |
| Dificultad mal ajustada (imposible o trivial) en el nivel 1                                                | El paso 5 obliga a jugar el nivel completo; los ajustes se hacen en `lanes.ts` y se anotan en la SPEC GJ-ranaria-01.                               |
| Escritura de `scores` desde el cliente sin autenticación                                                   | Heredado de SPEC 06 (RLS de inserción pública); anti-trampas fuera de alcance.                                                                     |

## Lo que **no** está en esta spec

- Cambios de reglas, velocidades o dibujo del motor (SPEC GJ-ranaria-01).
- Altas o cambios en la tabla `games`, rediseño de `.cover-rana`, cambios de esquema, RLS, `lib/data.ts`, `lib/save-score.ts` o `components/game-over-modal.tsx`.
- Sonido y música, moscas, cocodrilos y modos extra.
- Botones PAUSA/FIN de la barra y control del juego desde React.
- Controles táctiles, gamepad y ratón.
- Actualización de `references/implemented-games.md`, `CLAUDE.md` y del To-Do.
- Autenticación, anti-trampas, moderación y ranking global.
- Tests automatizados.

Cada uno de estos, si se hace, va en su propia spec.
