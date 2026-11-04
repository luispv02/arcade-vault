# SPEC 10 — Controles táctiles y layout móvil de los juegos

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-11-04
> **Objetivo:** Hacer jugables en un móvil táctil los 4 juegos con motor real (Asteroides, Tetris, Arkanoid y Serpentina) con un layout vertical —HUD compacto de una fila, canvas arriba y mando virtual (cruceta + 2 botones) debajo—, sin cambiar la jugabilidad ni el control por teclado.

## Por qué existe esta spec

Hoy los 4 juegos solo leen `keydown`/`keyup` (y Arkanoid `mousemove`), así que en un móvil no se pueden jugar. Además, el reproductor ocupa media pantalla con el HUD (Jugador, Puntuación, Vidas, Nivel, Skin, PAUSA/FIN/SALIR) y deja el canvas pequeño (captura de referencia a 375 px aprox.).

La decisión del usuario es un mando virtual **igual en todos los juegos**: cruceta de 4 direcciones y como máximo 2 botones de acción (A/B), porque casi todos los arcades se resuelven con eso. El canvas va fijo arriba y el mando debajo, **fuera** del canvas, para que los pulgares no tapen el juego.

Patrón técnico: los motores siguen sin importar React ni tocar `document`. La entrada táctil llega al motor por una **API de entrada** (`input(action, down)`) que reutiliza la misma lógica que ya ejecutan las teclas; el mando es un componente React que solo llama a esa API (entrada, no control del juego).

## Alcance

**Dentro:**

- **Tipo compartido** `lib/games/touch.ts`: `TouchAction = "left" | "right" | "up" | "down" | "a" | "b"`.
- **API de entrada en los 4 motores:** cada `Game` añade `input(action: TouchAction, down: boolean): void`, que ejecuta la misma lógica que la tecla equivalente y se ignora en `gameover` (y en pausa, salvo lo indicado). También `togglePause(): void` en Tetris, Arkanoid y Serpentina (ya tienen pausa interna) y en Asteroides (**pausa nueva**, ver Decisiones). Los listeners de teclado no cambian.
- **Mapeo de acciones por juego:**

| Juego      | Cruceta                                                         | A                        | B                           |
| ---------- | --------------------------------------------------------------- | ------------------------ | --------------------------- |
| Asteroides | ← → girar, ↑ impulso (↓ sin efecto)                             | disparar (`Space`)       | — (oculto)                  |
| Tetris     | ← → mover, ↓ bajar (mantener repite), ↑ rotar                   | rotar (`ArrowUp`/`KeyX`) | caída instantánea (`Space`) |
| Arkanoid   | ← → mover la pala (mantener)                                    | — (oculto)               | — (oculto)                  |
| Serpentina | ↑ ↓ ← → girar (equivale a `ArrowX`; mismas reglas de giro 180°) | — (oculto)               | — (oculto)                  |

En Asteroides, `a` también reinicia tras `dead`/`gameover` interno igual que `Space` hoy (si el motor lo requiere). Los botones sin acción en un juego no se renderizan.

