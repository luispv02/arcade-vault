# SPEC 01 — MVP visual de Arcade Vault (todas las pantallas)

> **Estado:** Implementado
> **Depende de:** ninguna
> **Fecha:** 2026-11-02
> **Objetivo:** Portar a Next.js (App Router) las 5 pantallas del template `references/templates/` con datos mock y sesión simulada, sin implementar ningún juego real.

## Por qué existe esta spec

El template en `references/templates/` es un prototipo React con Babel en el navegador y un router por hash. Esta spec lo convierte en la base real de la app (rutas, componentes y datos tipados) para que las specs posteriores reemplacen los mocks y el placeholder del reproductor por juegos y backend reales.

## Alcance

**Dentro:**

- Pantalla **Biblioteca** (`/`): hero, buscador por nombre, chips de categoría y grilla de tarjetas con efecto tilt.
- Pantalla **Detalle de juego** (`/juegos/[id]`): portada, etiquetas, descripción, franja de estadísticas, botones y ranking Top 10 del juego.
- Pantalla **Reproductor** (`/juegos/[id]/jugar`): HUD, pantalla CRT y modal de fin de juego. Es un **placeholder** copiado tal cual del template (arena decorativa, puntuación que sube sola, pausa, fin, guardar puntuación) que más adelante se sustituirá por los juegos reales.
- Pantalla **Acceso** (`/acceso`): pestañas Iniciar sesión / Crear cuenta, invitado y botones sociales (solo visuales).
- Pantalla **Salón de la Fama** (`/salon`): pestañas por juego, podio, tabla y fila "tu mejor marca" si hay sesión.
- Navegación superior con menú móvil (hamburguesa) y footer, compartidos desde `app/layout.tsx`.
- Datos mock tipados (8 juegos, 5 categorías, generador determinista de rankings).
- Sesión simulada y puntuaciones guardadas en `localStorage`.
- Página 404 para ids de juego inexistentes.
- Interfaz diseñada con la skill `/frontend-design`, respetando el look del template.

**Fuera de alcance (para otras specs):**

- Cualquier juego jugable (lógica, canvas, input, sonido).
- Backend, base de datos, autenticación real y OAuth con Google/GitHub.
- Rankings reales: la tabla de puntuaciones sigue siendo mock; las guardadas en `av_scores` no se muestran todavía en el Salón.
- Pruebas automatizadas (no hay test runner configurado).
- Internacionalización: todos los textos quedan en español.

## Modelo de datos

```ts
// lib/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;           // slug: "bloque-buster", "caida", ...
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;        // clase CSS: "cover-bricks", "cover-tetro", ...
  color: GameColor;
  best: number;
  plays: string;        // ya formateado: "12.4K"
}

export const GAMES: Game[];                              // los 8 juegos de data.jsx
export const CATS: ("TODOS" | GameCategory)[];

// lib/scores.ts
export interface ScoreRow { rank: number; name: string; score: number; date: string } // date: "DD/MM/2026"
export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista, igual a data.jsx

// lib/session.ts (cliente)
export interface SessionUser { name: string }            // máx. 10 caracteres, mayúsculas
// localStorage "av_user"   → SessionUser | null
// localStorage "av_scores" → { game: string; score: number; name: string; at: number }[]
```

Convenciones:

- Números con `toLocaleString("es-ES")`.
- Seeds: detalle `id.length * 17 + 3` con 10 filas; salón `id.length * 23 + 7` con 12 filas.
- Todo acceso a `localStorage` va dentro de `try/catch` y se lee tras el montaje para evitar errores de hidratación.

## Plan de implementación

1. Verificar que `app/globals.css` cubre todas las clases de `references/templates/styles.css` (portadas `cover-*`, `.crt`, `.podium`, `.modal`, etc.) y añadir las que falten. `npm run dev` arranca sin errores.
2. Crear `lib/games.ts` y `lib/scores.ts` portando `data.jsx` a TypeScript estricto.
3. Crear `lib/session.ts` y `components/session-provider.t sx` (contexto cliente con `user`, `login`, `logout`, `saveScore`).
4. Crear `components/nav.tsx` (con menú móvil y estado activo por `usePathname`) y `components/footer.tsx`; montarlos junto al provider en `app/layout.tsx`. La ruta `/` ya muestra la nav.
5. Reemplazar `app/page.tsx` por la Biblioteca: `components/library.tsx` (cliente, búsqueda y filtro) y `components/game-card.tsx` (tilt). Los enlaces apuntan a `/juegos/[id]`.
6. Crear `app/juegos/[id]/page.tsx` (Detalle) con `generateStaticParams` y `notFound()` para ids inválidos, respetando `cacheComponents`.
7. Crear `app/acceso/page.tsx` con `components/auth-form.tsx`; el login guarda el usuario y redirige a `/`.
8. Crear `app/salon/page.tsx` con `components/hall-of-fame.tsx` (pestañas, podio, tabla, fila del usuario).
9. Crear `app/juegos/[id]/jugar/page.tsx` con `components/game-player.tsx` (placeholder copiado del template) y conectar `saveScore`.
10. Crear `app/not-found.tsx` con el estilo del vault. Ejecutar `npm run lint` y `npm run build` sin errores.

