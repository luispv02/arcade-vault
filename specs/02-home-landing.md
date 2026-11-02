# SPEC 02 — Home (landing page) de Arcade Vault

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-02
> **Objetivo:** Portar a Next.js la pantalla Home del template `references/templates/home-about/home.jsx` en `/`, moviendo la Biblioteca a `/games` y añadiendo "Inicio" a la navegación.

## Por qué existe esta spec

La SPEC 01 dejó la Biblioteca en `/`. El template `home-about` define una landing de marketing que debe ser la puerta de entrada del sitio. Esto obliga a mover la Biblioteca a `/games` y a revisar todos los enlaces que hoy apuntan a `/` esperando la Biblioteca.

## Alcance

**Dentro:**

- Pantalla **Home** en `/` con las secciones del template:
  - Hero: eyebrow "INSERTA UNA MONEDA_", título de 3 líneas, subtítulo, 2 CTAs, indicador "DESLIZA" y 8 siluetas pixel flotantes.
  - `// 01` "¿POR QUÉ ARCADE VAULT?": 4 tarjetas de características con icono pixel.
  - `// 02` "JUEGOS DISPONIBLES AHORA": riel con los 6 primeros juegos de `GAMES` y botón "VER TODOS LOS JUEGOS →".
  - Franja de estadísticas (3 bloques).
  - `// 03` "ACTIVIDAD EN VIVO": lista de últimas puntuaciones y "TOP JUGADORES · HOY" con barras.
  - `// 04` "PRECIOS": tarjeta "JUGADOR VAULT" ($0) y 3 preguntas frecuentes.
  - CTA final "¿LISTO PARA JUGAR?".
- Animación de aparición al hacer scroll (clase `.reveal` + `IntersectionObserver`).
- Mover la Biblioteca actual de `/` a `/games` (mismo contenido, incluido su hero `av-hero`).
- Enlace **Inicio** en la nav de escritorio y en el menú móvil.
- Actualizar los enlaces internos que apuntaban a `/` esperando la Biblioteca.
- Datos mock tipados en `lib/home.ts`.
- Portar a `app/globals.css` las clases CSS de la Home que falten (`.home-*`, `.feature-*`, `.mini-*`, `.stat-*`, `.activity-*`, `.price-*`, `.faq-*`, `.reveal`, etc.).
- Interfaz diseñada con la skill `/frontend-design`, respetando el look del template.

**Fuera de alcance (para otras specs):**

- Pantalla **Acerca de** y su formulario de contacto (`about.jsx`). Va en su propia spec; el enlace "Acerca de" **no** se añade a la nav ahora.
- Renombrar `/juegos/[id]` a `/games/[id]`.
- Actividad y rankings reales: todo el contenido de "Actividad en vivo" y las estadísticas es mock.
- Ocultar o cambiar los CTAs según haya sesión iniciada (se muestran siempre, como en el template).
- Pruebas automatizadas.
- Internacionalización: todos los textos en español.

## Modelo de datos

```ts
// lib/home.ts
import type { GameColor } from "@/lib/games";

export interface Feature { icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET"; title: string; desc: string; color: GameColor }
export interface HomeStat { n: string; u: string; s: string }                     // "12+" / "JUEGOS" / "Y CONTANDO"
export interface RecentScore { player: string; game: string; score: number; ago: string; color: GameColor }
export interface TopPlayer { rank: number; player: string; score: number }
export interface FaqItem { q: string; a: string }

export const FEATURES: Feature[];            // 4 items
export const HOME_STATS: HomeStat[];         // 3 items
export const RECENT_SCORES: RecentScore[];   // 7 items
export const TOP_PLAYERS: TopPlayer[];       // 5 items
export const PRICING_PERKS: string[];        // 6 items
export const FAQ: FaqItem[];                 // 3 items
```

Convenciones:

- Los textos y valores se copian tal cual de `home.jsx`.
- Los puntajes se muestran con `toLocaleString("es-ES")`.
- El ancho de las barras del top es `100 - índice * 16` (%).
- Las rutas nuevas: Home `/`, Biblioteca `/games`. `/juegos/[id]`, `/juegos/[id]/jugar`, `/acceso` y `/salon` no cambian.
- No se introduce estado de servidor ni persistencia nueva.

## Plan de implementación

1. Auditar qué clases de la Home faltan en `app/globals.css` frente a `references/templates/home-about/styles.css` (desde `.home`) y portarlas. `npm run dev` arranca sin errores.
2. Crear `lib/home.ts` con los datos mock tipados.
3. Mover la Biblioteca: crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (hero `av-hero` + `<Library />`). Dejar `app/page.tsx` temporalmente igual. Ambas rutas funcionan.
4. Actualizar la nav (`components/nav.tsx`): añadir "Inicio" (`/`, activo solo con ruta exacta `/`) y apuntar "Biblioteca" a `/games` (activo en `/games` y `/juegos/*`), tanto en escritorio como en el menú móvil. El logo enlaza a `/`.
5. Actualizar los enlaces que querían la Biblioteca: "VOLVER AL VAULT" en `app/juegos/[id]/page.tsx`, `components/game-player.tsx`, `components/hall-of-fame.tsx` y `app/not-found.tsx` pasan a `/games`; el login en `components/auth-form.tsx` redirige a `/games`.
6. Crear `components/home/reveal.tsx` (cliente): envoltorio que añade `.in` al entrar en el viewport con `IntersectionObserver` (umbral 0.12, un solo disparo) y respeta `prefers-reduced-motion`.
7. Crear `components/home/floating-silhouettes.tsx` y `components/home/feature-icon.tsx` (SVG pixel, componentes de servidor) portados de `home.jsx`.
8. Crear `components/home/home-page.tsx` con las 6 secciones, usando `next/link` en todos los CTAs y `GAMES.slice(0, 6)` para el riel. Reemplazar `app/page.tsx` por la Home.
9. Ejecutar `npm run lint` y `npm run build` sin errores.

