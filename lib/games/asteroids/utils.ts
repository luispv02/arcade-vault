export const W = 800;
export const H = 600;

export const wrap = (v: number, max: number): number => ((v % max) + max) % max;
export const dist = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): number => Math.hypot(a.x - b.x, a.y - b.y);
export const rand = (min: number, max: number): number =>
  min + Math.random() * (max - min);
export const randInt = (min: number, max: number): number =>
  Math.floor(rand(min, max + 1));

// Power-up de triple disparo
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const TRIPLE_SPREAD = 0.18;

// Asteroides, indexados por tamaño (1 pequeño, 2 mediano, 3 grande)
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32];
export const POINTS = [0, 100, 50, 20];