- **Componente cliente** `components/touch-pad.tsx`: mando virtual con cruceta a la izquierda y botones A/B a la derecha. Props: `onInput(action, down)`, `buttons` (qué botones y su etiqueta, p. ej. `{ a: "ROTAR", b: "CAER" }`) y `repeat` (acciones que repiten al mantener, solo Tetris: ← → ↓ con retardo inicial 170 ms y luego cada 55 ms). Usa Pointer Events (`pointerdown`/`pointerup`/`pointercancel`/`pointerleave`) con `setPointerCapture`, soporta **multitoque** (cruceta + botón a la vez) y suelta todas las acciones al desmontar y al perder visibilidad.
- **Visibilidad:** el mando se pinta siempre en el DOM (sin lectura de `window` en el render, sin errores de hidratación) y se muestra solo con CSS `@media (pointer: coarse)`. En escritorio no aparece y el teclado sigue igual.
- **HUD compacto en móvil** (`@media (pointer: coarse), (max-width: 720px)`): una sola fila con Puntuación, la estadística principal del juego (Vidas en Asteroides; Nivel en Tetris, Arkanoid y Serpentina), botón PAUSA/REANUDAR (según `state === "paused"`) y botón ☰ que despliega Skin y SALIR. Jugador y estadísticas secundarias se ocultan en móvil (siguen en escritorio). Un componente `components/mobile-hud-menu.tsx` agrupa el botón ☰ y el panel.
- **Layout móvil del reproductor** en `app/globals.css`: columna `HUD → canvas → mando` dentro de `100dvh`, canvas con ancho completo y proporción original (4:3 en Asteroides, Arkanoid y Serpentina; 460×600 en Tetris) sin recortarse, marco `.crt` con padding reducido, leyenda `.crt-bottom` oculta, sin scroll vertical ni horizontal durante la partida.
- **Anti-gestos del navegador:** `touch-action: none`, `user-select: none` y `-webkit-touch-callout: none` en canvas y mando; `onContextMenu` con `preventDefault` en el mando (evita menú por pulsación larga); `overscroll-behavior: none` en la página de juego (sin pull-to-refresh ni rebote).
- **Viewport:** `export const viewport` en `app/layout.tsx` con `width: "device-width"`, `initialScale: 1` y `viewportFit: "cover"` (comprobar antes en `node_modules/next/dist/docs/` el API vigente), y padding `env(safe-area-inset-bottom)` bajo el mando.
- Integración en los 4 players (`asteroids-player.tsx`, `tetris-player.tsx`, `arkanoid-player.tsx`, `serpentina-player.tsx`): guardan el motor en `gameRef` (ya existe en los players con skin), pasan `gameRef.current?.input` al mando y `togglePause` al botón PAUSA.
- Interfaz diseñada con `/frontend-design`, respetando el look neón/CRT y las 3 skins (`neon`, `retro`, `clasico`) en el mando.

**Fuera de alcance (para otras specs):**

- Juegos del catálogo con placeholder (`GamePlayer`) y `ranaria` (solo existe en `specs/game-jam/`).
- Gestos sobre el canvas (swipe, arrastrar la pala de Arkanoid), joystick analógico y detección de tilt/giroscopio.
- Orientación horizontal optimizada (el diseño es vertical; en horizontal solo debe seguir funcionando) y aviso de rotar el móvil.
- Vibración háptica, sonido, PWA/instalable y pantalla completa.
- Mapeo personalizable de botones o mando configurable por el usuario.
- Gamepad físico.
- Cambios en `GameOverModal`, esquema, RLS, `lib/data.ts` y en las reglas de cada juego.
- Resto de páginas (home, `/games`, `/salon`, ficha del juego): su responsive no se toca aquí.
- Pruebas automatizadas.

## Modelo de datos

Esta feature no cambia la base de datos ni introduce datos persistentes. Añade tipos y APIs de entrada.

```ts
// lib/games/touch.ts
export type TouchAction = "left" | "right" | "up" | "down" | "a" | "b";

// Añadido a cada interfaz de juego (AsteroidsGame, TetrisGame, ArkanoidGame, SerpentinaGame)
interface GameInput {
  input(action: TouchAction, down: boolean): void;
  togglePause(): void;
}

// components/touch-pad.tsx
interface TouchPadProps {
  onInput: (action: TouchAction, down: boolean) => void;
  buttons?: { a?: string; b?: string }; // etiqueta; si falta la clave, el botón no se pinta
  repeat?: TouchAction[]; // acciones con auto-repetición (Tetris: left, right, down)
}
```

Convenciones:

