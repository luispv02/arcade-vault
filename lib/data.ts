import { createClient } from "@/lib/supabase/server";
import type { GameCategory, GameColor, GameWithStats } from "@/lib/games";

/**
 * Capa de datos del servidor (SPEC 06). Usa el cliente de servidor, que lee
 * `cookies()`: con `cacheComponents` hay que llamarla dentro de <Suspense>.
 */

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY"
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/** Todos los juegos, ordenados por `sort_order`, con `best` y `plays`. */
export async function getGames(): Promise<GameWithStats[]> {
  const supabase = await createClient();
  const [games, stats] = await Promise.all([
    supabase.from("games").select("*").order("sort_order"),
    supabase.from("game_stats").select("game_id, best, plays"),
  ]);
  if (games.error) throw new Error(`getGames: ${games.error.message}`);
  if (stats.error) throw new Error(`getGames: ${stats.error.message}`);

  const byGame = new Map(stats.data.map((s) => [s.game_id, s]));
  return games.data.map((g) => ({
    ...g,
    cat: g.cat as GameCategory,
    color: g.color as GameColor,
    best: byGame.get(g.id)?.best ?? 0,
    plays: byGame.get(g.id)?.plays ?? 0,
  }));
}

/** Un juego por id, o `null` si no existe. */
export async function getGame(id: string): Promise<GameWithStats | null> {
  const supabase = await createClient();
  const [game, stats] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("game_stats")
      .select("best, plays")
      .eq("game_id", id)
      .maybeSingle(),
  ]);
  if (game.error) throw new Error(`getGame: ${game.error.message}`);
  if (stats.error) throw new Error(`getGame: ${stats.error.message}`);
  if (!game.data) return null;
  return {
    ...game.data,
    cat: game.data.cat as GameCategory,
    color: game.data.color as GameColor,
    best: stats.data?.best ?? 0,
    plays: stats.data?.plays ?? 0,
  };
}

/** Top de un juego: `score desc`, y a igualdad gana quien llegó antes. */
export async function getTopScores(
  gameId: string,
  limit = 12,
): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`getTopScores: ${error.message}`);
  return data.map((r, i) => ({
    rank: i + 1,
    name: r.name,
    score: r.score,
    date: formatDate(r.created_at),
  }));
}
