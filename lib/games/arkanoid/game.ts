import { LEVELS } from "./levels";
import { EXPLOSION_DURATION, type BlockColor } from "./sprites";
import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  BOUNCE_SOUND_URL,
  BREAK_SOUND_URL,
  H,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  POINTS_PER_BLOCK,
  SPRITESHEET_URL,
  START_LIVES,
  W,
} from "./utils";
export interface ArkanoidSnapshot {
  score: number;
  lives: number;
  level: number; // 1–5
  state: "playing" | "paused" | "gameover";
  won: boolean; // true solo si el gameover llega por limpiar el último nivel
}
export interface ArkanoidGame {
  destroy(): void;
}
interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}
interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number; // ms
}
// Motor de Arkanoid. Todo el estado vive dentro de esta función (nada en el ámbito
// del módulo), de modo que cada partida es independiente y `destroy()` la corta.
export function startArkanoid(
  canvas: HTMLCanvasElement,
  opts?: { onStateChange?: (s: ArkanoidSnapshot) => void },
): ArkanoidGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(
      "startArkanoid: no se pudo obtener el contexto 2D del canvas",
    );
  }
  const onStateChange = opts?.onStateChange;
  // ── Assets ────────────────────────────────────────────────────────────────
  const sheet = new Image();
  const bounceSound = new Audio(BOUNCE_SOUND_URL);
  const breakSound = new Audio(BREAK_SOUND_URL);
  // Los navegadores bloquean el audio hasta la primera interacción del usuario:
  // el rechazo de `play()` se ignora para que no aparezca como error en consola.
  function playSound(sound: HTMLAudioElement): void {
    (sound.cloneNode() as HTMLAudioElement).play().catch(() => {});
  }
  // ── Estado del juego ──────────────────────────────────────────────────────
  const paddle = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  const ball = { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };
  const keys = { ArrowLeft: false, ArrowRight: false };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = START_LIVES;
  let currentLevel = 1;
  const paused = false;
  let gameOver = false;
  let won = false;
  // ── Aviso a React ─────────────────────────────────────────────────────────
  // Solo se emite al arrancar y cuando cambia algún valor (nunca por frame).
  let last: ArkanoidSnapshot | null = null;
  function notify(): void {
    const state: ArkanoidSnapshot["state"] = gameOver
      ? "gameover"
      : paused
        ? "paused"
        : "playing";
    if (
      last &&
      last.score === score &&
      last.lives === lives &&
      last.level === currentLevel &&
      last.state === state &&
      last.won === won
    ) {
      return;
    }
    last = { score, lives, level: currentLevel, state, won };
    onStateChange?.({ ...last });
  }
  // ── Lógica ────────────────────────────────────────────────────────────────
  function initPaddle(): void {
    paddle.x = (W - paddle.w) / 2;
  }
  // Pone la pelota sobre el paddle con la velocidad del nivel actual.
  function initBall(): void {
    const speed = LEVELS[currentLevel - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }
  function loadLevel(n: number): void {
    currentLevel = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    initBall();
  }
  function collideAABB(block: Block): boolean {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }
  // `dt` en segundos.
  function update(dt: number): void {
    if (gameOver) return;
    // Paddle (teclado)
    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);
    // Pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // Rebotes en paredes (izquierda, derecha y techo)
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      playSound(bounceSound);
    }
    // Rebote en el paddle (solo si la pelota baja)
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      playSound(bounceSound);
    }
    // Colisión con bloques: como máximo uno por frame
    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(block)) {
        block.alive = false;
        explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        score += POINTS_PER_BLOCK;
        ball.vy = -ball.vy;
        playSound(breakSound);
        if (blocks.every((b) => !b.alive)) {
          if (currentLevel < LEVELS.length) {
            loadLevel(currentLevel + 1);
          } else {
            won = true;
            gameOver = true;
          }
        }
        break;
      }
    }
    // Explosiones
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);
    // Pelota perdida
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        gameOver = true;
      } else {
        initBall();
      }
    }
  }
  // Arranca la partida cuando el spritesheet está cargado. Si `destroy()` se llamó
  // antes, no se arranca nada.
  let destroyed = false;
  function begin(): void {
    if (destroyed) return;
    initPaddle();
    loadLevel(1);
    notify();
  }
  sheet.onload = begin;
  sheet.src = SPRITESHEET_URL;
  return {
    destroy() {
      destroyed = true;
      sheet.onload = null;
    },
  };
}
