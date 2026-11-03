import { LEVELS } from "./levels";
import {
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  SPRITES,
  drawSprite,
  type BlockColor,
} from "./sprites";
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
// Teclas cuyo comportamiento por defecto (scroll, etc.) hay que anular.
const PREVENT_DEFAULT_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "KeyP",
  "Escape",
]);
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
  let paused = false;
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
  // ── Dibujo ────────────────────────────────────────────────────────────────
  function drawOverlay(message: string): void {
    ctx!.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx!.fillRect(0, 0, W, H);
    ctx!.fillStyle = "#fff";
    ctx!.font = "bold 64px monospace";
    ctx!.textAlign = "center";
    ctx!.textBaseline = "middle";
    ctx!.fillText(message, W / 2, H / 2);
  }
  // Pausa: solo «PAUSA» y cómo reanudar (el selector de nivel del original se elimina).
  function drawPauseOverlay(): void {
    ctx!.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx!.fillRect(0, 0, W, H);
    ctx!.fillStyle = "#fff";
    ctx!.textAlign = "center";
    ctx!.textBaseline = "middle";
    ctx!.font = "bold 56px monospace";
    ctx!.fillText("PAUSA", W / 2, H / 2 - 20);
    ctx!.font = "bold 16px monospace";
    ctx!.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx!.fillText("P O ESC PARA CONTINUAR", W / 2, H / 2 + 28);
  }
  function draw(): void {
    const c = ctx!;
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
    for (const block of blocks) {
      if (!block.alive) continue;
      drawSprite(
        c,
        sheet,
        SPRITES.blocks[block.color],
        block.x,
        block.y,
        block.w,
        block.h,
      );
    }
    for (const exp of explosions) {
      const frame = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
        3,
      );
      drawSprite(
        c,
        sheet,
        EXPLOSION_FRAMES[exp.color][frame],
        exp.x,
        exp.y,
        exp.w,
        exp.h,
      );
    }
    drawSprite(
      c,
      sheet,
      SPRITES.paddle,
      paddle.x,
      paddle.y,
      paddle.w,
      paddle.h,
    );
    drawSprite(c, sheet, SPRITES.ball, ball.x, ball.y, ball.w, ball.h);
    // HUD del canvas: solo mientras se juega, como en el original.
    if (!gameOver) {
      c.fillStyle = "#fff";
      c.font = "bold 18px monospace";
      c.textBaseline = "top";
      c.textAlign = "left";
      c.fillText("Score: " + score, 10, 10);
      c.textAlign = "center";
      c.fillText("Nivel: " + currentLevel, W / 2, 10);
      const spacing = 4;
      for (let i = 0; i < lives; i++) {
        const bx = W - 10 - (lives - i) * (BALL_SIZE + spacing);
        drawSprite(c, sheet, SPRITES.ball, bx, 10, BALL_SIZE, BALL_SIZE);
      }
    }
    if (gameOver) drawOverlay(won ? "¡Completaste el juego!" : "GAME OVER");
    if (paused) drawPauseOverlay();
  }
  // ── Bucle principal ───────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId = 0;
  let destroyed = false;
  function loop(ts: number): void {
    if (destroyed) return;
    // dt limitado a 50 ms para evitar saltos al volver de una pestaña oculta.
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    // Último frame: se dibuja el overlay y se detiene el bucle (toma el relevo el modal).
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
      // Al reanudar se reinicia el reloj para que no haya un salto de `dt`.
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    }
    notify();
  }
  // ── Input ─────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      keys[e.code] = true;
    } else if ((e.code === "KeyP" || e.code === "Escape") && !e.repeat) {
      togglePause();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      keys[e.code] = false;
    }
  };
  // Si la ventana pierde el foco, se sueltan las teclas.
  const onBlur = () => {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
  };
  // El canvas se escala por CSS con `object-fit: contain`: el área dibujada es más
  // pequeña que su caja (barras negras), así que se descuenta escala y desplazamiento.
  const onMouseMove = (e: MouseEvent) => {
    if (paused || gameOver) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scale = Math.min(rect.width / W, rect.height / H);
    const offsetX = (rect.width - W * scale) / 2;
    const x = (e.clientX - rect.left - offsetX) / scale;
    paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
  };
  // Arranca la partida cuando el spritesheet está cargado. Si `destroy()` se llamó
  // antes, no se arranca nada (ni bucle ni listeners).
  function begin(): void {
    if (destroyed) return;
    initPaddle();
    loadLevel(1);
    notify();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("mousemove", onMouseMove);
    rafId = requestAnimationFrame(loop);
  }
  canvas.width = W;
  canvas.height = H;
  sheet.onload = begin;
  sheet.src = SPRITESHEET_URL;
  return {
    destroy() {
      destroyed = true;
      sheet.onload = null;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("mousemove", onMouseMove);
    },
  };
}
