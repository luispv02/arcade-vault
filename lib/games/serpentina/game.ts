import { FRUIT_NAMES, type FruitName } from "./sprites";
import {
  COLS,
  DIRECTION_DELTA,
  FRUIT_IMAGE_URL,
  H,
  INITIAL_LENGTH,
  MAX_QUEUED_TURNS,
  POINTS_PER_FRUIT,
  ROWS,
  W,
  freeCells,
  insideBoard,
  isOpposite,
  levelFor,
  sameCell,
  type Cell,
  type Direction,
} from "./utils";
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
interface Fruit {
  cell: Cell;
  name: FruitName;
}
export function startSerpentina(
  canvas: HTMLCanvasElement,
  opts: { onStateChange?: (s: SerpentinaSnapshot) => void } = {},
): SerpentinaGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Serpentina: el canvas no ofrece un contexto 2D.");
  }
  canvas.width = W;
  canvas.height = H;
  // ── Estado (vive en la instancia, no en el módulo) ──
  let snake: Cell[] = []; // snake[0] es la cabeza
  let dir: Direction = "right";
  let turnQueue: Direction[] = [];
  let fruit: Fruit | null = null;
  let fruitsEaten = 0;
  let score = 0;
  let state: SerpentinaSnapshot["state"] = "playing";
  let won = false;
  let destroyed = false;
  let lastSnapshot: SerpentinaSnapshot | null = null;
  const image = new Image();
  // ── Notificación a React: solo cuando algo cambia, nunca por frame ──
  function notify() {
    const snapshot: SerpentinaSnapshot = {
      score,
      length: snake.length,
      level: levelFor(fruitsEaten),
      state,
      won,
    };
    const prev = lastSnapshot;
    if (
      prev &&
      prev.score === snapshot.score &&
      prev.length === snapshot.length &&
      prev.level === snapshot.level &&
      prev.state === snapshot.state &&
      prev.won === snapshot.won
    ) {
      return;
    }
    lastSnapshot = snapshot;
    opts.onStateChange?.(snapshot);
  }
  // ── Reglas ──
  /** Coloca una fruta en una celda libre; devuelve false si el tablero está lleno. */
  function spawnFruit(): boolean {
    const free = freeCells(snake);
    if (free.length === 0) {
      fruit = null;
      return false;
    }
    fruit = {
      cell: free[Math.floor(Math.random() * free.length)],
      name: FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)],
    };
    return true;
  }
  function reset() {
    const row = Math.floor(ROWS / 2);
    const col = Math.floor(COLS / 2);
    snake = Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
      col: col - i,
      row,
    }));
    dir = "right";
    turnQueue = [];
    fruitsEaten = 0;
    score = 0;
    state = "playing";
    won = false;
    spawnFruit();
    notify();
  }
  /** Guarda un giro para un paso futuro (sin 180° ni repetidos, máx. 2). */
  function queueTurn(next: Direction) {
    if (state !== "playing") return;
    const ref = turnQueue.length ? turnQueue[turnQueue.length - 1] : dir;
    if (next === ref || isOpposite(next, ref)) return;
    if (turnQueue.length >= MAX_QUEUED_TURNS) return;
    turnQueue.push(next);
  }
  function togglePause() {
    if (state === "gameover") return;
    state = state === "playing" ? "paused" : "playing";
    notify();
  }
  /** Avanza la serpiente una celda. */
  function step() {
    if (state !== "playing") return;
    const turn = turnQueue.shift();
    if (turn) dir = turn;
    const delta = DIRECTION_DELTA[dir];
    const head = snake[0];
    const next: Cell = { col: head.col + delta.col, row: head.row + delta.row };
    const eats = fruit !== null && sameCell(next, fruit.cell);
    // La cola se libera en este paso, salvo que la serpiente crezca.
    const body = eats ? snake : snake.slice(0, -1);
    if (!insideBoard(next) || body.some((c) => sameCell(c, next))) {
      state = "gameover";
      won = false;
      notify();
      return;
    }
    snake.unshift(next);
    if (eats) {
      fruitsEaten += 1;
      score += POINTS_PER_FRUIT;
      if (!spawnFruit()) {
        state = "gameover";
        won = true;
      }
    } else {
      snake.pop();
    }
    notify();
  }
  // ── Arranque ──
  reset();
  image.onload = () => {
    if (destroyed) return;
    // Parte 2: aquí arranca el bucle y se registran los listeners.
  };
  image.src = FRUIT_IMAGE_URL;
  return {
    destroy() {
      destroyed = true;
      image.onload = null;
    },
  };
}
