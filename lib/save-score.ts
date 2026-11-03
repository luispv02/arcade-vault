import { createClient } from "@/lib/supabase/client";
// Inserta una puntuación en `scores`. Solo envía game_id, name y score:
// el resto de columnas las rellena la base de datos.
export async function saveScore(
  gameId: string,
  name: string,
  score: number,
): Promise<{ ok: boolean }> {
  try {
    const { error } = await createClient()
      .from("scores")
      .insert({ game_id: gameId, name, score });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