Cada paso deja la app arrancable. Se consultan las guías de `node_modules/next/dist/docs/` antes de escribir código de Next.js, en particular sobre `cacheComponents`.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/` muestra el hero con título "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA", 2 botones y 8 siluetas flotantes.
- [ ] "▶ EXPLORAR JUEGOS" lleva a `/games`; "✦ CREAR CUENTA" y "EMPEZAR GRATIS →" llevan a `/acceso`.
- [ ] La sección 01 muestra 4 tarjetas de características con su icono.
- [ ] La sección 02 muestra 6 tarjetas mini; pulsar una lleva a `/juegos/[id]` de ese juego.
- [ ] "VER TODOS LOS JUEGOS →" y "INSERTAR MONEDA →" llevan a `/games`.
- [ ] La franja de estadísticas muestra "12+", "MILES" y "GLOBAL".
- [ ] "ACTIVIDAD EN VIVO" muestra 7 filas de últimas puntuaciones y 5 filas de top, con las 3 primeras destacadas; "VER SALÓN →" lleva a `/salon`.
- [ ] "PRECIOS" muestra la tarjeta con 6 ventajas, el sello "FREE PLAY" y 3 preguntas frecuentes.
- [ ] Las secciones con `.reveal` aparecen al hacer scroll y no hay contenido invisible con JavaScript desactivado o con `prefers-reduced-motion`.
- [ ] `/games` muestra el mismo hero, buscador, 5 chips y 8 tarjetas que antes mostraba `/`.
- [ ] La nav muestra "Inicio", "Biblioteca" y "Salón de la Fama" en escritorio y en el menú móvil.
- [ ] "Inicio" se resalta solo en `/`; "Biblioteca" se resalta en `/games`, `/juegos/[id]` y `/juegos/[id]/jugar`.
- [ ] "VOLVER AL VAULT" (detalle, reproductor, salón) y el botón de la página 404 llevan a `/games`.
- [ ] Iniciar sesión desde `/acceso` redirige a `/games`; "JUGAR COMO INVITADO" también.
- [ ] A 375 px de ancho no hay scroll horizontal en `/`, las siluetas no tapan el texto del hero y la hamburguesa sigue funcionando.
- [ ] La consola del navegador no muestra errores de hidratación en `/` ni en `/games`.

## Decisiones

- **Sí:** Home en `/` y Biblioteca en `/games` (decidido). La landing es la URL canónica del sitio.
- **No:** Home en `/home` dejando la Biblioteca en `/`. Menos cambios, pero una URL poco natural para la portada.
- **Sí:** Solo Home en esta spec; "Acerca de" en otra (decidido). Mantiene la spec pequeña y revisable.
- **No:** añadir "Acerca de" a la nav ahora. Apuntaría a una ruta inexistente.
- **Sí:** mantener `/juegos/[id]` aunque la Biblioteca pase a `/games`. Evita tocar rutas y enlaces fuera de alcance. La inconsistencia de idioma en las URLs queda anotada para una spec futura.
- **Sí:** el login y los botones "volver" redirigen a `/games`. Conservan el comportamiento de la SPEC 01 (el usuario cae donde puede jugar). Es una decisión mía derivada del movimiento de ruta; cámbiala a `/` si prefieres volver a la landing.
- **Sí:** datos mock tipados en `lib/home.ts` (decidido). Coherente con la SPEC 01 y fácil de reemplazar por una API.
- **No:** derivar la actividad de `GAMES` o `seededScores`. Se desvía del template y acopla datos que serán reales más adelante.
- **Sí:** `Reveal` como único componente cliente; el resto de la Home son componentes de servidor. Mantiene el JS al mínimo.
- **Sí:** copiar los textos del template tal cual, incluido "12+ JUEGOS" aunque hoy hay 8 juegos. Es copy de marketing; se corrige cuando haya más juegos.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Enlaces a `/` que esperaban la Biblioteca se quedan sin actualizar | El paso 5 los lista explícitamente; se verifican con los criterios de aceptación de redirección. |
| El contenido con `.reveal` queda invisible si falla el observer o no hay JS | El estado oculto solo se aplica cuando el cliente ya montó, o se anula con `prefers-reduced-motion`. |
| Las siluetas flotantes causan scroll horizontal en móvil | Contenerlas con `overflow: hidden` en `.home-hero` y probar a 375 px. |
| `cacheComponents` y componentes de servidor con `Date`/aleatorio | La Home usa solo datos estáticos de `lib/`; no hay `Date.now()` ni `Math.random()` en el render. |
| Colisión de nombres CSS entre la Home y las clases ya portadas en SPEC 01 | El paso 1 audita las clases antes de añadirlas. |

## Lo que **no** está en esta spec

- La pantalla Acerca de y el formulario de contacto.
- Renombrar `/juegos/[id]` a `/games/[id]`.
- Actividad en vivo, estadísticas o rankings reales.
- Cambiar CTAs según el estado de sesión.
- Tests automatizados.
- Cambios de idioma.

Cada uno de estos, si se hace, va en su propia spec.
