import type { Database } from "@/lib/supabase/database.types";

export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

/** Fila de `games` con `cat` y `color` estrechados (en la BD son `text` con CHECK). */
export type Game = Omit<
  Database["public"]["Tables"]["games"]["Row"],
  "cat" | "color"
> & {
  cat: GameCategory;
  color: GameColor;
};

/** Juego del catálogo con sus estadísticas (`game_stats`), tal como lo devuelve `lib/data.ts`. */
export interface GameWithStats extends Game {
  best: number;
  plays: number;
}

export const CATS: ("TODOS" | GameCategory)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];

/** 12400 → "12.4K"; por debajo de 1000 se muestra el número tal cual. */
export function formatPlays(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1)}K`;
}
