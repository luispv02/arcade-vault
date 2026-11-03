export const W = 800;
export const H = 600;
export const PADDLE_SPEED = 400;
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
export const BLOCKS_ORIGIN_Y = 80;
export const PADDLE_Y = 560;
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const BALL_SIZE = 16;
// Velocidad base de la pelota; se multiplica por `speed` de cada nivel.
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;
export const START_LIVES = 3;
export const POINTS_PER_BLOCK = 10;
// Assets servidos desde public/games/arkanoid/.
export const SPRITESHEET_URL = "/games/arkanoid/spritesheet-breakout.png";
export const BOUNCE_SOUND_URL = "/games/arkanoid/sounds/ball-bounce.mp3";
export const BREAK_SOUND_URL = "/games/arkanoid/sounds/break-sound.mp3";
