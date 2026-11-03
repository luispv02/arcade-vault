export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
/**
 * Recortes de la fila de pixel art de `public/games/serpentina/fruits.png`
 * (3790×442, fondo transparente; y = 136, alto 160). Coordenadas idénticas a
 * `references/source-assets/snake-assets/sprites.js`.
 *
 * Los nombres siguen lo que muestra cada recorte, de izquierda a derecha; no
 * coinciden con las etiquetas del atlas original (p. ej. su `banana` es una
 * manzana). El motor solo los usa para elegir uno al azar.
 */
export type FruitName =
  | "apple"
  | "banana"
  | "pineapple"
  | "grapes"
  | "pumpkin"
  | "turnip"
  | "eggplant"
  | "strawberry"
  | "cherries"
  | "carrots"
  | "mushroom"
  | "broccoli"
  | "watermelon"
  | "pepper"
  | "kiwi"
  | "lemon"
  | "orange"
  | "peach"
  | "peanut"
  | "raspberry"
  | "tomato"
  | "fruitBowl";
const ROW_Y = 136;
const ROW_H = 160;
export const FRUITS: Record<FruitName, SpriteRect> = {
  apple: { x: 34, y: ROW_Y, w: 110, h: ROW_H },
  banana: { x: 186, y: ROW_Y, w: 150, h: ROW_H },
  pineapple: { x: 378, y: ROW_Y, w: 110, h: ROW_H },
  grapes: { x: 540, y: ROW_Y, w: 130, h: ROW_H },
  pumpkin: { x: 712, y: ROW_Y, w: 130, h: ROW_H },
  turnip: { x: 894, y: ROW_Y, w: 110, h: ROW_H },
  eggplant: { x: 1066, y: ROW_Y, w: 110, h: ROW_H },
  strawberry: { x: 1228, y: ROW_Y, w: 130, h: ROW_H },
  cherries: { x: 1400, y: ROW_Y, w: 130, h: ROW_H },
  carrots: { x: 1582, y: ROW_Y, w: 110, h: ROW_H },
  mushroom: { x: 1734, y: ROW_Y, w: 150, h: ROW_H },
  broccoli: { x: 1906, y: ROW_Y, w: 150, h: ROW_H },
  watermelon: { x: 2068, y: ROW_Y, w: 170, h: ROW_H },
  pepper: { x: 2250, y: ROW_Y, w: 140, h: ROW_H },
  kiwi: { x: 2432, y: ROW_Y, w: 130, h: ROW_H },
  lemon: { x: 2604, y: ROW_Y, w: 130, h: ROW_H },
  orange: { x: 2786, y: ROW_Y, w: 110, h: ROW_H },
  peach: { x: 2948, y: ROW_Y, w: 130, h: ROW_H },
  peanut: { x: 3110, y: ROW_Y, w: 150, h: ROW_H },
  raspberry: { x: 3302, y: ROW_Y, w: 110, h: ROW_H },
  tomato: { x: 3454, y: ROW_Y, w: 150, h: ROW_H },
  fruitBowl: { x: 3637, y: ROW_Y, w: 130, h: ROW_H },
};
export const FRUIT_NAMES = Object.keys(FRUITS) as FruitName[];
