export const W = 800;
export const H = 600;
export const CELL = 40;
export const COLS = W / CELL; // 20
export const ROWS = H / CELL; // 15
export const INITIAL_LENGTH = 3;
export const POINTS_PER_FRUIT = 10;
export const FRUITS_PER_LEVEL = 5;
// Intervalo entre pasos: 140 ms en el nivel 1, -8 ms por nivel, mínimo 70 ms.
export const STEP_BASE_MS = 140;
export const STEP_PER_LEVEL_MS = 8;
export const STEP_MIN_MS = 70;
// Giros que se guardan entre dos pasos (evita perder giros rápidos).
export const MAX_QUEUED_TURNS = 2;
// El frame se limita para que volver de una pestaña oculta no dispare pasos en ráfaga.
export const MAX_DT_MS = 50;
// Alto en píxeles con el que se dibuja el sprite de la fruta dentro de su celda.
export const FRUIT_DRAW_H = 36;
// Asset servido desde public/games/serpentina/.
export const FRUIT_IMAGE_URL = "/games/serpentina/fruits.png";
export interface Cell {
  col: number;
  row: number;
}
export type Direction = "up" | "down" | "left" | "right";
export const DIRECTION_DELTA: Record<Direction, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITE[a] === b;
}
/** Nivel según las frutas comidas: 1 + floor(frutas / 5). */
export function levelFor(fruitsEaten: number): number {
  return 1 + Math.floor(fruitsEaten / FRUITS_PER_LEVEL);
}
/** Intervalo en ms entre dos pasos de la serpiente para un nivel. */
export function stepIntervalFor(level: number): number {
  return Math.max(STEP_MIN_MS, STEP_BASE_MS - (level - 1) * STEP_PER_LEVEL_MS);
}
export function sameCell(a: Cell, b: Cell): boolean {
  return a.col === b.col && a.row === b.row;
}
export function insideBoard(c: Cell): boolean {
  return c.col >= 0 && c.col < COLS && c.row >= 0 && c.row < ROWS;
}
/** Celdas del tablero que no ocupa ningún segmento (orden fila a fila). */
export function freeCells(snake: readonly Cell[]): Cell[] {
  const taken = new Set(snake.map((c) => c.row * COLS + c.col));
  const free: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!taken.has(row * COLS + col)) free.push({ col, row });
    }
  }
  return free;
}
