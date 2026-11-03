export type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";
export interface SpriteRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
export const SPRITES: {
  paddle: SpriteRect;
  ball: SpriteRect;
  blocks: Record<BlockColor, SpriteRect>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};
// 4 frames de 32×16 por color, en la fila `sy` del spritesheet (x = 256, 288, 320, 352).
const explosion = (sy: number): SpriteRect[] =>
  [256, 288, 320, 352].map((sx) => ({ sx, sy, sw: 32, sh: 16 }));
export const EXPLOSION_FRAMES: Record<BlockColor, SpriteRect[]> = {
  red: explosion(176),
  cyan: explosion(192),
  green: explosion(208),
  magenta: explosion(224),
  yellow: explosion(240),
  hotpink: explosion(256),
  gray: explosion(176), // como en el original, el gris explota con los frames del rojo
};
export const EXPLOSION_DURATION = 150; // ms
// Dibuja un sprite o un frame de explosión del spritesheet `img` en (x, y) con tamaño w×h.
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  rect: SpriteRect,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, x, y, w, h);
}
