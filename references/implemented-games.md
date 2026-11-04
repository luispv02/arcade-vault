# Juegos implementados

Catálogo actual de la tabla `games` de Supabase (ordenado por `sort_order`).

| #   | ID           | Título     | Categoría | Color   
| --- | ------------ | ---------- | --------- | ------- 
| 1   | `asteroides` | ASTEROIDES | SHOOTER   | magenta 
| 2   | `tetris`     | TETRIS     | PUZZLE    | magenta
| 3   | `arkanoid`   | ARKANOID   | ARCADE    | cyan   
| 4   | `serpentina` | SERPENTINA | ARCADE    | green  

## 1. Asteroides

- **ID:** `asteroides` · **Categoría:** SHOOTER · **Color:** magenta
- **Resumen:** Pilota tu nave y esquiva un campo de rocas que se parten.
- **Descripción:** Una nave en un espacio sin bordes: lo que sale por un lado vuelve a entrar por el otro. Rota, propulsa y dispara para partir asteroides grandes en medianos y pequeños. Tienes 3 vidas, y un power-up de triple disparo puede salvarte cuando el campo se llene.
- **Spec:** `specs/05-juego-asteroides.md`

## 2. Tetris

- **ID:** `tetris` · **Categoría:** PUZZLE · **Color:** magenta
- **Resumen:** Encaja las piezas y limpia líneas antes de que el tablero se llene.
- **Descripción:** Un tablero de 10×20 y ocho piezas, incluida una tuerca hueca que rompe todas las reglas. Rota, mueve y suelta cada pieza guiándote por su fantasma; limpiar varias líneas a la vez multiplica los puntos. Cada 10 líneas sube el nivel y la caída se acelera.
- **Spec:** `specs/07-juego-tetris.md`

## 3. Arkanoid

- **ID:** `arkanoid` · **Categoría:** ARCADE · **Color:** cyan
- **Resumen:** Rebota la pelota y derriba los muros de ladrillos nivel tras nivel.
- **Descripción:** Mueve el paddle con el ratón o con las flechas y no dejes caer la pelota: tienes 3 vidas. Cada ladrillo destruido explota y suma 10 puntos. Hay 5 niveles con patrones distintos, desde la parrilla completa hasta el marco con cruz, y en cada uno la pelota gana un 10 % de velocidad. Limpia los cinco para completar el juego.
- **Spec:** `specs/08-juego-arkanoid.md`

## 4. Serpentina

- **ID:** `serpentina` · **Categoría:** ARCADE · **Color:** green
- **Resumen:** Come frutas, crece y no choques contigo ni con las paredes.
- **Descripción:** Guía a la serpiente por un tablero de 20×15 celdas. Cada fruta suma 10 puntos y la alarga un segmento, y cada 5 frutas sube el nivel y la serpiente se acelera. La partida termina si chocas con una pared o con tu propio cuerpo; si llenas el tablero, completas el juego.
- **Spec:** `specs/09-juego-serpentina.md`
