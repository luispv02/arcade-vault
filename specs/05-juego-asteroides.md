# SPEC 05 — Juego Asteroides jugable en la plataforma

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-03
> **Objetivo:** Portar a TypeScript el juego `references/templates/started-games/02-asteroids/` como un juego nuevo del catálogo con id `asteroides`, jugable en `/juegos/asteroides/jugar` dentro del marco CRT de la plataforma, con su HUD de canvas intacto y notificando su estado a React para mostrar también el HUD de la plataforma.

## Por qué existe esta spec

Hoy todos los juegos de `/juegos/[id]/jugar` usan el placeholder de `components/game-player.tsx` (arena decorativa y puntuación que sube sola). Asteroides es el primer juego real: ya existe como canvas HTML5 puro (`game.js`, 510 líneas, con estado en variables globales y acceso directo al DOM) y hay que adaptarlo a React/Next.js sin reescribir su jugabilidad. Esta spec también fija el patrón (motor en `lib/games/<id>/` + componente cliente con `<canvas>`) que usarán los juegos siguientes.

## Alcance

**Dentro:**

- Nueva entrada `asteroides` en `GAMES` (`lib/games.ts`): `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `color: "magenta"`, `cover: "cover-asteroides"`, `best: 0`, `plays: "0"`, con `short` y `long` escritos a partir del README del juego.
- Portada `.cover-asteroides` nueva en `app/globals.css` (distinta de `.cover-rocas`).
- Motor del juego portado a TypeScript en `lib/games/asteroids/`, sin variables globales de módulo ni acceso a `document`: recibe el `<canvas>` y expone una función de arranque que devuelve `destroy()`.
- Se porta **todo** el comportamiento de `game.js`: nave con rotación, empuje e invencibilidad al reaparecer, disparo, asteroides de 3 tamaños que se parten, partículas, niveles (`spawnAsteroids(3 + level)`), 3 vidas, power-up de triple disparo (incluido el drop garantizado a las 5 destrucciones), envolvimiento toroidal y `dt` limitado a 50 ms.
- El HUD (`SCORE`, `NIVEL`, vidas, contador `3x`) y el overlay `GAME OVER … ESPACIO PARA REINICIAR` se siguen dibujando en el canvas, como en el original. **Se usan los dos HUD:** el del canvas no se elimina.
- El motor notifica a React su estado (`score`, `lives`, `level`, `state`) mediante un callback `onStateChange`, que se invoca al arrancar y solo cuando algún valor cambia (no en cada frame).
- Componente cliente `components/asteroids-player.tsx`: barra HUD de la plataforma con las clases existentes (`player-hud`, `hud-stat`: Jugador, Puntuación, Vidas, Nivel) alimentada por `onStateChange`, marco `.crt` / `.crt-screen` / `.crt-bottom` con el canvas y un botón `SALIR` hacia `/juegos/asteroides`. «Jugador» muestra el nombre de `useSession()` (solo lectura) o `INVITADO`.
- Canvas de resolución interna fija 800×600 escalado por CSS al ancho disponible manteniendo 4:3.
- Teclado: `keydown`/`keyup` en `window` mientras el componente está montado, con `preventDefault` en `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` y `Space`; los listeners y el `requestAnimationFrame` se retiran al desmontar.
- `app/juegos/[id]/jugar/page.tsx` renderiza `AsteroidsPlayer` cuando `id === "asteroides"`; el resto de ids sigue con `GamePlayer`.
- Interfaz diseñada con la skill `/frontend-design`, respetando el look de las pantallas existentes.

**Fuera de alcance (para otras specs):**

- Guardar la puntuación (`saveScore`, `localStorage` o Supabase), modal «FIN DEL JUEGO» y Salón de la Fama con datos del juego.
- Botones PAUSA y FIN de la barra de la plataforma, y pausa del juego (el original no la tiene).
- Que React controle el juego: la comunicación es solo del motor hacia React (notificación), no al revés.
- Controles táctiles o gamepad.
- Sonido y música.
- Cambios en la entrada `rocas` ni en los demás juegos placeholder.
- Cambios en `GamePlayer`, `lib/session.ts`, `lib/scores.ts` o `components/session-provider.tsx`.
- Cambiar jugabilidad, balance, colores o reglas del original (incluido el HUD en inglés/español tal cual está).
- Pruebas automatizadas.

## Modelo de datos

Esta feature no introduce datos persistentes ni cambios en la base de datos. Añade una entrada al catálogo y la API del motor:

```ts
// lib/games.ts — nueva entrada en GAMES (misma interfaz Game que las demás)
{ id: "asteroides", title: "ASTEROIDES", cat: "SHOOTER", color: "magenta",
  cover: "cover-asteroides", best: 0, plays: "0", short: "...", long: "..." }

