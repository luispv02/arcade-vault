import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  type Keys,
} from "./entities";
import {
  ASTEROIDS_PALETTES,
  DEFAULT_SKIN,
  type Skin,
} from "@/lib/skins";
import type { TouchAction } from "@/lib/games/touch";
import {
  H,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  W,
  dist,
  rand,
} from "./utils";

export interface AsteroidsSnapshot {
  score: number;
  lives: number;
  level: number;
  state: "playing" | "dead" | "paused" | "gameover";
}

export interface AsteroidsGame {
  setSkin(skin: Skin): void;
  /** Entrada del mando virtual (SPEC 10): misma lógica que las teclas ←, →, ↑ (mantener) y Espacio (a). */
  input(action: TouchAction, down: boolean): void;
  togglePause(): void;
  destroy(): void;
}

const PREVENT_DEFAULT_CODES = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
]);

export function startAsteroids(
  canvas: HTMLCanvasElement,
  opts?: { onStateChange?: (s: AsteroidsSnapshot) => void; skin?: Skin },
): AsteroidsGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("startAsteroids: no se pudo obtener el contexto 2D del canvas");
  }
  const onStateChange = opts?.onStateChange;
  let pal = ASTEROIDS_PALETTES[opts?.skin ?? DEFAULT_SKIN];

  // ── Input ─────────────────────────────────────────────────────────────────
  const keys: Keys = {};
  const justPressed: Keys = {};

  const pressKey = (code: string) => {
    if (!keys[code]) justPressed[code] = true;
    keys[code] = true;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();
    pressKey(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();
    keys[e.code] = false;
  };
  const TOUCH_TO_CODE: Partial<Record<TouchAction, string>> = {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    a: "Space",
  };
  // Si la ventana pierde el foco, se sueltan todas las teclas
  const onBlur = () => {
    for (const code of Object.keys(keys)) keys[code] = false;
  };

  const pressed = (code: string): boolean => {
    const val = justPressed[code];
    justPressed[code] = false;
    return !!val;
  };

  // ── Estado del juego ──────────────────────────────────────────────────────
  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let powerUps: PowerUp[];
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: Exclude<AsteroidsSnapshot["state"], "paused"> = "playing";
  let paused = false;
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;

  let last: AsteroidsSnapshot | null = null;
  function notify(): void {
    const shown: AsteroidsSnapshot["state"] = paused ? "paused" : state;
    if (
      last &&
      last.score === score &&
      last.lives === lives &&
      last.level === level &&
      last.state === shown
    ) {
      return;
    }
    last = { score, lives, level, state: shown };
    onStateChange?.({ ...last });
  }

  function spawnAsteroids(count: number): void {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame(): void {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    spawnAsteroids(4);
  }

  function nextLevel(): void {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8): void {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip(): void {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────
  function update(dt: number): void {
    if (state === "gameover") {
      if (pressed("Space")) initGame();
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (asteroids.length === 0) nextLevel();
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function drawLifeIcon(c: CanvasRenderingContext2D, x: number, y: number) {
    c.save();
    c.translate(x, y);
    c.rotate(-Math.PI / 2);
    c.strokeStyle = pal.ship;
    c.lineWidth = Math.min(pal.lineWidth, 2);
    c.lineJoin = pal.pixel ? "miter" : "round";
    c.beginPath();
    c.moveTo(9, 0);
    c.lineTo(-6, -5);
    c.lineTo(-3, 0);
    c.lineTo(-6, 5);
    c.closePath();
    c.stroke();
    c.restore();
  }

  function drawHUD(c: CanvasRenderingContext2D): void {
    c.fillStyle = pal.text;
    c.font = `15px ${pal.font}`;

    c.textAlign = "left";
    c.fillText(`SCORE  ${score}`, 14, 26);

    c.textAlign = "center";
    c.fillText(`NIVEL ${level}`, W / 2, 26);

    for (let i = 0; i < lives; i++) drawLifeIcon(c, W - 16 - i * 22, 18);

    if (ship.tripleShot > 0) {
      c.textAlign = "left";
      c.fillStyle = pal.powerUp;
      c.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }

  function drawOverlay(c: CanvasRenderingContext2D, title: string, sub: string) {
    c.textAlign = "center";
    c.fillStyle = pal.text;
    c.font = "bold 46px monospace";
    c.fillText(title, W / 2, H / 2 - 18);
    c.font = "18px monospace";
    c.fillStyle = pal.textDim;
    c.fillText(sub, W / 2, H / 2 + 22);
  }

  function draw(c: CanvasRenderingContext2D): void {
    c.fillStyle = pal.bg;
    c.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(c, pal));
    asteroids.forEach((a) => a.draw(c, pal));
    powerUps.forEach((p) => p.draw(c, pal));
    bullets.forEach((b) => b.draw(c, pal));
    ship.draw(c, pal);

    drawHUD(c);

    if (paused) drawOverlay(c, "PAUSA", "JUEGO EN PAUSA");
    else if (state === "gameover")
      drawOverlay(
        c,
        "GAME OVER",
        `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`,
      );
  }

  // ── Bucle principal ───────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId = 0;
  let destroyed = false;

  function loop(ts: number): void {
    if (destroyed) return;
    const dt =
      lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw(ctx!);
    notify();
    rafId = requestAnimationFrame(loop);
  }

  function togglePause(): void {
    if (state === "gameover") return;
    paused = !paused;
    if (paused) {
      cancelAnimationFrame(rafId);
      draw(ctx!);
    } else {
      // Al reanudar se reinicia el reloj para que no haya un salto de `dt`.
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    }
    notify();
  }

  canvas.width = W;
  canvas.height = H;
  initGame();
  notify();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  rafId = requestAnimationFrame(loop);

  return {
    setSkin(skin) {
      pal = ASTEROIDS_PALETTES[skin];
      // En pausa el bucle no corre: se redibuja a mano.
      if (!destroyed && paused) draw(ctx!);
    },
    input(action, down) {
      const code = TOUCH_TO_CODE[action];
      if (destroyed || !code) return;
      if (down) {
        // Pulsar no actúa en pausa; soltar siempre se permite (nada queda pegado).
        if (!paused) pressKey(code);
      } else {
        keys[code] = false;
      }
    },
    togglePause() {
      if (!destroyed) togglePause();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
}