- `input(action, true)` equivale a `keydown` de la tecla mapeada y `input(action, false)` a `keyup`. En acciones continuas (Asteroides, Arkanoid) mantiene el mismo estado interno `keys` que el teclado; en acciones discretas (Tetris, Serpentina) solo actúa en `down: true`.
- La auto-repetición vive en `TouchPad` (no en el motor), porque el teclado ya repite por el sistema operativo; así el motor no distingue origen.
- Teclado y táctil pueden coexistir (tablets con teclado): ambos escriben en el mismo estado del motor.
- Estado de pulsación de cada botón en `TouchPad` (mapa por `pointerId`), no global de módulo; al desmontar se emiten `input(action, false)` para todo lo pulsado.
- Mapeo interno motor: Asteroides `left→ArrowLeft`, `right→ArrowRight`, `up→ArrowUp`, `a→Space`; Tetris `left/right/down→Arrow*`, `up` y `a→rotar`, `b→Space`; Arkanoid `left/right→ArrowLeft/ArrowRight`; Serpentina `left/right/up/down→Arrow*`.
- Constantes del mando en `components/touch-pad.tsx`: `REPEAT_DELAY_MS = 170`, `REPEAT_INTERVAL_MS = 55`.

## Plan de implementación

1. Crear `lib/games/touch.ts` con `TouchAction`. `npm run lint` pasa; sin cambios visibles.
2. Serpentina: añadir `input` y `togglePause` a `SerpentinaGame` reutilizando la lógica de giro y pausa de `onKeyDown`. Comprobar con una llamada manual desde la consola de desarrollo (o temporal en el player) que `input("up", true)` gira.
3. Tetris: añadir `input` (mueve, baja, rota, caída) y `togglePause`. Misma comprobación.
4. Arkanoid: añadir `input` (`left`/`right` sobre `keys`) y `togglePause`.
5. Asteroides: añadir `input` (`left`/`right`/`up` sobre `keys`, `a` como `Space` con `justPressed`) y **pausa nueva** `togglePause` (congela el bucle y reinicia el reloj al reanudar, como Tetris) más el estado `"paused"` en `AsteroidsSnapshot`. Las teclas existentes y la jugabilidad no cambian.
6. Crear `components/touch-pad.tsx` y su CSS (cruceta, botones A/B, skins) con `/frontend-design`, oculto salvo `@media (pointer: coarse)`. Pointer Events con multitoque, repetición, liberación al desmontar/ocultar pestaña. `npm run lint` pasa.
7. Crear `components/mobile-hud-menu.tsx` (botón ☰ con Skin y SALIR) y el CSS del HUD compacto de una fila.
8. Integrar en `serpentina-player.tsx`: HUD compacto, `TouchPad` bajo el marco CRT y botón PAUSA. Jugar una partida completa en un móvil/emulador táctil (DevTools con `pointer: coarse`) y guardar la puntuación.
9. Integrar en `tetris-player.tsx` (con `repeat` y botones ROTAR/CAER) y jugar una partida.
10. Integrar en `arkanoid-player.tsx` (sin botones A/B) y jugar una partida.
11. Integrar en `asteroids-player.tsx` (botón A = DISPARO, pausa nueva) y jugar una partida.
12. Layout móvil global en `app/globals.css` (`100dvh`, canvas a ancho completo, `.crt-bottom` oculto, `overscroll-behavior`, safe-area) y `export const viewport` en `app/layout.tsx`. Verificar a 375×667 y 390×844.
13. Ejecutar `npm run lint` y `npm run build` sin errores.

