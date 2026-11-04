import { DEFAULT_SKIN, TETRIS_PALETTES, type Skin } from "@/lib/skins";
import {
  BLOCK,
  COLS,
  H,
  LINE_SCORES,
  ROWS,
  W,
  createBoard,
  randomPiece,
  rotateCW,
  type Piece,
  type Shape,
} from "./utils";
export interface TetrisSnapshot {
  score: number;
  lines: number;
  level: number;
  state: "playing" | "paused" | "gameover";
}
export interface TetrisGame {
  setSkin(skin: Skin): void;
  destroy(): void;
}
// Teclas cuyo comportamiento por defecto (scroll de la página) hay que anular.
const PREVENT_DEFAULT_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "KeyX",
  "KeyP",
]);
// Panel derecho del canvas: recuadro NEXT de 4×4 bloques.
const PANEL_X = COLS * BLOCK;
const NEXT_X = PANEL_X + 20;
const NEXT_Y = 60;
const NEXT_SIZE = 4 * BLOCK;
// Motor de Tetris. Todo el estado vive dentro de esta función (nada en el ámbito
// del módulo), de modo que cada partida es independiente y `destroy()` la corta.
export function startTetris(
  canvas: HTMLCanvasElement,
  opts?: { onStateChange?: (s: TetrisSnapshot) => void; skin?: Skin },
): TetrisGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(
      "startTetris: no se pudo obtener el contexto 2D del canvas",
    );
  }
  const c: CanvasRenderingContext2D = ctx;
  const onStateChange = opts?.onStateChange;
  let pal = TETRIS_PALETTES[opts?.skin ?? DEFAULT_SKIN];
  const board = createBoard();
  let current: Piece;
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let paused = false;
  let gameOver = false;
  let dropInterval = 1000;
  let dropAccum = 0;
  // ── Aviso a React ─────────────────────────────────────────────────────────
  // Solo se emite al arrancar y cuando cambia algún valor (nunca por frame).
  let last: TetrisSnapshot | null = null;
  function notify(): void {
    const state: TetrisSnapshot["state"] = gameOver
      ? "gameover"
      : paused
        ? "paused"
        : "playing";
    if (
      last &&
      last.score === score &&
      last.lines === lines &&
      last.level === level &&
      last.state === state
    ) {
      return;
    }
    last = { score, lines, level, state };
    onStateChange?.({ ...last });
  }
  // ── Lógica ────────────────────────────────────────────────────────────────
  // ¿Chocaría `shape` colocada en (ox, oy) con las paredes, el suelo o el tablero?
  function collide(shape: Shape, ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let col = 0; col < shape[r].length; col++) {
        if (!shape[r][col]) continue;
        const nx = ox + col;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }
  // Rotación horaria con wall kicks: prueba desplazamientos laterales hasta que quepa.
  function tryRotate(): void {
    const rotated = rotateCW(current.shape);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }
  function merge(): void {
    for (let r = 0; r < current.shape.length; r++)
      for (let col = 0; col < current.shape[r].length; col++)
        if (current.shape[r][col])
          board[current.y + r][current.x + col] = current.shape[r][col];
  }
  function clearLines(): void {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++; // la fila de arriba ha bajado a esta posición: se revisa de nuevo
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }
  // Fila donde aterrizaría la pieza actual (pieza fantasma y hard drop).
  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }
  function hardDrop(): void {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }
  function softDrop(): void {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }
  function lockPiece(): void {
    merge();
    clearLines();
    spawn();
  }
  // La siguiente pieza pasa a ser la actual; si ya choca al aparecer, fin de partida.
  function spawn(): void {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) gameOver = true;
  }
  // ── Dibujo ────────────────────────────────────────────────────────────────
  // (px, py) es la esquina del bloque en píxeles del canvas.
  function drawBlock(
    px: number,
    py: number,
    colorIndex: number,
    alpha = 1,
  ): void {
    if (!colorIndex) return;
    const color = pal.colors[colorIndex];
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.shadowColor = color;
    c.shadowBlur = pal.glow;
    c.fillRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
    c.shadowBlur = 0;
    if (pal.gloss) {
      c.fillStyle = "rgba(255,255,255,0.12)";
      c.fillRect(px + 1, py + 1, BLOCK - 2, 4);
    }
    if (pal.hollow && colorIndex % 2 === 0) {
      // Hueco central: distingue las piezas pares sin depender del color.
      c.fillStyle = pal.boardBg;
      c.fillRect(px + 9, py + 9, BLOCK - 18, BLOCK - 18);
    }
    c.restore();
  }
  function drawShape(shape: Shape, gx: number, gy: number, alpha = 1): void {
    for (let r = 0; r < shape.length; r++)
      for (let col = 0; col < shape[r].length; col++)
        drawBlock((gx + col) * BLOCK, (gy + r) * BLOCK, shape[r][col], alpha);
  }
  function drawGrid(): void {
    c.strokeStyle = pal.grid;
    c.lineWidth = 0.5;
    for (let col = 1; col < COLS; col++) {
      c.beginPath();
      c.moveTo(col * BLOCK, 0);
      c.lineTo(col * BLOCK, ROWS * BLOCK);
      c.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      c.beginPath();
      c.moveTo(0, r * BLOCK);
      c.lineTo(COLS * BLOCK, r * BLOCK);
      c.stroke();
    }
  }
  // Panel derecho: recuadro NEXT con la pieza siguiente centrada en su 4×4.
  function drawNext(): void {
    c.fillStyle = pal.textDim;
    c.font = "bold 15px monospace";
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    c.fillText("NEXT", NEXT_X, NEXT_Y - 14);
    c.fillStyle = pal.boardBg;
    c.fillRect(NEXT_X, NEXT_Y, NEXT_SIZE, NEXT_SIZE);
    c.strokeStyle = pal.grid;
    c.lineWidth = 1;
    c.strokeRect(NEXT_X + 0.5, NEXT_Y + 0.5, NEXT_SIZE - 1, NEXT_SIZE - 1);
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let col = 0; col < shape[r].length; col++)
        drawBlock(
          NEXT_X + (offX + col) * BLOCK,
          NEXT_Y + (offY + r) * BLOCK,
          shape[r][col],
        );
  }
  function drawPause(): void {
    c.fillStyle = pal.overlay;
    c.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
    c.fillStyle = pal.text;
    c.textAlign = "center";
    c.font = "bold 40px monospace";
    c.fillText("PAUSA", (COLS * BLOCK) / 2, (ROWS * BLOCK) / 2 - 8);
    c.font = "15px monospace";
    c.fillStyle = pal.textDim;
    c.fillText("P PARA CONTINUAR", (COLS * BLOCK) / 2, (ROWS * BLOCK) / 2 + 26);
    c.textAlign = "left";
  }
  function draw(): void {
    c.clearRect(0, 0, W, H);
    c.fillStyle = pal.bg;
    c.fillRect(0, 0, W, H);
    // tablero
    c.fillStyle = pal.boardBg;
    c.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
    drawGrid();
    for (let r = 0; r < ROWS; r++)
      for (let col = 0; col < COLS; col++)
        drawBlock(col * BLOCK, r * BLOCK, board[r][col]);
    // fantasma y pieza actual
    drawShape(current.shape, current.x, ghostY(), 0.2);
    drawShape(current.shape, current.x, current.y);
    // separación con el panel
    c.strokeStyle = pal.grid;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(PANEL_X + 0.5, 0);
    c.lineTo(PANEL_X + 0.5, H);
    c.stroke();
    drawNext();
    if (paused) drawPause();
  }
  // ── Bucle principal ───────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId = 0;
  let destroyed = false;
  function loop(ts: number): void {
    if (destroyed) return;
    // dt limitado a 50 ms para evitar saltos al volver de una pestaña oculta.
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
    lastTime = ts;
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece();
    }
    // Último frame: se dibuja para que el bloque final se vea tras el modal.
    draw();
    notify();
    if (gameOver) return;
    rafId = requestAnimationFrame(loop);
  }
  function togglePause(): void {
    if (gameOver) return;
    paused = !paused;
    if (paused) {
      cancelAnimationFrame(rafId);
      draw();
    } else {
      // Al reanudar se reinicia el reloj; `dropAccum` conserva su valor previo.
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    }
    notify();
  }
  // ── Input ─────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();
    if (e.code === "KeyP") {
      togglePause();
      return;
    }
    if (paused || gameOver) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
    }
    notify();
  };
  canvas.width = W;
  canvas.height = H;
  spawn();
  notify();
  window.addEventListener("keydown", onKeyDown);
  rafId = requestAnimationFrame(loop);
  return {
    setSkin(skin) {
      pal = TETRIS_PALETTES[skin];
      // En pausa o fin de partida el bucle no corre: se redibuja a mano.
      if (!destroyed && (paused || gameOver)) draw();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
