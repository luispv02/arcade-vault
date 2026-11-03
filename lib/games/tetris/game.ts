import {
  COLS,
  ROWS,
  LINE_SCORES,
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
  destroy(): void;
}
// Motor de Tetris. Todo el estado vive dentro de esta función (nada en el ámbito
// del módulo), de modo que cada partida es independiente y `destroy()` la corta.
export function startTetris(
  canvas: HTMLCanvasElement,
  opts: { onStateChange?: (s: TetrisSnapshot) => void } = {},
): TetrisGame {
  const board = createBoard();
  let current: Piece;
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  const paused = false;
  let gameOver = false;
  let dropInterval = 1000;
  const dropAccum = 0;
  // ¿Chocaría `shape` colocada en (ox, oy) con las paredes, el suelo o el tablero?
  function collide(shape: Shape, ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
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
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
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
  spawn();
  return {
    destroy() {},
  };
}