// lib/games/asteroids/game.ts
export interface AsteroidsSnapshot {
  score: number;
  lives: number;
  level: number;
  state: "playing" | "dead" | "gameover";
}
export interface AsteroidsGame { destroy(): void }
export function startAsteroids(
  canvas: HTMLCanvasElement,
  opts?: { onStateChange?: (s: AsteroidsSnapshot) => void },
): AsteroidsGame;
```

Convenciones:

- Constantes del original sin cambios: lienzo `W = 800`, `H = 600`; `RADII`, `SPEEDS` y `POINTS` indexados por tamaño (1 pequeño, 2 mediano, 3 grande); puntos 100 / 50 / 20.
- Estado del juego (`ship`, `bullets`, `asteroids`, `particles`, `powerUps`, `score`, `lives`, `level`, `state: 'playing' | 'dead' | 'gameover'`, `deadTimer`) vive dentro de la instancia creada por `startAsteroids`, no en el ámbito del módulo.
- Las entidades (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`) reciben el contexto 2D en `draw(ctx)` en lugar de leer un global.
- `startAsteroids` obtiene el contexto con `canvas.getContext("2d")` y lanza un error claro si es `null`.
- `onStateChange` recibe un objeto nuevo con los cuatro campos; se llama al iniciar y después solo si cambia alguno (puntos, vidas, nivel o estado). El componente lo guarda en `useState`; el motor nunca importa React.
- Archivos del motor: `utils.ts` (`wrap`, `dist`, `rand`, `randInt`, constantes), `entities.ts` (las cinco clases) y `game.ts` (estado, `update`, `draw`, bucle, input).

## Plan de implementación

1. Añadir la entrada `asteroides` a `lib/games.ts` y `.cover-asteroides` a `app/globals.css`. `npm run dev` arranca; `/games` y `/juegos/asteroides` muestran la tarjeta y la ficha; `/juegos/asteroides/jugar` aún usa el placeholder.
2. Crear `lib/games/asteroids/utils.ts` con `W`, `H`, `wrap`, `dist`, `rand`, `randInt` y las constantes de power-up y puntuación. `npm run lint` pasa.
3. Crear `lib/games/asteroids/entities.ts` con `Bullet`, `Asteroid`, `Particle` y `PowerUp` portados (`draw(ctx)`). `npm run lint` pasa.
4. Añadir `Ship` a `entities.ts` (rotación, empuje, `tryShoot`, `tripleShot`, invencibilidad). `npm run lint` pasa.
5. Crear `lib/games/asteroids/game.ts`: estado en closure, `initGame`, `nextLevel`, `killShip`, `update`, `draw`, HUD y overlay en canvas, bucle con `requestAnimationFrame` y `dt` ≤ 50 ms, input con `preventDefault` y `destroy()` que cancela el bucle y retira los listeners. `npm run lint` pasa.
6. Crear `components/asteroids-player.tsx` (cliente): `useEffect` que llama a `startAsteroids` con la ref del canvas y devuelve `destroy`; pasar `onStateChange` que actualiza un `useState`; barra HUD de la plataforma, marco CRT, canvas escalado por CSS y botón `SALIR`. Los valores de la barra coinciden con los del canvas.
7. Bifurcar `app/juegos/[id]/jugar/page.tsx`: `asteroides` → `AsteroidsPlayer`, otros ids → `GamePlayer`. Jugar una partida completa en el navegador, incluido GAME OVER y reinicio con ESPACIO, comprobando que ambas HUD coinciden.
8. Ejecutar `npm run lint` y `npm run build` sin errores.