Cada paso deja la app arrancable: hasta el paso 8 el mando no se monta en ningún player y el comportamiento de escritorio no cambia.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] En escritorio (puntero fino) no aparece el mando virtual ni se altera el HUD completo, y los 4 juegos se siguen controlando con el teclado igual que antes.
- [ ] En un móvil táctil, `/juegos/<id>/jugar` de cada uno de los 4 juegos muestra de arriba abajo: HUD de una fila, canvas completo y mando virtual, sin scroll vertical ni horizontal a 375 px y a 390 px de ancho.
- [ ] El canvas mantiene su proporción (4:3 en Asteroides, Arkanoid y Serpentina; la de Tetris en Tetris) y no queda tapado por el mando ni por la barra del navegador (`100dvh`).
- [ ] El HUD móvil muestra Puntuación, la estadística principal (Vidas en Asteroides; Nivel en los demás), PAUSA/REANUDAR y ☰; Skin y SALIR están dentro del ☰ y funcionan.
- [ ] Serpentina: las 4 flechas del mando giran la serpiente, el giro de 180° se ignora y la partida termina y guarda puntuación como con teclado.
- [ ] Tetris: ← → mueven, ↓ baja, ↑ y A rotan, B suelta la pieza de golpe; mantener ← → ↓ repite tras ≈170 ms cada ≈55 ms y soltar detiene la repetición.
- [ ] Arkanoid: mantener ← o → mueve la pala de forma continua y soltar la detiene; no se muestran botones A/B.
- [ ] Asteroides: ← → giran mientras se mantienen, ↑ da impulso y A dispara; pulsar ← y A a la vez (multitoque) hace ambas cosas.
- [ ] Asteroides tiene pausa: PAUSA detiene la nave y los asteroides y REANUDAR continúa sin salto de tiempo; en pausa los botones del mando no actúan.
- [ ] PAUSA/REANUDAR de los 4 juegos refleja el estado real (`state === "paused"`) y mantiene el comportamiento de pausa existente (sin ráfagas al reanudar).
- [ ] Soltar el dedo, cancelar el toque (`pointercancel`) o salir del botón arrastrando libera la acción: ninguna nave, pala o pieza queda "pegada" en movimiento.
- [ ] Mantener pulsado el mando no abre menú contextual, no selecciona texto, no hace zoom ni scroll, y no activa pull-to-refresh.
- [ ] Al terminar la partida aparece el modal «FIN DEL JUEGO» y las pulsaciones del mando no afectan al juego de fondo; GUARDAR, JUGAR DE NUEVO y VOLVER AL VAULT funcionan con toque.
- [ ] Al desmontar el player (SALIR o JUGAR DE NUEVO) no queda ninguna acción pulsada ni temporizador de repetición activo, también bajo StrictMode.
- [ ] El mando se ve legible en las 3 skins (`neon`, `retro`, `clasico`) en modo oscuro.
- [ ] La consola no muestra errores ni avisos de hidratación en los 4 `/juegos/<id>/jugar` en escritorio ni en móvil.
- [ ] La jugabilidad con teclado no cambia en ningún juego y Asteroides conserva sus reglas (la única adición es la pausa).
- [ ] No se modifican el esquema, `lib/data.ts`, `components/game-over-modal.tsx` ni las políticas RLS.

## Decisiones