Cada paso deja la app arrancable; se consultan las guías de `node_modules/next/dist/docs/` antes de escribir código de Next.js.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/` muestra el hero, el buscador, 5 chips y 8 tarjetas.
- [ ] Escribir "caída" en el buscador deja solo la tarjeta CAÍDA; un texto sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Pulsar el chip SHOOTER muestra solo INVASORES y ROCAS.
- [ ] Pulsar una tarjeta o su botón JUGAR navega a `/juegos/[id]` del juego.
- [ ] `/juegos/caida` muestra título, 4 etiquetas, 3 estadísticas y 10 filas de ranking con las 3 primeras destacadas.
- [ ] `/juegos/no-existe` muestra la página 404.
- [ ] "JUGAR AHORA" lleva a `/juegos/[id]/jugar`; "VOLVER AL VAULT" lleva a `/`.
- [ ] En el reproductor la puntuación sube sola, PAUSA la detiene y muestra "EN PAUSA", y FIN abre el modal con la puntuación final.
- [ ] Guardar puntuación en el modal añade una entrada a `localStorage["av_scores"]` y muestra "PUNTUACIÓN GUARDADA_".
- [ ] SALIR vuelve a `/juegos/[id]`; JUGAR DE NUEVO reinicia puntuación, vidas y nivel.
- [ ] En `/acceso`, la pestaña "CREAR CUENTA" muestra el campo de correo y la otra pestaña lo oculta.
- [ ] Enviar el formulario guarda `av_user` con el nombre en mayúsculas (máx. 10 caracteres), redirige a `/` y la nav muestra el nombre.
- [ ] "JUGAR COMO INVITADO" redirige a `/` sin `av_user` guardado.
- [ ] Cerrar sesión desde la nav elimina `av_user`; recargar la página conserva el estado de sesión.
- [ ] `/salon` muestra podio con 3 posiciones y 12 filas; cambiar de pestaña cambia los datos.
- [ ] La fila "TU MEJOR MARCA" aparece solo con sesión iniciada.
- [ ] A 375 px de ancho aparece la hamburguesa, el menú lateral abre y cierra, y no hay scroll horizontal.
- [ ] El enlace activo de la nav se resalta (Biblioteca también en detalle y reproductor).
- [ ] La consola del navegador no muestra errores de hidratación en ninguna de las 5 pantallas.

## Decisiones

- **Sí:** rutas del App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/acceso`, `/salon`). URLs reales y compartibles, aprovecha Next.js.
- **No:** router por hash en una sola página como el template. Pierde SSR y no usa el framework.
- **Sí:** sesión simulada en `localStorage` (`av_user`, `av_scores`) como el template. Es un MVP visual sin backend.
- **No:** cookies con Server Actions. Es sobreingeniería sin backend.
- **Sí:** reproductor como placeholder copiado tal cual del template. Se sustituirá por los juegos reales en specs posteriores.
- **Sí:** datos mock tipados en `lib/` con el generador determinista del template. Rankings estables entre renders y fáciles de reemplazar por una API.
- **No:** JSON estático. Perdería el generador y habría que reescribir los rankings a mano.
- **Sí:** nav y footer en `app/layout.tsx`, con estado de sesión en un provider cliente.
- **Sí:** textos en español (idioma del proyecto y del template).

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Errores de hidratación al leer `localStorage` | Leer `av_user` en un efecto tras el montaje; renderizar el estado de invitado en el primer render. |
| `cacheComponents` rompe páginas con `params` dinámicos | Usar `generateStaticParams` con los 8 ids y consultar las guías de Next 16 antes de escribir. |
| `localStorage` bloqueado (modo privado) | `try/catch` en todos los accesos; la sesión vive solo en memoria. |
| Clases CSS del template que falten en `globals.css` | Paso 1 del plan las audita antes de construir pantallas. |
| Tailwind v4 vía Turbopack choca con el CSS portado | Mantener el CSS del template como está en `globals.css` y usar Tailwind solo para ajustes puntuales. |

## Lo que **no** está en esta spec

- Ningún juego jugable (el reproductor es un placeholder).
- Backend, base de datos, login real u OAuth.
- Rankings reales o mostrar `av_scores` en el Salón de la Fama.
- Tests automatizados.
- Cambios de idioma.

Cada uno de estos, si se hace, va en su propia spec.