Cada paso deja la app arrancable. Se consultan las guías de `node_modules/next/dist/docs/` antes de escribir código de Next.js, en particular sobre componentes cliente y `cacheComponents` en la página de juego.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/games` muestra la tarjeta «ASTEROIDES» (categoría SHOOTER) con su propia portada, distinta de «ROCAS», y «ROCAS» sigue existiendo.
- [ ] `/juegos/asteroides` muestra la ficha del juego y su botón de jugar lleva a `/juegos/asteroides/jugar`.
- [ ] `/juegos/asteroides/jugar` muestra un canvas dentro del marco CRT y la partida empieza sola con 4 asteroides grandes, 3 vidas, nivel 1 y score 0.
- [ ] Sobre el marco CRT se ve la barra HUD de la plataforma con Jugador (nombre de sesión o `INVITADO`), Puntuación, Vidas y Nivel, y el HUD del canvas sigue dibujado.
- [ ] Puntuación, vidas y nivel de la barra de la plataforma coinciden en todo momento con los del canvas (al destruir un asteroide, perder una vida, subir de nivel y reiniciar tras GAME OVER).
- [ ] La barra de la plataforma se actualiza solo cuando cambia algún valor, no en cada frame (React no re-renderiza a 60 fps).
- [ ] `←` `→` rotan la nave, `↑` la propulsa y `Espacio` dispara una bala.
- [ ] Destruir un asteroide grande, mediano y pequeño suma exactamente 20, 50 y 100 puntos; los grandes y medianos se parten en fragmentos de un tamaño menor y los pequeños no.
- [ ] Chocar con un asteroide quita una vida, la nave reaparece a los 2 s parpadeando e invencible, y no se pierde otra vida durante la invencibilidad.
- [ ] Al destruir todos los asteroides sube el nivel y aparecen `3 + nivel` asteroides.
- [ ] Recoger un power-up activa el disparo triple y se muestra `3x  N.Ns` en el HUD durante 5 s.
- [ ] Al llegar a 0 vidas se dibuja `GAME OVER` con el puntaje, y `Espacio` reinicia la partida a 3 vidas, nivel 1 y score 0.
- [ ] Pulsar flechas y `Espacio` en `/juegos/asteroides/jugar` no hace scroll de la página.
- [ ] Salir con `SALIR` detiene el juego: tras desmontar no quedan listeners de teclado ni bucle activo, y volver a entrar inicia una partida nueva sin duplicar velocidad ni disparos.
- [ ] El canvas se ve completo y sin scroll horizontal a 375 px de ancho, manteniendo 4:3.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en `/juegos/asteroides/jugar`.
- [ ] `/juegos/rocas/jugar` y el resto de ids siguen mostrando el placeholder sin cambios.
- [ ] No se modifican `components/game-player.tsx`, `lib/session.ts`, `lib/scores.ts` ni `components/session-provider.tsx`, y no hay peticiones a Supabase.

## Decisiones

- **Sí:** port a TypeScript con `<canvas>` en un componente React (decidido). Permite ciclo de vida limpio y es el patrón reutilizable para los siguientes juegos.
- **No:** `iframe` con el HTML original en `public/` (decidido). Más rápido, pero aísla el juego del resto de la plataforma y seguiría exigiendo tocar `game.js`.
- **Sí:** juego nuevo `asteroides` en el catálogo (decidido por el usuario); **No:** reutilizar `rocas`. Son entradas distintas aunque el concepto se parezca; `rocas` queda como placeholder.
- **Sí:** mantener el HUD y el GAME OVER del canvas **y además** mostrar el HUD de la plataforma (decidido por el usuario, corrige la versión anterior). El motor notifica a React con `onStateChange`.
- **Sí:** notificación en un solo sentido, motor → React, por callback y solo cuando algo cambia. Evita re-render a 60 fps y mantiene el motor independiente de React.
- **No:** PAUSA, FIN y modal de puntuación. Siguen fuera hasta la spec de guardado de puntuaciones.
- **No:** guardar la puntuación ahora (decidido por el usuario), ni en `localStorage` ni en Supabase.
- **Sí:** resolución interna 800×600 con escalado por CSS (decidido). La física no cambia y funciona en pantallas estrechas; sin controles táctiles.
- **Sí:** `preventDefault` en flechas y `Espacio` mientras el componente está montado (decidido). Evita scroll y que `Espacio` active el botón `SALIR` enfocado.
- **No:** requerir foco en el canvas. Obliga a hacer clic antes de jugar.
- **Sí:** `best: 0` y `plays: "0"` en la entrada del catálogo (decidido). Sin datos inventados.
- **Sí:** portar también el power-up de triple disparo aunque el README no lo menciona. Está en `game.js` y se juega así hoy.
- **Sí:** limpiar las teclas pulsadas cuando la ventana pierde el foco (`blur`). Decisión mía: evita que la nave quede propulsando si se suelta la tecla fuera de la pestaña; es el único cambio de comportamiento respecto al original.
- **Sí:** motor en tres archivos (`utils.ts`, `entities.ts`, `game.ts`) en vez de un solo archivo de 500 líneas. Facilita revisar y portar paso a paso.

## Riesgos

| Riesgo                                                                                | Mitigación                                                                                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| React StrictMode monta el efecto dos veces en desarrollo y duplica bucles o listeners | `destroy()` cancela el `requestAnimationFrame` y retira todos los listeners; el criterio de aceptación comprueba que no se duplican.        |
| `cacheComponents` y el uso de `params` en la página de juego                          | Se mantiene el patrón actual: página síncrona con `params` leído dentro de `<Suspense>`; el componente cliente no accede a APIs de request. |
| Las coordenadas del canvas escalado por CSS no coinciden con la lógica                | El juego solo usa teclado y coordenadas internas 800×600; no hay punteros que convertir.                                                    |
| `Math.random` y el estado inicial en el render provocan errores de hidratación        | `startAsteroids` solo se llama dentro de `useEffect`; el render del componente solo emite el `<canvas>` vacío.                              |
| Los dos HUD se desincronizan o React se re-renderiza en cada frame                    | `onStateChange` se dispara solo ante cambios de `score`, `lives`, `level` o `state`; un criterio de aceptación verifica que coinciden.      |
| La fuente `monospace` del canvas difiere según el sistema operativo                   | Se acepta; es la misma fuente que usa el original.                                                                                          |
| El render del canvas a 60 fps en pestañas ocultas acumula `dt`                        | `dt` limitado a 50 ms, igual que el original.                                                                                               |

## Lo que **no** está en esta spec

- Guardado de puntuaciones, modal de fin de partida y Salón de la Fama.
- PAUSA y FIN, y control del juego desde React.
- Controles táctiles, gamepad, sonido y música.
- Cambios en la entrada `rocas` o en los otros juegos placeholder.
- Cambios de jugabilidad o balance respecto al original.
- Autenticación, Supabase y cualquier base de datos.
- Tests automatizados.

Cada uno de estos, si se hace, va en su propia spec.