- **Sí:** mismo mando en los 4 juegos: cruceta de 4 direcciones y máximo 2 botones A/B, con los botones sin uso ocultos (decidido por el usuario). **No:** gestos por juego (swipe, arrastrar pala), joystick analógico ni gamepad distinto por juego: menos uniforme.
- **Sí:** alcance a los 4 juegos con motor real (decidido por el usuario). **No:** placeholders ni `ranaria`.
- **Sí:** canvas arriba y mando **debajo, fuera del canvas** (decidido por el usuario). **No:** mando superpuesto sobre el canvas: ahorra altura pero tapa el juego, y el dibujo de referencia lo indicaba solo como bosquejo de los controles.
- **Sí:** HUD compacto de una fila en móvil, con PAUSA y ☰ (Skin y SALIR) (decidido por el usuario con la opción recomendada). **No:** ocultarlo del todo ni dejarlo como está: se pierde información útil o el canvas queda pequeño.
- **Sí:** la pausa vive en el HUD, no en el mando (decidido por el usuario). **No:** reutilizar B como pausa: inconsistente entre juegos.
- **Sí:** mando visible solo con `(pointer: coarse)` y mediante CSS (decidido por el usuario). **No:** por ancho de pantalla ni por JavaScript: la CSS evita errores de hidratación y no afecta a escritorios con ventana estrecha.
- **Sí:** API `input(action, down)` en cada motor. Decisión mía: mantiene los motores sin `document` y sin teclas sintéticas. **No:** disparar `KeyboardEvent` sintéticos desde el mando: es frágil y el bloqueo de teclas de `GameOverModal` (fase de captura en `window`) los interceptaría de forma impredecible.
- **Sí:** la auto-repetición de Tetris vive en `TouchPad`. Decisión mía: el teclado ya repite por el sistema operativo y el motor no debe distinguir el origen.
- **Sí:** añadir pausa a Asteroides. Decisión mía: el HUD móvil necesita PAUSA en los 4 juegos y el motor actual no tiene pausa; es la única adición de jugabilidad (no altera reglas ni puntuación) y se documenta aquí.
- **Sí:** Arkanoid sin botón de acción (no existe lanzar bola en el motor actual) y Serpentina sin botones: se ocultan A/B en vez de inventar acciones.
- **Sí:** teclado y táctil coexisten sobre el mismo estado del motor. **No:** deshabilitar el teclado al detectar táctil.
- **Sí:** `viewport` explícito con `viewportFit: "cover"` y `safe-area-inset-bottom`. Decisión mía: sin ello iOS deja el mando bajo la barra de inicio.
- **No:** vibración háptica, sonido, PWA, pantalla completa y orientación horizontal optimizada (fuera de alcance por defecto).

## Riesgos

| Riesgo                                                                                 | Mitigación                                                                                                                         |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Acción "pegada" si se pierde el `pointerup` (pestaña oculta, llamada, toque cancelado) | `setPointerCapture`, manejo de `pointercancel`, liberación en `visibilitychange` y al desmontar; criterio de aceptación.           |
| Navegadores móviles interpretan toques como scroll, zoom o doble toque                 | `touch-action: none`, `overscroll-behavior: none`, `viewport` fijo y prueba en el dispositivo real.                                |
| iOS Safari: barra inferior y `100vh` tapan el mando                                    | Usar `100dvh` y `env(safe-area-inset-bottom)`; probar en un iPhone real o su emulación.                                            |
| Añadir pausa a Asteroides altera el bucle y el reloj (`dt` en ráfaga al reanudar)      | Reiniciar `lastTime` al reanudar como en Tetris y Arkanoid; criterio de aceptación específico.                                     |
| El mando oculto con CSS sigue en el DOM y se enfoca con teclado/lector de pantalla     | Botones con `tabIndex={-1}` y `aria-hidden` cuando están ocultos por CSS (`display: none` ya los saca del árbol de accesibilidad). |
| Con el modal abierto, pulsaciones del mando llegan al motor                            | `input` ignora todo en `gameover`; el modal cubre la pantalla con su backdrop.                                                     |
| En horizontal el canvas + mando no caben en `100dvh`                                   | Fuera de alcance; solo se exige que el juego no se rompa y se pueda hacer scroll si hace falta.                                    |
| Latencia percibida del mando en Tetris y Asteroides frente al teclado                  | Pointer Events (no `click`) y estado directo en el motor, sin pasar por React para el movimiento.                                  |

## Lo que **no** está en esta spec

- Juegos placeholder y `ranaria`.
- Gestos sobre el canvas, joystick analógico, giroscopio y gamepad físico.
- Orientación horizontal optimizada y aviso de rotación.
- Vibración, sonido, PWA y pantalla completa.
- Mapeo configurable por el usuario.
- Cambios de esquema, RLS, `lib/data.ts`, `components/game-over-modal.tsx` y reglas de los juegos (salvo la pausa nueva de Asteroides).
- Responsive de otras páginas (home, `/games`, `/salon`, ficha).
- Tests automatizados.

Cada uno de estos, si se hace, va en su propia spec.
