import { DEFAULT_SKIN, SERPENTINA_PALETTES, type Skin } from "@/lib/skins";
import type { TouchAction } from "@/lib/games/touch";
import { FRUITS, FRUIT_NAMES, type FruitName } from "./sprites";
import {
  CELL,
  COLS,
  DIRECTION_DELTA,
  FRUIT_DRAW_H,
  FRUIT_IMAGE_URL,
  H,
  INITIAL_LENGTH,
  MAX_DT_MS,
  MAX_QUEUED_TURNS,
  POINTS_PER_FRUIT,
  ROWS,
  W,
  freeCells,
  insideBoard,
  isOpposite,
  levelFor,
  sameCell,
  stepIntervalFor,
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
  setSkin(skin: Skin): void;
  /** Entrada del mando virtual (SPEC 10): solo `down: true` actúa; a/b no tienen efecto. */
  input(action: TouchAction, down: boolean): void;
  togglePause(): void;
  destroy(): void;
}
interface Fruit {
  cell: Cell;
  name: FruitName;
}
export function startSerpentina(
  canvas: HTMLCanvasElement,
  opts: {
    onStateChange?: (s: SerpentinaSnapshot) => void;
    skin?: Skin;
  } = {},
): SerpentinaGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Serpentina: el canvas no ofrece un contexto 2D.");
  }
  let pal = SERPENTINA_PALETTES[opts.skin ?? DEFAULT_SKIN];
  canvas.width = W;
  canvas.height = H;
  const g: CanvasRenderingContext2D = ctx;
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
  // ── Dibujo ──
  function bodyColor(index: number): string {
    // De la cabeza (verde neón) a la cola (verde apagado).
    const t = snake.length > 1 ? index / (snake.length - 1) : 0;
    const mix = (i: number) =>
      Math.round(pal.bodyRgb[i] + (pal.tailRgb[i] - pal.bodyRgb[i]) * t);
    return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
  }
  function drawBoard() {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        g.fillStyle = (col + row) % 2 === 0 ? pal.boardLight : pal.boardDark;
        g.fillRect(col * CELL, row * CELL, CELL, CELL);
      }
    }
  }
  function drawFruit() {
    if (!fruit) return;
    if (!pal.sprites) {
      const cx = fruit.cell.col * CELL + CELL / 2;
      const cy = fruit.cell.row * CELL + CELL / 2;
      g.fillStyle = pal.fruit;
      if (pal.fruitShape === "pixel") {
        // Cruz de píxeles, distinta del cuerpo cuadrado de la serpiente.
        g.fillRect(cx - 5, cy - 15, 10, 30);
        g.fillRect(cx - 15, cy - 5, 30, 10);
      } else {
        g.beginPath();
        g.arc(cx, cy, 12, 0, Math.PI * 2);
        g.fill();
      }
      return;
    }
    if (!image.complete || image.naturalWidth === 0) return;
    const rect = FRUITS[fruit.name];
    const scale = FRUIT_DRAW_H / rect.h;
    const dw = rect.w * scale;
    const dx = fruit.cell.col * CELL + (CELL - dw) / 2;
    const dy = fruit.cell.row * CELL + (CELL - FRUIT_DRAW_H) / 2;
    g.save();
    g.imageSmoothingEnabled = false;
    g.shadowColor = pal.fruitGlow;
    g.shadowBlur = 12;
    g.drawImage(
      image,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      dx,
      dy,
      dw,
      FRUIT_DRAW_H,
    );
    g.restore();
  }
  function drawSnake() {
    g.save();
    g.shadowColor = pal.bodyGlow;
    g.shadowBlur = pal.glow;
    // De la cola a la cabeza, para que la cabeza quede encima.
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      g.fillStyle = i === 0 ? pal.head : bodyColor(i);
      g.beginPath();
      g.roundRect(
        seg.col * CELL + 2,
        seg.row * CELL + 2,
        CELL - 4,
        CELL - 4,
        pal.radius,
      );
      g.fill();
    }
    g.restore();
    // Ojos de la cabeza, orientados según la dirección.
    const head = snake[0];
    const d = DIRECTION_DELTA[dir];
    const cx = head.col * CELL + CELL / 2 + d.col * 6;
    const cy = head.row * CELL + CELL / 2 + d.row * 6;
    for (const side of [-1, 1]) {
      const ex = cx + -d.row * side * 8;
      const ey = cy + d.col * side * 8;
      g.fillStyle = pal.eyeWhite;
      g.beginPath();
      g.arc(ex, ey, 5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = pal.eyePupil;
      g.beginPath();
      g.arc(ex + d.col * 2, ey + d.row * 2, 2.5, 0, Math.PI * 2);
      g.fill();
    }
  }
  function drawOverlay(title: string, color: string, hint?: string) {
    g.save();
    g.fillStyle = pal.overlayBg;
    g.fillRect(0, 0, W, H);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = pal.glow ? 16 : 0;
    g.font = "bold 56px monospace";
    g.fillText(title, W / 2, H / 2 - (hint ? 20 : 0));
    g.shadowBlur = 0;
    if (hint) {
      g.fillStyle = pal.hint;
      g.font = "bold 16px monospace";
      g.fillText(hint, W / 2, H / 2 + 28);
    }
    g.restore();
  }
  function draw() {
    drawBoard();
    drawFruit();
    drawSnake();
    if (state === "paused") {
      drawOverlay("PAUSA", pal.pause, "P O ESC PARA CONTINUAR");
    } else if (state === "gameover") {
      if (won) drawOverlay("¡TABLERO COMPLETO!", pal.win);
      else drawOverlay("GAME OVER", pal.lose);
    }
  }
  // ── Entrada ──
  const KEY_TO_DIRECTION: Record<string, Direction> = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
  };
  const TOUCH_TO_DIRECTION: Partial<Record<TouchAction, Direction>> = {
    up: "up",
    down: "down",
    left: "left",
    right: "right",
  };
  function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const turn = KEY_TO_DIRECTION[e.code];
    if (turn) {
      e.preventDefault();
      queueTurn(turn);
    } else if (e.code === "KeyP" || e.code === "Escape") {
      e.preventDefault();
      if (!e.repeat) togglePause();
    }
  }
  // ── Bucle ──
  let rafId = 0;
  let lastTime = 0;
  let accumulator = 0;
  function stopInput() {
    window.removeEventListener("keydown", onKeyDown);
  }
  function loop(now: number) {
    if (destroyed) return;
    const dt = Math.min(now - lastTime, MAX_DT_MS);
    lastTime = now;
    if (state === "playing") {
      accumulator += dt;
      let interval = stepIntervalFor(levelFor(fruitsEaten));
      while (accumulator >= interval && state === "playing") {
        accumulator -= interval;
        step();
        interval = stepIntervalFor(levelFor(fruitsEaten));
      }
    }
    draw();
    if (state === "gameover") {
      // Último frame ya dibujado: el bucle se detiene y el teclado se libera
      // para que el modal pueda escribir el nombre (W, A, S, D, P...).
      stopInput();
      rafId = 0;
      return;
    }
    rafId = requestAnimationFrame(loop);
  }
  // ── Arranque ──
  reset();
  draw(); // tablero visible mientras carga la imagen
  image.onload = () => {
    if (destroyed) return;
    window.addEventListener("keydown", onKeyDown);
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  };
  image.src = FRUIT_IMAGE_URL;
  return {
    setSkin(skin) {
      pal = SERPENTINA_PALETTES[skin];
      if (!destroyed) draw();
    },
    input(action, down) {
      if (destroyed || !down) return;
      const turn = TOUCH_TO_DIRECTION[action];
      if (turn) queueTurn(turn);
    },
    togglePause() {
      if (!destroyed) togglePause();
    },
    destroy() {
      destroyed = true;
      image.onload = null;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      stopInput();
    },
  };
}
